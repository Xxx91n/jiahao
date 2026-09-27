// grill-t24 clean-tree re-capture (Disclosed Re-Capture channel): run AFTER
// the closeout commits land, so the committed evidence reflects the final
// tree state - not a mid-round state byte-patched to look clean.
// t24 delta: the never-commit classifier is registry-driven
// (docs/governance/never-commit.json - ADR-0083 D-B single source, no
// hand-written regex here) and the artifact carries the ADR-0083 D-A
// captured-at-head provenance header.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t24', 'evidence');
const SELF = '.scratch/grill-t24/evidence/clean-tree.txt';
const HEAD = execFileSync('git', ['log', '-1', '--format=%H', '--invert-grep', '--grep=^GitButler Workspace Commit', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'never-commit.json'), 'utf8'));
const RULES = reg.rules.filter(function (r) { return r.status === 'active'; }).map(function (r) { return new RegExp(r.pattern); });
const st = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
const porcelain = (st.stdout || '').split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
const trackedDiffs = porcelain.filter(function (l) { return l.slice(0, 2) !== '??'; });
const untracked = porcelain.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^"|"$/g, ''); });
const badUntracked = untracked.filter(function (p) { return p !== SELF && !RULES.some(function (re) { return re.test(p); }); });
const clean = trackedDiffs.length === 0 && badUntracked.length === 0;
const ct = ['$ git status --porcelain', '', 'EXIT ' + st.status, '', porcelain.join('\n'),
  '', 'classification (registry docs/governance/never-commit.json, ' + RULES.length + ' active rules):', '  tracked-diff lines: ' + trackedDiffs.length,
  '  untracked lines: ' + untracked.length + ' (never-commit class or self: ' + (untracked.length - badUntracked.length) + '; other: ' + badUntracked.length + ')',
  badUntracked.length ? '  unexpected untracked: ' + badUntracked.join(', ') : '  unexpected untracked: none',
  '', 'verdict: ' + (clean ? 'CLEAN' : 'DIRTY'), ''].join('\n');
fs.writeFileSync(path.join(EVD, 'clean-tree.txt'), 'captured-at-head: ' + HEAD + '\n' + ct, 'utf8');
console.log('[recapture] clean-tree.txt verdict: ' + (clean ? 'CLEAN' : 'DIRTY') + ' (captured-at-head ' + HEAD.slice(0, 7) + ')');
process.exit(clean ? 0 : 1);
