'use strict';
// .scratch/grill-t27/capture-battery.cjs - grill-t27 evidence battery.
// Re-runnable: `node .scratch/grill-t27/capture-battery.cjs` rewrites every
// capture under .scratch/grill-t27/evidence/ verbatim, each first line
// `captured-at-head: <durable non-workspace sha>` (ADR-0083 header contract,
// ADR-0085 floor semantics). Argv arrays only (Non-Interpolating Channel).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const EVD = path.join(ROOT, '.scratch', 'grill-t27', 'evidence');

const { WORKSPACE_SUBJECT } = require(path.join(ROOT, 'scripts', 'evidence-freshness.js')); // single source, not a second literal

const HEAD = execFileSync('git', ['log', '-1', '--invert-grep', '--grep=^' + WORKSPACE_SUBJECT, '--format=%H'], { cwd: ROOT, encoding: 'utf8' }).trim();

function run(argv, opts) {
  const r = spawnSync(argv[0], argv.slice(1), Object.assign({ cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opts || {}));
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function write(name, argvDisplay, r) {
  fs.mkdirSync(EVD, { recursive: true });
  const body = 'captured-at-head: ' + HEAD + '\n$ ' + argvDisplay + '\n\n' + r.out + '\nEXIT ' + r.code + '\n';
  fs.writeFileSync(path.join(EVD, name), body, 'utf8');
  console.log('captured', name, 'exit=' + r.code);
}

const node = (s, extra) => [process.execPath, path.join(ROOT, s)].concat(extra || []);

// --- leg list -------------------------------------------------------------
const legs = [
  ['run-test-gate.txt', 'node scripts/run-test-gate.js --expected-suites 82', node('scripts/run-test-gate.js', ['--expected-suites', '82'])],
  ['gate-all.txt', 'node scripts/run-gates.js', node('scripts/run-gates.js')],
  ['governance-inventory.txt', 'node scripts/check-governance-inventory.js --coverage-base fc390d5e778db567d12b072f7a25cbf1e73b03f8', node('scripts/check-governance-inventory.js', ['--coverage-base', 'fc390d5e778db567d12b072f7a25cbf1e73b03f8'])],
  ['check-deferred.txt', 'node scripts/check-deferred.js', node('scripts/check-deferred.js')],
  ['adr-index.txt', 'node scripts/build-adr-index.js --check', node('scripts/build-adr-index.js', ['--check'])],
  ['rewrite-map.txt', 'node scripts/build-rewrite-map.js --check', node('scripts/build-rewrite-map.js', ['--check'])],
  ['rewrite-map-published.txt', 'node scripts/build-rewrite-map.js --published-only', node('scripts/build-rewrite-map.js', ['--published-only'])],
  ['anchors.txt', 'node scripts/build-governance-anchors.js --check', node('scripts/build-governance-anchors.js', ['--check'])],
  ['pack-smoke.txt', 'node scripts/check-pack-smoke.js', node('scripts/check-pack-smoke.js')],
  ['corpus-restore.txt', 'display-form: private/bench-corpus -> tgz -> scripts/restore-bench-corpus.js -> manifest verdict', corpusRestore],
  ['clean-tree.txt', 'git status --porcelain', ['git', 'status', '--porcelain']],
];

// T-2 rehearsal leg: rebuild the real corpus tarball (basename argv under cwd,
// never an absolute path into tar), feed it through the restore script, and
// record the manifest-validation verdict against the private/ corpus.
function corpusRestore() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-t27-corpus-'));
  const lines = [];
  const mk = run(['tar', '-czf', 'corpus.tgz', 'bench-corpus'], { cwd: path.join(ROOT, 'private') });
  lines.push('$ tar -czf corpus.tgz bench-corpus (cwd=private/)\n' + mk.out + 'exit=' + mk.code);
  const staged = path.join(tmp, 'corpus.tgz');
  fs.copyFileSync(path.join(ROOT, 'private', 'corpus.tgz'), staged);
  fs.rmSync(path.join(ROOT, 'private', 'corpus.tgz'), { force: true });
  const dest = path.join(tmp, 'dest'); fs.mkdirSync(dest, { recursive: true });
  const res = run(node('scripts/restore-bench-corpus.js', [staged, dest]));
  lines.push('$ node scripts/restore-bench-corpus.js <real-corpus.tgz> <dest>\n' + res.out + 'exit=' + res.code);
  const ok = mk.code === 0 && res.code === 0 && fs.existsSync(path.join(dest, 'bench-corpus', 'mr-probes.jsonl'));
  return { code: ok ? 0 : 1, out: lines.join('\n') };
}

// freshness self-evaluation: the checker's verdict on all registered rounds
function freshnessEval() {
  const fresh = require(path.join(ROOT, 'scripts', 'evidence-freshness'));
  const f = fresh.loadFreshness(ROOT);
  const summary = {};
  for (const r of f.rounds) {
    const v = fresh.evaluateRound(ROOT, f, r);
    summary[r.id] = {
      claims: v.claims.length,
      claimFailures: v.claims.filter((c) => c.bad.length).length,
      seal: v.seal.present
        ? { declared: v.seal.declared.slice(0, 9), inFlightClean: v.seal.inFlightClean, amended: v.seal.amended, capturesAtSealOk: v.seal.capturesAtSealOk, freezeViolations: v.seal.freezeViolations.length, tag: v.seal.tag.state }
        : null,
      unregisteredClaims: v.unregisteredClaims,
    };
  }
  return { code: 0, out: JSON.stringify(summary, null, 1) };
}

// liveness: npm pack -> extract -> install --help + init --dry-run -> MCP probe
function liveness() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-live-'));
  const lines = [];
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'); // npm sits beside node on this host family
  const pack = run([process.execPath, npmCli, 'pack', '--pack-destination', tmp]);
  lines.push('$ npm pack --pack-destination ' + tmp + '\n' + pack.out + 'exit=' + pack.code);
  const tgz = path.join(tmp, 'jiahao-0.0.1.tgz');
  // GNU tar parses a drive-letter path as <host>:<path> - extract with a
  // relative filename inside the temp dir instead.
  const ex = run(['tar', '-xzf', 'jiahao-0.0.1.tgz'], { cwd: tmp });
  lines.push('tarball: ' + tgz + ' extract exit=' + ex.code + ' ' + ex.out);
  const pkg = path.join(tmp, 'package');
  const help = run([process.execPath, path.join(pkg, 'scripts', 'install.js'), '--help']);
  lines.push('$ node ' + path.join(pkg, 'scripts', 'install.js') + ' --help (extracted tarball copy)\n' + help.out + 'exit=' + help.code);
  const init = run([process.execPath, path.join(pkg, 'scripts', 'install.js'), 'init', '-y', '--dry-run']);
  lines.push('$ node ' + path.join(pkg, 'scripts', 'install.js') + ' init -y --dry-run (extracted tarball copy)\n' + init.out + 'exit=' + init.code);
  const rpc = run([process.execPath, path.join(ROOT, 'jiahao-mcp', 'index.js')], { input: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}\n' });
  lines.push('$ node jiahao-mcp/index.js <stdin: JSON-RPC initialize request>\n' + rpc.out + 'exit=' + rpc.code);
  const ok = pack.code === 0 && ex.code === 0 && help.code === 0 && init.code === 0 && rpc.code === 0 && /"result"/.test(rpc.out);
  return { code: ok ? 0 : 1, out: lines.join('\n') };
}

const only = process.argv[2] ? process.argv[2].split(',') : null;
for (const [name, disp, argv] of legs) {
  if (only && !only.includes(name)) continue;
  write(name, disp, typeof argv === 'function' ? argv() : run(argv));
}
if (!only || only.includes('freshness-eval.txt')) write('freshness-eval.txt', 'node -e <evaluateRound summary over registered rounds>', freshnessEval());
if (!only || only.includes('liveness.txt')) write('liveness.txt', 'display-form: npm pack -> tar extract -> install.js --help -> install.js init -y --dry-run -> mcp initialize', liveness());
console.log('battery done at', HEAD);
