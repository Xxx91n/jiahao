// test/adr-0038-wiring.test.js -- ADR-0038 wiring assertions (ADR-0031 D1 convention):
// npm runtime-artifact surface + corpus distribution boundary.

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const { corpusMissingMessage } = require('../src/shared/paths.js');
// Single-sourced pack-surface contract (see scripts/check-pack-smoke.js).
const { PACK_SURFACE_ABSENT, PACK_SURFACE_PRESENT, packCapBytes } = require('../scripts/check-pack-smoke.js');

describe('D1: files whitelist = runtime artifact surface', () => {
  test('files whitelist matches the ADR-0039 D1 narrowed set', () => {
    expect(pkg.files).toEqual(['src/', 'scripts/', 'adapters/', 'schemas/', 'hooks/', 'docs/gates.json', 'docs/coverage-map.json', 'docs/deferred-registry.json', 'docs/change-surface.json', 'bench/polygraph/thresholds.json', 'CONTEXT.md', 'README.md', 'AGENTS.md']);
  });

  test('npm pack dry-run tarball: no test/, no docs/adr, no bench fixtures, thresholds.json present, under the 200,000-byte ADR-0039 D3 cap', () => {
    // shell: true on win32 - Node >=18.20 refuses to spawn .cmd/.bat without it (EINVAL)
    const res = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
    expect(res.status).toBe(0);
    const out = JSON.parse(res.stdout.trim())[0];
    const names = out.files.map(f => f.path);
    // Absent-set: single-sourced from the gate's pack-surface contract (the gate
    // checks the extracted tree; this test checks npm pack's dry-run listing).
    // ADR-0059 D-B: the source-only MCP tier must be absent from the tarball.
    for (const gone of PACK_SURFACE_ABSENT) expect(names.some((f) => f.startsWith(gone))).toBe(false);
    expect(names.some(f => f.startsWith('private/'))).toBe(false);
    // npm auto-includes a README from any directory that contributes a whitelisted
    // file. Empirically verified 2026-09-12: a ROOT .npmignore does not subtract
    // from the `files` whitelist, but a SUBDIRECTORY .npmignore does (so the
    // inclusion is overridable after all). bench/polygraph/README.md is included
    // by that rule; it is public docs, no fixture data.
    const benchAllowed = new Set(['bench/polygraph/thresholds.json', 'bench/polygraph/README.md']);
    expect(names.some(f => f.startsWith('bench/') && !benchAllowed.has(f))).toBe(false);
    expect(names.some(f => f.startsWith('.githooks/'))).toBe(false);
    // Present-set: the gate's contract plus the entries only this test checks
    // (same union as before — no assertion was dropped).
    const presentExtras = ['package.json', 'src/shared/paths.js', 'scripts/check-mr-probes.js', 'bench/polygraph/thresholds.json', 'README.md', 'AGENTS.md'];
    for (const must of PACK_SURFACE_PRESENT.concat(presentExtras)) {
      expect(names).toContain(must);
    }
    // ADR-0039 D3 (2026-08-31 impl round): measured-anchor budget. 256KB provisional cap
    // replaced by 200,000 bytes (npm decimal display unit); docs/adr left the tarball, so the
    // measured base (~141 kB) sits comfortably under a tight cap. The cap is
    // parsed from ADR-0039 (F3: no magic number duplicated in test).
    // Single-sourced cap parse (ADR-0061 D-F): the gate and this test consume
    // one helper instead of two regexes - duplication is what drifted before.
    const cap = packCapBytes();
    expect(cap).toBeGreaterThan(0);
    expect(out.size).toBeLessThan(cap);
  }, 60000);
});

describe('ADR-0039 D3: cap content anchor', () => {
  test('the amended cap appears verbatim in ADR-0039 (ADR-0062 trend anchor)', () => {
    const adr = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md'), 'utf8');
    // ADR-0062 D-C (2026-09-13): the one-shot 200,000-byte narrowing-round
    // anchor is superseded by the periodic trend anchor cap 230,000 bytes.
    // The live cap is asserted via packCapBytes(); this test anchors the text.
    expect(adr).toContain('230,000');
    expect(adr).toContain('200,000'); // the superseded value stays recorded, not erased
    expect(adr).toContain('Budget status (2026-09-12');
    expect(adr).toContain('withdrawn');
  });
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
    // ADR-0059 D-A/D-B implementation round: name-independent channel,
    // naming declaration, source-only MCP tier; no registry install instruction.
    expect(readme).toContain('npx --yes github:<org>/jiahao init');
    expect(readme).toContain('Naming declaration (ADR-0059 D-A)');
    expect(readme).not.toMatch(/npx\s+jiahao\b/);
    expect(readme).not.toMatch(/npm\s+i(nstall)?\s+jiahao\b/);
    expect(readme).toContain('source-only');
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
