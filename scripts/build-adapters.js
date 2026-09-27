#!/usr/bin/env node
// build-adapters.js — generate per-host adapter files from src/SKILL.md
// Mirrors ponytail's single-source + per-host adapter pattern.
// Run: node scripts/build-adapters.js
// Supports dual-profile (ADR-0010 Option C): SKILL.md has tagged sections
// ## Generator Profile / ## Verifier Profile / ## Boundaries (shared).

const fs = require('fs');
const path = require('path');
const { splitByProfile, validateGsrHeaders } = require('../hooks/jiahao-profile');
const { requireCapabilities } = require('../src/shared/capability');

const root = path.join(__dirname, '..');

// ADR-0028 D2: the adapter map is a pure function of src/SKILL.md so the
// --check golden layer regenerates it in memory and byte-compares against
// the committed files (regen-and-diff; no lock file, no snapshots).
function buildAdapters() {
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  const profiles = splitByProfile(skill);

  // ADR-0032 D2: gsr rule headers are the structural latch for the generator
  // profile; fail the build (and the --check golden layer) on malformed rules.
  const gsrErrors = validateGsrHeaders(profiles.generator);
  if (gsrErrors.length > 0) {
    throw new Error('gsr header validation failed:' + String.fromCharCode(10) + gsrErrors.map(e => '  - ' + e).join(String.fromCharCode(10)));
  }

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

  // ---- CodeBuddy (ADR-0087): first Claude-Code-compatible path host ----
  // The bundle is SELF-CONTAINED: CodeBuddy recognizes `.claude-plugin/` +
  // `${CLAUDE_PLUGIN_ROOT}` verbatim (official compat chapter; the name is
  // kept unchanged to maximize single-source distribution). Hook scripts +
  // their static require() closure + src/SKILL.md + jiahao-mcp are vendored
  // byte-verbatim so the plugin dir loads standalone. Regen-diff keeps the
  // vendored copies honest - drift fails --check.
  const CB = 'adapters/codebuddy/';
  const CB_SEEDS = [
    'hooks/jiahao-activate.js', 'hooks/jiahao-mode-tracker.js',
    'hooks/jiahao-subagent.js', 'hooks/jiahao-sweep.js',
    'hooks/jiahao-verdict-gate.js', 'hooks/jiahao-runtime.js',
    'hooks/jiahao-profile.js', 'hooks/jiahao-instructions-assert.js',
    'hooks/jiahao-pretool-guard.js', 'jiahao-mcp/index.js',
  ];
  {
    const seen = new Set();
    const queue = CB_SEEDS.slice();
    const REQ = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const resolveReq = (spec, fromRel) => {
      if (!spec.startsWith('.')) return null;
      const base = path.join(root, path.dirname(fromRel), spec);
      for (const c of [base, base + '.js', base + '.json', path.join(base, 'index.js')]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          return path.relative(root, c).split(path.sep).join('/');
        }
      }
      return null;
    };
    while (queue.length) {
      const rel = queue.shift();
      if (seen.has(rel)) continue;
      seen.add(rel);
      const abs = path.join(root, rel.split('/').join(path.sep));
      const text = fs.readFileSync(abs, 'utf8');
      adapters[CB + rel] = text;
      if (!/\.js$/.test(rel)) continue;
      REQ.lastIndex = 0;
      let m;
      while ((m = REQ.exec(text))) {
        const r = resolveReq(m[1], rel);
        if (r && !seen.has(r)) queue.push(r);
      }
    }
    // Runtime data files outside the require() graph.
    adapters[CB + 'src/SKILL.md'] = skill;
    adapters[CB + 'jiahao-mcp/package.json'] =
      fs.readFileSync(path.join(root, 'jiahao-mcp', 'package.json'), 'utf8');
  }

  adapters[CB + '.claude-plugin/plugin.json'] = JSON.stringify({
    name: 'jiahao',
    version: '0.0.1',
    description: 'Dual-profile verification discipline (generator advisory + verifier iron laws) - Claude-Code-compatible plugin surface for CodeBuddy.',
    hooks: 'hooks/hooks.json',
    mcpServers: '.mcp.json',
    defaultEnabled: false, // conservative: opt-in enable; hooks execute on enable and bypass the untrusted-frontmatter gate
    license: 'MIT',
    repository: 'https://github.com/CognitionAI/jiahao',
  }, null, 2) + '\n';

  // Full event map: the migrated five-event set plus the InstructionsLoaded
  // integrity assertion and the PreToolUse enforcement-surface deny wiring.
  // Every assertion/enforcement line lives here (plugin hooks.json is exempt
  // from the allowUntrustedFrontmatterHooks gate and effective on enable) -
  // never in skill/agent frontmatter (silently skipped by default).
  // Commands are Git-Bash-compatible `node` invocations; matchers are
  // case-sensitive; the 60s default timeout budget is never exceeded.
  adapters[CB + 'hooks/hooks.json'] = JSON.stringify({
    description: 'jiahao verifier discipline - CodeBuddy plugin hook map',
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-activate.js"', timeout: 5 }] }],
      SubagentStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-subagent.js"', timeout: 5 }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-mode-tracker.js"', timeout: 5 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js"', timeout: 10 }] }],
      SessionEnd: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-sweep.js"', timeout: 3 }] }],
      InstructionsLoaded: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-instructions-assert.js"', timeout: 5 }] }],
      PreToolUse: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-pretool-guard.js"', timeout: 5 }] }],
    },
  }, null, 2) + '\n';

  // .mcp.json bundles the existing jiahao-mcp stdio server - vendored
  // verbatim under jiahao-mcp/ inside the bundle; deps install per README.
  adapters[CB + '.mcp.json'] = JSON.stringify({
    mcpServers: {
      'jiahao-mcp': {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js'],
        cwd: '${CLAUDE_PLUGIN_ROOT}/jiahao-mcp',
      },
    },
  }, null, 2) + '\n';

  // rules/ dual profile - installed as .codebuddy/rules/*.md (or auto-loaded
  // on the plugin rules path). alwaysApply: true pins both profiles on;
  // non-alwaysApply load priority is a declared-unverified item (README).
  const ruleFm = (desc) => '---\ndescription: ' + desc + '\nalwaysApply: true\n---\n';
  adapters[CB + 'rules/jiahao-verifier.md'] = ruleFm('Jiahao verifier discipline (blocking)') + profiles.verifier;
  adapters[CB + 'rules/jiahao-generator.md'] = ruleFm('Jiahao generator discipline (surface signals)') + profiles.generator;

  adapters[CB + 'README.md'] = codebuddyReadme();

  return adapters;
}

// CodeBuddy install manual + injection-surface ruling (ADR-0087 D-C, spec
// section 5): the Verified / Declared-unverified tiering tables live here
// (disclosure surface - ADR-0074 D-F push discipline applies). Regenerated
// from this single source; edit the string, never the emitted file.
function codebuddyReadme() {
  return `# CodeBuddy Adapter (first Claude-Code-compatible path host, ADR-0087)

This directory is a **self-contained plugin bundle**: CodeBuddy recognizes
\`.claude-plugin/\` and \`\${CLAUDE_PLUGIN_ROOT}\` verbatim (official
Claude-Code compatibility chapter; \`\${CODEBUDDY_PLUGIN_ROOT}\` takes
precedence when set). Copy the whole directory as the plugin root - the hook
scripts, their require() closure, \`src/SKILL.md\`, and the \`jiahao-mcp\`
server are vendored inside, so nothing resolves outside the bundle.

## Install (plugin path)

1. Copy this directory to the CodeBuddy plugin location, e.g.
   \`codebuddy plugin install <path-to-this-dir>\` (CLI) or the IDE plugin
   manager.
2. Enable the plugin explicitly - \`defaultEnabled: false\` is deliberate:
   plugin hooks bypass the \`allowUntrustedFrontmatterHooks\` gate and
   execute the moment the plugin is enabled.
3. Activate the jiahao profile flag, same as every host:
   \`echo full > "$CLAUDE_CONFIG_DIR/.jiahao-active"\` (or \`$HOME/\` when the
   env var is unset) and \`echo verifier > .jiahao-profile\` for the
   blocking profile (\`generator\` for advisory-only).
4. MCP server: run \`npm install --omit=dev\` inside the bundle's
   \`jiahao-mcp/\` once (the server source is vendored; dependencies are
   not). The bundle's \`.mcp.json\` registers it via
   \`\${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js\`.

Settings-tier alternative (CLI): merge the hook map into
\`.codebuddy/settings.json\` and copy the rules into \`.codebuddy/rules/\`.
The settings path is the one live-verified end to end (see tiering below).

## Hook behavior disclosure (read before enabling)

Plugin \`hooks/hooks.json\` entries are **exempt from the
\`allowUntrustedFrontmatterHooks\` gate** - unlike skill/agent frontmatter
(which is silently skipped unless trusted), plugin hooks execute as soon as
the plugin is enabled. Nothing load-bearing lives in frontmatter here by
design. Enabling this bundle installs seven hook points:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 + {decision:"block"} |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| InstructionsLoaded | hooks/jiahao-instructions-assert.js | integrity assertion: records both rules files' presence + sha256 to the telemetry log |
| PreToolUse | hooks/jiahao-pretool-guard.js | enforcement-surface guard: emits permissionDecision:"deny" (verifier profile) when a tool call targets injected rules / hook map / manifest / jiahao state-evidence files; every hit is a bypass-attempt record |

Timeouts stay within the 60s host budget (5/5/5/10/3/5/5s). Commands are
Git-Bash-compatible \`node\` invocations (cmd/PowerShell unsupported by the
host). Event matchers are case-sensitive - none are narrowed here.

## Injection-surface ruling - Verified vs Declared-unverified

### Verified (CodeBuddy Code CLI 2.151.0, live-probed)

| Point | Evidence |
| --- | --- |
| \`.codebuddy/settings.json\` hooks: SessionStart / PreToolUse / PostToolUse | hook_event_name + hookSpecificOutput envelope live-verified |
| PreToolUse \`permissionDecision: "deny"\` envelope | verified deny shape on CLI |
| MCP server registration via \`.mcp.json\` | stdio connect + tool list verified |

### Declared-unverified (documented, not live-probed - pending-confirmation)

| Point | Status |
| --- | --- |
| IDE-side hook parity, incl. \`InstructionsLoaded\` firing | pending-confirmation |
| \`rules/\` non-\`alwaysApply\` load priority (both forms) | pending-confirmation |
| \`npx\`-bundled install vs \`codebuddy plugin install\` coexistence | pending-confirmation |
| Plugin-bundle path parity on CLI (documented compat, unprobed live) | pending-confirmation |

Unverified means **registered, not assumed**: each row has a
pending-confirmation entry in the taxonomy exception channel (ADR-0086
schema) with an expiry and an owner ratify/revoke point. Windows note: the
upstream \`\${CLAUDE_PLUGIN_ROOT}\` hook expansion bug
(anthropics/claude-code issues) may carry over - the settings-tier path is
the verified fallback.

## Trial boundary

The adapter is admitted; the external effectiveness trial (install +
Phase 0/1/2 in a real CodeBuddy environment) is an **owner action**, never
agent-executed. Protocol: \`.scratch/grill-t30/protocol.md\`; judgment lines:
\`bench/codebuddy-trial/judgment-lines.json\` (preregistered, immutable -
deviations ride errata records).
`;
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
    requireCapabilities('adapters-golden'); // ADR-0040 D2
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
