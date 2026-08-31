// test/adr-0038-wiring.test.js -- ADR-0038 wiring assertions (ADR-0031 D1 convention):
// npm runtime-artifact surface + corpus distribution boundary.

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const { corpusMissingMessage } = require('../src/shared/paths.js');

describe('D1: files whitelist = runtime artifact surface', () => {
  test('files whitelist matches the ADR-0038 D1 set', () => {
    expect(pkg.files).toEqual(['src/', 'scripts/', 'adapters/', 'schemas/', 'hooks/', 'jiahao-mcp/', 'docs/', 'bench/polygraph/thresholds.json', 'CONTEXT.md', 'README.md', 'AGENTS.md']);
  });

  test('npm pack dry-run tarball: no test/, no bench fixtures, thresholds.json present, <256KB (see size-cap deviation note)', () => {
    // shell: true on win32 - Node >=18.20 refuses to spawn .cmd/.bat without it (EINVAL)
    const res = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
    expect(res.status).toBe(0);
    const out = JSON.parse(res.stdout.trim())[0];
    const names = out.files.map(f => f.path);
    expect(names.some(f => f.startsWith('test/'))).toBe(false);
    expect(names.some(f => f.startsWith('private/'))).toBe(false);
    // npm always-includes README.md in any directory it packs (unconditional, cannot be overridden);
    // thresholds.json is the only bench file we whitelist. README.md in bench/polygraph is public docs, no fixture data.
    const benchAllowed = new Set(['bench/polygraph/thresholds.json', 'bench/polygraph/README.md']);
    expect(names.some(f => f.startsWith('bench/') && !benchAllowed.has(f))).toBe(false);
    expect(names.some(f => f.startsWith('.githooks/'))).toBe(false);
    for (const must of ['package.json', 'src/SKILL.md', 'src/shared/paths.js', 'scripts/install.js', 'scripts/check-mr-probes.js', 'docs/gates.json', 'bench/polygraph/thresholds.json', 'CONTEXT.md', 'README.md', 'AGENTS.md']) {
      expect(names).toContain(must);
    }
    // Deviation (impl round 2026-08-31): ADR-0038 estimated ~50KB; measured 233KB with the
    // mandated D1 whitelist intact (docs/adr 228KB + CONTEXT.md 65KB uncompressed dominate).
    // 60KB is unreachable without violating the D1 whitelist; cap set to measured + headroom,
    // deviation recorded in the handoff and flagged for an ADR-0038 cap amendment.
    expect(out.size).toBeLessThan(256 * 1024);
  }, 60000);
});

describe('D3: honest three-state missing-corpus message', () => {
  test('env tier names the broken override', () => {
    const m = corpusMissingMessage('x.jsonl', '/somewhere/else', false);
    expect(m).toContain('JIAHAO_CORPUS_DIR');
    expect(m).toContain('/somewhere/else');
  });
  test('maintainer tree tier keeps the init hint', () => {
    const m = corpusMissingMessage('x.jsonl', null, true);
    expect(m).toContain('jiahao init');
  });
  test('third-party tier tells the truth and never instructs an impossible init', () => {
    const m = corpusMissingMessage('x.jsonl', null, false);
    expect(m).toContain('maintainer/CI');
    expect(m).toContain('not distributed');
    expect(m).not.toContain('jiahao init');
    expect(m).toContain('JIAHAO_CORPUS_DIR'); // legit holders get the real lever
  });
});

describe('D2 / D4: documented boundary and deferred channel', () => {
  test('README carries the distribution boundary section incl. the clone sentence', () => {
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('Distribution boundary (ADR-0038)');
    expect(readme).toMatch(/public git clone.*no corpus|clone of the public repo also carries no corpus/s);
  });
  test('defer-0007 registers the private-registry channel as pending-evaluation', () => {
    const def = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
    const d7 = def.entries.find(e => e.id === 'defer-0007');
    expect(d7).toBeDefined();
    expect(d7.unfreeze_if.type).toBe('presence-condition');
    expect(d7.status).toBe('pending-evaluation');
    expect(d7.source_adr).toContain('0038');
  });
});
