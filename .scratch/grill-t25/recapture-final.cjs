// grill-t25 staged re-capture v2: legs RUN first (results buffered in
// memory), files WRITE at the end. A mid-run file write introduces an
// uncovered citation token (its own captured-at-head) that poisons every
// later --check/jest leg; deferring writes keeps every leg's capture-time
// state clean. Same captured-at-head honesty: headers name the durable tip
// the commands ran against.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const HEAD = execFileSync('git', ['log', '-1', '--format=%H', '--invert-grep', '--grep=^GitButler Workspace Commit', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const JEST = require.resolve('jest/bin/jest');
function run(args) { const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' }); return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }; }
const pending = [];
function leg(evd, name, shown, res) { pending.push({ evd: evd, name: name, shown: shown, res: res }); console.log('[' + res.status + '] ran ' + evd + '/' + name); }
for (const d of ['grill-t24', 'grill-t25']) {
  leg(d, 'gate-all.txt', 'node scripts/run-gates.js', run(['scripts/run-gates.js']));
  leg(d, 'rewrite-map.txt', 'node scripts/build-rewrite-map.js --check', run(['scripts/build-rewrite-map.js', '--check']));
  leg(d, 'round-facts.txt', 'node scripts/build-round-facts.js --round ' + d + ' --check --report .scratch/' + d + '/reports/' + (d === 'grill-t24' ? '2026-09-23' : '2026-09-24') + '-report.md',
    run(['scripts/build-round-facts.js', '--round', d, '--check', '--report', '.scratch/' + d + '/reports/' + (d === 'grill-t24' ? '2026-09-23' : '2026-09-24') + '-report.md']));
  // the recapture asserts the CURRENT gate contract (79 suites, ADR-0083 D-D) -
  // the t24 evidence file records the verbatim argv of the re-run, not the era pin.
  leg(d, 'run-test-gate.txt', 'node scripts/run-test-gate.js --expected-suites 79',
    run(['scripts/run-test-gate.js', '--expected-suites', '79']));
}
leg('grill-t24', 'adr-0083-wiring.txt', 'node ' + JEST + ' test/adr-0083-wiring.test.js', run([JEST, 'test/adr-0083-wiring.test.js']));
leg('grill-t25', 'rewrite-map-published.txt', 'node scripts/build-rewrite-map.js --published-only', run(['scripts/build-rewrite-map.js', '--published-only']));
leg('grill-t25', 'never-commit-sweep.txt', 'node <registry-driven untracked-path sweep>', (function () {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'never-commit.json'), 'utf8'));
  const active = reg.rules.filter(function (r) { return r.status === 'active'; });
  const g = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const lines = g.stdout.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
  const untracked = lines.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^"|"$/g, ''); });
  const SELF = '.scratch/grill-t25/evidence/never-commit-sweep.txt';
  const body = [];
  body.push('registry: docs/governance/never-commit.json (' + reg.rules.length + ' rules: ' + active.length + ' active)');
  let bad = 0;
  for (const p of untracked) {
    const hit = active.filter(function (r) { return new RegExp(r.pattern).test(p); }).map(function (r) { return r.id; });
    if (p === SELF) body.push('  SELF    ' + p);
    else if (hit.length) body.push('  ' + hit.join('+') + '  ' + p);
    else { bad++; body.push('  UNCOVERED ' + p); }
  }
  body.push('verdict: ' + (bad === 0 ? 'ALL COVERED' : bad + ' UNCOVERED PATHS'));
  return { status: bad ? 1 : 0, out: body.join('\n') + '\n' };
})());
for (const p of pending) {
  fs.writeFileSync(path.join(ROOT, '.scratch', p.evd, 'evidence', p.name), 'captured-at-head: ' + HEAD + '\n$ ' + p.shown + '\n\nEXIT ' + p.res.status + '\n\n' + p.res.out, 'utf8');
}
console.log('staged recapture complete at ' + HEAD.slice(0, 7) + ' - ' + pending.length + ' legs written');
