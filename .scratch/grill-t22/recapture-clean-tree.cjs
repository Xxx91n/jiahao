// grill-t22 clean-tree re-capture (Disclosed Re-Capture channel): run AFTER
// the closeout commits land, so the committed evidence reflects the final
// tree state - not a mid-round state byte-patched to look clean. Regex
// widened: audit2-evidence/ joins audit-evidence/ in the never-commit class.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t22', 'evidence');
const SELF = '.scratch/grill-t22/evidence/clean-tree.txt';
const NEVER_COMMIT = /^\.scratch\/[^/]+\/audit\d*-evidence\/|\.patch$|round-commits\.txt$/;
const st = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
const porcelain = (st.stdout || '').split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
const trackedDiffs = porcelain.filter(function (l) { return l.slice(0, 2) !== '??'; });
const untracked = porcelain.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^"|"$/g, ''); });
const badUntracked = untracked.filter(function (p) { return p !== SELF && !NEVER_COMMIT.test(p); });
const clean = trackedDiffs.length === 0 && badUntracked.length === 0;
const ct = ['$ git status --porcelain', '', 'EXIT ' + st.status, '', porcelain.join('\n'),
  '', 'classification:', '  tracked-diff lines: ' + trackedDiffs.length,
  '  untracked lines: ' + untracked.length + ' (never-commit class or self: ' + (untracked.length - badUntracked.length) + '; other: ' + badUntracked.length + ')',
  badUntracked.length ? '  unexpected untracked: ' + badUntracked.join(', ') : '  unexpected untracked: none',
  '', 'verdict: ' + (clean ? 'CLEAN' : 'DIRTY'), ''].join('\n');
fs.writeFileSync(path.join(EVD, 'clean-tree.txt'), ct, 'utf8');
console.log('[recapture] clean-tree.txt verdict: ' + (clean ? 'CLEAN' : 'DIRTY'));
process.exit(clean ? 0 : 1);
