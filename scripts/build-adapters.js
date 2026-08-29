#!/usr/bin/env node
// build-adapters.js — generate per-host adapter files from src/SKILL.md
// Mirrors ponytail's single-source + per-host adapter pattern.
// Run: node scripts/build-adapters.js
// Supports dual-profile (ADR-0010 Option C): SKILL.md has tagged sections
// ## Generator Profile / ## Verifier Profile / ## Boundaries (shared).

const fs = require('fs');
const path = require('path');
const { splitByProfile } = require('../hooks/jiahao-profile');

const root = path.join(__dirname, '..');

// ADR-0028 D2: the adapter map is a pure function of src/SKILL.md so the
// --check golden layer regenerates it in memory and byte-compares against
// the committed files (regen-and-diff; no lock file, no snapshots).
function buildAdapters() {
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  const profiles = splitByProfile(skill);

// Adapter definitions: host -> { path, content }
// Instruction-tier adapters: generate both profiles
const adapters = {
  // Claude Code: plugin hooks.json already in hooks/, SKILL.md is the source
  'adapters/claude-code/README.md': '# Claude Code Adapter\n\nInstall as a Claude Code plugin. The hooks in hooks/jiahao-hooks.json\nactivate on SessionStart, SubagentStart, UserPromptSubmit, and Stop.\n\nSee hooks/jiahao-hooks.json for the hook configuration.\n',

  // Codex: .codex/hooks.json
  'adapters/codex/hooks.json': JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-activate.js', timeout: 5 }] }],
      SubagentStart: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-subagent.js', timeout: 5 }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-mode-tracker.js', timeout: 5 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-verdict-gate.js', timeout: 10 }] }],
      SessionEnd: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-sweep.js', timeout: 3 }] }], // ADR-0024 D3
    },
  }, null, 2),

  // Cursor: .cursor/rules/jiahao.mdc — verifier profile (default for instruction-tier)
  'adapters/cursor/jiahao.mdc': '---\ndescription: Jiahao verifier discipline\nglobs:\n  - "**/*"\n---\n' + profiles.verifier,

  // Cursor generator profile
  'adapters/cursor/jiahao-generator.mdc': '---\ndescription: Jiahao generator discipline (surface signals)\nglobs:\n  - "**/*"\n---\n' + profiles.generator,

  // Windsurf: .windsurf/rules/jiahao.md — verifier profile
  'adapters/windsurf/jiahao.md': profiles.verifier,
  'adapters/windsurf/jiahao-generator.md': profiles.generator,

  // Cline: .clinerules/jiahao.md — verifier profile
  'adapters/cline/jiahao.md': profiles.verifier,
  'adapters/cline/jiahao-generator.md': profiles.generator,

  // Instruction-tier fallback: AGENTS.md fragment — verifier profile
  'adapters/instruction-tier/AGENTS.md': '# Jiahao Verifier Discipline\n\n' + profiles.verifier,
  'adapters/instruction-tier/AGENTS-generator.md': '# Jiahao Generator Discipline\n\n' + profiles.generator,

  // Copilot CLI: repo-level .github/hooks/jiahao.json, flat {version,hooks}
  // schema. agentStop is the verdict-gate mapping; userPromptSubmitted is the
  // attested injection path (repo-level sessionStart has known non-firing
  // bugs: copilot-cli #1730 open, #2415; additionalContext fixed in 1.0.11 per
  // #2142). Verified against docs.github.com/en/copilot hooks docs, 2026-08.
  'adapters/copilot/hooks.json': JSON.stringify({
    version: 1,
    hooks: {
      sessionStart: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-activate.js', timeoutSec: 10 }],
      userPromptSubmitted: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-mode-tracker.js', timeoutSec: 10 }],
      subagentStart: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-subagent.js', timeoutSec: 10 }],
      agentStop: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-verdict-gate.js', timeoutSec: 30 }],
      sessionEnd: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-sweep.js', timeoutSec: 10 }],
    },
  }, null, 2) + '\n',

  'adapters/copilot/README.md': '# GitHub Copilot CLI Adapter\n\nRepo-level hook config for GitHub Copilot CLI: copy hooks.json to\n`.github/hooks/jiahao.json` and the hook scripts (hooks/*.js from this\npackage) to `.github/jiahao/hooks/`. Flat schema `{version: 1, hooks:\n{event: [entry]}}` per the official hooks reference.\n\nEvent mapping:\n- sessionStart -> jiahao-activate.js (additionalContext injection)\n- userPromptSubmitted -> jiahao-mode-tracker.js (mode commands + reminder;\n  attested injection path)\n- subagentStart -> jiahao-subagent.js\n- agentStop -> jiahao-verdict-gate.js (block forces continuation; the CLI\n  force-ends after 8 consecutive blocks)\n- sessionEnd -> jiahao-sweep.js (sentinel sweep)\n\nKnown degradations (verified against copilot-cli issues, 2026-08):\n- #1730 (open): repo-level `.github/hooks/` sessionStart may not fire;\n  userPromptSubmitted is the attested injection path.\n- #2142: sessionStart additionalContext was dropped until CLI 1.0.11.\n- Copilot exit codes default to warn/fail-open outside\n  preToolUse/permissionRequest; the agentStop block follows the CLI\'s own\n  continuation semantics, not Claude\'s exit-2 stderr convention (ADR-0028\n  R6: differences are recorded, not shimmed).\n',

  // Qoder (international CLI): project-level .qoder/settings.json fragment.
  // Contract homologous to Claude Code: hookSpecificOutput.hookEventName,
  // exit 2 blocks on Stop/UserPromptSubmit (docs.qoder.com/cli/hooks and
  // hooks-reference, verified 2026-08). SessionStart exists (matcher
  // startup|resume|clear, non-blocking). SessionEnd is NOT registered: not
  // verified in the official event list at research time.
  'adapters/qoder/settings.json': JSON.stringify({
    hooks: {
      SessionStart: [{ matcher: 'startup|resume|clear', hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-activate.js', timeout: 10 }] }],
      SubagentStart: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-subagent.js', timeout: 10 }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-mode-tracker.js', timeout: 10 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-verdict-gate.js', timeout: 30 }] }],
      SubagentStop: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-verdict-gate.js', timeout: 30 }] }],
    },
  }, null, 2) + '\n',

  'adapters/qoder/README.md': '# Qoder Adapter (international CLI)\n\nMerge settings.json into your project `.qoder/settings.json` (or install\nuser-level at `~/.qoder/settings.json`) and copy the hook scripts\n(hooks/*.js of this package) to `.qoder/hooks/`. The contract is homologous\nto Claude Code: `hookSpecificOutput.hookEventName` + `additionalContext`,\nexit 2 blocks on Stop/UserPromptSubmit (docs.qoder.com/cli/hooks and\ncli/hooks-reference, verified 2026-08).\n\nEvent mapping: SessionStart (matcher startup|resume|clear; non-blocking) ->\njiahao-activate.js; SubagentStart -> jiahao-subagent.js; UserPromptSubmit ->\njiahao-mode-tracker.js; Stop/SubagentStop -> jiahao-verdict-gate.js\n(exit-2 blocking verifier gate).\n\nHonest notes:\n- SessionStart IS supported (matcher startup/resume/clear); the old runtime\n  comment "Qoder has no SessionStart" was wrong and has been corrected.\n- SessionEnd is not registered because it was not verified in the official\n  event list at research time; the next session\'s first hook reconcile\n  remains the sweep baseline (ADR-0024 D3).\n- CN fork (Lingma / Qoder CN): 5 events only, no SessionStart, Stop cannot\n  block, config under `~/.lingma/` — this adapter targets the international\n  CLI. Do not assume parity.\n',

  // opencode: instruction tier, advisory-only. No lifecycle hooks and no
  // exit-2 contract exist (opencode#12472 open; #14551 closed not-planned).
  // Primary channel: AGENTS.md (project root + ~/.config/opencode/AGENTS.md,
  // merged). opencode.json instructions field is V1-only (accepted but not
  // loaded in V2 beta) — shipped as a supplementary channel, documented.
  'adapters/opencode/jiahao-verifier.md': '# Jiahao Verifier Discipline\n\n' + profiles.verifier,
  'adapters/opencode/jiahao-generator.md': '# Jiahao Generator Discipline\n\n' + profiles.generator,
  'adapters/opencode/opencode.json': JSON.stringify({
    instructions: ['jiahao-verifier.md'],
  }, null, 2) + '\n',
  'adapters/opencode/README.md': '# opencode Adapter (instruction tier, advisory-only)\n\nopencode has no lifecycle hooks and no exit-2 contract (issue #12472 open;\n#14551 closed as not-planned), so jiahao runs advisory-only here.\n\nTwo injection channels:\n1. AGENTS.md (primary; V1 and V2): paste the profile content into your\n   project-root AGENTS.md or `~/.config/opencode/AGENTS.md` (both are\n   merged by opencode).\n2. opencode.json `instructions` (V1 only; accepted but NOT loaded in the V2\n   beta): place jiahao-verifier.md next to the provided opencode.json, which\n   references it via `"instructions": ["jiahao-verifier.md"]`.\n\nClaude Code compatibility paths (~/.claude/skills) also work.\n',

  // aider: instruction tier, advisory-only. No hooks (issue #2557 closed
  // stale). Loader is explicit configuration, not discovery: read: list in
  // .aider.conf.yml (search order git root, cwd, home). Default installs do
  // NOT inject anything — the opt-in is the honest contract.
  'adapters/aider/CONVENTIONS.md': profiles.verifier,
  'adapters/aider/CONVENTIONS-generator.md': profiles.generator,
  'adapters/aider/.aider.conf.yml': '# Jiahao discipline injection (advisory-only; aider has no hooks)\n# Loader is explicit configuration, not discovery\n# (aider.chat/docs/config/aider_conf.html; conventions guide recommends\n# read: over the stale read-only: spelling).\nread:\n  - CONVENTIONS.md\n',
  'adapters/aider/README.md': '# aider Adapter (instruction tier, advisory-only)\n\naider has no hooks (issue #2557 closed by stale bot, never implemented), so\njiahao is advisory-only plain-text injection here. The loader is explicit\nconfiguration, not discovery: nothing is injected unless you opt in.\n\nInstall: copy CONVENTIONS.md and .aider.conf.yml to your project git root\n(config search order: git root, cwd, home). The `read:` key takes a list;\nswap in CONVENTIONS-generator.md for the generator profile.\n',

  // MCP server (future): package.json for ponytail-mcp equivalent
  'adapters/mcp/README.md': '# MCP Adapter\n\njiahao-mcp/ is a stdio MCP server exposing jiahao verifier discipline\nvia registerPrompt + registerTool for MCP-only agent hosts.\n\nSee jiahao-mcp/index.js for the server implementation.\nDependencies: @modelcontextprotocol/sdk, zod.\n',
};

  return adapters;
}

// Minimal zero-dependency unified diff (LCS over lines, 3 lines of context).
function unifiedDiff(rel, oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length;
  const n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push(new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push([' ', a[i], i + 1, j + 1]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i], i + 1, 0]); i++; }
    else { ops.push(['+', b[j], 0, j + 1]); j++; }
  }
  while (i < m) { ops.push(['-', a[i], i + 1, 0]); i++; }
  while (j < n) { ops.push(['+', b[j], 0, j + 1]); j++; }

  const out = ['--- a/' + rel, '+++ b/' + rel];
  const CTX = 3;
  const ranges = [];
  for (let t = 0; t < ops.length; t++) {
    if (ops[t][0] === ' ') continue;
    const lo = Math.max(0, t - CTX);
    const hi = Math.min(ops.length - 1, t + CTX);
    if (ranges.length && lo <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], hi);
    } else {
      ranges.push([lo, hi]);
    }
  }
  for (const [lo, hi] of ranges) {
    let aStart = 0;
    let bStart = 0;
    let aCount = 0;
    let bCount = 0;
    for (let t = lo; t <= hi; t++) {
      const op = ops[t];
      if (aStart === 0 && op[2]) aStart = op[2];
      if (bStart === 0 && op[3]) bStart = op[3];
      if (op[0] !== '+') aCount++;
      if (op[0] !== '-') bCount++;
    }
    out.push('@@ -' + (aStart || 1) + ',' + aCount + ' +' + (bStart || 1) + ',' + bCount + ' @@');
    for (let t = lo; t <= hi; t++) out.push(ops[t][0] + ops[t][1]);
  }
  return out.join('\n');
}

// Regen-and-diff: regenerate in memory, byte-compare with committed files.
// Returns [{rel, missing}|{rel, diff}]; empty array = golden layer clean.
function checkAll() {
  const expected = buildAdapters();
  const failures = [];
  for (const rel of Object.keys(expected)) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) { failures.push({ rel: rel, missing: true }); continue; }
    const actual = fs.readFileSync(full, 'utf8');
    if (actual !== expected[rel]) failures.push({ rel: rel, diff: unifiedDiff(rel, actual, expected[rel]) });
  }
  return failures;
}

function writeAll() {
  const adapters = buildAdapters();
  let count = 0;
  for (const [rel, content] of Object.entries(adapters)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, { encoding: 'utf8' });
    count++;
  }
  return count;
}

function main() {
  if (process.argv.includes('--check')) {
    const failures = checkAll();
    if (failures.length > 0) {
      for (const f of failures) {
        if (f.missing) console.error('MISSING: ' + f.rel);
        else console.error('DRIFT: ' + f.rel + '\n' + f.diff);
      }
      console.error('\nAdapter drift detected. Run: node scripts/build-adapters.js');
      process.exit(1);
    }
    console.log('All ' + Object.keys(buildAdapters()).length + ' adapter files match src/SKILL.md (regen-diff clean)');
    process.exit(0);
  }
  const count = writeAll();
  console.log('Generated ' + count + ' adapter files from src/SKILL.md');
}

if (require.main === module) main();

module.exports = { buildAdapters, unifiedDiff, checkAll, writeAll };
