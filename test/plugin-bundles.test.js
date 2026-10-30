'use strict';
// test/plugin-bundles.test.js - #76: the structural contract of every host
// exit, asserted once per row of the generator's host table. A row with a
// manifest is a plugin bundle; a row with manifest: null is the rules-only
// shape (rule text + README, no manifest, no hooks).
//
// Adding a host is a row in the generator's HOSTS table; this file names no host.
// Everything is read from the IN-MEMORY generator output: the committed bytes
// are `--check`'s job, and the suites that spawn hooks materialize the same
// output into a temp dir (test/helpers/generated-bundle.js).
//
// tier claims are falsifiable here: an A row must wire its turn-end event to
// the verdict gate, a C row must not register hooks, and both rules are proven
// red on synthetic rows below.

const fs = require('fs');
const path = require('path');
const { isBuiltin } = require('module');

const {
  buildAdapters, HOSTS, MARKETPLACE_HOST, CODEX_MARKETPLACE_HOST, hostShapeProblems, bundleSeeds,
  dialectOf, isRulesOnlyDirectory,
} = require('../scripts/build-adapters');
const { PLATFORMS } = require('../hooks/jiahao-runtime');
const { hookRegistrationPaths } = require('./helpers/generated-bundle');

const ROOT = path.join(__dirname, '..');
const generated = buildAdapters();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const pkgRepository = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

// Bundle-local wiring the generator writes itself; everything else under a
// bundle directory is vendored from the repository and must be byte-identical.
// The manifest directory comes from the row's dialect: Claude-compatible hosts
// publish `.claude-plugin/`, Codex publishes `.codex-plugin/`.
function bundleWiring(host) {
  const manifestDir = dialectOf(host).manifestDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^(' + manifestDir + '/|rules/|hooks/hooks\\.json$|\\.mcp\\.json$|README\\.md$)');
}

function readGenerated(rel) {
  const text = generated[rel];
  if (text === undefined) throw new Error('generator did not emit ' + rel);
  return text;
}

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel.split('/').join(path.sep)), 'utf8');
}

// Resolve a relative require() the way node does, against the in-memory map.
function resolveInBundle(fromRel, spec) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  for (const c of [base, base + '.js', base + '.json', base + '/index.js']) {
    if (generated[c] !== undefined) return c;
  }
  return null;
}

const REQ = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

// The require() closure of the wired scripts, walked over the REPOSITORY
// sources rather than the generator's own helper: the bundle must ship exactly
// what the hooks need, so an orphan vendored file or a missing dependency is a
// failure, not a difference of opinion between two copies of one function.
function repoClosure(seeds) {
  const seen = new Set();
  const queue = seeds.slice();
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (!rel.endsWith('.js')) continue;
    const text = readRepo(rel);
    REQ.lastIndex = 0;
    let m;
    while ((m = REQ.exec(text))) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const base = path.join(ROOT, path.dirname(rel.split('/').join(path.sep)), spec);
      for (const c of [base, base + '.js', base + '.json', path.join(base, 'index.js')]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          queue.push(path.relative(ROOT, c).split(path.sep).join('/'));
          break;
        }
      }
    }
  }
  return seen;
}

describe.each(HOSTS)('$label exit ($dir)', (host) => {
  const P = host.dir + '/';
  const events = Object.keys(host.hooks || {});
  const dialect = dialectOf(host);
  const manifestRel = P + dialect.manifestDir + '/plugin.json';
  // A rules-only row has no plugin manifest to parse; the shape tests below
  // assert that absence instead.
  const manifest = isRulesOnlyDirectory(host) ? null : JSON.parse(readGenerated(manifestRel));

  describe('bundle shape', () => {
    test('the exit ships exactly the files its shape declares', () => {
      if (isRulesOnlyDirectory(host)) {
        expect(generated[manifestRel]).toBeUndefined();
        expect(Object.keys(generated).filter((rel) => rel.startsWith(P + 'src/'))).toEqual([]);
        expect(typeof generated[P + 'README.md']).toBe('string');
        return;
      }
      expect(typeof generated[manifestRel]).toBe('string');
      expect(generated[P + 'plugin.json']).toBeUndefined();
      for (const rel of [P + 'src/SKILL.md', P + 'src/instrument-identity.json', P + 'README.md']) {
        expect(typeof generated[rel]).toBe('string');
      }
    });

    test('every wired event has a vendored script', () => {
      for (const hook of Object.values(host.hooks)) {
        expect(typeof generated[P + 'hooks/' + hook.script + '.js']).toBe('string');
      }
    });

    test('the bundle ships exactly the wired closure, nothing orphaned', () => {
      const wiring = bundleWiring(host);
      const expected = new Set();
      if (!isRulesOnlyDirectory(host)) {
        expected.add('src/SKILL.md');
        expected.add('src/instrument-identity.json');
      }
      for (const rel of repoClosure(bundleSeeds(host))) expected.add(rel);
      for (const rel of (host.mcp ? host.mcp.files : [])) expected.add(rel);
      const vendored = Object.keys(generated)
        .filter((rel) => rel.startsWith(P))
        .map((rel) => rel.slice(P.length))
        .filter((rel) => !wiring.test(rel));
      expect(vendored.sort()).toEqual(Array.from(expected).sort());
    });

    test('every vendored file is a byte copy of its repository source', () => {
      // No non-empty floor: a rules-only bundle legitimately ships no .js, and
      // the closure test above already pins the exact vendored set.
      const vendoredJs = Object.keys(generated).filter((rel) => rel.startsWith(P) && rel.endsWith('.js'));
      for (const rel of vendoredJs) {
        expect(generated[rel]).toBe(readRepo(rel.slice(P.length)));
      }
      if (!isRulesOnlyDirectory(host)) {
        expect(generated[P + 'src/SKILL.md']).toBe(readRepo('src/SKILL.md'));
        expect(generated[P + 'src/instrument-identity.json']).toBe(readRepo('src/instrument-identity.json'));
      }
    });
  });

  describe('manifest', () => {
    if (isRulesOnlyDirectory(host)) {
      test('a rules-only exit ships no plugin manifest at all', () => {
        expect(generated[manifestRel]).toBeUndefined();
        expect(Object.keys(generated).filter((rel) => rel.startsWith(P) && rel.endsWith('plugin.json'))).toEqual([]);
      });
      return;
    }

    test('parses; name, version, license, and repository come from the package', () => {
      expect(manifest.name).toBe('jiahao');
      expect(manifest.version).toBe(pkg.version);
      expect(manifest.license).toBe(pkg.license);
      expect(manifest.repository).toBe(pkgRepository);
      // The conservative opt-in flag belongs to the Claude-compatible manifest;
      // a host that does not read the field must not be told it is disabled.
      if (dialect.defaultEnabled) expect(manifest.defaultEnabled).toBe(false);
      else expect(manifest.defaultEnabled).toBeUndefined();
    });

    test('every component path it names is emitted, prefixed the way this host requires, and auto-discovered files are not repeated', () => {
      // These two keys name the generator's own files, not host data.
      // A host that does not auto-discover a component has to be told about it
      // in the manifest, or the file never loads - so the key is required, not
      // merely checked when present.
      const prefix = dialect.manifestPathPrefix;
      if (events.length && !host.autoDiscovered.includes('hooks/hooks.json')) {
        expect(manifest.hooks).toBe(prefix + 'hooks/hooks.json');
      }
      if (host.mcp && !host.autoDiscovered.includes('.mcp.json')) {
        expect(manifest.mcpServers).toBe(prefix + '.mcp.json');
      }
      for (const key of ['hooks', 'mcpServers']) {
        if (manifest[key] === undefined) continue;
        expect(manifest[key].startsWith(prefix)).toBe(true);
        expect(typeof generated[P + manifest[key].slice(prefix.length)]).toBe('string');
      }
      // Auto-discovery is the host's job: the file may or may not ship, but a
      // manifest entry would load it a second time.
      for (const rel of host.autoDiscovered) {
        expect(Object.values(manifest)).not.toContain(rel);
      }
    });
  });

  describe('hook map', () => {
    if (events.length === 0) {
      test('a rules-only bundle registers no hooks at all', () => {
        expect(generated[P + 'hooks/hooks.json']).toBeUndefined();
        expect(Object.keys(generated).filter((rel) => rel.startsWith(P + 'hooks/'))).toEqual([]);
      });

      test('no emitted file in a rules-only exit carries a hook registration', () => {
        expect(hookRegistrationPaths(generated, P)).toEqual([]);
      });
      return;
    }

    const cfg = JSON.parse(readGenerated(P + 'hooks/hooks.json'));

    test('registers exactly the host table event set', () => {
      expect(Object.keys(cfg.hooks)).toEqual(events);
    });

    test('every command runs a vendored script through the plugin root and names its platform, within the timeout budget', () => {
      const varName = dialect.pluginRootVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const suffix = dialect.platformArg ? ' ' + dialect.platformArg : '';
      const pattern = new RegExp('^node "\\$\\{' + varName + '\\}/(hooks/[a-z0-9-]+\\.js)"' + suffix + '$');
      for (const ev of events) {
        for (const entry of cfg.hooks[ev]) {
          for (const h of entry.hooks) {
            expect(h.type).toBe('command');
            expect(h.timeout).toBe(host.hooks[ev].timeout);
            expect(h.timeout).toBeLessThanOrEqual(60);
            const m = pattern.exec(h.command);
            expect(m).not.toBeNull();
            expect(typeof generated[P + m[1]]).toBe('string');
            expect(h.command).not.toContain('adapters/');
            expect(h.command).not.toContain('..');
          }
        }
      }
    });

    test('the turn-end event carries the verdict gate, and every script is a repo hook', () => {
      for (const ev of events) {
        expect(fs.existsSync(path.join(ROOT, 'hooks', host.hooks[ev].script + '.js'))).toBe(true);
      }
      if (host.turnEnd) {
        const command = cfg.hooks[host.turnEnd][0].hooks[0].command;
        expect(command).toContain('jiahao-verdict-gate.js');
      }
    });

    test('the README discloses every registered event, script, and timeout', () => {
      const readme = readGenerated(P + 'README.md');
      for (const ev of events) {
        expect(readme).toContain(ev);
        expect(readme).toContain(host.hooks[ev].script + '.js');
      }
      // The disclosure sentence lists the per-event timeouts in wiring order;
      // a table edit that does not follow through to the README goes red here.
      expect(readme).toContain(events.map(ev => host.hooks[ev].timeout).join('/') + 's');
    });
  });

  describe('imports', () => {
    test('hooks stay self-contained: no relative require() escapes, no third-party dependency', () => {
      // The MCP server is the one component whose deps the host user installs
      // (the bundle's README says so), so third-party requires are allowed only
      // inside its own directory - the hook layer must never grow one.
      const mcpDir = host.mcp ? path.posix.dirname(host.mcp.entry) + '/' : null;
      const escapes = [];
      const external = [];
      const edges = new Map();
      let scanned = 0;
      for (const rel of Object.keys(generated).filter((r) => r.startsWith(P) && r.endsWith('.js'))) {
        scanned++;
        const text = generated[rel];
        REQ.lastIndex = 0;
        let m;
        while ((m = REQ.exec(text))) {
          const spec = m[1];
          if (!spec.startsWith('.')) {
            // Node builtins (both `fs` and `node:fs`) are fine anywhere.
            const insideMcp = mcpDir !== null && rel.slice(P.length).startsWith(mcpDir);
            if (!isBuiltin(spec) && !insideMcp) external.push(rel + ' -> ' + spec);
            continue;
          }
          const resolved = resolveInBundle(rel, spec);
          edges.set(rel + ' -> ' + spec, resolved);
          if (!resolved || !resolved.startsWith(P)) escapes.push(rel + ' -> ' + spec);
        }
      }
      expect(escapes).toEqual([]);
      expect(external).toEqual([]);
      // A fixpoint: empty `escapes` also passes when the scan walked nothing.
      // Floors are the row's own wiring count, so a host with one event does not
      // have to reach today's closure size to pass.
      expect(scanned).toBeGreaterThanOrEqual(bundleSeeds(host).length);
      expect(edges.size).toBeGreaterThanOrEqual(Object.keys(host.hooks || {}).length);
      if (generated[P + 'src/evidence-log.js'] !== undefined) {
        expect(edges.get(P + 'src/evidence-log.js -> ./shared/paths')).toBe(P + 'src/shared/paths.js');
      }
      if (generated[P + 'src/instrument-identity.js'] !== undefined) {
        expect(edges.get(P + 'src/instrument-identity.js -> ./evidence-log')).toBe(P + 'src/evidence-log.js');
      }
    });
  });

  if (host.rules.length > 0) {
    describe('rules', () => {
      test('carry alwaysApply frontmatter and the declared profiles only', () => {
        const emitted = Object.keys(generated).filter((rel) => rel.startsWith(P + 'rules/'));
        expect(emitted.sort()).toEqual(host.rules.map((r) => P + 'rules/' + r.file).sort());
        const text = {};
        for (const rule of host.rules) {
          text[rule.profile] = readGenerated(P + 'rules/' + rule.file);
          expect(text[rule.profile]).toMatch(/alwaysApply:\s*true/);
          expect(text[rule.profile]).toMatch(/jiahao/i);
          if (rule.profile === 'both') {
            // The rules-version body: one file carries both profiles.
            expect(text[rule.profile]).toContain('Generator Profile');
            expect(text[rule.profile]).toContain('Verifier Profile');
          } else {
            expect(text[rule.profile]).toContain(rule.profile === 'generator' ? 'Generator Profile' : 'Verifier Profile');
          }
        }
        if (text.verifier && text.generator) expect(text.verifier).not.toBe(text.generator);
      });
    });
  } else {
    test('a bundle with no rules ships none', () => {
      expect(Object.keys(generated).filter((rel) => rel.startsWith(P + 'rules/'))).toEqual([]);
    });
  }

  if (host.mcp) {
    test('.mcp.json registers the vendored MCP entry and its package file ships', () => {
      const mcp = JSON.parse(readGenerated(P + '.mcp.json'));
      expect(mcp.mcpServers['jiahao-mcp'].command).toBe('node');
      expect(mcp.mcpServers['jiahao-mcp'].args[0]).toBe('${' + dialect.pluginRootVar + '}/' + host.mcp.entry);
      expect(typeof generated[P + host.mcp.entry]).toBe('string');
      for (const rel of host.mcp.files) expect(typeof generated[P + rel]).toBe('string');
    });
  } else {
    test('a bundle without an MCP server ships no .mcp.json and no server files', () => {
      expect(generated[P + '.mcp.json']).toBeUndefined();
      expect(Object.keys(generated).filter((rel) => rel.startsWith(P + 'jiahao-mcp/'))).toEqual([]);
    });
  }
});

describe('marketplace manifest (Claude Code)', () => {
  const marketplace = JSON.parse(readGenerated('.claude-plugin/marketplace.json'));
  const sourceHost = MARKETPLACE_HOST;

  test('has the three required top-level fields and one entry', () => {
    expect(marketplace.name).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(typeof marketplace.owner.name).toBe('string');
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBe(1);
  });

  test('source points at a host row directory, not the repo root', () => {
    const entry = marketplace.plugins[0];
    expect(entry.source.startsWith('./')).toBe(true);
    expect(entry.source).not.toContain('..');
    expect(path.posix.normalize(entry.source).replace(/\/$/, '')).toBe(sourceHost.dir);
    expect(typeof generated[sourceHost.dir + '/.claude-plugin/plugin.json']).toBe('string');
  });

  test('the entry name matches that host manifest, and the version lives in plugin.json only', () => {
    const m = JSON.parse(readGenerated(sourceHost.dir + '/.claude-plugin/plugin.json'));
    expect(marketplace.plugins[0].name).toBe(m.name);
    expect(marketplace.plugins[0].version).toBeUndefined();
  });
});

describe('marketplace manifest (Codex CLI)', () => {
  const marketplace = JSON.parse(readGenerated('.agents/plugins/marketplace.json'));
  const sourceHost = CODEX_MARKETPLACE_HOST;

  test('has a name and one entry, and the entry points inside the repository', () => {
    expect(marketplace.name).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBe(1);
    const entry = marketplace.plugins[0];
    // Codex resolves source.path from the marketplace root (the repository),
    // and requires the './' prefix.
    expect(entry.source.source).toBe('local');
    expect(entry.source.path.startsWith('./')).toBe(true);
    expect(entry.source.path).not.toContain('..');
    expect(path.posix.normalize(entry.source.path).replace(/\/$/, '')).toBe(sourceHost.dir);
  });

  test('the entry name matches the Codex-dialect manifest, and the version lives in plugin.json only', () => {
    const manifestDir = dialectOf(sourceHost).manifestDir;
    const m = JSON.parse(readGenerated(sourceHost.dir + '/' + manifestDir + '/plugin.json'));
    expect(marketplace.plugins[0].name).toBe(m.name);
    expect(marketplace.plugins[0].version).toBeUndefined();
    expect(typeof generated[sourceHost.dir + '/hooks/hooks.json']).toBe('string');
  });
});

describe('tier contract', () => {
  const good = {
    name: 'probe-host',
    label: 'Probe',
    dir: 'adapters/probe-host',
    tier: 'A',
    turnEnd: 'Stop',
    provenance: 'probe',
    hooks: { Stop: { script: 'jiahao-verdict-gate', timeout: 10 } },
    manifest: { description: 'probe' },
    autoDiscovered: [],
    mcp: null,
    rules: [],
    readme: () => '',
  };

  test('every shipped row satisfies its own tier', () => {
    expect(hostShapeProblems(HOSTS)).toEqual([]);
    for (const host of HOSTS) expect(hostShapeProblems([host])).toEqual([]);
  });

  test('an A row without a turn-end event is rejected', () => {
    const row = Object.assign({}, good, { turnEnd: null });
    expect(hostShapeProblems([row]).join('\n')).toMatch(/turn-end event/);
  });

  test('an A row whose turn-end event runs something else is rejected', () => {
    const row = Object.assign({}, good, { hooks: { Stop: { script: 'jiahao-sweep', timeout: 10 } } });
    expect(hostShapeProblems([row]).join('\n')).toMatch(/turnEnd must run jiahao-verdict-gate/);
  });

  test('a C row that registers hooks is rejected', () => {
    const row = Object.assign({}, good, { tier: 'C', turnEnd: null });
    expect(hostShapeProblems([row]).join('\n')).toMatch(/rules-only/);
  });

  test('a tier without provenance, and a row that repeats an auto-discovered file, are rejected', () => {
    const noEvidence = Object.assign({}, good, { provenance: ' ' });
    expect(hostShapeProblems([noEvidence]).join('\n')).toMatch(/provenance/);
    const duplicated = Object.assign({}, good, {
      autoDiscovered: ['hooks/hooks.json'],
      manifest: { description: 'probe', hooks: 'hooks/hooks.json' },
    });
    expect(hostShapeProblems([duplicated]).join('\n')).toMatch(/repeats auto-discovered/);
  });

  test('a row without a hooks object is rejected', () => {
    const missing = Object.assign({}, good, { hooks: undefined });
    expect(hostShapeProblems([missing]).join('\n')).toMatch(/hooks must be an object/);
    const array = Object.assign({}, good, { hooks: [] });
    expect(hostShapeProblems([array]).join('\n')).toMatch(/hooks must be an object/);
  });

  test('a row that rewrites a manifest key the emitter pins is rejected', () => {
    const row = Object.assign({}, good, { manifest: { description: 'probe', version: '9.9.9' } });
    expect(hostShapeProblems([row]).join('\n')).toMatch(/must not set version/);
  });

  test('a rules-only C row is a valid row and ships no hooks', () => {
    const rulesOnly = {
      name: 'probe-rules', label: 'Probe', dir: 'adapters/probe-rules', tier: 'C',
      turnEnd: null, provenance: 'probe', hooks: {},
      manifest: { description: 'probe' }, autoDiscovered: [], mcp: null,
      rules: [{ file: 'jiahao.md', profile: 'verifier', description: 'probe' }],
      readme: () => '',
    };
    expect(hostShapeProblems([rulesOnly])).toEqual([]);
    expect(bundleSeeds(rulesOnly)).toEqual([]);
  });

  test('a manifest-less row is the rules-only shape and must carry at least one rule', () => {
    const rulesOnly = {
      name: 'probe-rules', label: 'Probe', dir: 'adapters/probe-rules', tier: 'C',
      turnEnd: null, provenance: 'probe', hooks: {}, manifest: null,
      autoDiscovered: [], mcp: null,
      rules: [{ file: 'jiahao.md', profile: 'both', description: 'probe' }],
      readme: () => '',
    };
    expect(hostShapeProblems([rulesOnly])).toEqual([]);
    expect(bundleSeeds(rulesOnly)).toEqual([]);
    expect(hostShapeProblems([Object.assign({}, rulesOnly, { rules: [] })]).join('\n'))
      .toMatch(/must ship at least one rule/);
    expect(hostShapeProblems([Object.assign({}, rulesOnly, {
      tier: 'A', turnEnd: 'Stop', hooks: { Stop: { script: 'jiahao-verdict-gate', timeout: 10 } },
    })]).join('\n')).toMatch(/manifest-less exit is rules-only/);
    expect(hostShapeProblems([Object.assign({}, rulesOnly, {
      mcp: { entry: 'index.js', files: [] },
    })]).join('\n')).toMatch(/no MCP registration/);
    expect(hostShapeProblems([Object.assign({}, rulesOnly, {
      rules: [{ file: 'x.md', profile: 'nope', description: 'probe' }],
    })]).join('\n')).toMatch(/unknown profile/);
  });

  test('a host that registers SubagentStop runs the same gate as its turn-end event', () => {
    for (const host of HOSTS) {
      if (!host.hooks.SubagentStop) continue;
      expect(host.hooks.SubagentStop.script).toBe(host.hooks[host.turnEnd].script);
      expect(host.hooks.SubagentStop.timeout).toBe(host.hooks[host.turnEnd].timeout);
    }
  });

  test('a malformed dialect is rejected instead of emitting an unreadable bundle', () => {
    const badDir = Object.assign({}, good, { dialect: { manifestDir: 'codex-plugin' } });
    expect(hostShapeProblems([badDir]).join('\n')).toMatch(/manifestDir/);
    const badVar = Object.assign({}, good, { dialect: { pluginRootVar: 'plugin_root' } });
    expect(hostShapeProblems([badVar]).join('\n')).toMatch(/pluginRootVar/);
    const badPlatform = Object.assign({}, good, { dialect: { platformArg: 'Codex!' } });
    expect(hostShapeProblems([badPlatform]).join('\n')).toMatch(/platformArg/);
    const badPath = Object.assign({}, good, { manifest: { description: 'probe', hooks: '../hooks/hooks.json' } });
    expect(hostShapeProblems([badPath]).join('\n')).toMatch(/bundle-relative/);
  });

  test('the conservative enable flag only rides a Claude-compatible manifest', () => {
    const foreign = Object.assign({}, good, {
      dialect: { manifestDir: '.other-plugin', pluginRootVar: 'OTHER_PLUGIN_ROOT', defaultEnabled: true },
      manifest: { description: 'probe', hooks: './hooks/hooks.json' },
    });
    expect(hostShapeProblems([foreign]).join('\n')).toMatch(/defaultEnabled belongs to the \.claude-plugin manifest/);
  });

  test('the default dialect is Claude-compatible, and the Codex row is the Codex dialect', () => {
    expect(dialectOf(good).manifestDir).toBe('.claude-plugin');
    expect(dialectOf(good).platformArg).toBeNull();
    const codex = HOSTS.find((host) => host.name === 'codex');
    expect(codex).toBeDefined();
    expect(dialectOf(codex).manifestDir).toBe('.codex-plugin');
    expect(dialectOf(codex).platformArg).toBe('codex');
  });

  test('every platform name a config template passes is a name the hook layer implements', () => {
    // A template that passes a name detectHost() does not know would silently
    // fall back to the Claude envelope. The generator rejects that at build
    // time; this pins the same invariant from the shipped rows.
    const passed = HOSTS.map((host) => dialectOf(host).platformArg).filter((p) => p !== null);
    expect(passed).toContain('codex');
    for (const platform of passed) expect(PLATFORMS).toContain(platform);
  });
});
