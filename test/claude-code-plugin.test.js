'use strict';
// test/claude-code-plugin.test.js - #61: the Claude Code plugin is a
// self-contained directory, not a README that points at the repo root.
//
// Shape assertions read the IN-MEMORY generator output (buildAdapters), the
// same rule skill-dir.test.js follows: another suite reruns the generator
// while jest works, so a read of a generated file on disk can land in a
// truncate window. Only non-generated inputs (package.json, src/SKILL.md,
// hooks/*.js) are read from disk. The behavior tests materialize that same
// in-memory output into a temp dir and spawn from there, so they exercise the
// shipped bytes without racing the generator.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { builtinModules } = require('module');

const { buildAdapters } = require('../scripts/build-adapters');

const ROOT = path.join(__dirname, '..');
const BUNDLE = 'adapters/claude-code/';
const generated = buildAdapters();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const pkgRepository = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

const HOOK_EVENTS = ['SessionStart', 'SubagentStart', 'UserPromptSubmit', 'Stop', 'SubagentStop', 'SessionEnd', 'PreToolUse'];
const VENDORED_HOOKS = [
  'jiahao-activate', 'jiahao-subagent', 'jiahao-mode-tracker', 'jiahao-verdict-gate',
  'jiahao-sweep', 'jiahao-runtime', 'jiahao-profile', 'jiahao-pretool-guard',
];

const readGenerated = (rel) => {
  const text = generated[rel];
  if (text === undefined) throw new Error('generator did not emit ' + rel);
  return text;
};

// Write the bundle exactly as the generator emits it into a throwaway dir, so
// the spawned hooks run the shipped bytes while no other suite can rewrite
// them mid-test.
function materializeBundle() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cc-bundle-'));
  for (const [rel, text] of Object.entries(generated)) {
    if (!rel.startsWith(BUNDLE)) continue;
    const abs = path.join(dir, rel.slice(BUNDLE.length).split('/').join(path.sep));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
  }
  return dir;
}

// Resolve a relative require() the way node does, against the in-memory map.
function resolveInBundle(fromRel, spec) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  for (const c of [base, base + '.js', base + '.json', base + '/index.js']) {
    if (generated[c] !== undefined) return c;
  }
  return null;
}

describe('bundle structure', () => {
  test('the plugin is a directory with a manifest, an auto-loaded hook map, and a skill body', () => {
    for (const rel of [
      BUNDLE + '.claude-plugin/plugin.json',
      BUNDLE + 'hooks/hooks.json',
      BUNDLE + 'src/SKILL.md',
      BUNDLE + 'src/instrument-identity.json', // require-time pin for calibration.js
      BUNDLE + 'README.md',
    ]) {
      expect(typeof generated[rel]).toBe('string');
    }
    // the manifest lives ONLY in .claude-plugin/ (host contract)
    expect(generated[BUNDLE + 'plugin.json']).toBeUndefined();
  });

  test('manifest parses; version, license, and repository come from the package', () => {
    const m = JSON.parse(readGenerated(BUNDLE + '.claude-plugin/plugin.json'));
    expect(m.name).toBe('jiahao');
    expect(m.version).toBe(pkg.version);
    expect(m.license).toBe(pkg.license);
    expect(m.repository).toBe(pkgRepository);
    expect(m.defaultEnabled).toBe(false);
  });

  // hooks/hooks.json and .mcp.json are auto-discovered at the plugin root. The
  // manifest's hooks/mcpServers fields load *in addition* to those files, so
  // repeating them would register the same map twice.
  test('the manifest does not duplicate the auto-discovered component files', () => {
    const m = JSON.parse(readGenerated(BUNDLE + '.claude-plugin/plugin.json'));
    expect(m.hooks).toBeUndefined();
    expect(m.mcpServers).toBeUndefined();
  });

  test('vendored hook scripts and the skill body are byte copies of their sources', () => {
    for (const name of VENDORED_HOOKS) {
      expect(readGenerated(BUNDLE + 'hooks/' + name + '.js'))
        .toBe(fs.readFileSync(path.join(ROOT, 'hooks', name + '.js'), 'utf8'));
    }
    expect(readGenerated(BUNDLE + 'src/SKILL.md'))
      .toBe(fs.readFileSync(path.join(ROOT, 'src', 'SKILL.md'), 'utf8'));
  });

  // #59 keeps jiahao-mcp in the repo but not as a plugin component; an
  // auto-discovered .mcp.json would register a server without its deps.
  test('the MCP server is not part of this bundle', () => {
    expect(generated[BUNDLE + '.mcp.json']).toBeUndefined();
    expect(Object.keys(generated).filter(rel => rel.startsWith(BUNDLE + 'jiahao-mcp/'))).toEqual([]);
  });

  test('no relative require() resolves outside the bundle, and nothing third-party is required', () => {
    const REQ = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const escapes = [];
    const external = [];
    const edges = new Map();
    let scanned = 0;
    for (const rel of Object.keys(generated).filter(r => r.startsWith(BUNDLE) && r.endsWith('.js'))) {
      scanned++;
      const text = generated[rel];
      let m;
      while ((m = REQ.exec(text))) {
        const spec = m[1];
        if (!spec.startsWith('.')) {
          // Node builtins are fine; anything else would break the README's
          // "no third-party runtime dependency" claim.
          const bare = spec.replace(/^node:/, '').split('/')[0];
          if (!builtinModules.includes(bare)) external.push(rel + ' -> ' + spec);
          continue;
        }
        const resolved = resolveInBundle(rel, spec);
        edges.set(rel + ' -> ' + spec, resolved);
        if (!resolved || !resolved.startsWith(BUNDLE)) escapes.push(rel + ' -> ' + spec);
      }
      REQ.lastIndex = 0;
    }
    expect(escapes).toEqual([]);
    expect(external).toEqual([]);
    // Fixpoint: an empty `escapes` also passes when the scan walked nothing.
    // The floors sit well under the current closure, so they catch an empty
    // walk without pinning today's file count.
    expect(scanned).toBeGreaterThanOrEqual(15);
    expect(edges.size).toBeGreaterThanOrEqual(25);
    expect(edges.get(BUNDLE + 'src/evidence-log.js -> ./shared/paths'))
      .toBe(BUNDLE + 'src/shared/paths.js');
    expect(edges.get(BUNDLE + 'src/instrument-identity.js -> ./evidence-log'))
      .toBe(BUNDLE + 'src/evidence-log.js');
  });
});

describe('marketplace manifest', () => {
  const marketplace = JSON.parse(readGenerated('.claude-plugin/marketplace.json'));

  test('has the three required top-level fields', () => {
    expect(marketplace.name).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(typeof marketplace.owner.name).toBe('string');
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBe(1);
  });

  test('source points at the plugin directory, not the repo root', () => {
    const entry = marketplace.plugins[0];
    expect(entry.source.startsWith('./')).toBe(true);
    expect(entry.source).not.toContain('..');
    const resolved = path.posix.normalize(entry.source).replace(/\/$/, '');
    expect(resolved).toBe('adapters/claude-code');
    expect(typeof generated[resolved + '/.claude-plugin/plugin.json']).toBe('string');
  });

  test('the entry name matches the plugin manifest name', () => {
    const m = JSON.parse(readGenerated(BUNDLE + '.claude-plugin/plugin.json'));
    expect(marketplace.plugins[0].name).toBe(m.name);
  });

  // The host validator warns when the entry and plugin.json both set a version;
  // plugin.json is the authority, and it carries the package version.
  test('the version lives in plugin.json only', () => {
    expect(marketplace.plugins[0].version).toBeUndefined();
  });
});

describe('hook map', () => {
  const cfg = JSON.parse(readGenerated(BUNDLE + 'hooks/hooks.json'));

  test('registers the Claude Code event set, Stop/SubagentStop on the same gate', () => {
    expect(Object.keys(cfg.hooks).sort()).toEqual(HOOK_EVENTS.slice().sort());
    expect(cfg.hooks.Stop[0].hooks[0].command).toBe(cfg.hooks.SubagentStop[0].hooks[0].command);
    expect(cfg.hooks.Stop[0].hooks[0].command).toContain('jiahao-verdict-gate.js');
  });

  test('every command stays inside the plugin root and names a vendored script', () => {
    for (const ev of HOOK_EVENTS) {
      for (const entry of cfg.hooks[ev]) {
        for (const h of entry.hooks) {
          expect(h.type).toBe('command');
          expect(h.timeout).toBeLessThanOrEqual(60);
          const m = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)"$/.exec(h.command);
          expect(m).not.toBeNull();
          expect(typeof generated[BUNDLE + m[1]]).toBe('string');
          // no repo-relative path and no parent traversal
          expect(h.command).not.toContain('adapters/');
          expect(h.command).not.toContain('..');
        }
      }
    }
  });
});

// The bundled copies are what the host actually runs, so the gate's Stop
// semantics are checked on the copy, not only on hooks/ at the repo root.
describe('bundled Stop gate (live spawn, temp config dir)', () => {
  let bundleDir;
  beforeAll(() => {
    bundleDir = materializeBundle();
  });

  function runBundled(script, opts) {
    const env = Object.assign({}, process.env);
    for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID', 'CODEBUDDY_PLUGIN_ROOT']) delete env[k];
    env.CLAUDE_CONFIG_DIR = opts.configDir;
    env.CLAUDE_PLUGIN_ROOT = bundleDir;
    return spawnSync(process.execPath, [path.join(bundleDir, 'hooks', script)], {
      input: opts.stdin === undefined ? '{}' : opts.stdin,
      env: env, encoding: 'utf8', timeout: 15000,
    });
  }

  function configDir(profile) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cc-'));
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
    return dir;
  }

  test('a completion claim with an empty evidence chain is blocked (exit 2)', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-verdict-gate.js', {
      configDir: dir, stdin: JSON.stringify({ stop_hook_active: false, session_id: 'probe' }),
    });
    expect(res.status).toBe(2);
    const out = JSON.parse(res.stdout.trim());
    expect(out.decision).toBe('block');
    expect(out.reason).toContain('no evidence');
  });

  test('SessionStart injects the verifier profile from the bundled SKILL.md', () => {
    const dir = configDir('verifier');
    const res = runBundled('jiahao-activate.js', { configDir: dir, stdin: '{}' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Jiahao');
    expect(res.stdout).toContain('verification ladder');
  });
});
