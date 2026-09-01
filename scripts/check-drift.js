#!/usr/bin/env node
// check-drift.js — verify adapter files are in sync with src/SKILL.md
// Run: node scripts/check-drift.js
// Exit 0 = in sync, exit 1 = drift detected (run build-adapters.js)

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');

// ADR-0041 impl (audit L1): no top-level side effects - the body runs inside
// main() so requiring this module never probes or exits.

function main() {
  requireCapabilities('drift'); // ADR-0040 D2: needs a git worktree

  const root = path.join(__dirname, '..');
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  // Check if SKILL.md has profile tags
  const body = skill.replace(/^---[\s\S]*?---\n/, '');
  const hasProfiles = body.includes('## Generator Profile') && body.includes('## Verifier Profile');

  // Core fragments:in verifier profile adapters
  const verifierFragments = [
    'anti-false-completion iron laws',
    'verification ladder',
    'The judge cannot be the author',
    'NOT VERIFIED',
  ];

  // Generator profile must NOT contain these
  const generatorForbidden = [
    'verification ladder',
    'second-party verifier',
    'The judge cannot be the author',
    'hash chain',
    'confidence calibration',
    'independent LLM critic',
  ];

  // Generator profile must contain these
  const generatorRequired = [
    'No evidence, no completion claim',
    'state changes',
    'calling a tool',
  ];

  // Adapter files to check
  const checks = [
    'adapters/cursor/jiahao.mdc',
    'adapters/cursor/jiahao-generator.mdc',
    'adapters/windsurf/jiahao.md',
    'adapters/windsurf/jiahao-generator.md',
    'adapters/cline/jiahao.md',
    'adapters/cline/jiahao-generator.md',
    'adapters/instruction-tier/AGENTS.md',
    'adapters/instruction-tier/AGENTS-generator.md',
    'adapters/claude-code/README.md',
    'adapters/codex/hooks.json',
    'adapters/mcp/README.md',
    // ADR-0028 D5: four research-gated hosts
    'adapters/copilot/hooks.json',
    'adapters/copilot/README.md',
    'adapters/qoder/settings.json',
    'adapters/qoder/README.md',
    'adapters/opencode/jiahao-verifier.md',
    'adapters/opencode/jiahao-generator.md',
    'adapters/opencode/opencode.json',
    'adapters/opencode/README.md',
    'adapters/aider/CONVENTIONS.md',
    'adapters/aider/CONVENTIONS-generator.md',
    'adapters/aider/.aider.conf.yml',
    'adapters/aider/README.md',
  ];

  let drift = false;
  for (const rel of checks) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error('MISSING: ' + rel);
      drift = true;
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    const isInstructionTier = (rel.startsWith('adapters/cursor/') ||
      rel.startsWith('adapters/windsurf/') ||
      rel.startsWith('adapters/cline/') ||
      rel.startsWith('adapters/instruction-tier/') ||
      rel.startsWith('adapters/opencode/') ||
      rel.startsWith('adapters/aider/')) &&
      !rel.endsWith('README.md') && !rel.endsWith('.json') && !rel.endsWith('.yml');
    if (isInstructionTier) {
      const isGenerator = rel.includes('-generator');
      if (isGenerator) {
        for (const term of generatorForbidden) {
          if (content.includes(term)) {
            console.error('PROFILE DRIFT: ' + rel + ' (generator) must NOT contain: ' + term);
            drift = true;
          }
        }
        for (const term of generatorRequired) {
          if (!content.includes(term)) {
            console.error('PROFILE DRIFT: ' + rel + ' (generator) must contain: ' + term);
            drift = true;
          }
        }
      } else {
        for (const frag of verifierFragments) {
          if (!content.includes(frag)) {
            console.error('DRIFT: ' + rel + ' (verifier) missing fragment: ' + frag);
            drift = true;
          }
        }
      }
    }
  }

  if (drift) {
    console.error('\nDrift detected. Run: node scripts/build-adapters.js');
    process.exit(1);
  } else {
    console.log('All adapter files in sync with src/SKILL.md');
    process.exit(0);
  }
}

if (require.main === module) main();
