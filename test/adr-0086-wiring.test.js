'use strict';
// test/adr-0086-wiring.test.js - wiring suite for ADR-0086 (grill-t29):
// registry field governance + exception-channel lifecycle. Pins the ADR's
// anchors, the classification block, the channel schema, the four new gate
// legs, the conventions (hermetic git, ANCHORING footer), the errata rows,
// the tide packet + deferred row, and the round registration.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const fresh = require('../scripts/evidence-freshness');
const exc = require('../scripts/check-exception-channel');
const cons = require('../scripts/check-classification-consistency');
const hg = require('./helpers/git-hermetic');

const ROOT = path.join(__dirname, '..');
const ADR = 'docs/adr/0086-registry-field-governance-fenced-editorial-exception-channel-pending-confirmation-lifecycle.md';
const TAX = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/governance/surface-taxonomy.json'), 'utf8'));
const adrText = fs.readFileSync(path.join(ROOT, ADR), 'utf8');
const gates = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/gates.json'), 'utf8'));
const run = (s, args) => spawnStatus(s, args);
const spawnStatus = (s, args) => require('child_process').spawnSync(process.execPath, [s].concat(args || []), { cwd: ROOT, encoding: 'utf8' });

describe('ADR-0086 registration + anchors', () => {
  test('the ADR exists with ledger/spec anchors, self-audit enumeration, and the three-class taxonomy', () => {
    expect(fs.existsSync(path.join(ROOT, ADR))).toBe(true);
    for (const frag of [
      'grill-t29', 'decision-ledger', 'spec-t29-disposition',
      '### D-A', '### D-B', '### D-C', '### D-D',
      'fenced', 'exception-channel', 'editorial',
      'pending-confirmation', 'auto-lapse', 'for_commit',
      'Self-audit', 'countersign queue',
    ]) {
      expect(adrText).toContain(frag);
    }
    // registered in the taxonomy as the block's carrier
    expect(TAX.field_governance.source_adr).toBe(ADR);
  });

  test('ADR-0085 carries the append-only pointer to the channel + classification block', () => {
    const a85 = fs.readFileSync(path.join(ROOT, 'docs/adr/0085-anchor-semantics-claim-point-seal-boundary.md'), 'utf8');
    expect(a85).toContain('ADR-0086');
    expect(a85).toContain('Field-governance pointer');
  });

  test('grill-t29 is registered in freshness.rounds with its base', () => {
    const row = (TAX.freshness.rounds || []).find((r) => r.id === 'grill-t29');
    expect(row).toBeTruthy();
    expect(row.base).toBe('c7ae4f81d4f13f9ddca829694bd2ae7fea750960');
  });
});

describe('classification block', () => {
  test('the map is closed, nested, and self-classified', () => {
    const fg = TAX.field_governance;
    expect(fg.class_enum).toEqual(['fenced', 'exception-channel', 'editorial']);
    expect(fg.classification.field_governance).toBe('fenced'); // the block fences itself
    expect(fg.classification.freshness.claim_surfaces.exceptions).toBe('exception-channel');
    expect(fg.classification.freshness.claim_surfaces.closed_enum).toBe('fenced');
    expect(fg.classification.freshness.orphan_ancestry.errata_exemptions).toBe('exception-channel');
    expect(fg.classification.freshness.rounds).toBe('editorial');
    expect(fg.exception_channel.required_fields).toEqual(['status', 'requested_by', 'reason', 'expires_at', 'scope']);
    expect(fg.exception_channel.status_enum).toEqual(['pending-confirmation', 'ratified', 'revoked', 'lapsed']);
    expect(fg.exception_channel.no_wildcard_scope).toBe(true);
  });
});

describe('exception-channel entries', () => {
  test('every channel entry is a complete object - five required fields, closed status, ISO expiry', () => {
    for (const e of TAX.freshness.claim_surfaces.exceptions) {
      expect(typeof e).toBe('object');
      expect(e.path).toBeTruthy();
      for (const f of ['status', 'requested_by', 'reason', 'expires_at', 'scope']) {
        expect(typeof e[f]).toBe('string');
        expect(e[f].length).toBeGreaterThan(0);
      }
      expect(['pending-confirmation', 'ratified', 'revoked', 'lapsed']).toContain(e.status);
      expect(e.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('the t28 audit-report registration is re-registered through the channel (F-8)', () => {
    const e = TAX.freshness.claim_surfaces.exceptions.find((x) => x.path === 'reports/audit-report.md');
    expect(e).toBeTruthy();
    expect(e.status).toBe('pending-confirmation');
    expect(e.expires_at).toBe('2026-12-15');
    expect(e.requested_by).toContain('t28');
  });

  test('the F-9 sealed-report correction binds via for_commit to exactly the correction commit', () => {
    const e = TAX.freshness.claim_surfaces.exceptions.find((x) => x.path === 'reports/2026-09-26-report.md');
    expect(e).toBeTruthy();
    expect(e.status).toBe('pending-confirmation');
    expect(e.for_commit).toMatch(/^[0-9a-f]{40}$/);
    // the bound sha must be the commit that actually touched the sealed file
    const lastTouch = execFileSync('git', ['log', '-1', '--format=%H', '--', '.scratch/grill-t28/reports/2026-09-26-report.md'], { cwd: ROOT, encoding: 'utf8' }).trim();
    expect(e.for_commit).toBe(lastTouch);
  });
});

describe('exception-channel leg (unit)', () => {
  const baseTax = () => JSON.parse(JSON.stringify(TAX));
  test('lapsed / wildcard / missing-field / bad-status entries are all caught', () => {
    const tax = baseTax();
    const bad = [
      { path: 'x', status: 'pending-confirmation', requested_by: 't', reason: 'r', expires_at: '2020-01-01', scope: 's' }, // lapsed
      { path: 'x', status: 'pending-confirmation', requested_by: 't', reason: 'r', expires_at: '2099-01-01', scope: '*.md' }, // wildcard scope
      { path: 'x', status: 'pending-confirmation', requested_by: 't', reason: 'r', scope: 's' }, // missing expires_at
      { path: 'x', status: 'mystery', requested_by: 't', reason: 'r', expires_at: '2099-01-01', scope: 's' }, // bad status
      { path: '*.md', status: 'pending-confirmation', requested_by: 't', reason: 'r', expires_at: '2099-01-01', scope: 's' }, // wildcard binding
      'bare-string', // non-object
    ];
    const errs = [];
    tax.freshness.claim_surfaces.exceptions = bad;
    const e1 = exc.checkChannel(tax, '2026-09-27');
    expect(e1.length).toBeGreaterThanOrEqual(6);
    for (const e of e1) errs.push(e);
    // revoked/lapsed terminal records pass
    tax.freshness.claim_surfaces.exceptions = [
      { path: 'x', status: 'revoked', requested_by: 't', reason: 'r', expires_at: '2020-01-01', scope: 's' },
      { path: 'y', status: 'lapsed', requested_by: 't', reason: 'r', expires_at: '2020-01-01', scope: 's' },
    ];
    expect(exc.checkChannel(tax, '2026-09-27')).toEqual([]);
  });
});

describe('gate registrations', () => {
  test('four new confirmatory legs registered with source ADR + capabilities', () => {
    const names = ['exception-channel', 'classification-consistency', 'test-git-hermetic', 'anchoring-footer'];
    const orders = [220, 221, 222, 223];
    names.forEach((n, i) => {
      const e = gates.entries.find((x) => x.name === n);
      expect(e).toBeTruthy();
      expect(e.order).toBe(orders[i]);
      expect(e.tier).toBe('confirmatory');
      expect(e.source_adr).toBe(ADR);
      expect(e.requires).toEqual(['repo-tree']);
      expect(e.params).toEqual({});
    });
  });
});

describe('conventions landed', () => {
  test('hermetic helper exists and exports the write path', () => {
    const h = require('./helpers/git-hermetic');
    expect(typeof h.git).toBe('function');
    expect(typeof h.gitOk).toBe('function');
    expect(typeof h.mkRepo).toBe('function');
    const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('test/helpers/git-hermetic.js');
    expect(agents).toContain('GIT_CONFIG_NOSYSTEM');
    expect(agents).toContain('[ANCHORING]');
    expect(agents).toContain('forensic, not preventive');
    expect(agents).toContain('Human-only adjudication');
    expect(agents).toContain('residual exposure window');
  });

  test('ERRATA carries E-15 (F-8 procedural defect) and E-16 (F-9/F-10 corrections)', () => {
    const err = fs.readFileSync(path.join(ROOT, 'docs/governance/ERRATA.md'), 'utf8');
    expect(err).toContain('E-15');
    expect(err).toContain('E-16');
    expect(err).toContain('161');
  });

  test('t28 report prose corrected: the claim row reads 161, not 180+', () => {
    const rpt = fs.readFileSync(path.join(ROOT, '.scratch/grill-t28/reports/2026-09-26-report.md'), 'utf8');
    expect(rpt).not.toContain('over 180+ shipped'); // the claim form is gone
    expect(rpt).toContain('over 161 shipped'); // corrected forward (ERRATA E-16)
    expect(rpt).toContain('Correction (grill-t29'); // transparent correction note
  });

  test('tide adjudication packet + defer-0075 tide-capacity row registered', () => {
    const pkt = fs.readFileSync(path.join(ROOT, '.scratch/grill-t29/tide-adjudication-packet.md'), 'utf8');
    for (const frag of ['F-8', 'seq-13', 'ratchet-brake', 'F-12', 'adjudicated/grill-t27', 'Signature:', 'countersign queue']) {
      expect(pkt).toContain(frag);
    }
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/deferred-registry.json'), 'utf8'));
    const row = reg.entries.find((r) => r.id === 'defer-0075');
    expect(row).toBeTruthy();
    expect(row.status).toBe('pending-evaluation');
    expect(row.review_at).toBe('2026-12-15');
  });

  test('trend inventory carries the grill-t29 row', () => {
    const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/governance/trend-inventory.json'), 'utf8'));
    const row = tr.rounds.find((r) => r.round === 'grill-t29');
    expect(row).toBeTruthy();
    expect(row.kind).toBe('fix');
    expect(row.governance_tooling_diff.files.length).toBeGreaterThan(0);
    expect(row.deferred_entry).toBe('defer-0075');
  });
});

describe('live leg runs', () => {
  test('exception-channel + test-git-hermetic pass on the real tree', () => {
    expect(run('scripts/check-exception-channel.js').status).toBe(0);
    expect(run('scripts/check-test-git-hermetic.js').status).toBe(0);
  });
  test('orphan-ancestry stays green on the real tree (hardened form)', () => {
    const r = fresh.orphanAncestry(ROOT, fresh.loadFreshness(ROOT), {});
    expect(r.violations).toEqual([]);
    expect(r.red).toBe(false);
  });
  test('evaluateRound(grill-t29) is clean: inFlightClean, capturesAtSealOk, no freeze violations, no unregistered claims', () => {
    const r = fresh.evaluateRound(ROOT, fresh.loadFreshness(ROOT), { id: 'grill-t29', base: 'c7ae4f81d4f13f9ddca829694bd2ae7fea750960' });
    expect(r.unregisteredClaims).toEqual([]);
    for (const c of r.claims) expect(c.bad).toEqual([]);
    expect(r.seal.present).toBe(true);
    expect(r.seal.inFlightClean).toBe(true);
    expect(r.seal.capturesAtSealOk).toBe(true);
    expect(r.seal.freezeViolations).toEqual([]);
  });
});
