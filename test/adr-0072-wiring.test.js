'use strict';
// test/adr-0072-wiring.test.js -- ADR-0072 (grill-t11 ledger D-001..D-005):
// doc-round wiring seeds for the readiness-verdict round. Locks the
// PRE-MEASUREMENT surface: the usable+testable verdict under
// measure-then-declare ordering, the b2-method re-measurement plan with its
// pre-registered downgrade trigger, the owner-dogfood bake protocol with the
// ADR-0070 G2 tier-2 amendment, the four critique dispositions, the
// capability-label word-slot fix, and the dormant D-G declaration block. The
// doc commit is the stage gate: no measurement/declaration precedes it.
// Const/style follows test/adr-0070-wiring.test.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0072-readiness-verdict-remeasurement-preregistration-bake-protocol-critique-dispositions.md');
const README = path.join(ROOT, 'README.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('ADR-0072 doc surface (grill-t11 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0072 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0072: Readiness Verdict');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-16');
    expect(a).toContain('D-001..D-005');
    expect(a).toContain('decision-ledger-t11');
  });

  test('all eight decision clauses land (verdict, plan, bake, tier-2, dispositions, labels, declaration, boundary)', () => {
    const a = adr();
    expect(a).toContain('### D-A - Readiness verdict: formally usable and testable');
    expect(a).toContain('### D-B - Pre-registered re-measurement plan');
    expect(a).toContain('### D-C - Bake protocol');
    expect(a).toContain('### D-D - ADR-0070 amendment: tier-2 independent second-line review');
    expect(a).toContain('### D-E - Critique-v4 dispositions');
    expect(a).toContain('### D-F - Capability-label semantics fix');
    expect(a).toContain('### D-G - Pre-registered declaration wording');
    expect(a).toContain('### D-H - Delivery boundary and round surface');
  });

  test('the re-measurement plan is registered with the lane exercise and the downgrade trigger', () => {
    const a = norm(adr());
    expect(a).toContain('npx --yes github:Xxx91n/jiahao init --profile verifier -y');
    expect(a).toContain('transcript_path');
    expect(a).toContain('detector.shadow === true');
    expect(a).toContain("detector.pairer.state === 'flagged'");
    expect(a).toContain('install path has a known issue (see the measured record)');
    expect(a).toContain('Repairing the wording after observing a failure is forbidden');
  });

  test('the bake protocol registers the host-confirmation stop point and the measured-present flip', () => {
    const a = adr();
    expect(a).toContain('REQUIRES a separate owner confirmation');
    expect(a).toContain('measured-present');
    expect(norm(a)).toContain('measured on one operator, one host');
    expect(norm(a)).toContain('synthetic bake traffic is forbidden');
  });

  test('the G2 tier-2 amendment is registered verbatim (before/after + pre-set criteria)', () => {
    const a = norm(adr());
    expect(a).toContain('every flagged item owner-reviewed: FP = 0');
    expect(a).toContain('every flagged item re-reviewed by an independent second line before the flip is evaluated: FP = 0');
    expect(a).toContain('FP adjudication authority is not the owner alone');
    expect(a).toContain('FALSE POSITIVE iff an independent re-parse');
    expect(a).toContain('family mis-assignment');
  });

  test('the dormant D-G declaration block is registered verbatim inside the ADR', () => {
    const a = norm(adr());
    expect(a).toContain('## Readiness status (ADR-0072)');
    expect(a).toContain('[installed-artifact measured] The Tier-1 channel installs in a clean environment');
    expect(a).toContain('[installed-artifact measured] The conviction lane runs stdin');
    expect(a).toContain('[documented] The lane runs in shadow mode only');
    expect(a).toContain('not a gate pass');
  });

  test('rejected clauses land (declare-before-measure, enum surgery, synthetic traffic, owner-only FP, seq-13 rewrite, hook registration without confirmation)', () => {
    const a = adr();
    for (const r of ['Declare readiness without re-measuring', 'Post-hoc wording repair', 'Enum rename/surgery', 'Synthetic bake traffic', 'owner-only FP adjudication', 'Rewriting seq 13', 'separate owner confirmation']) {
      expect(a).toContain(r);
    }
  });

  test('R2 landed: README carries the registered readiness block verbatim (it landed only after the measurement record)', () => {
    const rm = read(README);
    expect(rm).toContain('## Readiness status (ADR-0072)');
    expect(rm).toContain('[installed-artifact measured] The conviction lane runs stdin');
    expect(fs.existsSync(path.join(ROOT, '.scratch', 'grill-t11', 'readiness', 'b2-remeasurement-2026-09-16.md'))).toBe(true);
  });
});

describe('critique dispositions (ADR-0072 D-E)', () => {
  test('P-1: ERRATA E-6 carries the delegated-signature disclosure with the registered wording', () => {
    const e = read(path.join(ROOT, 'docs', 'governance', 'ERRATA.md'));
    expect(e).toContain('## E-6');
    expect(e).toContain('delegated second-line review, ID-level +');
    expect(e).toContain('delegation-level independence');
    expect(e).toContain('seq 13');
    expect(e).toContain('never rewritten');
  });

  test('P-1: ADR-0047 carries the appended second_reviewer disclosure note', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0047-impact-tiered-instrument-change-control.md'));
    expect(a).toContain('Appended note (2026-09-16, ADR-0072 D-E P-1)');
    expect(a).toContain('delegated second-line review');
    expect(a).toContain('ERRATA E-6');
  });

  test('P-2: the bounded-renewal template is pre-staged with scope + expiry mandatory', () => {
    const t = read(path.join(ROOT, 'docs', 'governance', 'delegation-renewal-template.md'));
    expect(t).toContain('scope');
    expect(t).toContain('expires_at');
    expect(t).toContain('renew | expire');
    expect(t).toContain('never rewritten');
    expect(t).toContain('ADR-0072 D-E P-2');
  });

  test('P-4: ADR-0067 carries the appended INDETERMINATE appendix', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0067-devin-corpus-v1-oot-falsification-adjudication.md'));
    expect(a).toContain('Appendix (2026-09-16, ADR-0072 D-E P-4): INDETERMINATE de facto claim treatment');
    expect(a).toContain('equal mechanical binding');
    expect(a).toContain('performance characteristics not established');
    expect(a).toContain('reserved-not-displayed');
  });

  test('P-5: the Re-Execution Prior term is present in CONTEXT.md', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('**Re-Execution Prior');
  });
});

describe('ADR-0070 amendments (ADR-0072 D-D/D-F)', () => {
  const A70 = path.join(ROOT, 'docs', 'adr', '0070-hook-side-conviction-lane-pairer-shadow-wiring-promotion-gate.md');

  test('ADR-0070 carries the Amended-by line and the appended amendment note', () => {
    const a = read(A70);
    expect(a).toContain('Amended by: ADR-0072 D-D');
    expect(a).toContain('## Amendment note (2026-09-16, ADR-0072)');
    expect(a).toContain('independent second line');
    expect(a).toContain('documented to deliver, not live-measured');
  });

  test('the amended claim sentence sits verbatim in all three claim homes', () => {
    // ADR-0073 D-C (O-1): superseded a second time at the measured-present
    // flip - the evidence layer is mandatory per the registered wording.
    const s = 'currently `measured-present` (live-observed: independent-audit reproduction + automated-harness events; organic pending) only for claude-code';
    for (const f of ['README.md', path.join('bench', 'research', 'out', 'claim-template.md'), path.join('bench', 'research', 'out', 'devin-oot-v3-report.md')]) {
      expect(read(path.join(ROOT, f))).toContain(s);
    }
  });
});

describe('capability-label semantics fix (ADR-0072 D-F)', () => {
  test('host-contracts _doc discloses present as documented-to-deliver and defines measured-present', () => {
    const cfg = readJson(path.join(ROOT, 'test', 'fixtures', 'host-contracts.json'));
    expect(cfg._doc).toContain('documented to deliver');
    expect(cfg._doc).toContain('measured-present');
    expect(cfg._doc).toContain('never a live measurement');
  });

  test('the measured-present word slot is registered in the validator enum; post-flip only claude-code carries it (ADR-0073 D-C O-1)', () => {
    const v = read(path.join(ROOT, 'scripts', 'check-host-contracts.js'));
    expect(v).toContain("'measured-present'");
    const cfg = readJson(path.join(ROOT, 'test', 'fixtures', 'host-contracts.json'));
    for (const c of cfg.contracts) {
      if (c.host === 'claude-code') expect(c.transcript_file).toBe('measured-present');
      else expect(c.transcript_file).not.toBe('measured-present');
    }
  });
});

describe('registry + ceremony rows (ADR-0027 D2 same-commit discipline)', () => {
  test('defer-0052 lands as this round net-addition tally row', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0052'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0072');
    expect(e.status).toBe('pending-evaluation');
    expect(e.review_at).toBe('2026-12-15');
    expect(e.subject).toContain('net-addition');
    expect(e.rationale).toContain('D-006(a)(i)');
  });

  test('trend-inventory gains the grill-t11 doc-round row', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t11-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0072']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0052');
  });

  test('anchors.json lists decision-ledger-t11.md under ADR-0072, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t11.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0072');
    expect(e.origin).toBe('.scratch/grill-t11/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t11.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t11', 'decision-ledger.md')));
  });

  test('the README ADR index carries ADR-0072 (rebuilt, 72 records)', () => {
    const r = read(README);
    expect(r).toContain('74 architecture decision records');
    expect(r).toContain('[ADR-0072](docs/adr/0072-readiness-verdict-remeasurement-preregistration-bake-protocol-critique-dispositions.md)');
  });

  test('the instrument-side registration event is recorded on the hash chain', () => {
    const st = readJson(path.join(ROOT, 'src', 'instrument-state.json'));
    const ev = st.history.find(function (e) {
      return e.kind === 'record_only_change' && e.after && JSON.stringify(e.after).indexOf('ADR-0072') !== -1;
    });
    expect(ev).toBeDefined();
    expect(ev.maker_id).toBeDefined();
    expect(ev.authorization).toBeDefined();
  });
});

describe('frozen surfaces this round must not touch', () => {
  test('v3 report.json stays at the burned sha256', () => {
    expect(sha256(read(path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.json'))))
      .toBe('fd6a0d42f5c0d3578ad9ee818b87d503eb51b758e0b950e33a3678cdadc6245b');
  });

  test('instrument-state history seq 13 is byte-stable (frozen, never rewritten)', () => {
    const st = readJson(path.join(ROOT, 'src', 'instrument-state.json'));
    const s13 = st.history.find(function (e) { return e.seq === 13; });
    expect(s13.kind).toBe('criteria_change');
    expect(s13.event_hash).toBe('d025289f5279c3751f0f50abbb331893861bed412eeb072e3d7e13be4e6b4006');
    expect(s13.second_reviewer).toBe('Xxx91n');
  });
});
