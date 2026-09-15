'use strict';
// test/adr-0069-wiring.test.js -- ADR-0069 (grill-t8 ledger D-001..D-007):
// doc-round wiring seeds for the merged CAPA + readiness round. Locks the
// PRE-IMPLEMENTATION surface: the pairer semantics package, the three
// pre-registered clauses, the artifact-scoped sha256 freeze and the
// adjudicated/devin-corpus-v2 anchor tag, the b-line positioning contract,
// the v3 contamination-registry framework, and the ceremony rows. The doc
// commit is the stage gate: no pairer code, probe, or measured install run
// may precede it. Const/style follows the v2 suite (test/adr-0068-wiring).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0069-capa-claim-evidence-pairer-artifact-freeze-adjudication-anchor-readiness-positioning.md');
const V3DIR = path.join(ROOT, 'bench', 'research', 'devin-corpus-v3');
const README = path.join(ROOT, 'README.md');
const TAG = 'adjudicated/devin-corpus-v2';
const VERDICT_COMMIT = '8807a61122a8991bbe5f99ecc412d8989496f786';
const PINS = {
  'src/port/score.js': 'ffc61319ffc02d4dbaba0516d2f2c53860c0c5bdc93e6de71060c6bccdeb8977',
  'src/port/g6-manifest.json': '7ed23909cb7c5f459d26abcd93536ea84956920581372002571cc9b3cb87b115'
};
const FACT = 'devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)';
const LIM = 'This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function git(args) { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }); return { status: r.status, out: ((r.stdout || '') + (r.stderr || '')).trim() }; }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }

describe('ADR-0069 doc surface (grill-t8 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0069 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0069: CAPA Claim-Evidence Pairer Semantics');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-16');
    expect(a).toContain('D-001..D-007');
  });

  test('all six decision clauses land (pairer, clauses, binding, positioning, v3 obligations, G6)', () => {
    const a = adr();
    expect(a).toContain('### D-A - CAPA artifact: the deterministic claim-evidence pairer');
    expect(a).toContain('### D-B - three pre-registered clauses');
    expect(a).toContain('### D-C - version binding: artifact-scoped freeze + adjudication anchor');
    expect(a).toContain('### D-D - readiness positioning contract');
    expect(a).toContain('### D-E - v3 plan registration obligations');
    expect(a).toContain('### D-F - G6 impact assessment');
  });

  test('the ADR anchors the round tally row defer-0049', () => {
    expect(adr()).toContain('defer-0049');
  });

  test('rejected clauses land (R1-R8)', () => {
    const a = adr();
    expect(a).toContain('R1 Lexical surgery on the port');
    expect(a).toContain('R2 Switching the adjudicated object to src/detector.js');
    expect(a).toContain('R3 Pairer rules derived from spec.check');
    expect(a).toContain('R4 npm registry publication this round');
    expect(a).toContain('R5 Tree-level freeze wording');
    expect(a).toContain('R6 Any port-to-verdict influence in v3');
    expect(a).toContain('R7 Excluding undetermined items from n');
    expect(a).toContain('R8 Silent adoption of the fallback variant');
  });
});

describe('pairer semantics package (ADR-0069 D-A)', () => {
  const adr = () => read(ADR);

  test('proven-contradiction flag + never-flags-on-resemblance', () => {
    const a = adr();
    expect(a).toContain('mechanically proven contradiction');
    expect(a).toContain('claimed value parsed from the');
    expect(a).toContain('tool_result/event stream');
    expect(a).toContain('never flags on resemblance');
  });

  test('undetermined third state: collapses to unflagged, conservative on both axes, inside n', () => {
    const a = adr();
    expect(a).toContain('flagged | consistent | undetermined');
    expect(a).toContain('conservative on BOTH axes');
    expect(a).toContain('stays inside n');
    expect(a).toContain('undetermined rate is a');
    expect(a).toContain('pre-registered descriptive metric');
  });

  test('four check families + rules-before-data extension + detector.js boundary', () => {
    const a = adr();
    for (const f of ['exit-report', 'file-contains', 'count-report', 'content-append']) expect(a).toContain(f);
    expect(a).toContain('rules-before-data');
    expect(a).toContain('detector.js boundary');
    expect(a).toContain('judge-seam FP gate');
  });
});

describe('three pre-registered clauses (ADR-0069 D-B)', () => {
  test('port zero-verdict telemetry + disclosure-only divergence + meta-circularity ban', () => {
    const a = read(ADR);
    expect(a).toContain('zero-verdict');
    expect(a).toContain('no weighting, no veto, no escalation');
    expect(a).toContain('disclosure-only');
    expect(a).toContain('Meta-circularity ban');
    expect(a).toContain('spec.check is never read');
    expect(a).toContain('quantitative');
    expect(a).toContain('never enters');
  });
});

describe('artifact-scoped freeze + adjudication anchor (ADR-0069 D-C)', () => {
  test('the ADR carries both sha256 pins verbatim', () => {
    const a = read(ADR);
    for (const f of Object.keys(PINS)) expect(a).toContain(PINS[f]);
    expect(a).toContain('file-scoped');
    expect(a).toContain('forbidden tree-level claim');
  });

  test('the two adjudicated artifacts are byte-frozen at HEAD (any touch fails)', () => {
    for (const f of Object.keys(PINS)) {
      expect(sha256(fs.readFileSync(path.join(ROOT, f)))).toBe(PINS[f]);
    }
  });

  test('the anchor tag exists, is annotated, and points at the v2 verdict commit', () => {
    const ty = git(['cat-file', '-t', 'refs/tags/' + TAG]);
    expect(ty.status).toBe(0);
    expect(ty.out).toBe('tag'); // annotated, not lightweight
    const target = git(['rev-list', '-n', '1', TAG]);
    expect(target.out).toBe(VERDICT_COMMIT);
    const msg = git(['tag', '-l', '--format=%(contents)', TAG]);
    expect(msg.out).toContain('construct misalignment');
    expect(msg.out).toContain('devin-corpus@v2');
  });

  test('the tagged commit carries the frozen bytes (anchor binds the adjudicated state)', () => {
    for (const f of Object.keys(PINS)) {
      // blob-hash equality: tagged blob == HEAD blob, and the worktree file
      // sha256 already pins HEAD bytes to the registered pin (above).
      const tagged = git(['rev-parse', TAG + ':' + f]);
      const head = git(['rev-parse', 'HEAD:' + f]);
      expect(tagged.status).toBe(0);
      expect(head.status).toBe(0);
      expect(tagged.out).toBe(head.out);
    }
  });

  test('fallback variant registered but not selected', () => {
    const a = read(ADR);
    expect(a).toContain('Fallback variant (registered, not selected)');
    expect(a).toContain('adjudication_ref');
    expect(a).toContain('post-v2 unadjudicated');
    expect(a).toContain('explicit re-decision');
  });
});

describe('readiness positioning contract (ADR-0069 D-D)', () => {
  const rd = () => read(README);

  test('the failed fact line + limitation sit verbatim on the first screen', () => {
    const r = rd();
    const firstSection = r.indexOf('## What it does');
    expect(firstSection).toBeGreaterThan(0);
    const head = r.slice(0, firstSection);
    expect(head).toContain(FACT);
    expect(head).toContain(LIM);
    expect(head).toContain('discipline scaffold');
    expect(head).toContain('Nothing on this page is a detector-effectiveness claim');
  });

  test('existing claim homes stay byte-untouched (verbatim fact + limitation)', () => {
    const tpl = read(path.join(ROOT, 'bench', 'research', 'out', 'claim-template.md'));
    const md = read(path.join(ROOT, 'bench', 'research', 'out', 'devin-oot-v2-report.md'));
    for (const surf of [tpl, md, rd()]) {
      expect(surf).toContain(FACT);
      expect(surf).toContain(LIM);
    }
    // the claim-home section still carries the landed descriptor verbatim
    expect(rd()).toContain('dual-axis intersection-union verdict: lie axis 9/31 hits');
  });

  test('no unbounded effectiveness claim survives on the first screen', () => {
    expect(rd()).not.toContain('makes this structurally impossible');
  });

  test('b2 fail-branch + b3 invitation-only + b4 out are registered in the ADR', () => {
    const a = read(ADR);
    expect(a).toContain('install path has a known issue');
    expect(a).toContain('measurement-reproduction invitation');
    expect(a).toContain('b4 npm registry publication stays OUT');
    expect(a).toContain('equal standing');
  });
});

describe('v3 contamination-registry framework (ADR-0069 D-E.6)', () => {
  const FW = path.join(V3DIR, 'contamination-framework.json');
  const fw = () => readJson(FW);

  test('framework exists with schema, snapshot, source ADR and row shape', () => {
    const f = fw();
    expect(f.schema_version).toBe(1);
    expect(f.snapshot).toBe('devin-corpus@v3');
    expect(f.source_adr).toContain('0069');
    expect(f.registered_at).toBe('2026-09-16');
    expect(f.row_shape).toEqual(['parameter', 'value', 'v2_informed', 'basis']);
  });

  test('rows are well-formed and carry the v2_informed axis', () => {
    const rows = fw().rows;
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const r of rows) {
      expect(typeof r.parameter).toBe('string');
      expect('value' in r).toBe(true);
      expect(typeof r.v2_informed).toBe('boolean');
      expect(typeof r.basis).toBe('string');
    }
  });

  test('registered rows cover the v3 obligations (floor, bound, disposition, pin, undetermined)', () => {
    const rows = fw().rows;
    const by = (n) => rows.find(function (r) { return r.parameter === n; });
    expect(by('lie-axis floor').value).toBe(null);
    expect(by('lie-axis floor').v2_informed).toBe(true);
    expect(by('fp-axis usability bound').v2_informed).toBe(true);
    expect(by('ci flavor').v2_informed).toBe(false);
    expect(by('undetermined collapse').v2_informed).toBe(true);
    expect(by('category-scoped bound disposition').v2_informed).toBe(true);
    expect(by('adjudicated object pin').value).toBe(null);
    expect(by('adjudicated object pin').v2_informed).toBe(true);
    expect(by('supported check families').value).toEqual(['exit-report', 'file-contains', 'count-report', 'content-append']);
  });
});

describe('stage gates + scope clamps (this round)', () => {
  test('no v3 collection artifacts exist: no items, no decision tables, no v3 report', () => {
    expect(fs.existsSync(path.join(V3DIR, 'items.jsonl'))).toBe(false);
    expect(fs.existsSync(path.join(V3DIR, 'decision-tables.json'))).toBe(false);
    expect(fs.existsSync(path.join(V3DIR, 'manifest.json'))).toBe(false);
    const out = path.join(ROOT, 'bench', 'research', 'out');
    expect(fs.readdirSync(out).filter(function (f) { return /v3/i.test(f); })).toEqual([]);
  });

  test('npm surface unchanged: no bench/ leak beyond the one registered pin (ADR-0038 D2)', () => {
    const pkg = readJson(path.join(ROOT, 'package.json'));
    expect(pkg.files.join(' ')).not.toContain('devin-corpus-v3');
    expect(pkg.files.filter(function (f) { return /^bench\//.test(f); })).toEqual(['bench/polygraph/thresholds.json']);
  });

  test('CONTEXT.md carries the nine t8 glossary terms', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    for (const t of ['Construct Misalignment', 'Claim-Evidence Pairer', 'Undetermined (', 'Zero-Verdict Telemetry', 'Meta-Circularity Ban', 'Artifact-Scoped Freeze', 'Adjudication Anchor', 'Evidence-Tiered Readiness', 'Measurement-Reproduction Invitation']) {
      expect(c).toContain(t);
    }
  });
});

describe('registry + ceremony rows (ADR-0027 D2 same-commit discipline)', () => {
  test('defer-0049 lands as this round net-addition tally row', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0049'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0069');
    expect(e.status).toBe('pending-evaluation');
    expect(e.review_at).toBe('2026-12-15');
    expect(e.subject).toContain('net-addition');
    expect(e.rationale).toContain('D-006(a)(i)');
  });

  test('trend-inventory gains the grill-t8 doc-round row', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t8-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0069']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0049');
  });

  test('anchors.json lists decision-ledger-t8.md under ADR-0069', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t8.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0069');
    expect(e.origin).toBe('.scratch/grill-t8/decision-ledger.md');
    const ledger = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t8.md'));
    expect(sha256(ledger)).toBe(e.sha256);
  });

  test('the README ADR index carries ADR-0069 (rebuilt, 69 records)', () => {
    const r = read(README);
    expect(r).toContain('69 architecture decision records');
    expect(r).toContain('[ADR-0069](docs/adr/0069-capa-claim-evidence-pairer-artifact-freeze-adjudication-anchor-readiness-positioning.md)');
  });

  test('the instrument-side registration event is recorded on the hash chain', () => {
    const st = readJson(path.join(ROOT, 'src', 'instrument-state.json'));
    const ev = st.history.find(function (e) {
      return e.kind === 'record_only_change' && e.after && JSON.stringify(e.after).indexOf('adjudicated/devin-corpus-v2') !== -1;
    });
    expect(ev).toBeDefined();
    expect(ev.maker_id).toBeDefined();
    expect(ev.authorization).toBeDefined();
  });

  test('the ADR names the instrument registration channel', () => {
    expect(read(ADR)).toContain('second_reviewer countersign deferred');
  });
});
