'use strict';

// ADR-0064 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Content-anchor seed for the T-6 pre-registration documentation round:
// covers D-A (MDE stop-loss gate), D-B (research/confirmatory split),
// D-C (4-class corpus taxonomy), D-D (two-stage rungs + G1..G5),
// D-E (golden-sample equivalence gate G6), D-F (governance trend anchor +
// governance-inventory structural gate; 锐评 prescription-5 disposition).

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const adrPath = path.join(ROOT, 'docs/adr/0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md');
const adr = () => fs.readFileSync(adrPath, 'utf8');

describe('ADR-0064 T-6 pre-registration doc round', () => {
  test('the ADR exists and records all six decisions', () => {
    for (const id of ['D-A','D-B','D-C','D-D','D-E','D-F']) {
      expect(adr()).toContain('### ' + id);
    }
  });
  test('D-A anchors the MDE stop-loss gate and the ADR-0059 D-C amendment', () => {
    const s = adr();
    expect(s).toContain('Amends: ADR-0059 D-C');
    expect(s).toContain('d_MDE = max(0.03');
    expect(s).toContain(' 1.64 * SE_5seed');
    expect(s).toContain('stop-loss');
  });
  test('D-B pins the baseline honestly and splits research from confirmatory', () => {
    const s = adr();
    expect(s).toContain('47.92%');
    expect(s).toContain('4.29%');
    expect(s).toContain('0.265');
    expect(s).toContain('34.7%');
    expect(s).toContain('never edits bench/polygraph/thresholds.json');
  });
  test('D-C keeps corpus classes distinct and Devin blind to rung 1', () => {
    const s = adr();
    expect(s).toContain('devin-corpus@v1');
    expect(s).toContain('blind to rung 1');
    expect(s).toContain('min_n=100');
  });
  test('D-D fixes rung gates and the two negative controls', () => {
    const s = adr();
    for (const k of ['G1','G2','G3','G4','G5']) expect(s).toContain(k);
    expect(s).toContain('GroupShuffleSplit');
    expect(s).toContain('headline never max-of-trials');
  });
  test('D-E pins the golden-sample equivalence tiers and forbidden channels', () => {
    const s = adr();
    expect(s).toContain('< 1e-9');
    expect(s).toContain('< 1e-12');
    expect(s).toContain('positive control');
    expect(s).toContain('sklearn-porter');
    expect(s).toContain('onnxruntime');
    expect(s).toContain('m2cgen');
  });
  test('D-F dispositions the critique prescription 5 without a hard cap', () => {
    const s = adr();
    expect(s).toContain('governance-inventory');
    expect(s).toContain('anchor 63, K=2');
    expect(s).toContain('hard cap is rejected');
    expect(s).toContain('212,699 B < 230,000 B');
  });
  test('CONTEXT.md carries the new Language terms', () => {
    const c = fs.readFileSync(path.join(ROOT, 'CONTEXT.md'), 'utf8');
    for (const term of ['MDE Stop-Loss Gate', 'Golden-Sample Equivalence Gate', 'Governance Trend Anchor', 'Research Round vs Confirmatory Round', 'Fourth-Class Corpus']) {
      expect(c).toContain('**' + term);
    }
  });
  test('defer-0039 registers the trend-anchor first evaluation', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
    const e = reg.entries.find((x) => x.id === 'defer-0039');
    expect(e).toBeDefined();
    expect(e.status).toBe('pending-evaluation');
    expect(e.cadence_tier).toBe('quarterly');
    expect(e.source_adr).toContain('0064');
  });
  test('governance anchors carry the t6 ledger authoritative copy', () => {
    const anchors = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'anchors.json'), 'utf8'));
    const a = anchors.artifacts.find((x) => x.file === 'decision-ledger-t6.md');
    expect(a).toBeDefined();
    expect(a.adr).toBe('ADR-0064');
    expect(a.bytes).toBeGreaterThan(10000);
    const onDisk = fs.statSync(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t6.md')).size;
    expect(a.bytes).toBe(onDisk);
  });
  test('t6 ledger is not in the tarball whitelist', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const files = JSON.stringify(pkg.files);
    expect(files).not.toContain('docs/governance');
  });
});
