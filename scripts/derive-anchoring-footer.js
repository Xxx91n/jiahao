#!/usr/bin/env node
// derive-anchoring-footer.js - grill-t29 D-006 repair (audit A-4c): the
// [ANCHORING] footer is *derived*, never hand-typed. This tool is the
// derivation surface the convention names - two modes:
//
//   node scripts/derive-anchoring-footer.js --ids <id> [<id> ...]
//       resolve `but status -fv` uncommitted/committed-file ids to paths and
//       print the footer line to paste into `but commit -m`. Use BEFORE
//       committing - the footer you type must be this output.
//
//   node scripts/derive-anchoring-footer.js --commit <sha>
//       derive the footer from the landed commit (`git show --name-only`) -
//       the checker's own replay form; a mismatch means the commit lied.
//
// Exit 0 prints exactly one line: `[ANCHORING] <space-separated sorted paths>`.
// No git write operations.
//
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();

function fromCommit(sha) {
  return git(['show', '--name-only', '--format=', sha]).split('\n').map((s) => s.trim()).filter(Boolean).sort();
}

function fromIds(ids) {
  // `but status -fv` prints one `id   <status> <path>` row per change; the id
  // column is the first whitespace-separated token on lines that carry one.
  const out = execFileSync('but', ['status', '-fv'], { cwd: ROOT, encoding: 'utf8', shell: true });
  const rows = new Map();
  for (const line of out.split(/\r?\n/)) {
    // Uncommitted rows carry a bare id after the box-drawing margin; committed
    // file rows carry a compound <commit>:<file> id (e.g. qosm:zw) - anchoring
    // at ^ with a box-only prefix rejects those (id-colon collision, A-4c
    // found in the tool's own first use).
    const m = line.match(/^[│┊┃\s]*([A-Za-z0-9]+)\s+(A|M|D)\s+(\S+)\s*$/);
    if (m) rows.set(m[1], m[3]);
  }
  const missing = ids.filter((id) => !rows.has(id));
  if (missing.length) {
    console.error('[derive-anchoring-footer] unknown but change id(s): ' + missing.join(' ') + ' - run `but status -fv` and copy exact ids');
    process.exit(2);
  }
  return ids.map((id) => rows.get(id)).sort();
}

function main() {
  requireCapabilities('anchoring-footer');
  const argv = process.argv.slice(2);
  let files = null;
  if (argv[0] === '--commit' && argv[1]) files = fromCommit(argv[1]);
  else if (argv[0] === '--ids' && argv.length > 1) files = fromIds(argv.slice(1));
  else {
    console.error('usage: derive-anchoring-footer.js --ids <id> [<id>...] | --commit <sha>');
    process.exit(2);
  }
  if (!files.length) {
    console.error('[derive-anchoring-footer] empty file set - empty commits carry no footer');
    process.exit(2);
  }
  console.log('[ANCHORING] ' + files.join(' '));
  process.exit(0);
}

if (require.main === module) main();
module.exports = { fromCommit, fromIds };
