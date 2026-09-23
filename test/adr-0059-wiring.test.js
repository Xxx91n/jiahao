'use strict';

// ADR-0059 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers D-A (name-independent Tier 1 channel + naming declaration),
// D-B (jiahao-mcp leaves the tarball whitelist; source-only tier),
// D-C (lightweight-feature direction documented; research-round waiver),
// D-D (coherence-tier limited assurance wording; no check reduction),
// D-E (signal-driven polish defer entry shape).
//
// CONTENT-ANCHOR SEED - intent-shaped assertions for the doc-round facts
// (ADR file, glossary terms, registry entries). Implementation-round facts
// (README Tier 1 text, package.json files whitelist, SKILL.md edits) are
// asserted by the implementation round when those edits land; this seed must
// pass before that round starts.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const adrPath = path.join(
  ROOT,
  'docs/adr/0059-external-critique-dialectic-closure-distribution-honesty-and-governance-posture.md'
);
const glossaryPath = path.join(ROOT, 'CONTEXT.md');
const registryPath = path.join(ROOT, 'docs', 'deferred-registry.json');

describe('ADR-0059 external critique closure', () => {
  const adr = () => fs.readFileSync(adrPath, 'utf8');

  test('the ADR exists and records all five decisions', () => {
    const text = adr();
    for (const id of ['D-A', 'D-B', 'D-C', 'D-D', 'D-E']) {
      expect(text).toContain(`### ${id}`);
    }
    expect(text).toContain('defer-0028');
    expect(text).toContain('defer-0029');
    expect(text).toContain('defer-0030');
    expect(text).toContain('defer-0031');
  });

  test('ADR-84 records the ADR-0038 D1 amendment (source-only MCP tier)', () => {
    expect(adr()).toContain('ADR-0038 D1');
  });

  test('glossary carries the five new ADR-0059 terms', () => {
    const g = fs.readFileSync(glossaryPath, 'utf8');
    expect(g).toContain('Triage-Layer Detector Semantics');
    expect(g).toContain('Name-Independent Channel');
    expect(g).toContain('Source-Only Distribution Tier');
    expect(g).toContain('Coherence-Tier Limited Assurance');
    expect(g).toContain('Signal-Driven Polish');
  });

  test('registry gains the four ADR-0059 entries in pending-evaluation', () => {
    const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    for (const id of ['defer-0028', 'defer-0029', 'defer-0030', 'defer-0031']) {
      const e = reg.entries.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e.status).toBe('pending-evaluation');
      expect(e.source_adr).toContain('0059');
      expect(e.unfreeze_if.type).toBe('presence-condition');
    }
  });

  test('defer-0030 keeps the review MVP inside the repository (defer-0024 untouched)', () => {
    const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const e = reg.entries.find((x) => x.id === 'defer-0030');
    expect(e.last_check_in.note).toMatch(/inside the repository/);
  });

  // ---- implementation round: the ADR-0059 edits landed on disk ----
  test('implementation-round facts landed (README, files whitelist, SKILL.md, bench README)', () => {
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    // D-A: name-independent Tier 1 channel + naming declaration; no registry instruction.
    expect(readme).toContain('npx --yes github:<org>/jiahao init');
    expect(readme).toContain('Naming declaration (ADR-0059 D-A)');
    expect(readme).not.toMatch(/npx\s+jiahao\b/);
    expect(readme).not.toMatch(/npm\s+i(nstall)?\s+jiahao\b/);
    // D-B: source-only MCP tier documented; the tarball whitelist drops it.
    expect(readme).toContain('source-only');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.files).not.toContain('jiahao-mcp/');
    // D-C: the research-round waiver note is recorded in the bench README.
    const bench = fs.readFileSync(path.join(ROOT, 'bench/polygraph/README.md'), 'utf8');
    expect(bench).toContain('Research-round waiver (ADR-0059 D-C)');
    expect(bench).toContain('no metric commitment');
    // D-D: SKILL.md same-boundary rule sharpened; README carries the slogan.
    const skill = fs.readFileSync(path.join(ROOT, 'src/SKILL.md'), 'utf8');
    expect(skill).toContain('Self-validation provides coherence evidence only, not independence evidence.');
    expect(skill).not.toContain('is verification theater');
    expect(readme).toContain('agreement is not accuracy');
  });
});
