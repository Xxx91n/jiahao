'use strict';
// test/adr-0075-wiring.test.js -- ADR-0075 (grill-t14 ledger D-001..D-005):
// doc-round wiring seeds for the promotion-review preregistration pack. Locks
// the PRE-ACTION surface: the N/M sufficiency qualifier (single proposition,
// no independent pass state, distinct non-self-test session independence +
// measurability boundary, tighten-only values), the <=8-class analysis-side
// intent taxonomy (unknown catch-all never counts, K=2 support, classifier
// version+prompt-hash pinning, amendment-only), the sunset dual-or-path
// trigger (6 zero quarterly check-ins OR defer-0055 closure-without-
// activation -> sole consequence = activate the scheduled strategic review +
// ledger event; watchdog lifecycle independence), the blocking meta-
// requirement (>=1 organic-falsifiable kill condition; no G1/G3/G4
// amendment; tighten-only), the defer-0055 pointer + defer-0059 tally
// registrations, and the round's sync surface (t14 ledger anchor, README
// index). The doc commit is the stage gate: R2 may not edit this text.
// Const/style follows test/adr-0074-wiring.test.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0075-promotion-review-preregistration-nm-sufficiency-intent-taxonomy-sunset-trigger.md');
const README = path.join(ROOT, 'README.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('ADR-0075 doc surface (grill-t14 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0075 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0075: Promotion-Review Preregistration Pack');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-17');
    expect(a).toContain('D-001..D-005');
    expect(a).toContain('decision-ledger-t14');
  });

  test('all five decision clauses land', () => {
    const a = adr();
    expect(a).toContain('### D-A - The N/M sufficiency qualifier');
    expect(a).toContain('### D-B - The intent taxonomy and its four implementation requirements');
    expect(a).toContain('### D-C - The sunset trigger clause');
    expect(a).toContain('### D-D - The blocking meta-requirement and the criteria shape');
    expect(a).toContain('### D-E - Round surface and registrations');
  });

  test('the N/M qualifier is registered verbatim: single proposition, no independent pass state', () => {
    const a = norm(adr());
    expect(a).toContain('events >= 200 AND sessions >= 20 AND intent-classes >= 5');
    expect(a).toContain('NO independent pass state');
    expect(a).toContain('the SAME organic corpus G1 counts');
  });

  test('independence operationalization + measurability boundary + values are frozen', () => {
    const a = norm(adr());
    expect(a).toContain('distinct non-self-test session_id');
    expect(a).toContain('lane records carry no user-id field');
    expect(a).toContain('N = 20 sessions');
    expect(a).toContain('M = 5 intent classes');
    expect(a).toContain('only tighten later, never loosen');
  });

  test('the 8-class taxonomy is pre-registered with the unknown catch-all that never counts', () => {
    const a = norm(adr());
    for (const c of ['feature', 'bugfix', 'refactor', 'docs', 'exploration', 'ops', 'qa', 'other', 'unknown']) {
      expect(a).toContain('`' + c + '`');
    }
    expect(a).toContain('unknown never counts toward M');
    expect(a).toContain('>= K=2 independent sessions');
    expect(a).toContain("classifier's version and prompt hash");
    expect(a).toContain('ANALYSIS side');
  });

  test('the sunset clause is dual-or-path with a single consequence and watchdog independence', () => {
    const a = norm(adr());
    expect(a).toContain('N=6 consecutive quarterly check-ins with organic=0');
    expect(a).toContain('defer-0055 closes under its own `closes_if`');
    expect(a).toContain('activates the already-scheduled, pre-registered strategic review');
    expect(a).toContain('INDEPENDENT lifecycle');
    expect(a).toContain('organic>0 resets the counter to zero');
    expect(a).toContain('never amends, closes, or exempts G1/G3/G4');
    expect(a).toContain('carries a pointer to this clause and nothing else');
  });

  test('the blocking meta-requirement and the criteria shape are registered', () => {
    const a = norm(adr());
    expect(a).toContain('MUST register its full evidence criteria before evaluating anything');
    expect(a).toContain('output produced without prior registration is void');
    expect(a).toContain('>= 1 kill condition');
    expect(a).toContain('falsifiable in the organic-event corpus');
    expect(a).toContain('no amendment of G1/G3/G4');
  });

  test('the frozen-text exit criterion and the two unbundled owner asks are registered', () => {
    const a = norm(adr());
    expect(a).toContain('frozen as text before R1 closes');
    expect(a).toContain('instrument seq 24 sign-off (record-type)');
    expect(a).toContain('defer-0051 evidence packet (judgmental');
    expect(a).toContain('never bundled');
  });
});

describe('registry + governance-surface sync', () => {
  test('defer-0055 carries only a pointer to the ADR-0075 clause', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const d = reg.entries.find(function (e) { return e.id === 'defer-0055'; });
    expect(d).toBeDefined();
    expect(d.sunset_trigger_pointer).toContain('ADR-0075 D-C');
    expect(d.sunset_trigger_pointer).toContain('only the pointer');
    expect(d.status).toBe('pending-evaluation');
    expect(d.closes_if.check).toContain('six consecutive months');
  });

  test('defer-0059 registers the net-addition tally for this round', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const d = reg.entries.find(function (e) { return e.id === 'defer-0059'; });
    expect(d).toBeDefined();
    expect(d.source_adr).toContain('0075-promotion-review-preregistration');
    expect(d.cadence_tier).toBe('quarterly');
    // R1 facts only here - the closed status is R2 state and lives solely in
    // the R1->R2 boundary describe below (grill-t15 nit: no double assert).
  });

  test('the README ADR index carries ADR-0075 (rebuilt, 76 records)', () => {
    const r = read(README);
    expect(r).toContain('76 architecture decision records');
    expect(r).toContain('0075-promotion-review-preregistration-nm-sufficiency-intent-taxonomy-sunset-trigger.md');
  });

  test('anchors.json lists decision-ledger-t14.md under ADR-0075, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t14.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0075');
    expect(e.origin).toBe('.scratch/grill-t14/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t14.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t14', 'decision-ledger.md')));
  });
});

describe('R1->R2 boundary: action-round dispositions (grill-t14 R2)', () => {
  test('defer-0051 is closed discharged-by-trigger with the single-point caveat', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const d = reg.entries.find(function (e) { return e.id === 'defer-0051'; });
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('discharged-by-trigger');
    expect(d.closed_via).toContain('324711');
    expect(d.closure_note).toContain('1 data point existence check');
    expect(d.closure_note).toContain('pack-smoke');
    expect(d.trigger_override).toContain('overrides review_at=2026-12-15');
  });

  test('the evidence packet carries the measurement + weak-independent countersign + the owner ratification landed at grill-t15 T-3', () => {
    const p = readJson(path.join(ROOT, '.scratch', 'grill-t14', 'evidence', 'defer-0051-evidence-packet.json'));
    expect(p.measurement.size_bytes).toBe(324711);
    expect(p.protocol.command).toBe('npm pack --dry-run --json');
    expect(p.anchors.under_cap).toBe(true);
    expect(p.signatures.second_party_countersign.grade).toBe('weak-independent');
    expect(p.signatures.second_party_countersign.matches_packet).toBe(true);
    // owner slot was open at t14 R2 (Ask B pending); ratified 2026-09-18 at
    // grill-t15 T-3 - F-1 settled, the t14 audit outcome owner-ratified.
    expect(p.signatures.owner_ratification.verdict).toBe('ratified');
    expect(p.signatures.owner_ratification.signer).toBe('Euiop1');
    expect(p.signatures.owner_ratification.signed_at).toBe('2026-09-18');
  });

  test('the T-2 dispositions ledger section is appended and synced to the governance copy', () => {
    const scratch = read(path.join(ROOT, '.scratch', 'grill-t14', 'decision-ledger.md'));
    expect(scratch).toContain('## T-2 dispositions (R2 action round, 2026-09-17)');
    expect(scratch).toContain('defer-0051');
    expect(scratch).toContain('discharged-by-trigger');
    expect(scratch).toContain('overrides review_at=2026-12-15');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t14.md'));
    expect(copy).toBe(scratch);
  });

  test('defer-0059 closed via same-commit ledger note; the trend row landed', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const d = reg.entries.find(function (e) { return e.id === 'defer-0059'; });
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('same-commit ledger note');
    const t = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const row = t.rounds.find(function (r) { return r.round === 'grill-t14-doc-round'; });
    expect(row.adr_added).toEqual(['0075']);
    expect(row.deferred_entry).toBe('defer-0059');
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

  test('G1 stays organic-only and unchanged (no G1/G3/G4 amendment this round)', () => {
    const a70 = read(path.join(ROOT, 'docs', 'adr', '0070-hook-side-conviction-lane-pairer-shadow-wiring-promotion-gate.md'));
    expect(a70).toContain('narrowed to ">= 200 organic Stop events');
    const a = read(ADR);
    expect(a).not.toContain('G1 amended');
    expect(a).toContain('G1/G3/G4 untouched');
  });
});


describe('grill-t15: sunset counter durable home (ADR-0075 D-C state host)', () => {
  const COUNTER = path.join(ROOT, 'docs', 'governance', 'sunset-counter.json');
  const counter = () => readJson(COUNTER);

  test('the counter artifact exists with the registered schema and lives in the anchors chain', () => {
    const c = counter();
    expect(c.schema_version).toBe(1);
    expect(c.trigger_ref).toBe('ADR-0075 D-C');
    expect(c.n_target).toBe(6);
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'sunset-counter.json'; });
    expect(e).toBeDefined();
    expect(e.sha256).toBe(sha256(read(COUNTER)));
  });

  test('the count reads 1/6: one observation of organic=0, no resets, no activation latch', () => {
    const c = counter();
    expect(c.consecutive_zeros).toBe(1);
    expect(c.observations).toHaveLength(1);
    expect(c.observations[0].organic_events).toBe(0);
    expect(c.reset_events).toEqual([]);
    expect(c.missed_check_ins).toEqual([]);
    expect(c.activation).toBeNull();
  });

  test('the observation tail reconciles with the ledger audit trail (ledger is not the state host)', () => {
    const c = counter();
    const obs = c.observations[c.observations.length - 1];
    expect(obs.check_in_date).toBe('2026-09-17');
    expect(fs.existsSync(path.join(ROOT, obs.evidence_ref))).toBe(true);
    const ledger = read(path.join(ROOT, obs.ledger_ref.split('#')[0]));
    expect(ledger).toContain('organic=0');
    expect(ledger).toContain('1/6');
  });

  test('the clause semantics are pinned: missed check-in freezes, organic resets, activation only suggests', () => {
    const c = counter();
    expect(c.semantics.missed_check_in).toContain('freezes');
    expect(c.semantics.organic_positive).toContain('resets');
    expect(c.semantics.activation).toContain('SUGGESTS');
    expect(c.verified_by).toBe('scripts/pairer-lane-telemetry.js');
  });

  test('ADR-0075 D-C carries the durable-host pointer line', () => {
    const a = norm(read(ADR));
    expect(a).toContain('docs/governance/sunset-counter.json');
    expect(a).toContain('A missed check-in is not a zero');
  });
});
