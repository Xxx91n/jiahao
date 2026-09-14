'use strict';

// ADR-0065 wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Content-anchor seed for the grill-t7 doc round: covers D-A (confirmatory
// adjudication + fallback ladder), D-B (port surface + G6 publish gate),
// D-C (devin corpus protocol), D-D (execution closure), D-E (governance
// anchor terminal-events-only + claim template).

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const adrPath = path.join(ROOT, 'docs/adr/0065-t6-confirmatory-round-adjudication-port-surface-devin-corpus-and-claim-honesty.md');
const adr = () => fs.readFileSync(adrPath, 'utf8');

describe('ADR-0065 t7 confirmatory doc round', () => {
  test('the ADR exists and records all five decisions', () => {
    for (const id of ['D-A','D-B','D-C','D-D','D-E']) {
      expect(adr()).toContain('### ' + id);
    }
  });
  test('D-A pins the single absolute floor and the fallback ladder', () => {
    const a = adr();
    expect(a).toContain('0.563863');
    expect(a).toContain('0.4792 + d_MDE 0.084663');
    expect(a).toMatch(/fallback ladder/);
    expect(a).toMatch(/SAME floor/);
  });
  test('D-B keeps the manifest in-tarball and splits G6 bench CI vs prepublishOnly', () => {
    const a = adr();
    expect(a).toMatch(/IN the tarball under src\//);
    expect(a).toContain('prepublishOnly');
    expect(a).toContain('Quantization');
    expect(a).toContain('FORBIDDEN (G6 logits < 1e-12');
  });
  test('D-C forbids kappa and hand-written items, and keeps labels blind', () => {
    const a = adr();
    expect(a).toContain('Cohen-kappa');
    expect(a).toMatch(/never cited by any conformity\s+claim/);
    expect(a).toMatch(/NEVER item\s+content/);
  });
  test('D-E repeats the three verbatim honesty facts', () => {
    const a = adr();
    expect(a).toContain('+0.1093');
    expect(a).toContain('0.28 recall@FP0');
    expect(a).toContain('claim-template.md');
  });
  test('governance anchors carry the t7 ledger authoritative copy', () => {
    const anchors = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'anchors.json'), 'utf8'));
    const x = anchors.artifacts.find((y) => y.file === 'decision-ledger-t7.md');
    expect(x).toBeDefined();
    expect(x.adr).toBe('ADR-0065');
    expect(x.bytes).toBeGreaterThan(5000);
    const onDisk = fs.statSync(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t7.md')).size;
    expect(x.bytes).toBe(onDisk);
  });
  test('trend inventory, defer-0041 and CONTEXT terms landed for this round', () => {
    const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'), 'utf8'));
    const row = inv.rounds.find((r) => r.round === 'grill-t7-doc-round');
    expect(row).toBeDefined();
    expect(row.net_additions).toBe(1);
    expect(row.advisory_fired).toBe(true);
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
    const e = reg.entries.find((x) => x.id === 'defer-0041');
    expect(e).toBeDefined();
    expect(e.status).toBe('pending-evaluation');
    expect(e.source_adr).toContain('0065');
    const c = fs.readFileSync(path.join(ROOT, 'CONTEXT.md'), 'utf8');
    for (const term of ['Fallback Ladder', 'Claim Template']) {
      expect(c).toContain('**' + term);
    }
  });
});
