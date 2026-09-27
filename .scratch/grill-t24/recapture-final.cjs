// grill-t24 targeted re-capture (Disclosed Re-Capture channel, t23 lineage):
// legs whose committed bytes legitimately depend on committed state are
// re-captured after the relevant commit lands - never byte-patched.
//   jest-wave : run-test-gate + adr-0083-wiring + round-facts (collect leg)
//               + never-commit-sweep + h1-reread - these read the committed
//               tree / the on-disk evidence floor, so their green form only
//               exists once the evidence commit is in.
//   post-map  : gate-all + rewrite-map --check - green only once the map has
//               regenerated over the committed evidence surface.
// clean-tree stays in recapture-clean-tree.cjs (self-exempt single commit).
// Every artifact carries the captured-at-head provenance header (ADR-0083 D-A).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t24', 'evidence');
const REPORT = '.scratch/grill-t24/reports/2026-09-23-report.md';
const HEAD = execFileSync('git', ['log', '-1', '--format=%H', '--invert-grep', '--grep=^GitButler Workspace Commit', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', shell: false }, opts || {}));
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
}
function cap(name, shown, res) {
  fs.writeFileSync(path.join(EVD, name), 'captured-at-head: ' + HEAD + '\n$ ' + shown + '\n\nEXIT ' + res.status + '\n\n' + res.out, 'utf8');
  console.log('[' + res.status + '] ' + name + ' <- ' + shown);
}
function capText(name, shown, exitCode, body) {
  fs.writeFileSync(path.join(EVD, name), 'captured-at-head: ' + HEAD + '\n$ ' + shown + '\n\nEXIT ' + exitCode + '\n\n' + body, 'utf8');
  console.log('[' + exitCode + '] ' + name + ' <- ' + shown);
}
function shownNode(args) { return 'node ' + args.join(' '); }
function node(script, args) { return run(process.execPath, [script].concat(args || [])); }
const JEST = require.resolve('jest/bin/jest');
function jest(args) { return node(JEST, args); }

const wave = process.argv[2];

if (wave === 'jest-wave') {
  cap('run-test-gate.txt', shownNode(['scripts/run-test-gate.js', '--expected-suites', '79']), node('scripts/run-test-gate.js', ['--expected-suites', '79']));
  cap('adr-0083-wiring.txt', shownNode([JEST, 'test/adr-0083-wiring.test.js']), jest(['test/adr-0083-wiring.test.js']));
  cap('round-facts.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t24', '--check', '--report', REPORT]), node('scripts/build-round-facts.js', ['--round', 'grill-t24', '--check', '--report', REPORT]));
  cap('never-commit-sweep.txt', shownNode(['<registry-driven untracked-path sweep>']), (function () {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'never-commit.json'), 'utf8'));
    const active = reg.rules.filter(function (r) { return r.status === 'active'; });
    const deprecated = reg.rules.filter(function (r) { return r.status === 'deprecated'; });
    const st = run('git', ['status', '--porcelain']);
    const lines = st.out.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
    const untracked = lines.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^"|"$/g, ''); });
    const SELF = '.scratch/grill-t24/evidence/never-commit-sweep.txt';
    const body = [];
    body.push('registry: docs/governance/never-commit.json (schema_version ' + reg.schema_version + ', ' + reg.rules.length + ' rules: ' + active.length + ' active, ' + deprecated.length + ' deprecated)');
    body.push('');
    body.push('rule enumeration:');
    for (const r of reg.rules) body.push('  ' + r.id + ' [' + r.status + '] ' + r.pattern + '  (since ' + r.since + ')');
    body.push('');
    body.push('untracked-path classification (' + untracked.length + ' entries):');
    let bad = 0;
    for (const p of untracked) {
      const hit = active.filter(function (r) { return new RegExp(r.pattern).test(p); }).map(function (r) { return r.id; });
      if (p === SELF) body.push('  SELF    ' + p);
      else if (hit.length) body.push('  ' + hit.join('+') + '  ' + p);
      else { bad++; body.push('  UNCOVERED ' + p); }
    }
    body.push('');
    body.push('verdict: ' + (bad === 0 ? 'ALL COVERED' : bad + ' UNCOVERED PATHS'));
    return { status: st.status !== 0 ? st.status : (bad ? 1 : 0), out: body.join('\n') + '\n' };
  })());
  // h1-reread: independent byte scan over committed .scratch/*.md + *.txt.
  function mdHygiene(buf) {
    const hits = [];
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
      if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
    }
    const t = buf.toString('utf8');
    for (const ch of t) { const c = ch.codePointAt(0); if (c >= 0x80 && c <= 0x9f) { hits.push('C1 control char (octal-eaten stray)'); break; } }
    const noTicks = t.replace(/`[^`]*`/g, '');
    if (/[A-Za-z]:(?![\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature');
    if (/^- {2,}-/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
    return hits;
  }
  function txtHygiene(buf) {
    return /[A-Za-z]:(?:[\\/][A-Za-z0-9_.-]+)*\\\r?\n[A-Za-z0-9_.-]+\.[A-Za-z]{2,5}/.test(buf.toString('utf8')) ? ['path-LF-break signature'] : [];
  }
  const tracked = run('git', ['ls-files']).out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  let bad = 0, mdN = 0, txtN = 0;
  const scanLines = [];
  for (const f of tracked) {
    if (!/^\.scratch\/.+\.(md|txt)$/.test(f)) continue;
    const hits = /\.md$/.test(f) ? (mdN++, mdHygiene(fs.readFileSync(path.join(ROOT, f)))) : (txtN++, txtHygiene(fs.readFileSync(path.join(ROOT, f))));
    if (hits.length) { bad++; scanLines.push('FAIL ' + f + ' :: ' + hits.join(' | ')); } else { scanLines.push('OK   ' + f); }
  }
  scanLines.push('independent scan: ' + mdN + ' committed .scratch/*.md + ' + txtN + ' committed .scratch/*.txt, ' + bad + ' flagged');
  capText('h1-reread.txt', 'node <doc-hygiene byte scan over committed .scratch/*.md + *.txt>', bad ? 1 : 0, scanLines.join('\n') + '\n');
} else if (wave === 'post-map') {
  cap('gate-all.txt', shownNode(['scripts/run-gates.js']), node('scripts/run-gates.js'));
  cap('rewrite-map.txt', shownNode(['scripts/build-rewrite-map.js', '--check']), node('scripts/build-rewrite-map.js', ['--check']));
} else {
  console.error('usage: node recapture-final.cjs <jest-wave|post-map>');
  process.exit(2);
}
console.log('recapture wave ' + wave + ' complete (captured-at-head ' + HEAD.slice(0, 7) + ')');
