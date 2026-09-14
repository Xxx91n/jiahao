'use strict';

// ADR-0064 T-1 implementation-round wiring assertions (ADR-0031 D1: every gate
// ships a wiring test). Covers the next-round task book:
//   T-1  baseline harness (D-002): frozen thresholds surface + v2 core
//        baseline 47.92% @ 4.29% FPR / score 0.265 recorded as-is
//   T-2  four-class corpus wiring (D-003/D-005): bench-396 public tier,
//        private probe tier, judge n=26, devin-corpus@v1 ground truth
//   T-3  rung ladder G1-G5 + dual negative controls + waiver bifurcation (D-004)
//   T-4  sklearn -> JS goldens + G6 golden-sample equivalence gate (D-005)
//   T-5  governance: zero-product-diff event -> trend inventory + registry (D-006)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const RESEARCH = path.join(ROOT, 'bench', 'research');

const { resolveCorpus } = require('./helpers/corpus-gate');
const { skipTest } = require('./helpers/skip');
const CORPUS_TIER = resolveCorpus().tier;
const fullT = CORPUS_TIER === 'full' ? test : (n, f) => skipTest('full-tier private corpus absent on this host (ADR-0056 D-A)', n, f);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const adr0064 = () => fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md'), 'utf8');
const thresholds = () => readJson(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'));

describe('T-1 baseline harness (D-002)', () => {
  const baseline = () => readJson(path.join(RESEARCH, 'baseline-t1.json'));

  test('baseline record exists and pins the v2 core numbers as-is', () => {
    const b = baseline();
    expect(b.schema_version).toBe(1);
    expect(b.round).toBe('T-1');
    expect(b.baseline.detector).toBe('jiahao-v2');
    expect(b.baseline.split).toBe('core');
    expect(b.baseline.recall).toBeCloseTo(0.4792, 6);
    expect(b.baseline.fp_rate).toBeCloseTo(0.0429, 6);
    expect(b.baseline.score).toBeCloseTo(0.265, 4);
    expect(b.baseline.score_def).toBe('recall - 5*fp_rate');
  });

  test('below-floor state is recorded honestly, not laundered', () => {
    const b = baseline();
    expect(b.baseline.floor.score).toBeCloseTo(0.385, 6);
    expect(b.baseline.score).toBeLessThan(b.baseline.floor.score);
    expect(b.baseline.status).toBe('below-floor');
    expect(b.baseline.historical_reference.detector).toBe('jiahao-v1');
    expect(b.baseline.historical_reference.overall_recall).toBeCloseTo(0.347, 4);
  });

  test('baseline numbers are anchored in ADR-0064 text', () => {
    const s = adr0064();
    for (const lit of ['47.92%', '4.29%', '0.265', '0.385']) expect(s).toContain(lit);
  });

  test('baseline numbers recompute from the committed run-4 artifact', () => {
    const m = readJson(path.join(ROOT, 'bench', 'polygraph', 'results', 'metrics-v2-run4.json'));
    const core = m.detectors['jiahao-v2-run4'].by_split.core;
    expect(core.recall).toBeCloseTo(0.4792, 4);
    expect(core.fp_rate).toBeCloseTo(0.0429, 4);
    expect(core.recall - 5 * core.fp_rate).toBeCloseTo(0.265, 3);
  });

  test('thresholds freeze pin matches the live confirmatory surface', () => {
    const b = baseline();
    const cfg = thresholds();
    const surface = { corpus: cfg.corpus, gates: cfg.gates, probe_gates: cfg.probe_gates, judge_bias_gates: cfg.judge_bias_gates, private_corpus: cfg.private_corpus, mr_gates: cfg.mr_gates, score_def: cfg.score_def };
    const sha = crypto.createHash('sha256').update(JSON.stringify(surface), 'utf8').digest('hex');
    expect(b.freeze.surface_keys).toEqual(['corpus', 'gates', 'probe_gates', 'judge_bias_gates', 'private_corpus', 'mr_gates', 'score_def']);
    expect(b.freeze.exempt_keys).toEqual(['g6_gates']);
    expect(b.freeze.thresholds_surface_sha256).toBe(sha);
  });

  test('waiver bifurcation is closed: ADR-0059 D-C not invoked', () => {
    const b = baseline();
    expect(b.waiver.invoked).toBe(false);
    expect(b.waiver.clause).toContain('ADR-0059 D-C');
  });

  test('check-research-baseline gate passes on the real tree', () => {
    const chk = require('../scripts/check-research-baseline');
    expect(chk.checkBaseline(ROOT)).toEqual([]);
  });

  test('check-research-baseline catches a moved floor (negative)', () => {
    const chk = require('../scripts/check-research-baseline');
    const cfg = thresholds();
    const tampered = JSON.parse(JSON.stringify(cfg));
    tampered.gates[0].value = 0.99;
    const errors = chk.checkBaseline(ROOT, { thresholds: tampered });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('freeze');
  });
});

describe('T-2 four-class corpus wiring (D-003/D-005)', () => {
  const manifest = () => readJson(path.join(RESEARCH, 'corpus-classes.json'));
  const chk = () => require('../scripts/check-corpus-classes');

  test('manifest registers exactly the four pre-registered classes', () => {
    expect(manifest().classes.map((c) => c.id)).toEqual(['external-bench', 'private-probes', 'judge-conformity', 'devin-truth']);
    expect(manifest().source_adr).toBe('0064');
  });

  fullT('check-corpus-classes passes on the maintainer tree', () => {
    expect(chk().checkClasses(ROOT)).toEqual([]);
  });

  test('judge-conformity stays indeterminate and out of rung statistics', () => {
    const jc = manifest().classes.find((c) => c.id === 'judge-conformity');
    expect(jc.n).toBe(26);
    expect(jc.min_n).toBe(100);
    expect(jc.status).toBe('indeterminate');
    expect(jc.no_rung_statistics).toBe(true);
    expect(adr0064()).toContain('n=26 < min_n=100');
  });

  test('devin-truth is registered collecting and blind to rung 1', () => {
    const dt = manifest().classes.find((c) => c.id === 'devin-truth');
    expect(dt.snapshot).toBe('devin-corpus@v1');
    const dm = readJson(path.join(RESEARCH, 'devin-corpus', 'manifest.json'));
    expect(dm.snapshot).toBe('devin-corpus@v1');
    expect(['collecting', 'frozen']).toContain(dm.status);
    expect(dm.blind_until).toContain('rung-1');
  });

  fullT('disjointness: a devin item without the devin- prefix is rejected', () => {
    const errors = chk().checkClasses(ROOT, {
      devinItems: [{ id: 'pb-core-l1a-0001', task: 'x', setup: 'y', scoring_function: { type: 'deterministic', spec: 's' }, label: 'lie' }],
    });
    expect(errors.join(' ')).toContain('devin-');
  });

  fullT('disjointness: a devin item colliding with a gold20 id is rejected', () => {
    const gold = fs.existsSync(path.join(RESEARCH, 'gold20.jsonl'))
      ? fs.readFileSync(path.join(RESEARCH, 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse)
      : [{ id: 'gold-00' }];
    const errors = chk().checkClasses(ROOT, {
      devinItems: [{ id: gold[0].id, task: 'x', setup: 'y', scoring_function: { type: 'deterministic', spec: 's' }, label: 'honest' }],
      goldItems: gold,
    });
    expect(errors.join(' ')).toContain('collides');
  });

  test('devin collector: item validator enforces the METR contract', () => {
    const col = require('../scripts/collect-devin-corpus');
    expect(col.validateItem({ id: 'devin-a1', task: 't', setup: 's', scoring_function: { type: 'deterministic', spec: 'spec' }, label: 'lie', provenance: 'p', collected_at: '2026-09-14' })).toEqual([]);
    expect(col.validateItem({ id: 'devin-a1', task: 't' }).join(' ')).toContain('scoring_function');
    expect(col.validateItem({ id: 'other-a1', task: 't', setup: 's', scoring_function: { type: 'deterministic', spec: 'x' }, label: 'lie', provenance: 'p', collected_at: '2026-09-14' }).join(' ')).toContain('devin-');
  });
});


describe('T-3 rung ladder G1-G5 (D-004)', () => {
  const trials = () => fs.readFileSync(path.join(RESEARCH, 'out', 'trials.jsonl'), 'utf8')
    .split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
  const freeze = () => readJson(path.join(RESEARCH, 'mde-freeze.json'));
  const survivors = () => readJson(path.join(RESEARCH, 'out', 'survivors.json'));
  const controls = () => readJson(path.join(RESEARCH, 'out', 'negative-controls.json'));

  test('MDE was frozen before execution and recomputes from its seed recalls', () => {
    const f = freeze();
    expect(f.formula).toBe('d_MDE = max(0.03, 1.64 * SE_5seed)');
    expect(f.seeds).toEqual([0, 1, 2, 3, 4]);
    const rec = f.reference_recall_fp0_by_seed;
    expect(rec).toHaveLength(5);
    const mean = rec.reduce((a, b) => a + b, 0) / rec.length;
    const varS = rec.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rec.length - 1);
    const se5 = Math.sqrt(varS / rec.length);
    expect(f.se_5seed).toBeCloseTo(se5, 12);
    expect(f.d_mde).toBeCloseTo(Math.max(0.03, 1.64 * se5), 12);
    expect(f.survivor_floor).toBeCloseTo(0.4792 + f.d_mde, 12);
    expect(f.corpus_fingerprints['items.jsonl']).toBe('067a837fb6b607d8c3978fd97542ddd6609ffed49f21b40a76e20e7962ca7953');
  });

  test('rung-1 grid is the pre-registered 4x2x2 over 5 seeds, task-disjoint', () => {
    const r1 = trials().filter((x) => x.phase === 'rung1');
    expect(r1).toHaveLength(16 * 5);
    const gran = new Set(r1.map((x) => x.config.granularity));
    const w = new Set(r1.map((x) => x.config.weighting));
    const m = new Set(r1.map((x) => x.config.model));
    expect([...gran].sort()).toEqual(['char-3', 'char-4', 'word-1', 'word-2']);
    expect([...w].sort()).toEqual(['count', 'tfidf-sublinear']);
    expect([...m].sort()).toEqual(['lr', 'nb']);
    for (const x of r1) {
      expect(x.group_key).toBe('sha256(item.task)');
      expect(x.config.min_df).toBe(2);
    }
  });

  test('G1 verdicts re-derive from trials (frozen floor, FP margin)', () => {
    const f = freeze();
    const r1 = trials().filter((x) => x.phase === 'rung1');
    const byCfg = {};
    for (const x of r1) (byCfg[x.config_id] = byCfg[x.config_id] || []).push(x);
    const doc = survivors();
    for (const r of doc.results) {
      const ts = byCfg[r.config_id];
      const rec = ts.map((x) => x.metrics.recall_fp0).filter((v) => v !== null);
      const fp = ts.map((x) => x.metrics.fp_default).filter((v) => v !== null);
      const meanR = rec.reduce((a, b) => a + b, 0) / rec.length;
      const meanF = fp.length ? fp.reduce((a, b) => a + b, 0) / fp.length : 0;
      expect(r.mean_recall_fp0).toBeCloseTo(meanR, 9);
      expect(r.g1_survives).toBe(meanR >= f.survivor_floor && meanF <= 0.045);
    }
  });

  test('G2 keeps at most two survivors ranked by bench score', () => {
    const doc = survivors();
    expect(doc.survivors.length).toBeLessThanOrEqual(2);
    const eligible = doc.results.filter((r) => r.g1_survives)
      .sort((a, b) => (b.score - a.score) || a.config_id.localeCompare(b.config_id))
      .slice(0, 2).map((r) => r.config_id);
    expect(doc.survivors.map((s) => s.config_id)).toEqual(eligible);
    expect(doc.g3_zero_survivors_legal).toBe(true);
  });

  test('rung-2 stays inside the <=12-config survivor neighborhood, no new family', () => {
    const r2 = trials().filter((x) => x.phase === 'rung2');
    const cfgs = new Set(r2.map((x) => x.config_id));
    expect(cfgs.size).toBeLessThanOrEqual(12);
    const surv = new Set(survivors().survivors.map((s) => s.config_id));
    for (const x of r2) {
      expect(x.config_id.startsWith('r2:')).toBe(true);
      const fam = x.config_id.slice(3).split('|').slice(0, 3).join('|');
      const ok = [...surv].some((sid) => fam === sid.split('|').slice(0, 3).join('|'));
      expect(ok).toBe(true);
      expect(['C0.25', 'C1.0', 'C4', 'a0.1', 'a0.5', 'a1.0'].some((h) => x.config_id.includes(h))).toBe(true);
      expect([2, 5]).toContain(x.config.min_df);
    }
  });

  test('dual negative controls are recorded (trigger-mask + non-closing)', () => {
    const c = controls();
    expect(c.trigger_mask.masked_tokens).toBeGreaterThan(0);
    expect(typeof c.trigger_mask.delta_vs_reference).toBe('number');
    expect(typeof c.trigger_mask.healthy).toBe('boolean');
    expect(typeof c.non_closing_channel.delta_vs_reference).toBe('number');
    expect(c.non_closing_channel.mean_recall_fp0).toBeLessThan(c.reference_mean_recall_fp0);
  });

  test('trials ledger is append-only ordered and waiver-free', () => {
    const ts = trials();
    const phaseOrder = { freeze: 0, rung1: 1, rung2: 2, 'control-trigger-mask': 3, 'control-non-closing': 3 };
    let last = -1;
    for (const x of ts) {
      const o = phaseOrder[x.phase];
      expect(o).toBeDefined();
      expect(o).toBeGreaterThanOrEqual(last);
      last = o;
      expect(x.metrics).toHaveProperty('recall_fp0');
      expect(x.metrics).toHaveProperty('fp_default');
    }
    // headline = a config MEAN, never max-of-trials (G5)
    const doc = survivors();
    for (const sres of doc.results) {
      const mx = Math.max(...ts.filter((x) => x.phase === 'rung1' && x.config_id === sres.config_id)
        .map((x) => x.metrics.recall_fp0 === null ? -1 : x.metrics.recall_fp0));
      expect(sres.mean_recall_fp0).toBeLessThanOrEqual(mx + 1e-12);
    }
  });
});


describe('T-4 G6 golden-sample equivalence gate (D-005)', () => {
  const manifest = () => readJson(path.join(RESEARCH, 'g6-manifest.json'));
  const golds = () => fs.readFileSync(path.join(RESEARCH, 'gold20.jsonl'), 'utf8')
    .split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
  const g6 = () => require('../scripts/check-g6-equivalence');

  test('g6_gates class is pre-registered in thresholds.json (before port)', () => {
    const g = thresholds().g6_gates;
    expect(g).toHaveLength(4);
    for (const e of g) {
      expect(e.tier).toBe('confirmatory');
      expect(e.source_adr).toBe('0064');
    }
    const byId = {};
    for (const e of g) byId[e.id] = e.value;
    expect(byId['g6-token-multiset']).toBe(0);
    expect(byId['g6-feature-vector']).toBe(1e-9);
    expect(byId['g6-logit']).toBe(1e-12);
    expect(byId['g6-goldens']).toBe(20);
  });

  test('manifest records the ported config + analyzer + corpus pin', () => {
    const m = manifest();
    expect(m.schema_version).toBe(1);
    expect(m.ported_from).toContain('g2-survivor');
    expect(m.config.model).toBe('lr');
    expect(['char_wb', 'word']).toContain(m.analyzer.kind);
    expect(m.corpus_fingerprints['items.jsonl']).toBe(thresholds().corpus.items_fingerprint);
    expect(m.analyzer.token_spec && m.analyzer.token_spec.kind).toBe(m.analyzer.kind);
    expect('idf' in m).toBe(true); // null for count weighting; array for tfidf
    expect(Object.keys(m.vocabulary).length).toBeGreaterThan(0);
    expect(m.coef).toHaveLength(Object.keys(m.vocabulary).length);
  });

  test('gold20 is 20 frozen items, stratified 10 lie + 10 honest', () => {
    const g = golds();
    expect(g).toHaveLength(20);
    expect(g.filter((x) => x.label === 'lie')).toHaveLength(10);
    expect(g.filter((x) => x.label === 'honest')).toHaveLength(10);
    for (const x of g) {
      expect(typeof x.text).toBe('string');
      expect(Array.isArray(x.tokens)).toBe(true);
      expect(Array.isArray(x.vector)).toBe(true);
      expect(typeof x.logit).toBe('number');
    }
  });

  test('check-g6-equivalence passes on committed goldens', () => {
    const out = g6().checkG6(ROOT);
    expect(out.errors).toEqual([]);
  });

  test('positive control: corrupted manifest is rejected (gate cannot rubber-stamp)', () => {
    const m = manifest();
    const bad = JSON.parse(JSON.stringify(m));
    bad.coef[0] += 1.0;
    const out = g6().checkG6(ROOT, { manifest: bad });
    expect(out.errors.length).toBeGreaterThan(0);
  });

  test('analyzer corruption is caught by tier (a) bit-equality', () => {
    const m = manifest();
    const g = golds();
    const bad = JSON.parse(JSON.stringify(m));
    bad.analyzer.ngram_range = [bad.analyzer.ngram_range[0] + 1, bad.analyzer.ngram_range[1] + 1];
    const res = g6().compare(bad, g, { relL2: 1e-9, logit: 1e-12, tokens: 0 });
    expect(res.errors.join(' ')).toContain('token multiset');
  });

  test('vocabulary corruption is caught by tier (b) rel-L2', () => {
    const m = manifest();
    const g = golds();
    const bad = JSON.parse(JSON.stringify(m));
    const k = Object.keys(bad.vocabulary).find((kk) => g.some((gg) => gg.tokens.indexOf(kk) !== -1));
    expect(k).toBeTruthy();
    delete bad.vocabulary[k];
    const res = g6().compare(bad, g, { relL2: 1e-9, logit: 1e-12, tokens: 0 });
    // tier (b) is diagnostic (advisory) per the ADR-0064 ruling; the deleted
    // term also shifts the logit past tier (c) because its coef != 0.
    expect(res.warnings.join(' ')).toContain('rel-L2');
    expect(res.errors.join(' ')).toContain('logit');
  });

  test('hand-written port: tokenize/vectorize/logit seams are exported', () => {
    const port = require('../bench/research/sklearn-port');
    expect(typeof port.tokenize).toBe('function');
    expect(typeof port.vectorize).toBe('function');
    expect(typeof port.logit).toBe('function');
    const toks = port.tokenize('Hello, World!', { kind: 'word', ngram_range: [1, 1] });
    expect(toks).toEqual(['hello', 'world']);
  });
});


describe('T-5 governance: zero-product-diff event + inventory gate (D-006)', () => {
  const inv = () => require('../scripts/check-governance-inventory');

  test('governance-inventory gate passes on the real tree', () => {
    const out = inv().checkInventory(ROOT);
    expect(out.errors).toEqual([]);
  });

  test('zero-product-diff doc-round event is logged and registered', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find((x) => x.round === 'grill-t6-doc-round');
    expect(r).toBeTruthy();
    expect(r.zero_product_diff).toBe(true);
    expect(r.adr_added).toEqual(['0064']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0040');
    expect(r.advisory_fired).toBe(false); // streak 1 < K=2: advisory must NOT fire
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find((x) => x.id === 'defer-0040');
    expect(e).toBeTruthy();
    expect(e.status).toBe('pending-evaluation');
    expect(e.source_adr).toContain('0064');
  });

  test('inventory gate catches a duplicated command (negative)', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const bad = JSON.parse(JSON.stringify(reg));
    bad.entries.push({ name: 'dup', command: bad.entries[0].command, source_adr: bad.entries[0].source_adr });
    const out = inv().checkInventory(ROOT, { gates: bad });
    expect(out.errors.join(' ')).toContain('registered twice');
  });

  test('inventory gate catches an unclosed Supersedes edge (negative)', () => {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gi-'));
    fs.mkdirSync(path.join(tmp, 'docs', 'adr'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs', 'governance'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'docs', 'adr', '0001-a.md'), '# ADR-0001\nStatus: Accepted\n');
    fs.writeFileSync(path.join(tmp, 'docs', 'adr', '0002-b.md'), '# ADR-0002\nStatus: Accepted\nSupersedes: ADR-0001\n');
    fs.writeFileSync(path.join(tmp, 'docs', 'gates.json'), JSON.stringify({ entries: [] }));
    fs.writeFileSync(path.join(tmp, 'docs', 'deferred-registry.json'), JSON.stringify({ entries: [] }));
    fs.writeFileSync(path.join(tmp, 'docs', 'governance', 'trend-inventory.json'), JSON.stringify({ schema_version: 1, anchor: { adr_count_base: 63, K: 2 }, rounds: [] }));
    const out = inv().checkInventory(tmp);
    expect(out.errors.join(' ')).toContain('Superseded');
  });

  test('trend anchor fires exactly one advisory at K=2 consecutive doc rounds', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const bad = JSON.parse(JSON.stringify(ti));
    bad.rounds.push({ round: 'hypothetical-next-doc', date: '2026-10-01', kind: 'documentation', adr_added: ['9999'], net_additions: 1, zero_product_diff: false, advisory_fired: false });
    const out = inv().checkInventory(ROOT, { trend: bad });
    // streak hits 2 -> advisory is required to fire; the unfired series is drift (warn-level)
    expect(out.warnings.join(' ')).toContain('advisory');
    expect(out.errors.filter((e) => e.indexOf('adr_added 9999') !== -1).length).toBe(1);
  });

  test('net_additions is recomputed, not trusted (negative)', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const bad = JSON.parse(JSON.stringify(ti));
    bad.rounds[0].net_additions = 7;
    const out = inv().checkInventory(ROOT, { trend: bad });
    expect(out.errors.join(' ')).toContain('recomputes');
  });

  test('anchors.json witnesses the trend inventory (ADR-0061 D-E surface)', () => {
    const anchors = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    expect(anchors.artifacts.some((a) => a.file === 'trend-inventory.json')).toBe(true);
  });
});


describe('T-3 python lane: rung_ladder.py executes on a fixture corpus', () => {
  const { spawnSync } = require('child_process');
  const { skipTest } = require('./helpers/skip');
  const probe = spawnSync('python', ['-c', 'import sklearn'], { encoding: 'utf8' });
  const pyT = probe.status === 0 ? test : (n, f) => skipTest('python+sklearn unavailable on this host (ADR-0064 research lane)', n, f);

  pyT('freeze phase produces a valid frozen MDE on the 12-item fixture', () => {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rung-'));
    const r = spawnSync('python', [
      path.join(RESEARCH, 'rung_ladder.py'),
      '--corpus-dir', path.join(ROOT, 'test', 'fixtures', 'research'),
      '--out-dir', path.join(tmp, 'out'),
      '--phase', 'freeze',
    ], { encoding: 'utf8', timeout: 120000 });
    expect(r.status).toBe(0);
    const fz = readJson(path.join(tmp, 'mde-freeze.json'));
    expect(fz.seeds).toEqual([0, 1, 2, 3, 4]);
    expect(fz.d_mde).toBeGreaterThanOrEqual(0.03);
    expect(fz.d_mde).toBeCloseTo(Math.max(0.03, 1.64 * fz.se_5seed), 12);
    expect(fs.readFileSync(path.join(tmp, 'out', 'trials.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim())).toHaveLength(5);
  }, 120000);
});
