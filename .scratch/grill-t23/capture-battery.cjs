// grill-t23 closeout battery capture (Non-Interpolating Channel, ledger
// lineage t20..t22): the grill-t22 battery re-run verbatim parameterized
// --round grill-t23. Every leg runs through a spawnSync arg array - never
// an escape-interpreting string layer - and each evidence file is written
// via fs in the "$ <command>\n\nEXIT <n>\n\n<output>" shape.
// t23 deltas:
//  - expected-suites 77 (the adr-0082 wiring suite lands this round)
//  - adr-0082-wiring.txt leg captures the new suite verbatim
//  - coverage.txt leg re-anchors at the t23 round base 688e113 (ADR-0081
//    D-A: the base pairs with the latest row's own round)
//  - svg-assets.txt leg: the pure-SVG gate over docs/assets/**
//  - brand-regen.txt leg: deterministic regen-diff of the Pillow pipeline
//    (ADR-0028 D2 convention: regen must produce byte-identical output)
//  - NEVER_COMMIT: audit\d*-evidence/ + *.patch + round-commits.txt

'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t23', 'evidence');
const REPORT = '.scratch/grill-t23/reports/2026-09-22-report.md';
fs.mkdirSync(EVD, { recursive: true });

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', shell: false }, opts || {}));
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
}
function cap(name, shown, res) {
  const text = '$ ' + shown + '\n\nEXIT ' + res.status + '\n\n' + res.out;
  fs.writeFileSync(path.join(EVD, name), text, 'utf8');
  console.log('[' + res.status + '] ' + name + ' <- ' + shown);
}
function shownNode(args) { return 'node ' + args.join(' '); }
function node(script, args) { return run(process.execPath, [script].concat(args || [])); }
const JEST = require.resolve('jest/bin/jest');
const NPMCLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
function jest(args) { return node(JEST, args); }
function npm(args) { return node(NPMCLI, args); }

// 0. gate:all first - the g6-publish replay regenerates the tarball byte
// record inside it, so the facts canon collects against the fresh replay.
cap('gate-all.txt', shownNode(['scripts/run-gates.js']), node('scripts/run-gates.js'));

// facts canon + report splice (collect requires the green suite)
const fw = node('scripts/build-round-facts.js', ['--round', 'grill-t23']);
console.log('[facts write] exit ' + fw.status); if (fw.status !== 0) { console.log(fw.out); process.exit(1); }
const sp = node('scripts/build-round-facts.js', ['--round', 'grill-t23', '--report', REPORT]);
console.log('[report splice] exit ' + sp.status); if (sp.status !== 0) { console.log(sp.out); process.exit(1); }

// verbatim battery legs
cap('run-test-gate.txt', shownNode(['scripts/run-test-gate.js', '--expected-suites', '77']), node('scripts/run-test-gate.js', ['--expected-suites', '77']));
cap('check-ci-jobs.txt', shownNode(['scripts/check-ci-jobs.js']), node('scripts/check-ci-jobs.js'));
cap('check-ci-jobs-missing.txt', shownNode(['scripts/check-ci-jobs.js', '.scratch/grill-t23/evidence/no-such-ci.yml']), node('scripts/check-ci-jobs.js', ['.scratch/grill-t23/evidence/no-such-ci.yml']));
cap('check-deferred.txt', shownNode(['scripts/check-deferred.js']), node('scripts/check-deferred.js'));
cap('governance-inventory.txt', shownNode(['scripts/check-governance-inventory.js']), node('scripts/check-governance-inventory.js'));
cap('coverage.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', '688e113b658411a1da8f2c838eb03dbdf3bd153d']), node('scripts/check-governance-inventory.js', ['--coverage-base', '688e113b658411a1da8f2c838eb03dbdf3bd153d']));
cap('coverage-badref.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', 'not-a-real-ref']), node('scripts/check-governance-inventory.js', ['--coverage-base', 'not-a-real-ref']));
cap('anchors.txt', shownNode(['scripts/build-governance-anchors.js', '--check']), node('scripts/build-governance-anchors.js', ['--check']));
cap('rewrite-map.txt', shownNode(['scripts/build-rewrite-map.js', '--check']), node('scripts/build-rewrite-map.js', ['--check']));
cap('round-facts.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t23', '--check', '--report', REPORT]), node('scripts/build-round-facts.js', ['--round', 'grill-t23', '--check', '--report', REPORT]));
cap('instrument.txt', shownNode(['scripts/instrument.js', '--check']), node('scripts/instrument.js', ['--check']));
cap('pack-smoke.txt', shownNode(['scripts/check-pack-smoke.js']), node('scripts/check-pack-smoke.js'));
cap('adr-0080-wiring.txt', shownNode([JEST, 'test/adr-0080-wiring.test.js']), jest(['test/adr-0080-wiring.test.js']));
cap('adr-0081-wiring.txt', shownNode([JEST, 'test/adr-0081-wiring.test.js']), jest(['test/adr-0081-wiring.test.js']));
cap('adr-0082-wiring.txt', shownNode([JEST, 'test/adr-0082-wiring.test.js']), jest(['test/adr-0082-wiring.test.js']));
cap('svg-assets.txt', shownNode(['.scratch/grill-t23/check-svg-assets.cjs']), node('.scratch/grill-t23/check-svg-assets.cjs'));

// brand-regen leg (ADR-0028 D2 regen-diff convention): the Pillow pipeline
// re-run must leave docs/assets/brand/ byte-identical.
const regen = run('python', ['.scratch/grill-t23/build-brand-assets.py']);
const rd = run('git', ['status', '--porcelain', '--', 'docs/assets/brand/']);
const regenText = '$ python .scratch/grill-t23/build-brand-assets.py\n\nEXIT ' + regen.status + '\n\n' + regen.out +
  '\n$ git status --porcelain -- docs/assets/brand/\n\nEXIT ' + rd.status + '\n\n' + rd.out +
  'regen-diff verdict: ' + (rd.out.trim() === '' ? 'CLEAN (byte-identical)' : 'DIRTY - ' + rd.out.trim()) + '\n';
fs.writeFileSync(path.join(EVD, 'brand-regen.txt'), regenText, 'utf8');
console.log('[' + (regen.status || (rd.out.trim() === '' ? 0 : 1)) + '] brand-regen.txt <- Pillow regen + git status');

// quoted-stale fixture (must-fail leg): a bare canon value + a schema-key
// assign - the unconditional scan must reject it.
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t23', 'round-facts.json'), 'utf8'));
fs.writeFileSync(path.join(EVD, 'quoted-stale.fixture.md'),
  '# grill-t23 quoted-stale fixture (must-fail evidence)\n\nA canon number in prose, e.g. `' + facts.passed + '` tests, plus a bare\nschema-key assign suites: 77 - the unconditional scan must reject this.\n', 'utf8');
cap('quoted-stale.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t23', '--check', '--report', '.scratch/grill-t23/evidence/quoted-stale.fixture.md']), node('scripts/build-round-facts.js', ['--round', 'grill-t23', '--check', '--report', '.scratch/grill-t23/evidence/quoted-stale.fixture.md']));

cap('reclass-shape.txt', shownNode([JEST, 'test/adr-0080-wiring.test.js', '-t', 'reclass']), jest(['test/adr-0080-wiring.test.js', '-t', 'reclass']));
cap('inventory-shape.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'kind enum']), jest(['test/adr-0076-wiring.test.js', '-t', 'kind enum']));
cap('prose-fixtures.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'fixture']), jest(['test/adr-0076-wiring.test.js', '-t', 'fixture']));

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
const lines = [];
for (const f of tracked) {
  if (!/^\.scratch\/.+\.(md|txt)$/.test(f)) continue;
  const hits = /\.md$/.test(f) ? (mdN++, mdHygiene(fs.readFileSync(path.join(ROOT, f)))) : (txtN++, txtHygiene(fs.readFileSync(path.join(ROOT, f))));
  if (hits.length) { bad++; lines.push('FAIL ' + f + ' :: ' + hits.join(' | ')); } else { lines.push('OK   ' + f); }
}
lines.push('independent scan: ' + mdN + ' committed .scratch/*.md + ' + txtN + ' committed .scratch/*.txt, ' + bad + ' flagged');
fs.writeFileSync(path.join(EVD, 'h1-reread.txt'), '$ node <doc-hygiene byte scan over committed .scratch/*.md + *.txt>\n\nEXIT ' + (bad ? 1 : 0) + '\n\n' + lines.join('\n') + '\n', 'utf8');
console.log('[' + (bad ? 1 : 0) + '] h1-reread.txt <- doc-hygiene scan ' + mdN + ' md + ' + txtN + ' txt');

// liveness: pack -> extract -> install --help -> init -y --dry-run -> MCP initialize
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-live-'));
const pack = npm(['pack', '--pack-destination', tmp]);
let live = '$ ' + shownNode([NPMCLI, 'pack', '--pack-destination', tmp]) + '\n\n' + pack.out;
let lstatus = pack.status;
const tgz = fs.readdirSync(tmp).filter(function (f) { return /\.tgz$/.test(f); })[0];
if (tgz) {
  const ex = spawnSync('tar', ['-xzf', tgz, '-C', '.'], { cwd: tmp, encoding: 'utf8' });
  const exr = { status: ex.status, out: (ex.stdout || '') + (ex.stderr || '') };
  live += '\ntarball: ' + tgz + ' extract exit=' + exr.status + '\n';
  const inst = path.join(tmp, 'package', 'scripts', 'install.js');
  const h = run(process.execPath, [inst, '--help']);
  live += '$ ' + shownNode([inst, '--help']) + ' (extracted tarball copy)\n' + h.out + 'exit=' + h.status + '\n';
  const i = run(process.execPath, [inst, 'init', '-y', '--dry-run']);
  live += '$ ' + shownNode([inst, 'init', '-y', '--dry-run']) + ' (extracted tarball copy)\n' + i.out + 'exit=' + i.status + '\n';
  const mcp = run(process.execPath, ['jiahao-mcp/index.js'], { input: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"bat","version":"0"}}}\n' });
  live += '$ node jiahao-mcp/index.js <stdin: JSON-RPC initialize request>\n' + mcp.out + 'exit=' + mcp.status + '\n';
  if (exr.status !== 0 || h.status !== 0 || i.status !== 0 || mcp.status !== 0) lstatus = 1;
} else { lstatus = 1; live += '\nno tarball produced\n'; }
live += '\nEXIT ' + lstatus + '\n';
fs.writeFileSync(path.join(EVD, 'liveness.txt'), live, 'utf8');
console.log('[' + lstatus + '] liveness.txt <- pack/extract/install/init/mcp');

// clean-tree leg: committed git-status evidence. Tracked diffs must be
// zero; every untracked entry must be never-commit class or self-disclosed.
const SELF = '.scratch/grill-t23/evidence/clean-tree.txt';
const NEVER_COMMIT = /^\.scratch\/[^/]+\/audit\d*-evidence\/|\.patch$|round-commits\.txt$/;
const st = run('git', ['status', '--porcelain']);
const porcelain = st.out.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
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
console.log('[' + (clean ? 0 : 1) + '] clean-tree.txt <- git status --porcelain (' + trackedDiffs.length + ' tracked, ' + badUntracked.length + ' unexpected untracked)');
console.log('battery capture complete');
