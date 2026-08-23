#!/usr/bin/env node
// scripts/install.js — Tier 1 installer (ADR-0011 §2)
// Writes ONLY .jiahao-profile. Does not copy SKILL.md/adapters
// (build-adapters.js is the sole distributor — silent-drift guardrail).

const fs = require('fs');
const { profilePath, configDir } = require('../hooks/jiahao-paths');
const pkg = require('../package.json');

const REMINDER = [
  '',
  'Verifier Deployment Discipline:',
  '  - Run the verifier in a SEPARATE context/CWD from the generator.',
  '  - Prefer a DIFFERENT model family for verifier independence.',
  '  - See README section "Verifier deployment discipline".',
].join('\n');

function resolveProfile(arg) {
  if (!arg) return null;
  const v = arg.trim().toLowerCase();
  if (v === 'generator' || v === 'verifier') return v;
  console.error('Invalid profile:', arg + '. Must be generator or verifier.');
  process.exit(2);
}

function usage() {
  return [
    pkg.name + ' v' + pkg.version + ' — install .jiahao-profile flag',
    '',
    'Usage: jiahao init [--profile generator|verifier] [-y] [--dry-run]',
    '',
    'Writes ONLY ' + profilePath(),
    'Tier 0 manual: echo "verifier" > ' + profilePath(),
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return;
  }

  // commander convention (atomcode-cli-ux): unknown bare subcommand -> exit 1.
  const sub = args.find(a => !a.startsWith('-'));
  if (sub && sub !== 'init') {
    console.error("error: unknown command '" + sub + "'");
    console.error(usage());
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const yes = args.includes('-y') || args.includes('--yes');
  const pIdx = args.findIndex(a => a === '--profile' || a === '-p');
  let profile = null;
  if (pIdx !== -1) {
    const v = args[pIdx + 1];
    if (v === undefined || v.startsWith('-')) {
      // commander/cac convention: required-value flag without value -> exit 1.
      console.error("error: option '--profile <value>' argument missing");
      process.exit(1);
    }
    profile = resolveProfile(v);
  }

  if (!profile) {
    if (yes) {
      profile = 'verifier';
    } else if (!!process.env.CI || !process.stdin.isTTY) {
      // nuxt PR #1264 pattern: auto-detect CI / piped stdin, print the
      // equivalent explicit command, exit non-zero.
      console.error('Non-interactive shell detected. Re-run with:');
      console.error('  jiahao init --profile verifier');
      process.exit(1);
    } else {
      const prompts = require('prompts');
      const res = await prompts({
        type: 'select',
        name: 'profile',
        message: 'Which jiahao profile for this agent?',
        choices: [
          { title: 'verifier (default)', value: 'verifier', description: 'second-party audit agent — 7 iron laws, blocking' },
          { title: 'generator', value: 'generator', description: 'primary agent — 3 surface-signal rules, advisory' },
        ],
        initial: 0,
      });
      if (!res.profile) { console.log('Aborted.'); return; }
      profile = res.profile;
    }
  }

  const target = profilePath();
  if (dryRun) {
    console.log('[dry-run] would write "' + profile + '" to ' + target);
    return;
  }
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(target, profile + '\n', 'utf8');
  console.log('Wrote "' + profile + '" to ' + target);
  console.log(REMINDER);
}

main().catch(e => { console.error(e.message); process.exit(1); });
