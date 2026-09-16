'use strict';
// test/adr-0070-wiring.test.js -- ADR-0070 (grill-t10 ledger D-001..D-007):
// doc-round wiring seeds for the hook-side conviction-lane round. Locks the
// PRE-IMPLEMENTATION surface: lane locus, the four frozen promotion criteria,
// product shape (single-source move / adapter / transcript-file three-state /
// flag record shape), record schema evolution, the three-sentence claim block,
// the F-A carry-over dispositions, and the ceremony rows. The doc commit is
// the stage gate: no lane code may precede it. Const/style follows
// test/adr-0069-wiring.test.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0070-hook-side-conviction-lane-pairer-shadow-wiring-promotion-gate.md');
const README = path.join(ROOT, 'README.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// ADR-0070 D-E: the registered three-sentence descriptive-existence claim.
// Whitespace-normalized compare (the ADR wraps lines; claim homes do not).
const LANE_SENTENCES = [
  'The CAPA claim-evidence pairer runs in **shadow mode** on the Stop/SubagentStop conviction lane for hosts that deliver a transcript file (per-host reachability is registered in the host-contract registry; currently `present` only for claude-code): flagged contradictions are appended to the evidence chain as `source: pairer-instrument` shadow records and never enter the severity matrix.',
  'The lane flags only a mechanically proven contradiction - a claimed value parsed from the transcript closing and an evidence value parsed from the tool-result stream, both present and unequal, inside the four registered families (exit-report, file-contains, count-report, content-append); unparseable claims, absent evidence, unsupported families, and hosts without transcript delivery are outside coverage and degrade as `undetermined` or `absent`, never as a flag and never as coverage:partial.',
  'The devin-corpus@v3 adjudication describes that corpus\'s behavior; it is not a real-traffic recall claim, and the shadow->enforce promotion gate verifies flagged-item FP, undetermined coverage, and lane latency - it does not certify recall.',
];

describe('ADR-0070 doc surface (grill-t10 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0070 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0070: Hook-Side Conviction Lane');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-16');
    expect(a).toContain('D-001..D-007');
    expect(a).toContain('decision-ledger-t10');
  });

  test('all seven decision clauses land (locus, promotion, shape, schema, claim, dispositions, boundary)', () => {
    const a = adr();
    expect(a).toContain('### D-A Conviction lane locus');
    expect(a).toContain('### D-B Shadow → enforce promotion contract');
    expect(a).toContain('### D-C Product shape');
    expect(a).toContain('### D-D Record schema evolution');
    expect(a).toContain('### D-E Claim form');
    expect(a).toContain('### D-F F-A carry-over dispositions');
    expect(a).toContain('### D-G Delivery boundary');
  });

  test('the four promotion criteria are frozen in the ADR with their exact numbers', () => {
    const a = norm(adr());
    expect(a).toContain('>= 200 real Stop events carrying lane records, spanning >= 1 full usage cycle');
    expect(a).toContain('every flagged item owner-reviewed: FP = 0 (a review disagreement counts as an FP');
    expect(a).toContain('undetermined rate <= 90% with no abnormal uptrend');
    expect(a).toContain('lane p99 latency <= 1 s inside the 10 s Stop-hook budget');
  });

  test('the shadow/enforce markers and flag-file names are registered verbatim', () => {
    const a = adr();
    expect(a).toContain('source: \'pairer-instrument\'');
    expect(a).toContain('.jiahao-conviction-off');
    expect(a).toContain('.jiahao-conviction-enforce');
    expect(a).toContain('detector.shadow');
    expect(a).toContain('detector.pairer');
    expect(a).toContain('latency_ms');
    expect(norm(a)).toContain('never enter the severity matrix');
  });

  test('the transcript-file three-state + never-partial clause is registered', () => {
    const a = adr();
    expect(a).toContain('requires: transcript-file');
    expect(a).toContain('transcript_file');
    expect(a).toContain('coverage:partial');
    expect(a).toContain('unverifiable');
  });

  test('the three-sentence claim block sits verbatim in the ADR (normed)', () => {
    const a = norm(adr());
    for (const s of LANE_SENTENCES) expect(a).toContain(norm(s));
  });

  test('the four F-A dispositions are registered with their dispositions', () => {
    const a = adr();
    expect(a).toContain('F-A1');
    expect(a).toContain('F-A2');
    expect(a).toContain('F-A3');
    expect(a).toContain('F-A4');
    expect(a).toContain('corrigendum');
    expect(a).toContain('durable ref');
    expect(norm(a)).toContain('never rewritten');
  });

  test('rejected clauses land (agent-side, seam occupation, day-one enforce, corpus prerequisite, efficacy claim, silence, abstain-blocks, partial-coverage, L1-L3 ride-along)', () => {
    const a = adr();
    for (const r of ['Agent-side self-run self-record', 'Occupying the judge seam', 'Day-one enforce', 'Real-corpus adjudication as a prerequisite', 'Efficacy claims migrated', 'Silence about a shipped capability', 'ABSTAIN-blocks', 'coverage:partial for missing transcript', 'L1-L3 detector riding along']) {
      expect(a).toContain(r);
    }
  });
});

describe('registry + ceremony rows (ADR-0027 D2 same-commit discipline)', () => {
  test('defer-0050 lands as this round net-addition tally row', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0050'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0070');
    expect(e.status).toBe('pending-evaluation');
    expect(e.review_at).toBe('2026-12-15');
    expect(e.subject).toContain('net-addition');
    expect(e.rationale).toContain('D-006(a)(i)');
  });

  test('trend-inventory gains the grill-t10 doc-round row', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t10-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0070']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0050');
  });

  test('anchors.json lists decision-ledger-t10.md under ADR-0070, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t10.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0070');
    expect(e.origin).toBe('.scratch/grill-t10/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t10.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t10', 'decision-ledger.md')));
  });

  test('the README ADR index carries ADR-0070 (rebuilt, 70 records)', () => {
    const r = read(README);
    expect(r).toContain('70 architecture decision records');
    expect(r).toContain('[ADR-0070](docs/adr/0070-hook-side-conviction-lane-pairer-shadow-wiring-promotion-gate.md)');
  });

  test('CONTEXT.md carries the five t10 glossary terms', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    for (const t of ['Conviction Lane', 'Shadow-Enforce Promotion Gate', 'Documented-Decision Closure', 'Corrigendum Discipline', 'Descriptive Existence Claim']) {
      expect(c).toContain('**' + t);
    }
  });

  test('the instrument-side registration event is recorded on the hash chain', () => {
    const st = readJson(path.join(ROOT, 'src', 'instrument-state.json'));
    const ev = st.history.find(function (e) {
      return e.kind === 'record_only_change' && e.after && JSON.stringify(e.after).indexOf('conviction lane') !== -1;
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
});
