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
//   7 egress        code that runs after install makes no network call; no
//                   install lifecycle scripts; hook commands stay in the bundle
//   8 declarations  docs/release.md carries the write-scope and no-egress
//                   statements this gate relies on
//
// Step order is not cosmetic: the generator gates run BEFORE npm test so a
// stale or hand-edited artifact is caught before the suite starts. The suite
// no longer rewrites the workspace (#76 closed #66), so the order is now a
// belt rather than the only thing keeping the comparison honest; the CI job
// lists them first for the same reason.
//
// Usage:
//   node scripts/release-gate.js --tag v0.2.0 [--only <step[,step]>] [--evidence <file>]
// In CI the tag is read from GITHUB_REF_NAME when it names a tag ref.
//
// Exit codes: 0 all steps passed (a release verdict); 1 a step failed; 2 usage
// error; 3 the selected subset passed - an iteration aid, never a release
// verdict, and the evidence JSON records it as not ok.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { HOSTS, dialectOf, hookEntryCommands } = require('./build-adapters');

const root = path.join(__dirname, '..');

// What the packed artifact must carry and must never carry. Shared with
// test/packaging.test.js so the jest assertion and the tag command cannot
// drift apart: one list, two readers. The per-host entries come from the
// generator's host table, so a new bundle is required in the tarball without
// touching this list.
const REQUIRED_PACK_FILES = [
  'package.json',
  // `jiahao resolve` is dispatched from the installer and its module went
  // missing once (#85); a tarball that drops it breaks the only release path
  // for an unmarked stale record, and the failure only shows up on a user's
  // machine.
  'scripts/resolve.js',
  'skills/jiahao/SKILL.md',
  ...HOSTS.map(host => host.dir + '/' + dialectOf(host).manifestPath),
  ...HOSTS.filter(host => Object.keys(host.hooks || {}).length > 0).map(host => host.dir + '/' + dialectOf(host).hookMapPath),
  ...HOSTS.flatMap(host => host.rules.map(rule => host.dir + '/rules/' + rule.file)),
  '.claude-plugin/marketplace.json',
  'docs/release.md',
];
// Private corpus and the research / frozen-evaluation records never ship.
const FORBIDDEN_PACK_PREFIXES = ['private/', 'bench/', 'docs/research/'];

// Every plugin bundle and the rules directory get a deterministic content hash
// of their own: the tarball hash covers everything at once, and a broken single
// bundle is easier to name than a tarball diff.
const HASHED_TREES = ['skills/jiahao', ...HOSTS.map(host => host.dir)];

const PLUGIN_MANIFESTS = HOSTS.map(host => host.dir + '/' + dialectOf(host).manifestPath);
const MARKETPLACE_MANIFEST = '.claude-plugin/marketplace.json';

// Files that run on a user's machine once jiahao is installed: the installer
// and the resolve entry it dispatches, the runtime under src/, every hook the
// plugin bundles vendor (byte copies of hooks/, asserted by
// test/plugin-bundles.test.js), and the MCP server the user starts. Maintainer
// tools (this gate, the generator, the drift check) are not install paths and
// are deliberately outside the scan.
const EGRESS_SCAN = ['scripts/install.js', 'scripts/resolve.js', 'hooks', 'src', 'jiahao-mcp/index.js'];
const NETWORK_MODULE = /\brequire\(\s*['"](?:node:)?(?:https?|http2|net|dns|tls|dgram)(?:\/[a-z]+)?['"]\s*\)/;
const NETWORK_CALL = /(?:\bfetch\s*\(|XMLHttpRequest|https?\.(?:request|get)\s*\()/;
// Lifecycle scripts would turn `npm install` into "download and execute".
const FORBIDDEN_LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack'];
// Plugin hook commands must resolve inside the bundle. The spelling of each
// command field is the host row's dialect (scripts/hosts/*.js), not a second
// copy here: one pattern per field, and the capture names the path inside the
// bundle so "the script it runs" can be checked to exist as well.

function parseTag(tag) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(String(tag || ''));
  if (!m) return null;
  return m[1];
}

function parseArgs(argv) {
  const out = { tag: null, only: null, evidence: null, artifactDir: null };
  const VALUE_FLAGS = { '--tag': 'tag', '--only': 'only', '--evidence': 'evidence', '--artifact-dir': 'artifactDir' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const key = VALUE_FLAGS[a];
    if (!key) throw new Error('unknown argument: ' + a);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error('option ' + a + ' needs a value');
    i++;
    out[key] = a === '--only' ? value.split(',').map(s => s.trim()).filter(Boolean) : value;
  }
  return out;
}

// CI hands the tag over as a ref name; only a refs/tags/* ref is a release.
function tagFromEnv(env) {
  if (!env.GITHUB_REF_NAME) return null;
  if (env.GITHUB_REF && !env.GITHUB_REF.startsWith('refs/tags/')) return null;
  return env.GITHUB_REF_NAME;
}

function runCommand(cmd, args, opts) {
  const options = Object.assign({
    cwd: root,
    encoding: 'utf8',
    timeout: 600000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  }, opts || {});
  const res = spawnSync(cmd, args, options);
  if (res.error) throw new Error(cmd + ' did not complete: ' + res.error.message);
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
  return runCommand(npmCmd.cmd, npmCmd.args.concat(args), spawnOpts);
}

function tailLines(text, prefix) {
  const lines = String(text).trim().split('\n');
  return lines.slice(-25).map(l => prefix + l).join('\n');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Sorted-path tree hash: for every file, "rel\0<sha256 of bytes>", then the
// hash of those lines. Deterministic across machines, unlike a tarball of the
// same files with different timestamps.
function treeHashAt(absDir) {
  const files = [];
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const childRel = rel ? rel + '/' + entry.name : entry.name;
      const childAbs = path.join(abs, entry.name);
      if (entry.isDirectory()) walk(childAbs, childRel);
      else files.push(childRel + '\u0000' + sha256(fs.readFileSync(childAbs)));
    }
  };
  walk(absDir, '');
  return sha256(files.join('\n'));
}

function treeHash(relDir) {
  return treeHashAt(path.join(root, relDir.split('/').join(path.sep)));
}

// Both halves of the packaging contract, as data a caller can report on.
function auditPackFiles(files) {
  const problems = [];
  for (const rel of REQUIRED_PACK_FILES) {
    if (!files.includes(rel)) problems.push({ kind: 'missing', rel: rel });
  }
  for (const rel of files) {
    for (const prefix of FORBIDDEN_PACK_PREFIXES) {
      if (rel.startsWith(prefix)) problems.push({ kind: 'forbidden', rel: rel, prefix: prefix });
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

function step(name, title, check) {
  steps.push({ name, title, check });
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

  const status = runCommand('git', ['status', '--porcelain']);
  if (status.status !== 0) throw new Error('git status failed: ' + status.stderr.trim());
  if (status.stdout.trim()) {
    throw new Error('working tree is not clean; a release must be built from exactly the tagged tree:\n' + status.stdout.trim());
  }

  const head = runCommand('git', ['rev-parse', 'HEAD']);
  if (head.status !== 0) throw new Error('git rev-parse HEAD failed: ' + head.stderr.trim());
  const tagCommit = runCommand('git', ['rev-list', '-n', '1', tag]);
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
  const res = runCommand(process.execPath, [path.join('scripts', 'build-adapters.js'), '--check']);
  if (res.status !== 0) throw new Error('generated output drifted from src/SKILL.md:\n' + tailLines(res.stderr || res.stdout, '  '));
  return res.stdout.trim();
});

step('drift', 'profile fragments and retired adapter exits', () => {
  const res = runCommand(process.execPath, [path.join('scripts', 'check-drift.js')]);
  if (res.status !== 0) throw new Error('drift check failed:\n' + tailLines(res.stderr || res.stdout, '  '));
  return res.stdout.trim();
});

step('tests', 'full test suite (npm test)', () => {
  const res = npm(['test'], { timeout: 1800000 });
  if (res.status !== 0) throw new Error('npm test failed (exit ' + res.status + '):\n' + tailLines(res.stderr || res.stdout, '  '));
  const summary = (res.stderr || res.stdout).match(/Tests:.*$/m);
  return summary ? summary[0].trim() : 'npm test exited 0';
});

step('artifact', 'pack contents, sha256, per-tree hashes', (ctx) => {
  // A test that writes the workspace would leave the tree different from the
  // tagged one; the suite is supposed to write temp dirs only (#76), so this
  // re-check is the backstop that keeps that true.
  const status = runCommand('git', ['status', '--porcelain']);
  if (status.status !== 0) throw new Error('git status failed: ' + status.stderr.trim());
  if (status.stdout.trim()) {
    throw new Error('working tree is dirty, so the artifact would not be the tagged tree:\n' + status.stdout.trim());
  }

  const packOnce = () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-pack-'));
    try {
      const res = npm(['pack', '--json', '--pack-destination', dest], { timeout: 600000 });
      if (res.status !== 0) throw new Error('npm pack failed (exit ' + res.status + '):\n' + tailLines(res.stderr || res.stdout, '  '));
      let packed;
      try {
        packed = JSON.parse(res.stdout)[0];
      } catch (e) {
        throw new Error('npm pack --json output did not parse: ' + e.message + '\n' + tailLines(res.stdout, '  '));
      }
      const tarball = path.join(dest, packed.filename);
      return { packed: packed, bytes: fs.readFileSync(tarball) };
    } finally {
      // The bytes are in memory by now; the temp directory has no other user.
      fs.rmSync(dest, { recursive: true, force: true });
    }
  };

  const first = packOnce();
  const files = (first.packed.files || []).map(f => f.path);
  const problems = auditPackFiles(files);
  if (problems.length) {
    throw new Error('packed artifact violates the content contract:\n' +
      problems.map(p => p.kind === 'missing'
        ? '  MISSING: ' + p.rel
        : '  FORBIDDEN: ' + p.rel + ' (' + p.prefix + ' must not ship)').join('\n'));
  }

  // Same tree, second pack: identical bytes is what makes the SHA256 worth
  // quoting and what "reproducible" means for the artifact itself.
  const second = packOnce();
  const firstHash = sha256(first.bytes);
  const secondHash = sha256(second.bytes);
  if (firstHash !== secondHash) {
    throw new Error('two packs of the same tree differ (' + firstHash + ' vs ' + secondHash + '); the artifact is not reproducible');
  }

  ctx.artifact = { file: first.packed.filename, bytes: first.bytes.length, sha256: firstHash, files: files.length, reproducible: true };
  // Kept only when asked: the release needs the bytes to attach, a local run
  // usually does not, and the gate should not leave files behind by default.
  if (ctx.artifactDir) {
    fs.mkdirSync(ctx.artifactDir, { recursive: true });
    const kept = path.join(ctx.artifactDir, first.packed.filename);
    fs.writeFileSync(kept, first.bytes);
    // <hash>  <file> is what `sha256sum -c` reads, so the Release asset and
    // the checksum travel together instead of the hash living only in a log.
    fs.writeFileSync(kept + '.sha256', firstHash + '  ' + first.packed.filename + '\n', 'utf8');
    ctx.artifact.path = kept;
    ctx.artifact.sha256File = kept + '.sha256';
  }
  ctx.trees = {};
  for (const dir of HASHED_TREES) ctx.trees[dir] = treeHash(dir);
  return first.packed.filename + ' (' + first.bytes.length + ' B, ' + files.length + ' files)\n' +
    '  sha256  ' + firstHash + ' (identical on a second pack)\n' +
    '  trees   ' + HASHED_TREES.join(', ') +
    (ctx.artifact.path ? '\n  kept    ' + ctx.artifact.path + ' + .sha256' : '');
});

step('install', 'installer dry-run writes nothing', () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-gate-config-'));
  // Run from an empty directory too: the declaration says no file lands in the
  // working directory, and a config-dir-only check would not notice if it did.
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-gate-cwd-'));
  try {
    const res = runCommand(process.execPath, [path.join(root, 'scripts', 'install.js'), 'init', '--profile', 'verifier', '--dry-run'], {
      cwd: cwd,
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: configDir }),
    });
    if (res.status !== 0) throw new Error('install dry-run exited ' + res.status + ':\n' + tailLines(res.stderr || res.stdout, '  '));
    const leftInConfig = collectFiles(configDir, []);
    if (leftInConfig.length) throw new Error('install dry-run wrote config files: ' + leftInConfig.map(p => path.relative(configDir, p)).join(', '));
    const leftInCwd = collectFiles(cwd, []);
    if (leftInCwd.length) throw new Error('install dry-run wrote files into the working directory: ' + leftInCwd.map(p => path.relative(cwd, p)).join(', '));
    if (!res.stdout.includes(configDir)) {
      throw new Error('install dry-run did not name the target it would write (' + configDir + '):\n' + tailLines(res.stdout, '  '));
    }
    return res.stdout.trim();
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

step('egress', 'code that runs after install makes no network call', () => {
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
  // A scan that found nothing to scan proves nothing. Pin the load-bearing
  // files: the installer and the resolve entry it dispatches, the Stop gate, the
  // evidence log, and the sources the plugin bundles vendor byte-for-byte (the
  // `generated` step asserts the copies).
  const scanned = new Set(targets.map(f => path.relative(root, f).split(path.sep).join('/')));
  const unseen = [
    'scripts/install.js',
    'scripts/resolve.js',
    'hooks/jiahao-verdict-gate.js',
    'src/evidence-log.js',
    'jiahao-mcp/index.js',
  ].filter(rel => !scanned.has(rel));
  if (unseen.length) {
    throw new Error('egress scan did not reach load-bearing files: ' + unseen.join(', ') + ' (a scan that finds nothing asserts nothing)');
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
    throw new Error('code that runs after install reaches the network, contradicting the no-egress statement:\n' + hits.map(h => '  ' + h).join('\n'));
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = pkg.scripts || {};
  const lifecycle = FORBIDDEN_LIFECYCLE.filter(k => scripts[k]);
  if (lifecycle.length) {
    throw new Error('package.json declares install lifecycle scripts (' + lifecycle.join(', ') + '); installing must not run code beyond what the tarball ships');
  }

  for (const host of HOSTS) {
    // A host with no hook map is not a plugin; skipping a C-tier (rules-only)
    // row is deliberate, skipping one that declares events would let
    // `--only egress` report green over a bundle that has no commands.
    if (Object.keys(host.hooks || {}).length === 0) continue;
    const dialect = dialectOf(host);
    const rel = host.dir + '/' + dialect.manifestPath;
    const hookMapPath = path.join(root,
      host.dir.split('/').join(path.sep), dialect.hookMapPath.split('/').join(path.sep));
    if (!fs.existsSync(hookMapPath)) throw new Error(rel + ' has no ' + dialect.hookMapPath + ' beside it');
    const map = JSON.parse(fs.readFileSync(hookMapPath, 'utf8'));
    if (Object.keys(map.hooks || {}).length === 0) {
      throw new Error(rel + ' has a hook map that registers no events');
    }
    for (const [event, entries] of Object.entries(map.hooks || {})) {
      for (const entry of entries) {
        const commands = hookEntryCommands(entry);
        if (commands.length === 0) {
          throw new Error(rel + ' hook ' + event + ' registers no command');
        }
        for (const hook of commands) {
          if (hook.type !== 'command') continue;
          // Each field is checked against its own pattern: a bash entry spelled
          // with the PowerShell variable is a command the host would run in the
          // wrong shell, not an acceptable variant.
          for (const field of dialect.commandFields) {
            const cmd = String(hook[field] || '').trim();
            const m = dialect.commandPatterns[field].exec(cmd);
            if (!m) {
              throw new Error(rel + ' hook ' + event + ' runs a ' + field + ' command outside the bundle: ' + cmd);
            }
            if (!fs.existsSync(path.join(root, host.dir.split('/').join(path.sep), m[1].split('/').join(path.sep)))) {
              throw new Error(rel + ' hook ' + event + ' runs a ' + field + ' command naming a file that is not in the bundle: ' + m[1]);
            }
          }
        }
      }
    }
  }

  return targets.length + ' install-path files scanned: no http/http2/https/net/dns/tls/dgram require, no fetch or https.request, ' +
    'no install lifecycle script, every hook command resolves inside its bundle';
});

// Every path the shipped code can write, named in the document's table. A doc
// that renames a heading but drops a row would still look fine to a reader, so
// the gate checks the rows the code can produce.
const DECLARED_WRITE_PATHS = [
  '.jiahao-profile',
  '.jiahao-active',
  '.jiahao-evidence',
  '.jiahao-evidence.keys',
  '.jiahao-evidence.lock',
  '.jiahao-evidence.legacy.bak',
  '.jiahao-persistence.json',
  '.jiahao-anchor.json',
  '.jiahao-pretool.jsonl',
  '.jiahao-instructions.jsonl',
  '.jiahao-calibration.jsonl',
  '.jiahao-sentinel.',
  'private/phrases.json',
  'private/bench-corpus',
  'skills/jiahao/SKILL.md',
];

// The write-scope table itself, row by row: a path mentioned in prose elsewhere
// in the document is not a declaration of where that path gets written.
function writeScopeRows(text) {
  const afterHeading = text.split('## 写入范围')[1];
  if (afterHeading === undefined) return [];
  const section = afterHeading.split('\n## ')[0];
  return section.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
}

// A row declares a path only when the hit is not the head of a longer path.
// `.jiahao-evidence` is a prefix of `.jiahao-evidence.keys` (and of `.lock`,
// `.legacy.bak`), so a plain substring test would let a table that dropped the
// evidence-directory row pass on a keys row - the opposite of what this check
// exists for. A following path character (word, dot, dash) means "some other
// path", so the match does not count.
function declaresPath(row, declared) {
  const escaped = declared.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped + '(?![\\w.-])').test(row);
}

step('declarations', 'write scope and no-egress statements are present', () => {
  const docRel = 'docs/release.md';
  const full = path.join(root, docRel.split('/').join(path.sep));
  if (!fs.existsSync(full)) throw new Error(docRel + ' is missing: the release must declare its write scope and no-egress claim');
  const text = fs.readFileSync(full, 'utf8');
  const missing = ['## 写入范围', '## 无网络外呼'].filter(h => !text.includes(h));
  if (missing.length) throw new Error(docRel + ' is missing required sections: ' + missing.join(', '));

  const rows = writeScopeRows(text);
  if (rows.length < 3) throw new Error(docRel + ' has no write-scope table rows under ## 写入范围');
  const undeclared = DECLARED_WRITE_PATHS.filter(p => !rows.some(row => declaresPath(row, p)));
  if (undeclared.length) {
    throw new Error(docRel + ' write-scope table omits paths the shipped code writes: ' + undeclared.join(', '));
  }
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  if (!readme.includes(docRel)) throw new Error('README.md does not link ' + docRel + '; the declaration must be reachable from the install instructions');
  return docRel + ' table declares ' + DECLARED_WRITE_PATHS.length + ' write paths in ' + rows.length + ' rows + 无网络外呼; README.md links it';
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
    if (opts.only.length === 0) {
      console.error('error: --only needs at least one step name (known: ' + steps.map(s => s.name).join(', ') + ')');
      process.exit(2);
    }
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
  const evidence = { tag: tag, version: parseTag(tag), status: null, ok: false, commit: null, partial: opts.only || null, steps: [], artifact: null, trees: null, declarations: null };
  let failed = null;

  for (const s of selected) {
    const started = Date.now();
    try {
      const detail = s.check(ctx);
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
  // Three outcomes, one field: readers of the JSON (the CI summary, a Release
  // note) must not have to re-derive "was this a release verdict" from a
  // boolean plus a partial list.
  const status = (failed || notRun.length) ? 'red' : (opts.only ? 'partial' : 'green');
  evidence.status = status;
  // `ok` is true only for a complete run: a subset run is an iteration aid, and
  // evidence a Release might quote must never say "green" about it.
  evidence.ok = status === 'green';
  evidence.commit = ctx.commit;
  evidence.artifact = ctx.artifact;
  evidence.trees = ctx.trees;
  // Only a step that ran can declare anything.
  if (evidence.steps.some(s => s.name === 'declarations' && s.ok)) {
    evidence.declarations = { writeScope: 'docs/release.md#写入范围', noEgress: 'docs/release.md#无网络外呼' };
  }

  if (opts.evidence) {
    // The artifact step creates the directory when it gets that far; an earlier
    // failure must still leave a record, not a stack trace.
    const evidencePath = path.resolve(process.cwd(), opts.evidence);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  }

  if (failed || notRun.length) {
    if (notRun.length) console.error('\nNOT RUN after ' + failed + ': ' + notRun.join(', '));
    console.error('\nRELEASE GATE RED' + (opts.only ? ' (partial run: --only ' + opts.only.join(',') + ')' : ''));
    process.exit(1);
  }

  const summary = ' — ' + tag + ' (' + (ctx.commit ? ctx.commit.slice(0, 12) : 'commit not read') + ')';
  if (opts.only) {
    // Exit 3, not 0: a wrapper that only reads the exit status must not mistake
    // a subset run for a release verdict.
    console.log('\nRELEASE GATE PARTIAL GREEN — not a release verdict (--only ' + opts.only.join(',') + ')' + summary);
    console.log('the release verdict needs all ' + steps.length + ' steps: node scripts/release-gate.js --tag ' + tag);
    process.exit(3);
  }

  console.log('\nRELEASE GATE GREEN' + summary);
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
  writeScopeRows,
  declaresPath,
  auditPackFiles,
  treeHash,
  treeHashAt,
  sha256,
  REQUIRED_PACK_FILES,
  FORBIDDEN_PACK_PREFIXES,
  DECLARED_WRITE_PATHS,
  steps,
};
