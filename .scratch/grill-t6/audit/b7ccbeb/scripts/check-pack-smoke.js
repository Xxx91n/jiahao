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
// ADR-0061 D-F: the gate also asserts the ADR-0039 D3 measured-anchor size
// budget, so gate:all - not only the adr-0038-wiring jest test - fails on a
// cap breach. The cap is parsed from ADR-0039 (one home for the number).
//
// Run: node scripts/check-pack-smoke.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const WORK = path.join(ROOT, '.scratch', 'pack-smoke');
const EXTRACT = path.join(WORK, 'extract');

// The pack-surface contract: ONE definition, measured twice — this gate against
// the EXTRACTED tree, and test/adr-0038-wiring.test.js against npm pack’s
// dry-run listing. Exported so the wiring test consumes the same contract
// instead of maintaining a second copy (drift is what the duplication caused).
const PACK_SURFACE_ABSENT = ['jiahao-mcp', 'test', 'docs/adr'];
const PACK_SURFACE_PRESENT = ['src/SKILL.md', 'scripts/install.js', 'docs/gates.json', 'CONTEXT.md'];

// ADR-0039 D3 measured-anchor budget (ADR-0061 D-F). Parsed from ADR-0039 so
// the number has exactly one home (F3: no magic number duplicated in a test);
// exported so the wiring test consumes this helper instead of keeping a
// second regex - duplication is what drifted before (see the surface contract).
function packCapBytes() {
  const adrPath = path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md');
  const adr = fs.readFileSync(adrPath, 'utf8');
  const m = adr.match(/out[.]size < ([0-9,]+) bytes/);
  if (!m) throw new Error('ADR-0039 D3 cap anchor (out.size < N bytes) not found');
  return Number(m[1].split(',').join(''));
}

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
  for (const gone of PACK_SURFACE_ABSENT) {
    if (fs.existsSync(path.join(pkgDir, gone))) fail('packed surface unexpectedly contains ' + gone);
  }
  for (const present of PACK_SURFACE_PRESENT) {
    if (!fs.existsSync(path.join(pkgDir, present))) fail('packed surface is missing ' + present);
  }

  // Run the PACKAGED CLI. cwd stays at the repo so Node resolves the dev
  // node_modules (the check is about the packed tree's contents, not about
  // npm install network behaviour).
  const cli = path.join(pkgDir, 'scripts', 'install.js');
  const r = execFileSync(process.execPath, [cli, '--dry-run', '-y'], { cwd: ROOT, encoding: 'utf8' });
  if (!/would write "(generator|verifier)"/.test(r)) fail('packaged CLI dry-run produced no expected plan: ' + JSON.stringify(r));

  console.log('[pack-smoke] smoke OK: ' + info.filename + ' (' + info.size + ' bytes, ' + info.entryCount + ' files) extracted and its CLI dry-run plan matched');
  console.log('[pack-smoke] packaged surface excludes jiahao-mcp/ + test/ + docs/adr; includes src/SKILL.md + scripts/install.js + docs/gates.json + CONTEXT.md');

  // ADR-0061 D-F / ADR-0039 D3: the cap was guarded only by jest before this
  // change; gate:all must fail on a breach too. Asserted after the smoke so a
  // budget breach never hides a broken packed surface. Honest red until the
  // T-2 gate-amendment ADR lands the new trend-derived cap.
  const cap = packCapBytes();
  if (!(info.size < cap)) fail('tarball ' + info.size + ' bytes is not under the ADR-0039 D3 cap of ' + cap + ' bytes');
  console.log('[pack-smoke] OK: budget ' + info.size + ' < ' + cap + ' bytes (ADR-0039 D3)');
  fs.rmSync(WORK, { recursive: true, force: true }); // no leftovers for the next jest collection
}

if (require.main === module) {
  // CLI path only: importing this module (the wiring test does) must not pack.
  try { main(); }
  catch (e) { fail(e && e.message ? e.message : String(e)); }
}

module.exports = { PACK_SURFACE_ABSENT, PACK_SURFACE_PRESENT, packCapBytes };
