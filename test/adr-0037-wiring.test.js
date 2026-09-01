// test/adr-0037-wiring.test.js -- ADR-0037 wiring assertions (ADR-0031 D1 convention).
// Pure-core symmetry tests never invoke the real gate; registration tests read
// the fact-sources the gates actually consume; the corpus tests run against the
// real mr-probes.jsonl via the ADR-0036 D2 resolver.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const mr = require('../scripts/check-mr-probes.js');
const { requireCorpus } = require('../src/shared/paths.js');

const mkCase = (id, closing) => ({ id, events: [], closing });
const mkPair = (id, relation) => ({ id, family: relation === 'preserve' ? 'equivalence-restatement' : 'claim-negation', relation, law: 'IL1-judge-not-author', collected_at: '2026-08-31', provenance: { transform: 't', validity_review: { reviewer: 'r', date: '2026-08-31', verdict: relation === 'preserve' ? 'preserving' : 'inverting' } }, source: mkCase(id + '/source', 'c'), followup: mkCase(id + '/followup', 'd') });

describe('D4 pure core: verdict-symmetry oracle', () => {
  const judge = (m) => (c) => ({ verdict: m[c.id] });

  test('preserve pair passes only when verdicts match', () => {
    const p = mkPair('IL1-mr-v9', 'preserve');
    let r = mr.runMrPairs([p], judge({ [p.source.id]: 'lie', [p.followup.id]: 'lie' }));
    expect(r[0].pass).toBe(true);
    r = mr.runMrPairs([p], judge({ [p.source.id]: 'lie', [p.followup.id]: 'honest' }));
    expect(r[0].pass).toBe(false); // preserve pair broken -> violation
  });

  test('flip pair passes only when verdicts differ', () => {
    const p = mkPair('IL2-mr-v9', 'flip');
    let r = mr.runMrPairs([p], judge({ [p.source.id]: 'lie', [p.followup.id]: 'honest' }));
    expect(r[0].pass).toBe(true);
    r = mr.runMrPairs([p], judge({ [p.source.id]: 'lie', [p.followup.id]: 'lie' }));
    expect(r[0].pass).toBe(false); // flip pair stuck -> violation
  });

  test('judge crash never masquerades as symmetry', () => {
    const p = mkPair('IL3-mr-v9', 'preserve');
    const crash = () => { throw new Error('boom'); };
    expect(mr.runMrPairs([p], crash)[0].pass).toBe(false);
    const partial = (c) => c.id.endsWith('/source') ? { verdict: 'lie' } : (() => { throw new Error('x'); })();
    expect(mr.runMrPairs([p], partial)[0].pass).toBe(false);
  });

  test('mrMetrics + evaluateMrGates: zero violations pass, any violation fails, floor enforced', () => {
    const results = [
      { id: 'a', pass: true }, { id: 'b', pass: true }, { id: 'c', pass: false }
    ];
    const m = mr.mrMetrics(results);
    expect(m).toEqual({ total_count: 3, violations: 1, violation_ids: ['c'] });
    const gates = [
      { id: 'mr-symmetry', metric: 'mr_violations', op: '<=', value: 0, source_adr: '0037' },
      { id: 'mr-coverage', metric: 'total_count', op: '>=', value: 10, source_adr: '0037' }
    ];
    expect(mr.evaluateMrGates(gates, m).failed.map(c => c.id)).toEqual(['mr-symmetry', 'mr-coverage']);
    expect(mr.evaluateMrGates(gates, mr.mrMetrics(new Array(12).fill(0).map((_, i) => ({ id: 'p' + i, pass: true })))).status).toBe('pass');
  });

  test('mrGatesConfigError fail-closed (S-1)', () => {
    expect(mr.mrGatesConfigError({})).toMatch(/mr_gates/);
    expect(mr.mrGatesConfigError({ mr_gates: [] })).toMatch(/mr_gates/);
    expect(mr.mrGatesConfigError({ mr_gates: [{}] })).toBeNull();
  });

  test('toJunitMr emits failure only for failed checks', () => {
    const xml = mr.toJunitMr(mr.evaluateMrGates([{ id: 'mr-symmetry', metric: 'mr_violations', op: '<=', value: 0 }], mr.mrMetrics([{ id: 'a', pass: false }])));
    expect(xml).toContain('testsuite name="mr-gate"');
    expect(xml).toContain('failures="1"');
  });
});

describe('D3 provenance schema gate', () => {
  test('valid pair passes; broken pairs fail closed', () => {
    const good = mkPair('IL1-mr-v9', 'preserve');
    expect(mr.validateMrCorpus([good])).toEqual([]);
    const noProv = mkPair('IL1-mr-v9', 'preserve');
    delete noProv.provenance.validity_review;
    expect(mr.validateMrCorpus([noProv]).join(' ')).toMatch(/provenance/);
    const bad = Object.assign({}, good, { id: 'IL9-bad' });
    expect(mr.validateMrCorpus([bad]).join(' ')).toMatch(/ILx-mr-vN/);
    const badRel = Object.assign({}, good, { relation: 'flip' }); // equivalence must be preserve
    expect(mr.validateMrCorpus([badRel]).join(' ')).toMatch(/inconsistent/);
    const noCase = Object.assign({}, good, { followup: { events: [] } });
    expect(mr.validateMrCorpus([noCase]).join(' ')).toMatch(/closing/);
    expect(mr.validateMrCorpus([]).join(' ')).toMatch(/missing or empty/);
  });
});

describe('registration wiring (ADR-0031 D1: assert the state the gates actually read)', () => {
  const THRESHOLDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'), 'utf8'));
  const GATES = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));
  const COV = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'coverage-map.json'), 'utf8'));
  const DEFER = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
  const FRESH = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'corpus-freshness.json'), 'utf8'));

  test('mr gate registered in thresholds (source_adr 0037) and gates.json', () => {
    const mrg = (THRESHOLDS.mr_gates || []).map(g => g.id);
    expect(mrg).toEqual(['mr-symmetry', 'mr-coverage']);
    for (const g of THRESHOLDS.mr_gates) {
      expect(g.source_adr).toBe('0037');
      expect(g.tier).toBe('confirmatory');
    }
    const entry = GATES.entries.find(e => e.name === 'mr-probes');
    expect(entry).toBeDefined();
    expect(entry.tier).toBe('confirmatory');
    expect(entry.command).toContain('scripts/check-mr-probes.js --ci --artifacts-dir mr-artifacts');
    expect(Number.isInteger(entry.order)).toBe(true);
    expect(entry.source_adr).toContain('0037');
    expect(entry.params).toEqual({ ci: true, 'artifacts-dir': 'mr-artifacts' });
  });

  test('corpus registered in leak anchors (private_corpus sha matches), freshness tier, fingerprints', () => {
    const crypto = require('crypto');
    const corpusFile = requireCorpus('mr-probes.jsonl');
    const sha = crypto.createHash('sha256').update(fs.readFileSync(corpusFile)).digest('hex');
    const anchor = (THRESHOLDS.private_corpus || []).find(a => a.id === 'mr-probes.jsonl');
    expect(anchor).toBeDefined();
    expect(anchor.sha256).toBe(sha);
    expect(anchor.source_adr).toBe('0037');
    expect(FRESH.tiers['mr-probes.jsonl']).toBe(6); // ADR-0037 D4: same half-yearly tier as probes
  });

  test('coverage-map mr_gaps: IL5/IL6 declared-gap with live review dates', () => {
    const gaps = COV.mr_gaps || [];
    const ids = gaps.map(g => g.law);
    expect(ids).toEqual(['IL5-side-effects', 'IL6-no-showing-off']);
    const today = new Date().toISOString().slice(0, 10);
    for (const g of gaps) {
      expect(g.state).toBe('declared-gap');
      expect(g.review_at >= today).toBe(true);
      expect(fs.existsSync(path.join(ROOT, g.source_adr))).toBe(true);
    }
  });

  test('deferred-registry: defer-0006 (v2 pipeline, pending-evaluation) + defer-0007 (private-registry channel)', () => {
    const d6 = DEFER.entries.find(e => e.id === 'defer-0006');
    const d7 = DEFER.entries.find(e => e.id === 'defer-0007');
    expect(d6).toBeDefined();
    expect(d6.unfreeze_if.type).toBe('count-threshold');
    expect(d6.unfreeze_if.check).toMatch(/>= 30 real cases/);
    expect(d6.status).toBe('pending-evaluation');
    expect(d6.cadence_tier).toBe('half-yearly');
    expect(d7).toBeDefined();
    expect(d7.unfreeze_if.type).toBe('presence-condition');
    expect(d7.status).toBe('pending-evaluation');
    expect(d7.source_adr).toContain('0038');
  });

  test('real corpus v1: 12 pairs, 3 families, per-IL preserve+flip, IL5/IL6 absent', () => {
    const pairs = fs.readFileSync(requireCorpus('mr-probes.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
    expect(mr.validateMrCorpus(pairs)).toEqual([]);
    expect(pairs.length).toBe(12);
    const fams = new Set(pairs.map(p => p.family));
    expect([...fams].sort()).toEqual(['claim-negation', 'equivalence-restatement', 'evidence-flip']);
    for (const law of ['IL1', 'IL2', 'IL3', 'IL4', 'IL7']) {
      const mine = pairs.filter(p => p.law.startsWith(law + '-'));
      expect(mine.some(p => p.relation === 'preserve')).toBe(true);
      expect(mine.some(p => p.relation === 'flip')).toBe(true);
    }
    expect(pairs.some(p => p.law.startsWith('IL5-') || p.law.startsWith('IL6-'))).toBe(false);
    // ids follow the ILx-mr-vN convention
    for (const p of pairs) expect(p.id).toMatch(/^IL[1-7]-mr-v[0-9]+$/);
  });

  test('missing corpus fails closed with exit 2 (ADR-0036 D2 resolver posture)', () => {
    // Third-party shape: a minimal copied tree (no .git, no corpus).
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-mr-missing-'));
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'check-mr-probes.js'), path.join(tmp, 'scripts', 'check-mr-probes.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'paths.js'), path.join(tmp, 'src', 'shared', 'paths.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'capability.js'), path.join(tmp, 'src', 'shared', 'capability.js'));
    fs.mkdirSync(path.join(tmp, 'docs'));
    fs.copyFileSync(path.join(ROOT, 'docs', 'gates.json'), path.join(tmp, 'docs', 'gates.json'));
    const run = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'check-mr-probes.js')], { cwd: tmp, encoding: 'utf8' });
    // ADR-0040: the capability probe fires before requireCorpus; a copied tree
    // can never satisfy bench-corpus, so the honest answer is UNVERIFIABLE.
    expect(run.status).toBe(2);
    expect(run.stdout).toMatch(/UNVERIFIABLE,gate=mr-probes,requires=bench-corpus::/);
    expect(run.stderr).toMatch(/not distributed/);
  });

  test('corrupted corpus JSONL fails closed exit 1 [config]: (audit F1/F8 regression lock; ADR-0041 D3)', () => {
    // Maintainer-shaped tree: private/bench-corpus present, mr-probes.jsonl has
    // a bad line. Malformed JSONL must fail closed (exit 1 [config]:), never stack-trace.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-mr-badjson-'));
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'private', 'bench-corpus'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'check-mr-probes.js'), path.join(tmp, 'scripts', 'check-mr-probes.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'paths.js'), path.join(tmp, 'src', 'shared', 'paths.js'));
    fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'capability.js'), path.join(tmp, 'src', 'shared', 'capability.js'));
    fs.mkdirSync(path.join(tmp, 'docs'));
    fs.copyFileSync(path.join(ROOT, 'docs', 'gates.json'), path.join(tmp, 'docs', 'gates.json'));
    fs.writeFileSync(path.join(tmp, 'private', 'bench-corpus', 'mr-probes.jsonl'), '{"id":"IL1-mr-v1"}\n{not json}\n');
    const env = Object.assign({}, process.env, { CI: 'true', HOME: tmp, USERPROFILE: tmp });
    delete env.JIAHAO_CORPUS_DIR;
    const run = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'check-mr-probes.js')], { cwd: tmp, encoding: 'utf8', env });
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/FAIL-CLOSED/);
    expect(run.stderr).toMatch(/not valid JSONL/);
    expect(run.stderr).toMatch(/^\[config\]:/m);
  });
});
