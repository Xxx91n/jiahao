// test/host-contracts.test.js — ADR-0028 D3 conformance matrix.
// Table-driven from test/fixtures/host-contracts.json: executable entries
// spawn the hook script with fixture stdin and assert per-contract exit
// codes and decision JSON; config entries assert event registration;
// instruction entries assert file presence. Also covers the D4 guard's
// negative paths via the shared couplingViolation pure function.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { couplingViolation } = require('../scripts/check-bench-thresholds');

jest.setTimeout(30000);

const root = path.join(__dirname, '..');
const registry = JSON.parse(
  fs.readFileSync(path.join(root, 'test', 'fixtures', 'host-contracts.json'), 'utf8')
);

function mkConfigDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-hc-'));
  for (const name of Object.keys(files || {})) {
    fs.writeFileSync(path.join(dir, name), files[name], 'utf8');
  }
  return dir;
}

function runHook(script, opts) {
  const o = opts || {};
  const env = Object.assign({}, process.env);
  delete env.PLUGIN_DATA;
  delete env.COPILOT_PLUGIN_DATA;
  delete env.QODER_SESSION_ID;
  env.CLAUDE_CONFIG_DIR = o.configDir || mkConfigDir();
  return spawnSync(process.execPath, [path.join(root, script)], {
    input: o.stdin === undefined ? '{}' : o.stdin,
    env: env,
    encoding: 'utf8',
    timeout: 15000,
  });
}

describe('registry integrity', () => {
  test('schema_version 1 with _doc header', () => {
    expect(registry.schema_version).toBe(1);
    expect(typeof registry._doc).toBe('string');
    expect(registry._doc).toContain('ADR-0028');
  });

  test('every adapters/<host> directory has a contract entry and lifecycle state', () => {
    const dirs = fs.readdirSync(path.join(root, 'adapters'), { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    const hosts = new Set(registry.contracts.map(c => c.host));
    for (const d of dirs) {
      expect(hosts.has(d)).toBe(true);
      expect(['active', 'deprecated', 'eol']).toContain(registry.lifecycle[d].state);
    }
  });

  test('every term anchors a CONTEXT.md glossary term', () => {
    const context = fs.readFileSync(path.join(root, 'CONTEXT.md'), 'utf8');
    for (const c of registry.contracts) {
      expect(context.includes('**' + c.term)).toBe(true);
    }
  });

  test('every source_adr file exists', () => {
    for (const c of registry.contracts) {
      expect(fs.existsSync(path.join(root, c.source_adr))).toBe(true);
    }
  });
});

describe('D3 executable-hook conformance', () => {
  const gateEntries = registry.contracts.filter(c => c.hook);
  const failsoftEntries = registry.contracts.filter(c => Array.isArray(c.hooks));

  test.each(gateEntries.map(c => [c.id, c]))('%s: flag off -> exit 0 passthrough', (id, c) => {
    const res = runHook(c.hook, { configDir: mkConfigDir(), stdin: '{}' });
    expect(res.status).toBe(c.exit_codes.flag_off);
  });

  test.each(gateEntries.map(c => [c.id, c]))('%s: advisory allow -> exit 0 + decision JSON', (id, c) => {
    const configDir = mkConfigDir({ '.jiahao-active': 'full', '.jiahao-profile': 'generator' });
    const res = runHook(c.hook, { configDir: configDir, stdin: '{}' });
    expect(res.status).toBe(c.exit_codes.allow);
    const out = JSON.parse(res.stdout.trim());
    expect(out.decision).toBe('allow');
  });

  test.each(gateEntries.map(c => [c.id, c]))('%s: block -> exit 2 + {decision,reason}', (id, c) => {
    const configDir = mkConfigDir({ '.jiahao-active': 'full', '.jiahao-profile': 'verifier' });
    const res = runHook(c.hook, { configDir: configDir, stdin: '{}' });
    expect(res.status).toBe(c.exit_codes.block);
    const out = JSON.parse(res.stdout.trim());
    expect(out.decision).toBe('block');
    expect(typeof out.reason).toBe('string');
    expect(out.reason.length).toBeGreaterThan(0);
  });

  test.each(gateEntries.map(c => [c.id, c]))('%s: decision values stay within contract', (id, c) => {
    expect(c.decision_values.decision).toEqual(expect.arrayContaining(['allow', 'block']));
    expect(c.decision_keys).toContain('decision');
    expect(c.fail_soft).toBe(false);
  });

  for (const c of failsoftEntries) {
    describe(c.id + ' (fail-soft)', () => {
      test.each(c.hooks.map(h => [path.basename(h), h]))('%s exits 0 on empty stdin', (name, hook) => {
        const res = runHook(hook, { configDir: mkConfigDir(), stdin: '' });
        expect(res.status).toBe(c.exit_codes.any);
      });
      test.each(c.hooks.map(h => [path.basename(h), h]))('%s exits 0 on garbage stdin', (name, hook) => {
        const res = runHook(hook, { configDir: mkConfigDir(), stdin: 'not json{{{' });
        expect(res.status).toBe(c.exit_codes.any);
      });
    });
  }
});

describe('D3 config-level conformance', () => {
  const configEntries = registry.contracts.filter(c => c.config);
  test.each(configEntries.map(c => [c.id, c]))('%s registers all expected events', (id, c) => {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, c.config), 'utf8'));
    for (const ev of c.expect_events) {
      expect(cfg.hooks[ev]).toBeDefined();
      expect(Array.isArray(cfg.hooks[ev])).toBe(true);
    }
  });
});

describe('D3 instruction-tier conformance', () => {
  const instructionEntries = registry.contracts.filter(c => Array.isArray(c.files));
  test.each(instructionEntries.map(c => [c.id, c]))('%s files exist and carry jiahao content', (id, c) => {
    for (const f of c.files) {
      const content = fs.readFileSync(path.join(root, f), 'utf8');
      expect(content.length).toBeGreaterThan(0);
      expect(/jiahao/i.test(content)).toBe(true);
    }
  });
});

describe('D4 coupling guard negative paths (shared couplingViolation)', () => {
  const CFG = 'test/fixtures/host-contracts.json';
  const opts = { cfgRel: CFG, allowContextMd: true, reason: 'host contract changes require an ADR (ADR-0028 D4)' };

  test('contract change without ADR or CONTEXT.md in range fails', () => {
    const errors = couplingViolation([CFG, 'src/detector.js'], 'base', opts);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('coupling');
    expect(errors[0]).toContain(CFG);
  });

  test('contract change with an ADR in range passes', () => {
    const errors = couplingViolation([CFG, 'docs/adr/0099-whatever.md'], 'base', opts);
    expect(errors).toEqual([]);
  });

  test('contract change with a CONTEXT.md change in range passes', () => {
    const errors = couplingViolation([CFG, 'CONTEXT.md'], 'base', opts);
    expect(errors).toEqual([]);
  });

  test('unrelated changes without the registry pass', () => {
    const errors = couplingViolation(['src/detector.js', 'README.md'], 'base', opts);
    expect(errors).toEqual([]);
  });

  test('default opts keep ADR-0027 thresholds semantics unchanged', () => {
    const bad = couplingViolation(['bench/polygraph/thresholds.json'], 'base');
    expect(bad.length).toBe(1);
    const ok = couplingViolation(['bench/polygraph/thresholds.json', 'CONTEXT.md'], 'base');
    expect(ok.length).toBe(1);
  });
});
