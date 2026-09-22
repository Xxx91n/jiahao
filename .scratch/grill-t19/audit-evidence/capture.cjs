// grill-t19 AUDIT battery re-capture (second-party, never-commit evidence).
// Mirrors .scratch/grill-t19/capture-battery.cjs verbatim --round grill-t19,
// output -> .scratch/grill-t19/audit-evidence/. Non-Interpolating Channel:
// every leg is a spawnSync arg array; files written via fs.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t19', 'audit-evidence');
const REPORT = '.scratch/grill-t19/reports/2026-09-19-report.md';
fs.mkdirSync(EVD, { recursive: true });
const PROGRESS = path.join(EVD, '_progress.log');
fs.writeFileSync(PROGRESS, '', 'utf8');
function mark(s){ fs.appendFileSync(PROGRESS, s + '\n', 'utf8'); console.log(s); }

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', shell: false }, opts || {}));
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
}
function cap(name, shown, res) {
  const text = '$ ' + shown + '\n\nEXIT ' + res.status + '\n\n' + res.out;
  fs.writeFileSync(path.join(EVD, name), text, 'utf8');
  mark('[' + res.status + '] ' + name + ' <- ' + shown);
  return res.status;
}
function node(script, args, opts) { return run(process.execPath, [script].concat(args || []), opts); }
const JEST = require.resolve('jest/bin/jest');
const NPMCLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
function jest(args) { return node(JEST, args); }
function npm(args) { return node(NPMCLI, args); }

mark('=== grill-t19 audit battery start ' + new Date().toISOString() + ' ===');

cap('gate-all.txt', 'node scripts/run-gates.js', node('scripts/run-gates.js'));
cap('run-test-gate.txt', 'node scripts/run-test-gate.js --expected-suites 73', node('scripts/run-test-gate.js', ['--expected-suites', '73']));
cap('check-ci-jobs.txt', 'node scripts/check-ci-jobs.js', node('scripts/check-ci-jobs.js'));
cap('check-ci-jobs-missing.txt', 'node scripts/check-ci-jobs.js .scratch/grill-t19/audit-evidence/no-such-ci.yml', node('scripts/check-ci-jobs.js', ['.scratch/grill-t19/audit-evidence/no-such-ci.yml']));
cap('check-deferred.txt', 'node scripts/check-deferred.js', node('scripts/check-deferred.js'));
cap('governance-inventory.txt', 'node scripts/check-governance-inventory.js', node('scripts/check-governance-inventory.js'));
cap('anchors.txt', 'node scripts/build-governance-anchors.js --check', node('scripts/build-governance-anchors.js', ['--check']));
cap('rewrite-map.txt', 'node scripts/build-rewrite-map.js --check', node('scripts/build-rewrite-map.js', ['--check']));
cap('round-facts.txt', 'node scripts/build-round-facts.js --round grill-t19 --check --report ' + REPORT, node('scripts/build-round-facts.js', ['--round', 'grill-t19', '--check', '--report', REPORT]));
cap('instrument.txt', 'node scripts/instrument.js --check', node('scripts/instrument.js', ['--check']));
cap('pack-smoke.txt', 'node scripts/check-pack-smoke.js', node('scripts/check-pack-smoke.js'));
cap('quoted-stale.txt', 'node scripts/build-round-facts.js --round grill-t19 --check --report .scratch/grill-t19/evidence/quoted-stale.fixture.md', node('scripts/build-round-facts.js', ['--round', 'grill-t19', '--check', '--report', '.scratch/grill-t19/evidence/quoted-stale.fixture.md']));
cap('inventory-shape.txt', 'npx jest test/adr-0076-wiring.test.js -t grill-t19', jest(['test/adr-0076-wiring.test.js', '-t', 'grill-t19']));
cap('prose-fixtures.txt', 'npx jest test/adr-0076-wiring.test.js -t fixture', jest(['test/adr-0076-wiring.test.js', '-t', 'fixture']));
// A-8 missing-input leg: missing slug -> FAIL pair + boundary exit 1, fixture unspliced.
const MFIX = '.scratch/grill-t19/audit-evidence/missing-facts.fixture.md';
fs.writeFileSync(path.join(ROOT, MFIX), '# fixture report\n', 'utf8');
cap('round-facts-missing.txt', 'node scripts/build-round-facts.js --round grill-t19-audit-nofacts --check --report ' + MFIX, node('scripts/build-round-facts.js', ['--round', 'grill-t19-audit-nofacts', '--check', '--report', MFIX]));
mark('fixture-after-missing-leg bytes: ' + fs.readFileSync(path.join(ROOT, MFIX), 'utf8').length);

// h1-reread: independent byte scan over committed .scratch/*.md + *.txt
function mdHygiene(buf) {
  const hits = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
    if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
  }
  const t = buf.toString('utf8');
  if (/[\u0080-\u009f]/.test(t)) hits.push('C1 control char (octal-eaten stray)');
  const noTicks = t.replace(/\`[^\`]*\`/g, '');
  if (/[A-Za-z]:(?![\\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature');
  if (/^- {2,}\u2014/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
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
mark('[' + (bad ? 1 : 0) + '] h1-reread.txt <- doc-hygiene scan ' + mdN + ' md + ' + txtN + ' txt');

// liveness: pack -> extract -> install --help -> init -y --dry-run -> MCP initialize
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-audit-'));
const pack = npm(['pack', '--pack-destination', tmp]);
let live = '$ npm pack --pack-destination ' + tmp + '\n\n' + pack.out;
let lstatus = pack.status;
const tgz = fs.readdirSync(tmp).filter(function (f) { return /\.tgz$/.test(f); })[0];
if (tgz) {
  live += '\ntarball: ' + tgz + ' size=' + fs.statSync(path.join(tmp, tgz)).size + '\n';
  const ex = spawnSync('tar', ['-xzf', tgz, '-C', '.'], { cwd: tmp, encoding: 'utf8' });
  const exr = { status: ex.status, out: (ex.stdout || '') + (ex.stderr || '') };
  live += 'extract exit=' + exr.status + '\n';
  const inst = path.join(tmp, 'package', 'scripts', 'install.js');
  const h = run(process.execPath, [inst, '--help']);
  live += '$ node install.js --help (extracted)\n' + h.out + 'exit=' + h.status + '\n';
  const i = run(process.execPath, [inst, 'init', '-y', '--dry-run']);
  live += '$ node install.js init -y --dry-run (extracted)\n' + i.out + 'exit=' + i.status + '\n';
  const mcp = run(process.execPath, ['jiahao-mcp/index.js'], { input: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"audit","version":"0"}}}\n' });
  live += '$ node jiahao-mcp/index.js < JSON-RPC initialize\n' + mcp.out + 'exit=' + mcp.status + '\n';
  if (exr.status !== 0 || h.status !== 0 || i.status !== 0 || mcp.status !== 0) lstatus = 1;
} else { lstatus = 1; live += '\nno tarball produced\n'; }
live += '\nEXIT ' + lstatus + '\n';
fs.writeFileSync(path.join(EVD, 'liveness.txt'), live, 'utf8');
mark('[' + lstatus + '] liveness.txt <- pack/extract/install/init/mcp');

// clean-tree assertion (tracked diffs only; untracked never-commit set listed)
const st = run('git', ['status', '--porcelain']);
const tracked_diffs = st.out.split('\n').filter(function (l) { return l && !l.startsWith('??'); });
const untracked = st.out.split('\n').filter(function (l) { return l.startsWith('??'); });
fs.writeFileSync(path.join(EVD, 'clean-tree.txt'), '$ git status --porcelain\n\nEXIT ' + st.status + '\n\ntracked diffs: ' + tracked_diffs.length + '\n' + tracked_diffs.join('\n') + '\n\nuntracked (never-commit set): ' + untracked.length + '\n' + untracked.join('\n') + '\n', 'utf8');
mark('[' + (tracked_diffs.length ? 1 : 0) + '] clean-tree.txt <- git status tracked=' + tracked_diffs.length + ' untracked=' + untracked.length);

mark('=== audit battery complete ' + new Date().toISOString() + ' ===');
