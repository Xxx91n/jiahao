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
