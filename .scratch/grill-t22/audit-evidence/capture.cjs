// grill-t22 second-party audit battery (verifier-profile audit session).
// Mechanical transform of COMMITTED .scratch/grill-t22/capture-battery.cjs:
// mutating legs (facts write + report splice) omitted - --check legs verify
// the committed canon instead. Output -> .scratch/grill-t22/audit-evidence/
// (never-commit class per the committed NEVER_COMMIT audit\d*-evidence regex).
// Added audit legs over the committed battery:
//  - coverage-old-base.txt (must-fail: t21 round base dc6d21b conflates the
//    t21 repair window's R2 files against the t22 latest row -> keyed FAIL;
//    proves ADR-0081 D-A pairing has teeth in the stale-base direction)
//  - claim-sites.txt (node claim-sites.cjs: grep-able report-claim checks)
//  - g6 side-effect watch: hash bench/research/out/g6-publish-replay.json
//    before gate:all and after all legs; disclose + restore if it dirties.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t22', 'audit-evidence');
const REPORT = '.scratch/grill-t22/reports/2026-09-22-report.md';
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
const JEST = require.resolve('jest/bin/jest', { paths: [ROOT] });
const NPMCLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
function jest(args) { return node(JEST, args); }
function npm(args) { return node(NPMCLI, args); }
const G6 = path.join(ROOT, 'bench', 'research', 'out', 'g6-publish-replay.json');
const g6Before = fs.existsSync(G6) ? crypto.createHash('sha256').update(fs.readFileSync(G6)).digest('hex') : 'absent';

cap('gate-all.txt', shownNode(['scripts/run-gates.js']), node('scripts/run-gates.js'));
cap('run-test-gate.txt', shownNode(['scripts/run-test-gate.js', '--expected-suites', '76']), node('scripts/run-test-gate.js', ['--expected-suites', '76']));
cap('check-ci-jobs.txt', shownNode(['scripts/check-ci-jobs.js']), node('scripts/check-ci-jobs.js'));
cap('check-ci-jobs-missing.txt', shownNode(['scripts/check-ci-jobs.js', '.scratch/grill-t22/audit-evidence/no-such-ci.yml']), node('scripts/check-ci-jobs.js', ['.scratch/grill-t22/audit-evidence/no-such-ci.yml']));
cap('check-deferred.txt', shownNode(['scripts/check-deferred.js']), node('scripts/check-deferred.js'));
cap('governance-inventory.txt', shownNode(['scripts/check-governance-inventory.js']), node('scripts/check-governance-inventory.js'));
cap('coverage.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', 'b93a5df02853ab4ec33ca3eb6881b5576e05b5d9']), node('scripts/check-governance-inventory.js', ['--coverage-base', 'b93a5df02853ab4ec33ca3eb6881b5576e05b5d9']));
cap('coverage-badref.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', 'not-a-real-ref']), node('scripts/check-governance-inventory.js', ['--coverage-base', 'not-a-real-ref']));
cap('coverage-old-base.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', 'dc6d21b95b7edc18d895ebbe41f649726ead3659']), node('scripts/check-governance-inventory.js', ['--coverage-base', 'dc6d21b95b7edc18d895ebbe41f649726ead3659']));
cap('anchors.txt', shownNode(['scripts/build-governance-anchors.js', '--check']), node('scripts/build-governance-anchors.js', ['--check']));
cap('rewrite-map.txt', shownNode(['scripts/build-rewrite-map.js', '--check']), node('scripts/build-rewrite-map.js', ['--check']));
cap('round-facts.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t22', '--check', '--report', REPORT]), node('scripts/build-round-facts.js', ['--round', 'grill-t22', '--check', '--report', REPORT]));
cap('instrument.txt', shownNode(['scripts/instrument.js', '--check']), node('scripts/instrument.js', ['--check']));
cap('pack-smoke.txt', shownNode(['scripts/check-pack-smoke.js']), node('scripts/check-pack-smoke.js'));
cap('adr-0080-wiring.txt', shownNode([JEST, 'test/adr-0080-wiring.test.js']), jest(['test/adr-0080-wiring.test.js']));
cap('adr-0081-wiring.txt', shownNode([JEST, 'test/adr-0081-wiring.test.js']), jest(['test/adr-0081-wiring.test.js']));

// quoted-stale fixture (must-fail leg): verbatim form, t22 canon values.
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t22', 'round-facts.json'), 'utf8'));
fs.writeFileSync(path.join(EVD, 'quoted-stale.fixture.md'),
  '# grill-t22 quoted-stale fixture (must-fail evidence)\n\nA canon number in prose, e.g. `' + facts.passed + '` tests, plus a bare\nschema-key assign suites: 76 - the unconditional scan must reject this.\n', 'utf8');
cap('quoted-stale.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t22', '--check', '--report', '.scratch/grill-t22/audit-evidence/quoted-stale.fixture.md']), node('scripts/build-round-facts.js', ['--round', 'grill-t22', '--check', '--report', '.scratch/grill-t22/audit-evidence/quoted-stale.fixture.md']));

cap('reclass-shape.txt', shownNode([JEST, 'test/adr-0080-wiring.test.js', '-t', 'reclass']), jest(['test/adr-0080-wiring.test.js', '-t', 'reclass']));
cap('inventory-shape.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'kind enum']), jest(['test/adr-0076-wiring.test.js', '-t', 'kind enum']));
cap('prose-fixtures.txt', shownNode([JEST, 'test/adr-0076-wiring.test.js', '-t', 'fixture']), jest(['test/adr-0076-wiring.test.js', '-t', 'fixture']));
cap('claim-sites.txt', shownNode([path.join('.scratch', 'grill-t22', 'audit-evidence', 'claim-sites.cjs')]), node(path.join('.scratch', 'grill-t22', 'audit-evidence', 'claim-sites.cjs'), []));

// h1-reread: independent byte scan over committed .scratch/*.md + *.txt (verbatim signatures).
function mdHygiene(buf) {
  const hits = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
    if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
  }
  const t = buf.toString('utf8');
  if (/[\u0080-\u009f]/.test(t)) hits.push('C1 control char (octal-eaten stray)');
  const noTicks = t.replace(/`[^`]*`/g, '');
  if (/[A-Za-z]:(?![\\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature');
  if (/^- {2,}-/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
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
  const mcp = run(process.execPath, ['jiahao-mcp/index.js'], { input: '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"bat\",\"version\":\"0\"}}}\n' });
  live += '$ node jiahao-mcp/index.js <stdin: JSON-RPC initialize request>\n' + mcp.out + 'exit=' + mcp.status + '\n';
  if (exr.status !== 0 || h.status !== 0 || i.status !== 0 || mcp.status !== 0) lstatus = 1;
} else { lstatus = 1; live += '\nno tarball produced\n'; }
live += '\nEXIT ' + lstatus + '\n';
fs.writeFileSync(path.join(EVD, 'liveness.txt'), live, 'utf8');
console.log('[' + lstatus + '] liveness.txt <- pack/extract/install/init/mcp');

// g6 side-effect watch: gate:all regenerates the replay record; disclose if
// my own run dirtied the tracked file, then restore HEAD bytes (audit-r2
// precedent: revert MY side effect, not the audited work).
const g6After = fs.existsSync(G6) ? crypto.createHash('sha256').update(fs.readFileSync(G6)).digest('hex') : 'absent';
let g6note;
if (g6Before !== g6After) {
  const head = run('git', ['show', 'HEAD:bench/research/out/g6-publish-replay.json']);
  fs.writeFileSync(G6, head.out, 'utf8');
  const g6Restored = crypto.createHash('sha256').update(fs.readFileSync(G6)).digest('hex');
  g6note = 'g6-publish-replay.json regenerated by my gate:all leg (before ' + g6Before.slice(0,12) + ' -> after ' + g6After.slice(0,12) + '); restored to HEAD bytes (' + g6Restored.slice(0,12) + ')';
} else {
  g6note = 'g6-publish-replay.json unchanged by my run (' + g6Before.slice(0,12) + ')';
}
console.log('[g6watch] ' + g6note);

// clean-tree leg: tracked diffs must be zero; untracked must be never-commit
// class or this leg's own outputs (self-disclosed).
const SELF = '.scratch/grill-t22/audit-evidence/clean-tree.txt';
const NEVER_COMMIT = /^\.scratch\/[^/]+\/audit\d*-evidence\/|\.patch$|round-commits\.txt$/;
const st = run('git', ['status', '--porcelain']);
const porcelain = st.out.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
const trackedDiffs = porcelain.filter(function (l) { return l.slice(0, 2) !== '??'; });
const untracked = porcelain.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^\"|\"$/g, ''); });
const ownEvidence = untracked.filter(function (p) { return /^\.scratch\/grill-t22\/audit-evidence\//.test(p); });
const badUntracked = untracked.filter(function (p) { return p !== SELF && !NEVER_COMMIT.test(p) && !/^\.scratch\/grill-t22\/audit-evidence\//.test(p); });
const clean = trackedDiffs.length === 0 && badUntracked.length === 0;
const ct = ['$ git status --porcelain', '', 'EXIT ' + st.status, '', porcelain.join('\n'),
  '', 'classification:', '  tracked-diff lines: ' + trackedDiffs.length,
  '  untracked lines: ' + untracked.length + ' (never-commit/self class: ' + (untracked.length - badUntracked.length) + '; other: ' + badUntracked.length + ')',
  '  this-audit evidence lines: ' + ownEvidence.length,
  '  g6 watch: ' + g6note,
  badUntracked.length ? '  unexpected untracked: ' + badUntracked.join(', ') : '  unexpected untracked: none',
  '', 'verdict: ' + (clean ? 'CLEAN' : 'DIRTY'), ''].join('\n');
fs.writeFileSync(path.join(EVD, 'clean-tree.txt'), ct, 'utf8');
console.log('[' + (clean ? 0 : 1) + '] clean-tree.txt <- git status --porcelain (' + trackedDiffs.length + ' tracked, ' + badUntracked.length + ' unexpected untracked)');
console.log('audit battery capture complete');
