#!/usr/bin/env node
// build-adapters.js — generate per-host adapter files from src/SKILL.md
// Mirrors ponytail's single-source + per-host adapter pattern.
// Run: node scripts/build-adapters.js
// Supports dual-profile (ADR-0010 Option C): SKILL.md has tagged sections
// ## Generator Profile / ## Verifier Profile / ## Boundaries (shared).

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillPath = path.join(root, 'src', 'SKILL.md');
const skill = fs.readFileSync(skillPath, 'utf8');

// Strip frontmatter for instruction-tier adapters
function stripFrontmatter(md) {
  return md.replace(/^---[\s\S]*?---\n/, '');
}

// Split SKILL.md body by profile tags (ADR-0010 Option C)
// Returns { generator, verifier } — each = preamble + its section + boundaries
function splitByProfile(md) {
  const body = stripFrontmatter(md);
  const genIdx = body.indexOf('## Generator Profile');
  const verIdx = body.indexOf('## Verifier Profile');
  const bndIdx = body.indexOf('## Boundaries');

  if (genIdx === -1 || verIdx === -1 || bndIdx === -1) {
    // No profile tags — return full body for both profiles (single-profile mode)
    return { generator: body, verifier: body };
  }

  const preamble = body.substring(0, genIdx).trim();
  const genSection = body.substring(genIdx, verIdx).trim();
  const verSection = body.substring(verIdx, bndIdx).trim();
  const boundaries = body.substring(bndIdx).trim();

  return {
    generator: preamble + '\n\n' + genSection + '\n\n' + boundaries,
    verifier: preamble + '\n\n' + verSection + '\n\n' + boundaries,
  };
}

const body = stripFrontmatter(skill);
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

let count = 0;
for (const [rel, content] of Object.entries(adapters)) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, { encoding: 'utf8' });
  count++;
}

console.log('Generated ' + count + ' adapter files from src/SKILL.md');
