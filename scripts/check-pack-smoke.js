#!/usr/bin/env node
'use strict';

// scripts/check-pack-smoke.js -- ADR-0059 D-B pack->install->smoke integrity
// check (the check that ADR-0059 D-B specifies; ADR-0059 deferred its
// gates.json registration to the implementation round, which registers it).
//
// It packs the tarball, extracts it into .scratch/pack-smoke/, and runs the
// PACKAGED CLI (not the repo copy) from the extracted tree. Exit 0 means the
// tarball's runtime surface actually runs; exit 1 means the packed surface is
// broken (the failure mode the external critique found: a tier that ships but
// dies at first require).
//
// Run: node scripts/check-pack-smoke.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const WORK = path.join(ROOT, '.scratch', 'pack-smoke');
const EXTRACT = path.join(WORK, 'extract');

function fail(msg) {
  console.error('[pack-smoke] FAIL: ' + msg);
  fs.rmSync(WORK, { recursive: true, force: true }); // never leave a partial tree
  process.exit(1);
}

function main() {
  requireCapabilities('pack-smoke');
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(EXTRACT, { recursive: true });

  const raw = execFileSync('npm', ['pack', '--pack-destination', WORK, '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  const info = JSON.parse(raw.trim())[0];
  const tgz = path.join(WORK, info.filename);
  if (!fs.existsSync(tgz)) fail('tarball not written: ' + tgz);

  // bsdtar (Windows) parses a drive-letter colon as a remote host:path, so run
  // from WORK with relative names (no 'D:' in the arguments).
  execFileSync('tar', ['-xzf', info.filename, '-C', 'extract'], { cwd: WORK, stdio: 'pipe' });
  const pkgDir = path.join(EXTRACT, 'package');
  if (!fs.existsSync(path.join(pkgDir, 'package.json'))) fail('extracted tree has no package.json');

  // The extracted runtime surface must exclude the source-only / dev surfaces.
  for (const gone of ['jiahao-mcp', 'test', 'docs/adr']) {
    if (fs.existsSync(path.join(pkgDir, gone))) fail('packed surface unexpectedly contains ' + gone);
  }
  for (const present of ['src/SKILL.md', 'scripts/install.js', 'docs/gates.json', 'CONTEXT.md']) {
    if (!fs.existsSync(path.join(pkgDir, present))) fail('packed surface is missing ' + present);
  }

  // Run the PACKAGED CLI. cwd stays at the repo so Node resolves the dev
  // node_modules (the check is about the packed tree's contents, not about
  // npm install network behaviour).
  const cli = path.join(pkgDir, 'scripts', 'install.js');
  const r = execFileSync(process.execPath, [cli, '--dry-run', '-y'], { cwd: ROOT, encoding: 'utf8' });
  if (!/would write "(generator|verifier)"/.test(r)) fail('packaged CLI dry-run produced no expected plan: ' + JSON.stringify(r));

  console.log('[pack-smoke] OK: ' + info.filename + ' (' + info.size + ' bytes, ' + info.entryCount + ' files) extracted and its CLI runs');
  console.log('[pack-smoke] packaged surface excludes jiahao-mcp/ + test/ + docs/adr; includes src/SKILL.md + scripts/install.js + docs/gates.json + CONTEXT.md');
  fs.rmSync(WORK, { recursive: true, force: true }); // no leftovers for the next jest collection
}

try { main(); }
catch (e) { fail(e && e.message ? e.message : String(e)); }
