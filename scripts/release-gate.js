#!/usr/bin/env node
'use strict';
// release-gate.js — what a tag must prove before anyone calls it released (#63).
//
// One command, named steps, exit 0 only when every step passes:
//   1 metadata      a tag is given; package.json version == tag; both plugin
//                   manifests agree; HEAD is the tag's commit; tree is clean
//   2 generated     build-adapters.js --check (committed output == generator)
//   3 drift         check-drift.js (profile fragments + retired adapter exits)
//   4 tests         npm test (full suite, includes test/packaging.test.js)
//   5 artifact      npm pack -> include/exclude audit, sha256, per-directory
//                   tree hashes
//   6 install       install.js init --dry-run exits 0 and writes nothing
//   7 egress        shipped code makes no network call; no install lifecycle
//                   scripts; plugin hook commands stay inside the bundle
//   8 declarations  docs/release.md carries the write-scope and no-egress
//                   statements this gate relies on
//
// Step order is not cosmetic: the generator gates run BEFORE npm test because
// three suites rerun the generator and rewrite adapters/ + skills/ in the
// working tree (#66), so a --check afterwards would compare generated output
// with itself and report clean. Same reason the CI job lists them first.
//
// Usage:
//   node scripts/release-gate.js --tag v0.2.0 [--only <step[,step]>] [--evidence <file>]
// In CI the tag is read from GITHUB_REF_NAME when it names a tag ref.
//
// Exit codes: 0 all steps passed, 1 a step failed, 2 usage error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

// What the packed artifact must carry and must never carry. Shared with
// test/packaging.test.js so the jest assertion and the tag command cannot
// drift apart: one list, two readers.
const REQUIRED_PACK_FILES = [
  'package.json',
  'skills/jiahao/SKILL.md',
  'adapters/codebuddy/.claude-plugin/plugin.json',
  'adapters/codebuddy/hooks/hooks.json',
  'adapters/claude-code/.claude-plugin/plugin.json',
  'adapters/claude-code/hooks/hooks.json',
  '.claude-plugin/marketplace.json',
  'docs/release.md',
];
// Private corpus and the research / frozen-evaluation records never ship.
const FORBIDDEN_PACK_PREFIXES = ['private/', 'bench/', 'docs/research/'];

// The two plugin bundles and the rules directory get a deterministic content
// hash of their own: the tarball hash covers everything at once, and a broken
// single exit is easier to name than a tarball diff.
const HASHED_TREES = ['skills/jiahao', 'adapters/codebuddy', 'adapters/claude-code'];

const PLUGIN_MANIFESTS = [
  'adapters/codebuddy/.claude-plugin/plugin.json',
  'adapters/claude-code/.claude-plugin/plugin.json',
];
const MARKETPLACE_MANIFEST = '.claude-plugin/marketplace.json';

// Files that run on a user's machine once jiahao is installed: the installer,
// the runtime under src/, every hook the plugin bundles vendor (byte copies of
// hooks/, asserted by test/claude-code-plugin.test.js), and the MCP server the
// user starts. Maintainer tools (this gate, the generator, the drift check)
// are not install paths and are deliberately outside the scan.
const EGRESS_SCAN = ['scripts/install.js', 'hooks', 'src', 'jiahao-mcp/index.js'];
const NETWORK_MODULE = /\brequire\(\s*['"](?:node:)?(?:https?|net|dns|tls|dgram)['"]\s*\)/;
const NETWORK_CALL = /(?:\bfetch\s*\(|XMLHttpRequest|https?\.(?:request|get)\s*\()/;
// Lifecycle scripts would turn `npm install` into "download and execute".
const FORBIDDEN_LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack'];
// Plugin hook commands must resolve inside the bundle. CodeBuddy additionally
// expands ${CODEBUDDY_PLUGIN_ROOT}, so both names are accepted.
const BUNDLED_COMMAND = /^node "?\$\{(?:CLAUDE|CODEBUDDY)_PLUGIN_ROOT\}\/hooks\/[A-Za-z0-9._-]+\.js"?$/;

function parseTag(tag) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(String(tag || ''));
  if (!m) return null;
  return m[1];
}

function parseArgs(argv) {
  const out = { tag: null, only: null, evidence: null, artifactDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tag') out.tag = argv[++i];
    else if (a === '--only') out.only = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--evidence') out.evidence = argv[++i];
    else if (a === '--artifact-dir') out.artifactDir = argv[++i];
    else throw new Error('unknown argument: ' + a);
  }
  return out;
}

// CI hands the tag over as a ref name; only a refs/tags/* ref is a release.
function tagFromEnv(env) {
  if (!env.GITHUB_REF_NAME) return null;
  if (env.GITHUB_REF && !env.GITHUB_REF.startsWith('refs/tags/')) return null;
  return env.GITHUB_REF_NAME;
}

function run(cmd, args, opts) {
  const options = Object.assign({
    cwd: root,
    encoding: 'utf8',
    timeout: 600000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  }, opts || {});
  const res = spawnSync(cmd, args, options);
  if (res.error) throw new Error(cmd + ' could not start: ' + res.error.message);
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

// `npm` is a shell script on POSIX and a .cmd shim on Windows; node can run
// npm's own CLI file directly, which keeps paths with spaces out of a shell.
function resolveNpm() {
  const candidates = [];
  if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
  if (process.platform === 'win32') {
    candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return { cmd: process.execPath, args: [c] };
  }
  return { cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: [], shell: process.platform === 'win32' };
}

function npm(args, opts) {
  const npmCmd = resolveNpm();
  const spawnOpts = Object.assign({}, opts || {});
  if (npmCmd.shell) spawnOpts.shell = true;
  return run(npmCmd.cmd, npmCmd.args.concat(args), spawnOpts);
}

function tape(text, prefix) {
  const lines = String(text).trim().split('\n');
  return lines.slice(-25).map(l => prefix + l).join('\n');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Sorted-path tree hash: for every file, "rel\0<sha256 of bytes>", then the
// hash of those lines. Deterministic across machines, unlike a tarball of the
// same files with different timestamps.
function treeHash(dir) {
  const base = path.join(root, dir.split('/').join(path.sep));
  const files = [];
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const childRel = rel ? rel + '/' + entry.name : entry.name;
      const childAbs = path.join(abs, entry.name);
      if (entry.isDirectory()) walk(childAbs, childRel);
      else files.push(childRel + '\u0000' + sha256(fs.readFileSync(childAbs)));
    }
  };
  walk(base, '');
  return sha256(files.join('\n'));
}

// Both halves of the packaging contract, as data a caller can report on.
function auditPackFiles(files) {
  const problems = [];
  for (const rel of REQUIRED_PACK_FILES) {
    if (!files.includes(rel)) problems.push({ kind: 'missing', rel: rel });
  }
  for (const rel of files) {
    for (const prefix of FORBIDDEN_PACK_PREFIXES) {
      if (rel === prefix || rel.startsWith(prefix)) problems.push({ kind: 'forbidden', rel: rel, prefix: prefix });
    }
  }
  return problems;
}

function collectFiles(abs, out) {
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) collectFiles(child, out);
    else out.push(child);
  }
  return out;
}

// ---- steps ---------------------------------------------------------------

const steps = [];

function step(name, title, run) {
  steps.push({ name, title, run });
}

step('metadata', 'tag / version / checkout identity', (ctx) => {
  const tag = ctx.tag;
  const version = parseTag(tag);
  if (!version) throw new Error('tag "' + tag + '" is not vMAJOR.MINOR.PATCH; the release gate only accepts a version tag');

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.version !== version) {
    throw new Error('package.json version is ' + pkg.version + ' but the tag says ' + version + '; bump package.json (plugin manifests follow it) or retag');
  }

  for (const rel of PLUGIN_MANIFESTS.concat([MARKETPLACE_MANIFEST])) {
    const full = path.join(root, rel.split('/').join(path.sep));
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      throw new Error(rel + ' does not parse as JSON: ' + e.message);
    }
    if (rel !== MARKETPLACE_MANIFEST && manifest.version !== version) {
      throw new Error(rel + ' version is ' + manifest.version + ' but the tag says ' + version + ' (run: node scripts/build-adapters.js)');
    }
  }

  const status = run('git', ['status', '--porcelain']);
  if (status.status !== 0) throw new Error('git status failed: ' + status.stderr.trim());
  if (status.stdout.trim()) {
    throw new Error('working tree is not clean; a release must be built from exactly the tagged tree:\n' + status.stdout.trim());
  }

  const head = run('git', ['rev-parse', 'HEAD']);
  if (head.status !== 0) throw new Error('git rev-parse HEAD failed: ' + head.stderr.trim());
  const tagCommit = run('git', ['rev-list', '-n', '1', tag]);
  if (tagCommit.status !== 0) {
    throw new Error('tag ' + tag + ' not found in this checkout (git fetch --tags)');
  }
  if (tagCommit.stdout.trim() !== head.stdout.trim()) {
    throw new Error('HEAD ' + head.stdout.trim().slice(0, 12) + ' is not the commit ' + tag + ' points at (' + tagCommit.stdout.trim().slice(0, 12) + ')');
  }

  ctx.commit = head.stdout.trim();
  return 'tag ' + tag + ' -> version ' + version + ', commit ' + ctx.commit.slice(0, 12) + ', tree clean';
});

step('generated', 'committed generated output == generator', () => {
  const res = run(process.execPath, [path.join('scripts', 'build-adapters.js'), '--check']);
  if (res.status !== 0) throw new Error('generated output drifted from src/SKILL.md:\n' + tape(res.stderr || res.stdout, '  '));
  return res.stdout.trim();
});

step('drift', 'profile fragments and retired adapter exits', () => {
  const res = run(process.execPath, [path.join('scripts', 'check-drift.js')]);
  if (res.status !== 0) throw new Error('drift check failed:\n' + tape(res.stderr || res.stdout, '  '));
  return res.stdout.trim();
});

step('tests', 'full test suite (npm test)', () => {
  const res = npm(['test'], { timeout: 1800000 });
  if (res.status !== 0) throw new Error('npm test failed (exit ' + res.status + '):\n' + tape(res.stderr || res.stdout, '  '));
  const summary = (res.stderr || res.stdout).match(/Tests:.*$/m);
  return summary ? summary[0].trim() : 'npm test exited 0';
});

step('artifact', 'pack contents, sha256, per-tree hashes', (ctx) => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-pack-'));
  try {
    const res = npm(['pack', '--json', '--pack-destination', dest], { timeout: 600000 });
    if (res.status !== 0) throw new Error('npm pack failed (exit ' + res.status + '):\n' + tape(res.stderr || res.stdout, '  '));
    let packed;
    try {
      packed = JSON.parse(res.stdout)[0];
    } catch (e) {
      throw new Error('npm pack --json output did not parse: ' + e.message + '\n' + tape(res.stdout, '  '));
    }
    const files = (packed.files || []).map(f => f.path);
    const problems = auditPackFiles(files);
    if (problems.length) {
      throw new Error('packed artifact violates the content contract:\n' +
        problems.map(p => p.kind === 'missing'
          ? '  MISSING: ' + p.rel
          : '  FORBIDDEN: ' + p.rel + ' (' + p.prefix + ' must not ship)').join('\n'));
    }
    const tarball = path.join(dest, packed.filename);
    const bytes = fs.readFileSync(tarball);
    ctx.artifact = { file: packed.filename, bytes: bytes.length, sha256: sha256(bytes), files: files.length };
    // Kept only when asked: the release needs the bytes to attach, a local run
    // usually does not, and the gate should not leave files behind by default.
    if (ctx.artifactDir) {
      fs.mkdirSync(ctx.artifactDir, { recursive: true });
      const kept = path.join(ctx.artifactDir, packed.filename);
      fs.copyFileSync(tarball, kept);
      ctx.artifact.path = kept;
    }
    ctx.trees = {};
    for (const dir of HASHED_TREES) ctx.trees[dir] = treeHash(dir);
    return packed.filename + ' (' + bytes.length + ' B, ' + files.length + ' files)\n' +
      '  sha256  ' + ctx.artifact.sha256 +
      (ctx.artifact.path ? '\n  kept    ' + ctx.artifact.path : '');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

step('install', 'installer dry-run writes nothing', () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-gate-config-'));
  try {
    const res = run(process.execPath, [path.join('scripts', 'install.js'), 'init', '--profile', 'verifier', '--dry-run'], {
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: configDir }),
    });
    if (res.status !== 0) throw new Error('install dry-run exited ' + res.status + ':\n' + tape(res.stderr || res.stdout, '  '));
    const left = collectFiles(configDir, []);
    if (left.length) throw new Error('install dry-run wrote files: ' + left.map(p => path.relative(configDir, p)).join(', '));
    if (!res.stdout.includes(configDir)) {
      throw new Error('install dry-run did not name the target it would write (' + configDir + '):\n' + tape(res.stdout, '  '));
    }
    return res.stdout.trim();
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});

step('egress', 'shipped code makes no network call', () => {
  const targets = [];
  for (const rel of EGRESS_SCAN) {
    const full = path.join(root, rel.split('/').join(path.sep));
    if (!fs.existsSync(full)) throw new Error('egress scan target missing: ' + rel);
    if (fs.statSync(full).isDirectory()) {
      collectFiles(full, []).filter(f => f.endsWith('.js')).forEach(f => targets.push(f));
    } else {
      targets.push(full);
    }
  }

  const hits = [];
  for (const abs of targets) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    const text = fs.readFileSync(abs, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (NETWORK_MODULE.test(line) || NETWORK_CALL.test(line)) hits.push(rel + ':' + (i + 1) + ' ' + line.trim());
    });
  }
  if (hits.length) {
    throw new Error('shipped code reaches the network, contradicting the no-egress statement:\n' + hits.map(h => '  ' + h).join('\n'));
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = pkg.scripts || {};
  const lifecycle = FORBIDDEN_LIFECYCLE.filter(k => scripts[k]);
  if (lifecycle.length) {
    throw new Error('package.json declares install lifecycle scripts (' + lifecycle.join(', ') + '); an install must not run code the tarball did not ship as its exit');
  }

  for (const rel of PLUGIN_MANIFESTS) {
    const dir = path.dirname(path.dirname(path.join(root, rel.split('/').join(path.sep))));
    const hookMapPath = path.join(dir, 'hooks', 'hooks.json');
    if (!fs.existsSync(hookMapPath)) continue;
    const map = JSON.parse(fs.readFileSync(hookMapPath, 'utf8'));
    for (const [event, groups] of Object.entries(map.hooks || {})) {
      for (const group of groups) {
        for (const hook of group.hooks || []) {
          if (hook.type !== 'command') continue;
          if (!BUNDLED_COMMAND.test(String(hook.command || '').trim())) {
            throw new Error(rel + ' hook ' + event + ' runs a command outside the bundle: ' + hook.command);
          }
        }
      }
    }
  }

  return targets.length + ' shipped files scanned: no http/https/net/dns/tls/dgram require, no fetch/https.request, ' +
    'no install lifecycle script, every hook command resolves inside its bundle';
});

step('declarations', 'write scope and no-egress statements are present', () => {
  const docRel = 'docs/release.md';
  const full = path.join(root, docRel.split('/').join(path.sep));
  if (!fs.existsSync(full)) throw new Error(docRel + ' is missing: the release must declare its write scope and no-egress claim');
  const text = fs.readFileSync(full, 'utf8');
  const missing = ['## 写入范围', '## 无网络外呼'].filter(h => !text.includes(h));
  if (missing.length) throw new Error(docRel + ' is missing required sections: ' + missing.join(', '));
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  if (!readme.includes(docRel)) throw new Error('README.md does not link ' + docRel + '; the declaration must be reachable from the install instructions');
  return docRel + ' carries 写入范围 + 无网络外呼; README.md links it';
});

// ---- driver --------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/release-gate.js --tag vX.Y.Z [--only <step[,step]>] [--evidence <file>] [--artifact-dir <dir>]');
    console.log('Steps: ' + steps.map(s => s.name).join(', '));
    return;
  }

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error('error: ' + e.message);
    process.exit(2);
  }

  const tag = opts.tag || tagFromEnv(process.env);
  if (!tag) {
    console.error('error: no tag given. The release gate runs on a tag: pass --tag vX.Y.Z or run it from a tag build (GITHUB_REF_NAME).');
    process.exit(2);
  }
  if (opts.only) {
    const known = new Set(steps.map(s => s.name));
    const unknown = opts.only.filter(n => !known.has(n));
    if (unknown.length) {
      console.error('error: unknown step(s) in --only: ' + unknown.join(', ') + ' (known: ' + steps.map(s => s.name).join(', ') + ')');
      process.exit(2);
    }
  }

  const ctx = {
    tag: tag,
    commit: null,
    artifact: null,
    trees: null,
    artifactDir: opts.artifactDir ? path.resolve(process.cwd(), opts.artifactDir) : null,
  };
  const selected = steps.filter(s => !opts.only || opts.only.includes(s.name));
  const evidence = { tag: tag, version: parseTag(tag), commit: null, steps: [], artifact: null, trees: null, declarations: { writeScope: 'docs/release.md#写入范围', noEgress: 'docs/release.md#无网络外呼' } };
  let failed = null;

  for (const s of selected) {
    const started = Date.now();
    try {
      const detail = s.run(ctx);
      const ms = Date.now() - started;
      evidence.steps.push({ name: s.name, title: s.title, ok: true, ms: ms, detail: detail });
      console.log('PASS ' + (s.name + ' ').padEnd(13) + s.title + ' (' + ms + ' ms)');
      for (const line of String(detail).split('\n')) console.log('     ' + line);
    } catch (e) {
      const ms = Date.now() - started;
      evidence.steps.push({ name: s.name, title: s.title, ok: false, ms: ms, error: e.message });
      console.error('FAIL ' + (s.name + ' ').padEnd(13) + s.title + ' (' + ms + ' ms)');
      console.error('     ' + e.message.split('\n').join('\n     '));
      failed = s.name;
      break;
    }
  }

  const notRun = selected.filter(s => !evidence.steps.some(e => e.name === s.name)).map(s => s.name + ' [' + s.title + ']');
  evidence.ok = !failed && notRun.length === 0;
  evidence.commit = ctx.commit;
  evidence.artifact = ctx.artifact;
  evidence.trees = ctx.trees;

  if (opts.evidence) {
    // The artifact step creates the directory when it gets that far; an earlier
    // failure must still leave a record, not a stack trace.
    const evidencePath = path.resolve(process.cwd(), opts.evidence);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  }

  if (!evidence.ok) {
    if (notRun.length) console.error('\nNOT RUN after ' + failed + ': ' + notRun.join(', '));
    console.error('\nRELEASE GATE RED' + (opts.only ? ' (partial run: --only ' + opts.only.join(',') + ')' : ''));
    process.exit(1);
  }

  // A subset run is an iteration aid, never a release verdict: it says so on
  // the line itself, because "GREEN" is the word a release gets judged by.
  const partial = opts.only ? ' (partial run: --only ' + opts.only.join(',') + ')' : '';
  console.log('\nRELEASE GATE ' + (opts.only ? 'PARTIAL GREEN — not a release verdict' : 'GREEN') +
    ' — ' + tag + ' (' + (ctx.commit ? ctx.commit.slice(0, 12) : 'commit not read') + ')' + partial);
  if (ctx.artifact) {
    console.log('artifact  ' + ctx.artifact.file + '  ' + ctx.artifact.bytes + ' B');
    console.log('sha256    ' + ctx.artifact.sha256);
    for (const [dir, hash] of Object.entries(ctx.trees || {})) console.log('tree      ' + dir + '  ' + hash);
  }
  console.log('declared  docs/release.md — 写入范围, 无网络外呼');
  if (opts.evidence) console.log('evidence  ' + opts.evidence);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('error: ' + e.message);
    process.exit(1);
  }
}

module.exports = {
  parseTag,
  auditPackFiles,
  treeHash,
  sha256,
  REQUIRED_PACK_FILES,
  FORBIDDEN_PACK_PREFIXES,
  steps,
};
