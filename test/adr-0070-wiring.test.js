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
const { spawnSync } = require('child_process');

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

// ADR-0073 D-C (O-1): sentence 1's parenthetical is superseded a second
// time in the claim homes at the measured-present flip - with the mandatory
// evidence layer. The ADR body keeps its registered original; the ADR-0072
// D-F intermediate form is superseded by this live-observed form.
const LANE_SENTENCES_HOMES = LANE_SENTENCES.slice();
LANE_SENTENCES_HOMES[0] = 'The CAPA claim-evidence pairer runs in **shadow mode** on the Stop/SubagentStop conviction lane for hosts that deliver a transcript file (per-host reachability is registered in the host-contract registry; currently `measured-present` (live-observed: independent-audit reproduction + automated-harness events; organic pending) only for claude-code): flagged contradictions are appended to the evidence chain as `source: pairer-instrument` shadow records and never enter the severity matrix.';

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
    expect(e.status).toBe('closed');
    expect(e.closed_via).toContain('T-2 dispositions');
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
    expect(r).toContain('79 architecture decision records');
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

describe('T-2 implementation surface (ADR-0070 D-A/D-C)', () => {
  const PAIRER = path.join(ROOT, 'src', 'capa-pairer.js');
  const PIN_SHA = '9ff2d0ada931628b0bffcb8685125cc7d97ddbd599e8a67123d8811f83917445';

  test('the pairer is single-source at src/, byte-identical to the adjudicated pin', () => {
    const buf = fs.readFileSync(PAIRER);
    expect(sha256(buf)).toBe(PIN_SHA);
    expect(buf.length).toBe(10697);
    expect(fs.existsSync(path.join(ROOT, 'bench', 'research', 'capa-pairer.js'))).toBe(false); // no dual copy
    // the pin records path as a reference; eval-plan + plan point at src/
    const ep = readJson(path.join(ROOT, 'bench', 'research', 'devin-corpus-v3', 'eval-plan.json'));
    const pl = readJson(path.join(ROOT, 'bench', 'research', 'devin-corpus-v3', 'plan.json'));
    expect(ep.instrument.pairer.path).toBe('src/capa-pairer.js');
    expect(ep.instrument.pairer.sha256).toBe(PIN_SHA);
    expect(pl.adjudicated_object.path).toBe('src/capa-pairer.js');
    expect(pl.adjudicated_object.sha256).toBe(PIN_SHA);
  });

  test('the lane module + adapter + channel flags exist as the registered surface', () => {
    for (const f of ['src/pairer-lane.js', 'src/transcript-adapter.js']) {
      expect(fs.existsSync(path.join(ROOT, f))).toBe(true);
    }
    const paths = require('../src/shared/paths');
    expect(paths.convictionLaneOffPath()).toContain('.jiahao-conviction-off');
    expect(paths.convictionLaneEnforcePath()).toContain('.jiahao-conviction-enforce');
  });

  test('the verdict gate wires the lane and skips shadow records in the matrix', () => {
    const h = read(path.join(ROOT, 'hooks', 'jiahao-verdict-gate.js'));
    expect(h).toContain("require('../src/pairer-lane')");
    expect(h).toContain('detector.shadow === true');
    expect(h).toContain("pairer-instrument");
  });

  test('createRecord carries the registered lane fields', () => {
    const { createEvidenceLog } = require('../src/evidence-log');
    const rec = createEvidenceLog().createRecord('pairer-lane', 'pairer-instrument', 'suspect', 'd', null, null, {
      session_id: 's',
      detector: {
        suspicious: true, severity: 'high', source: 'pairer-instrument', shadow: true,
        pairer: { family: 'exit-report', state: 'flagged', claim: 2, evidence: 0, reason: 'r', latency_ms: 3 }
      },
    });
    expect(rec.detector.source).toBe('pairer-instrument');
    expect(rec.detector.shadow).toBe(true);
    expect(rec.detector.pairer).toEqual({ family: 'exit-report', state: 'flagged', claim: 2, evidence: 0, reason: 'r', latency_ms: 3 });
  });

  test('transcript-file is a registered closed-enum capability', () => {
    const cap = require('../src/shared/capability');
    expect(cap.CAPABILITIES).toContain('transcript-file');
  });

  test('host-contract registry declares transcript_file reachability on every contract and host', () => {
    const cfg = readJson(path.join(ROOT, 'test', 'fixtures', 'host-contracts.json'));
    const vals = ['present', 'absent', 'unverifiable', 'measured-present'];
    for (const c of cfg.contracts) expect(vals).toContain(c.transcript_file);
    const hosts = new Set(cfg.contracts.map(function (c) { return c.host; }));
    for (const h of hosts) {
      const states = new Set(cfg.contracts.filter(function (c) { return c.host === h; }).map(function (c) { return c.transcript_file; }));
      expect(states.size).toBe(1);
    }
    // claude-code measured on real host events (ADR-0073 D-C O-1);
    // instruction-tier absent; the rest unverifiable
    expect(cfg.contracts.find(function (c) { return c.host === 'claude-code'; }).transcript_file).toBe('measured-present');
    expect(cfg.contracts.find(function (c) { return c.host === 'aider'; }).transcript_file).toBe('absent');
  });

  test('pairer-regression gate is registered (confirmatory, repo-tree)', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const e = g.entries.find(function (x) { return x.name === 'pairer-regression'; });
    expect(e).toBeDefined();
    expect(e.command).toBe('node scripts/check-pairer-regression.js');
    expect(e.tier).toBe('confirmatory');
    expect(e.requires).toEqual(['repo-tree']);
    expect(e.source_adr).toContain('0070');
    expect(fs.existsSync(path.join(ROOT, 'scripts', 'check-pairer-regression.js'))).toBe(true);
  });

  test('telemetry script exists and computes the four gate inputs', () => {
    const t = require('../scripts/pairer-lane-telemetry.js');
    const out = t.collect([
      { detector: { source: 'pairer-instrument', shadow: true, pairer: { state: 'flagged', latency_ms: 5, family: 'exit-report' } }, session_id: 's1' },
      { detector: { source: 'pairer-instrument', shadow: true, pairer: { state: 'undetermined', latency_ms: 15, family: 'file-contains' } }, session_id: 's1' },
      { detector: { source: 'other' }, session_id: 's2' }, // non-lane record excluded
    ]);
    expect(out.events).toBe(2);
    expect(out.flagged).toBe(1);
    expect(out.undetermined_rate).toBe(0.5);
    expect(out.latency_ms.p99).toBe(15);
    expect(out.by_family['exit-report'].flagged).toBe(1);
  });

  test('the packed runtime surface includes the shipped pairer', () => {
    const { PACK_SURFACE_PRESENT } = require('../scripts/check-pack-smoke.js');
    expect(PACK_SURFACE_PRESENT).toContain('src/capa-pairer.js');
  });
});

describe('T-3 claim block in the three homes (ADR-0070 D-E)', () => {
  test('the three registered sentences appear verbatim in README, claim-template, and the v3 report', () => {
    const homes = [
      path.join(ROOT, 'README.md'),
      path.join(ROOT, 'bench', 'research', 'out', 'claim-template.md'),
      path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.md'),
    ];
    for (const f of homes) {
      const n = norm(read(f));
      for (const s of LANE_SENTENCES_HOMES) expect(n).toContain(norm(s));
    }
  });
});

describe('T-4 F-A carry-over dispositions (ADR-0070 F-A)', () => {
  const V3_MD = path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.md');

  test('F-A1: the corrigendum marker block is present and in sync with report.json', () => {
    const md = read(V3_MD);
    expect(md).toContain('corrigendum: ADR-0070 F-A1');
    expect(md).toContain('## Confusion matrix (main set, n=120)');
    expect(md).toContain('## Categorical breakdown (per family, main set)');
    expect(md).toContain('## Session and batch distribution (main set)');
    expect(md).toContain('## Honest-ratio, undetermined and side-set diagnostics');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'corrigendum-v3.js'), '--check'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
  });

  test('F-A1: the re-render never touches the burned artifacts', () => {
    // report.json stays at its burned sha256; the v3 manifest untouched.
    expect(sha256(read(path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v3-report.json'))))
      .toBe('fd6a0d42f5c0d3578ad9ee818b87d503eb51b758e0b950e33a3678cdadc6245b');
    expect(sha256(read(path.join(ROOT, 'bench', 'research', 'devin-corpus-v3', 'manifest.json'))))
      .toBe('57d44b89adb7ced04e3b2648000c774af08b183d6335b3c5a127830b02958eef');
  });

  test('F-A3: the durable-ref forward rule is registered in the corpus validator', () => {
    const c = read(path.join(ROOT, 'scripts', 'check-corpus-classes.js'));
    expect(c).toContain('harness_ref');
    expect(c).toContain('never the durable ref');
  });

  test('F-A4: the worker v2 self-reference is fixed and Sessions carries the main-set scope', () => {
    const w = read(path.join(ROOT, '.scratch', 'grill-t9', 'devin-collect-v3.js'));
    expect(w).not.toContain('twin of\n// .scratch/grill-t9/devin-collect-v3.js');
    expect(w).toContain('.scratch/grill-t7/devin-collect-v2.js');
    const rep = read(path.join(ROOT, '.scratch', 'grill-t9', 'reports', '2026-09-16-report.md'));
    expect(rep).toContain('Sessions: 20 (main set;');
    const md = read(V3_MD);
    expect(md).toContain('Sessions: 20 (main set; items.jsonl carries 24 session ids');
  });

  test('F-A2: the disposition line is a no-action closure', () => {
    expect(norm(read(ADR))).toContain('备案，无需行动');
  });

  test('the v3 md holds no ASCII ellipsis (ellipsis policy)', () => {
    expect(read(V3_MD)).not.toContain('...');
  });
});
