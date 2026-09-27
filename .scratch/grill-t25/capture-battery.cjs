// grill-t25 acceptance battery capture (Non-Interpolating Channel, ledger
// lineage t20..t24): the grill-t24 battery re-parameterized --round grill-t25.
// Every leg runs through a spawnSync arg array - never an escape-interpreting
// string layer - and each evidence file is written via fs in the
// "captured-at-head: <sha>\n$ <command>\n\nEXIT <n>\n\n<output>" shape.
// t25 deltas (ADR-0084 first live firing):
//  - clone-sim legs: a real git clone to a fresh temp dir - no gb-local/* refs
//    - runs --check (expected exit 2 UNVERIFIABLE, the degrade IS the verdict)
//    and --published-only (expected exit 0, the clone-verifiable subset).
//  - D-D: expected-suites 79 (the adr-0084 wiring suite lands this round).
//  - coverage.txt leg anchors at the t25 round base fc390d5.
//  - facts legs are CHECK-ONLY here: collect/write/splice runs in the
//    closeout orchestration (same ADR-0083 D-A split).
//  - adr-0084-wiring.txt leg captures the new suite verbatim.
//  - never-commit-sweep.txt: registry-driven consent sweep, SELF = t25 dir.

'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t25', 'evidence');
const REPORT = '.scratch/grill-t25/reports/2026-09-24-report.md';
const ROUND_BASE = 'fc390d5e778db567d12b072f7a25cbf1e73b03f8';
fs.mkdirSync(EVD, { recursive: true });

const HEAD = execFileSync('git', ['log', '-1', '--format=%H', '--invert-grep', '--grep=^GitButler Workspace Commit', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', shell: false }, opts || {}));
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
}
function cap(name, shown, res) {
  const text = 'captured-at-head: ' + HEAD + '\n$ ' + shown + '\n\nEXIT ' + res.status + '\n\n' + res.out;
  fs.writeFileSync(path.join(EVD, name), text, 'utf8');
  console.log('[' + res.status + '] ' + name + ' <- ' + shown);
}
function capText(name, shown, exitCode, body) {
  fs.writeFileSync(path.join(EVD, name), 'captured-at-head: ' + HEAD + '\n$ ' + shown + '\n\nEXIT ' + exitCode + '\n\n' + body, 'utf8');
  console.log('[' + exitCode + '] ' + name + ' <- ' + shown);
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

// compile-tier legs: byte-parse ci.yml + node --check over the round's touched scripts + wiring suite
cap('compile-yaml.txt', shownNode(['-e', 'js-yaml parse .github/workflows/ci.yml']), (function () {
  try {
    const yaml = require('js-yaml');
    const doc = yaml.load(fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'));
    return { status: 0, out: 'js-yaml parse OK - top-level keys: ' + Object.keys(doc).join(', ') + '\njobs: ' + Object.keys(doc.jobs || {}).join(', ') + '\n' };
  } catch (e) { return { status: 1, out: 'yaml parse failed: ' + e.message + '\n' }; }
})());
cap('compile-node-check.txt', shownNode(['--check', '<t25 round scripts + wiring suite>']), (function () {
  const files = ['.scratch/grill-t25/capture-battery.cjs', 'scripts/build-rewrite-map.js', 'scripts/check-secret-scan.js', 'src/shared/capability.js', 'test/adr-0084-wiring.test.js'];
  const out = [];
  let worst = 0;
  for (const f of files) {
    const r = node('--check', [f]);
    out.push('$ node --check ' + f + ' -> ' + r.status + (r.out.trim() ? '\n' + r.out.trim() : ''));
    if (r.status !== 0) worst = 1;
  }
  return { status: worst, out: out.join('\n') + '\n' };
})());

// verbatim battery legs
cap('check-ci-jobs.txt', shownNode(['scripts/check-ci-jobs.js']), node('scripts/check-ci-jobs.js'));
cap('check-ci-jobs-missing.txt', shownNode(['scripts/check-ci-jobs.js', '.scratch/grill-t25/evidence/no-such-ci.yml']), node('scripts/check-ci-jobs.js', ['.scratch/grill-t25/evidence/no-such-ci.yml']));
cap('check-deferred.txt', shownNode(['scripts/check-deferred.js']), node('scripts/check-deferred.js'));
cap('governance-inventory.txt', shownNode(['scripts/check-governance-inventory.js']), node('scripts/check-governance-inventory.js'));
cap('coverage.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', ROUND_BASE]), node('scripts/check-governance-inventory.js', ['--coverage-base', ROUND_BASE]));
cap('coverage-badref.txt', shownNode(['scripts/check-governance-inventory.js', '--coverage-base', 'not-a-real-ref']), node('scripts/check-governance-inventory.js', ['--coverage-base', 'not-a-real-ref']));
cap('anchors.txt', shownNode(['scripts/build-governance-anchors.js', '--check']), node('scripts/build-governance-anchors.js', ['--check']));
cap('rewrite-map.txt', shownNode(['scripts/build-rewrite-map.js', '--check']), node('scripts/build-rewrite-map.js', ['--check']));
cap('rewrite-map-published.txt', shownNode(['scripts/build-rewrite-map.js', '--published-only']), node('scripts/build-rewrite-map.js', ['--published-only']));
cap('round-facts.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t25', '--check', '--report', REPORT]), node('scripts/build-round-facts.js', ['--round', 'grill-t25', '--check', '--report', REPORT]));
cap('instrument.txt', shownNode(['scripts/instrument.js', '--check']), node('scripts/instrument.js', ['--check']));
cap('pack-smoke.txt', shownNode(['scripts/check-pack-smoke.js']), node('scripts/check-pack-smoke.js'));
cap('run-test-gate.txt', shownNode(['scripts/run-test-gate.js', '--expected-suites', '79']), node('scripts/run-test-gate.js', ['--expected-suites', '79']));
cap('adr-0084-wiring.txt', shownNode([JEST, 'test/adr-0084-wiring.test.js']), jest(['test/adr-0084-wiring.test.js']));

// clone-sim legs: the ADR-0084 acceptance boundary. A real git clone into a
// fresh temp dir carries refs/heads + tags only - never the maintainer-side
// gb-local/* remote-tracking refs - which is exactly the public-clone shape.
(function () {
  const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-t25-clone-'));
  const cl = run('git', ['clone', '--no-local', '.', cloneDir]);
  if (cl.status !== 0) {
    capText('clone-sim.txt', 'git clone --no-local . <tmp> + verifier legs', 1, 'clone failed: ' + cl.out);
    return;
  }
  const body = [];
  let worst = 0;
  body.push('$ git clone --no-local . ' + cloneDir + '  -> exit ' + cl.status);
  const refs = run('git', ['for-each-ref', '--format=%(refname)', 'refs/remotes/gb-local/'], { cwd: cloneDir });
  body.push('$ git for-each-ref refs/remotes/gb-local/  -> "' + refs.out.trim() + '" (empty = the public-clone shape)');
  const chk = run(process.execPath, ['scripts/build-rewrite-map.js', '--check'], { cwd: cloneDir });
  body.push('$ node scripts/build-rewrite-map.js --check  -> exit ' + chk.status + ' (expected 2: UNVERIFIABLE, never red)');
  body.push(chk.out.trim());
  if (chk.status !== 2) worst = 1;
  const pub = run(process.execPath, ['scripts/build-rewrite-map.js', '--published-only'], { cwd: cloneDir });
  body.push('$ node scripts/build-rewrite-map.js --published-only  -> exit ' + pub.status + ' (expected 0: the clone-verifiable subset)');
  body.push(pub.out.trim());
  if (pub.status !== 0) worst = 1;
  capText('clone-sim.txt', 'git clone --no-local . <tmp>; for-each-ref gb-local; --check; --published-only', worst, body.join('\n') + '\n');
})();

// never-commit-sweep: registry-driven consent sweep over untracked paths.
cap('never-commit-sweep.txt', shownNode(['<registry-driven untracked-path sweep>']), (function () {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'never-commit.json'), 'utf8'));
  const active = reg.rules.filter(function (r) { return r.status === 'active'; });
  const deprecated = reg.rules.filter(function (r) { return r.status === 'deprecated'; });
  const st = run('git', ['status', '--porcelain']);
  const lines = st.out.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
  const untracked = lines.filter(function (l) { return l.slice(0, 2) === '??'; }).map(function (l) { return l.slice(3).replace(/^"|"$/g, ''); });
  const SELF = '.scratch/grill-t25/evidence/never-commit-sweep.txt';
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

// quoted-stale fixture (must-fail leg): a bare canon value + a schema-key
// assign - the unconditional scan must reject it.
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t25', 'round-facts.json'), 'utf8'));
fs.writeFileSync(path.join(EVD, 'quoted-stale.fixture.md'),
  '# grill-t25 quoted-stale fixture (must-fail evidence)\n\nA canon number in prose, e.g. `' + facts.passed + '` tests, plus a bare\nschema-key assign suites: 79 - the unconditional scan must reject this.\n', 'utf8');
cap('quoted-stale.txt', shownNode(['scripts/build-round-facts.js', '--round', 'grill-t25', '--check', '--report', '.scratch/grill-t25/evidence/quoted-stale.fixture.md']), node('scripts/build-round-facts.js', ['--round', 'grill-t25', '--check', '--report', '.scratch/grill-t25/evidence/quoted-stale.fixture.md']));

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
  const t = buf.toString('utf8');
  // path-LF-break signature: a backslash-continued path split across lines
  return /\\\r?\n[A-Za-z0-9_.-]+\.[A-Za-z]{2,5}/.test(t) ? ['path-LF-break signature'] : [];
}
const tracked = run('git', ['ls-files']).out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
let bad = 0, mdN = 0, txtN = 0;
const scanLines = [];
for (const f of tracked) {
  if (!(f.indexOf('.scratch/') === 0 && /\.(md|txt)$/.test(f))) continue;
  const hits = /\.md$/.test(f) ? (mdN++, mdHygiene(fs.readFileSync(path.join(ROOT, f)))) : (txtN++, txtHygiene(fs.readFileSync(path.join(ROOT, f))));
  if (hits.length) { bad++; scanLines.push('FAIL ' + f + ' :: ' + hits.join(' | ')); } else { scanLines.push('OK   ' + f); }
}
scanLines.push('independent scan: ' + mdN + ' committed .scratch/*.md + ' + txtN + ' committed .scratch/*.txt, ' + bad + ' flagged');
capText('h1-reread.txt', 'node <doc-hygiene byte scan over committed .scratch/*.md + *.txt>', bad ? 1 : 0, scanLines.join('\n') + '\n');

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
fs.writeFileSync(path.join(EVD, 'liveness.txt'), 'captured-at-head: ' + HEAD + '\n' + live, 'utf8');
console.log('[' + lstatus + '] liveness.txt <- pack/extract/install/init/mcp');

// clean-tree leg: committed git-status evidence. Tracked diffs must be
// zero; every untracked entry must be never-commit class (registry-driven)
// or self-disclosed.
const SELF = '.scratch/grill-t25/evidence/clean-tree.txt';
const reg2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'never-commit.json'), 'utf8'));
const RULES = reg2.rules.filter(function (r) { return r.status === 'active'; }).map(function (r) { return new RegExp(r.pattern); });
const st = run('git', ['status', '--porcelain']);
const porcelain = st.out.split('\n').map(function (s) { return s.replace(/\r$/, ''); }).filter(Boolean);
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
console.log('[' + (clean ? 0 : 1) + '] clean-tree.txt <- git status --porcelain (' + trackedDiffs.length + ' tracked, ' + badUntracked.length + ' unexpected untracked)');
console.log('battery capture complete (captured-at-head ' + HEAD.slice(0, 7) + ')');
