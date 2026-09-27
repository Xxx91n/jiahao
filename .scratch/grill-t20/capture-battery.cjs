// grill-t20 closeout battery capture (Non-Interpolating Channel, ledger
// D-006): the grill-t19 section-6 battery re-run verbatim parameterized
// --round grill-t20. Every leg runs through a spawnSync arg array - never
// an escape-interpreting string layer - and each evidence file is written
// via fs in the "$ <command>\n\nEXIT <n>\n\n<output>" shape.
// grill-t20 fixes (audit B-2/B-3/B-7, ledger D-005):
//  - B-2: every '$' label names the verbatim argv actually spawned
//    (node <bin> <args> - never a prettified 'npx jest'/'npm pack').
//  - B-3: the duplicate round-facts leg and the unused WIN var are removed.
//  - B-7: a committed git-status clean-tree leg produces clean-tree.txt.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t20', 'evidence');
const REPORT = '.scratch/grill-t20/reports/2026-09-20-report.md';
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
// verbatim argv helpers: the '$' line IS the spawned argv (B-2). 'node'
// names process.execPath verbatim - the spawned binary is node itself.
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
const fw = node('scripts/build-round-facts.js', ['--round', 'grill-t20']);
console.log('[facts write] exit ' + fw.status); if (fw.status !== 0) { console.log(fw.out); process.exit(1); }
const sp = node('scripts/build-round-facts.js', ['--round', 'grill-t20', '--report', REPORT]);
console.log('[report splice] exit ' + sp.status); if (sp.status !== 0) { console.log(sp.out); process.exit(1); }

// verbatim battery legs
cap('run-test-gate.txt', shownNode(['scripts/run-test-gate.js', '--expected-suites', '74']), node('scripts/run-test-gate.js', ['--expected-suites', '74']));
cap('check-ci-jobs.txt', shownNode(['scripts/check-ci-jobs.js']), node('scripts/check-ci-jobs.js'));
cap('check-ci-jobs-missing.txt', shownNode(['scripts/check-ci-jobs.js', '.scratch/grill-t20/evidence/no-such-ci.yml']), node('scripts/check-ci-jobs.js', ['.scratch/grill-t20/evidence/no-such-ci.yml']));
cap('check-deferred.txt', shownNode(['scripts/check-deferred.js']), node('scripts/check-deferred.js'));
cap('governance-inventory.txt', shownNode(['scripts/check-governance-inventory.js']), node('scripts/check-governance-inventory.js'));
cap('anchors.txt', shownNode(['scripts/build-governance-anchors.js', '--check']), node('scripts/build-governance-anchors.js', ['--check']));
cap('rewrite-map.txt', shownNode(['scripts/build-rewrite-map.js', '--check']), node('scripts/build-rewrite-map.js', ['--check']));
cap('round-facts.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t20', '--check', '--report', REPORT]), node('scripts/build-round-facts.js', ['--round', 'grill-t20', '--check', '--report', REPORT]));
cap('instrument.txt', shownNode(['scripts/instrument.js', '--check']), node('scripts/instrument.js', ['--check']));
cap('pack-smoke.txt', shownNode(['scripts/check-pack-smoke.js']), node('scripts/check-pack-smoke.js'));

// quoted-stale fixture (must-fail leg): a bare canon value + a schema-key
// assign - the unconditional scan must reject it.
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t20', 'round-facts.json'), 'utf8'));
fs.writeFileSync(path.join(EVD, 'quoted-stale.fixture.md'),
  '# grill-t20 quoted-stale fixture (must-fail evidence)\n\nA canon number in prose, e.g. `' + facts.passed + '` tests, plus a bare\nschema-key assign suites: 74 - the unconditional scan must reject this.\n', 'utf8');
cap('quoted-stale.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t20', '--check', '--report', '.scratch/grill-t20/evidence/quoted-stale.fixture.md']), node('scripts/build-round-facts.js', ['--round', 'grill-t20', '--check', '--report', '.scratch/grill-t20/evidence/quoted-stale.fixture.md']));

cap('inventory-shape.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'grill-t19']), jest(['test/adr-0076-wiring.test.js', '-t', 'grill-t19']));
cap('prose-fixtures.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'fixture']), jest(['test/adr-0076-wiring.test.js', '-t', 'fixture']));

// h1-reread: independent byte scan over committed .scratch/*.md + *.txt.
// md signature set (docHygiene): control bytes, lone CR, C1, stripped
// paths, stripped $name bullets. txt signature set (txtHygiene, D-006):
// the path-LF-break class only.
function mdHygiene(buf) {
  const hits = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
    if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
  }
  const t = buf.toString('utf8');
  if (/[-]/.test(t)) hits.push('C1 control char (octal-eaten stray)');
  const noTicks = t.replace(/`[^`]*`/g, '');
  if (/[A-Za-z]:(?![\\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature');
  if (/^- {2,}—/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
  return hits;
}
function txtHygiene(buf) {
  return /[A-Za-z]:(?:[\\\/][A-Za-z0-9_.-]+)*\\\r?\n[A-Za-z0-9_.-]+\.[A-Za-z]{2,5}/.test(buf.toString('utf8')) ? ['path-LF-break signature'] : [];
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

// clean-tree leg (B-7): committed git-status evidence. Tracked diffs must
// be zero; every untracked entry must be never-commit class
// (.scratch/*/audit-evidence/ trees, round-diff *.patch, round-commits.txt)
// or this leg's own output file (self-disclosed: it is untracked until the
// closeout commit lands it).
const SELF = '.scratch/grill-t20/evidence/clean-tree.txt';
const NEVER_COMMIT = /^\.scratch\/[^/]+\/audit-evidence\/|\.patch$|round-commits\.txt$/;
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
