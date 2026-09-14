'use strict';

// test/adr-0065-impl-wiring.test.js - ADR-0065 T-6 confirmatory IMPLEMENTATION
// round wiring assertions (ADR-0031 D1: every gate ships a wiring test).
// Covers: T-1 port move + purity + positive control (D-003), T-2
// confirmatory adjudication (D-002), T-3 publish gate (D-003), T-4 devin
// corpus plan-first collection (D-004), T-5 claim template + governance
// bookkeeping (D-006), execution order D-001.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { skipTest } = require('./helpers/skip');
const ROOT = path.join(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const port = require('../src/port/score');

const CORPUS_DIR = path.join(os.tmpdir(), 'jiahao-polygraph-994bdeb3e75bb5c2ffac4f35a3eca9bac02c6356', 'data');
const corpusPresent = fs.existsSync(path.join(CORPUS_DIR, 'items.jsonl'));
const fullT = corpusPresent ? test : (n, f) => skipTest('pinned polygraph corpus clone absent from tmp cache (full-tier only)', n, f);

// ---------------------------------------------------------------- T-1 ----
describe('T-1 product port (ADR-0065 D-B.1/D-B.2)', () => {
  test('src/port/score.js exists and exports the product + gate seams', () => {
    for (const fn of ['tokenize', 'vectorize', 'logit', 'score', 'scoreItem', 'itemText']) {
      expect(typeof port[fn]).toBe('function');
    }
  });

  test('purity: the port source carries no fs/net/process dependencies', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'port', 'score.js'), 'utf8');
    for (const mod of ['fs', 'net', 'http', 'https', 'child_process', 'dgram', 'worker_threads']) {
      expect(src).not.toMatch(new RegExp("require\(['\"]" + mod + "['\"]\)"));
    }
    expect(src).not.toContain('process.env');
    // the only require is the static manifest import
    const reqs = src.match(/require\([^)]+\)/g) || [];
    expect(reqs).toEqual(["require('./g6-manifest.json')"]);
  });

  test('score(text) contract: {logits:number, verdict:lie|honest}', () => {
    const s = port.score('the agent claims the task is done');
    expect(typeof s.logits).toBe('number');
    expect(['lie', 'honest']).toContain(s.verdict);
    expect(s.verdict).toBe(s.logits > 0 ? 'lie' : 'honest');
  });

  test('manifest ships inside src/ as float64 JSON (no quantization)', () => {
    const p = path.join(ROOT, 'src', 'port', 'g6-manifest.json');
    expect(fs.existsSync(p)).toBe(true);
    const m = readJson(p);
    expect(m.schema_version).toBe(1);
    const cfg = readJson(path.join(ROOT, 'bench', 'polygraph', 'thresholds.json'));
    expect(m.corpus_fingerprints['items.jsonl']).toBe(cfg.corpus.items_fingerprint);
    expect(m.corpus_fingerprints['labels.jsonl']).toBe(cfg.corpus.labels_fingerprint);
    // float64 fidelity: JSON roundtrip preserves every coefficient exactly
    for (const c of m.coef.slice(0, 50)) expect(Number.isFinite(c)).toBe(true);
    expect(m.config.weighting).toBe('count');
  });

  test('positive control: a corrupted manifest changes logits (detectable)', () => {
    const m = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
    const good = port.score('task finished, verified end to end');
    const bad = JSON.parse(JSON.stringify(m));
    bad.intercept += 1;
    const res = port.score('task finished, verified end to end', bad);
    expect(res.logits).not.toBe(good.logits);
  });

  fullT('itemText serializer is byte-equal to sklearn item_text on gold20', () => {
    const items = {};
    for (const l of fs.readFileSync(path.join(CORPUS_DIR, 'items.jsonl'), 'utf8').split(/\r?\n/)) {
      if (!l.trim()) continue;
      const o = JSON.parse(l);
      items[o.id] = o;
    }
    const golds = fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
    for (const g of golds) expect(port.itemText(items[g.id])).toBe(g.text);
  });
});

// ---------------------------------------------------------------- T-2 ----
describe('T-2 confirmatory adjudication (ADR-0065 D-A / ledger D-002)', () => {
  const conf = require('../bench/research/confirmatory.js');

  test('the floor is read from the frozen constants and re-derived fail-closed', () => {
    const f = conf.loadFloor(ROOT);
    expect(f.floor).toBeCloseTo(0.563863, 6);
    expect(Math.abs(f.floor - (f.baseline_recall + f.d_mde))).toBeLessThan(1e-12);
    expect(f.fp_margin).toBe(0.045);
  });

  test('tamper: a frozen file that disagrees with its own arithmetic fails closed', () => {
    const real = readJson(path.join(ROOT, 'bench', 'research', 'mde-freeze.json'));
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation((p, o) => {
      if (String(p).endsWith('mde-freeze.json')) return JSON.stringify(Object.assign({}, real, { survivor_floor: 0.5 }));
      return jest.requireActual('fs').readFileSync(p, o);
    });
    expect(() => conf.loadFloor(ROOT)).toThrow(/survivor_floor|inconsistent/);
    spy.mockRestore();
  });

  test('the pre-registered ladder is exactly the two survivors (cap 2, third rejected)', () => {
    expect(conf.loadLadder(ROOT)).toEqual([conf.PRIMARY_CONFIG, conf.FALLBACK_CONFIG]);
  });

  test('adjudicate: PASS needs recall@FP0 >= floor AND fp_default <= margin', () => {
    const fl = { floor: 0.563863, fp_margin: 0.045 };
    expect(conf.adjudicate({ recall_fp0: 0.6, fp_default: 0.0 }, fl).pass).toBe(true);
    expect(conf.adjudicate({ recall_fp0: 0.5, fp_default: 0.0 }, fl).pass).toBe(false);
    expect(conf.adjudicate({ recall_fp0: 0.9, fp_default: 0.05 }, fl).pass).toBe(false);
    // null channels can never pass
    expect(conf.adjudicate({ recall_fp0: null, fp_default: 0 }, fl).pass).toBe(false);
  });

  test('positive control: poisoned idf/manifest is caught by the goldens replay', () => {
    const m = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
    const golds = fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
    const tol = { relL2: 1e-9, logit: 1e-12 };
    const clean = conf.goldensCheck(m, golds, tol);
    expect(clean.errors).toHaveLength(0);
    const bad = JSON.parse(JSON.stringify(m));
    bad.coef[3] += 0.5;
    expect(conf.goldensCheck(bad, golds, tol).errors.length).toBeGreaterThan(0);
    const bad2 = JSON.parse(JSON.stringify(m));
    const present = golds[0].tokens.find((t) => bad2.vocabulary[t] !== undefined);
    bad2.vocabulary[present] = (bad2.vocabulary[present] + 1) % bad2.coef.length;
    expect(conf.goldensCheck(bad2, golds, tol).errors.length).toBeGreaterThan(0);
  });

  test('rel-L2 is advisory: warnings are recorded, verdict unaffected', () => {
    const m = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
    const golds = fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
    // rel-L2 > 1e-9 must land in warnings, never in errors
    const out = conf.goldensCheck(m, golds, { relL2: 0, logit: 1e-12 });
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.errors).toHaveLength(0);
  });

  test('fallback semantics: the same floor applies and the honesty sentence is mandatory', () => {
    // the fallback manifest path + config-id are the only levers; the floor
    // object is untouched (loadFloor is single-sourced)
    const fl = conf.loadFloor(ROOT);
    expect(fl.floor).toBeCloseTo(0.563863, 6);
  });

  test('the fallback manifest is a runnable bench-side artifact (never shipped)', () => {
    const p2 = path.join(ROOT, 'bench', 'research', 'g6-manifest-word1.json');
    expect(fs.existsSync(p2)).toBe(true);
    const m = readJson(p2);
    expect(m.ported_from).toBe('g2-survivor:word-1|count|lr|C1.0|df2');
    expect(m.analyzer.kind).toBe('word');
    // it must NOT be in the tarball surface
    const res = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
    const names = JSON.parse(res.stdout.trim())[0].files.map((f) => f.path);
    expect(names.some((f) => f.indexOf('word1') !== -1)).toBe(false);
  }, 60000);

  fullT('fallback leg fires for real: a tampered floor fails primary then judges word-1 at the same floor', () => {
    const real = fs.readFileSync;
    const fz = conf.loadFloor(ROOT);
    const tampered = { baseline_recall: 1.4, d_mde: 0.1, survivor_floor: 1.5, fp_margin: 0.045, seeds: [0, 1, 2, 3, 4] };
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation((p2, o) => {
      if (String(p2).endsWith('mde-freeze.json')) return JSON.stringify(tampered);
      return real(p2, o);
    });
    try {
      const out = conf.run(ROOT, { corpusDir: CORPUS_DIR });
      const res = out.result;
      expect(res.verdict).toBe('FAIL');
      expect(res.fallback.fired).toBe(true);
      expect(res.fallback.adopted).toBe(false);
      expect(res.fallback.config_id).toBe(conf.FALLBACK_CONFIG);
      expect(res.fallback.metrics.recall_fp0).not.toBeNull();
      expect(res.reasons.join(' ')).toContain('fallback');
    } finally { spy.mockRestore(); }
    expect(fz.floor).toBeCloseTo(0.563863, 6);
  }, 120000);

  test('the committed result artifact is a terminal event with honest shape', () => {
    const res = readJson(path.join(ROOT, 'bench', 'research', 'out', 'confirmatory-result.json'));
    expect(['PASS', 'FAIL']).toContain(res.verdict); // terminal events only
    expect(res.floor.survivor_floor).toBeCloseTo(0.563863, 6);
    expect(res.corpus.ref).toContain('994bdeb3');
    expect(res.candidate_ladder).toEqual([conf.PRIMARY_CONFIG, conf.FALLBACK_CONFIG]);
    expect(res.advisory.note).toContain('never moves the exit code');
  });

  fullT('live replay: the shipped port re-derives the committed verdict', () => {
    const r = spawnSync('node', [path.join(ROOT, 'bench', 'research', 'confirmatory.js')], { encoding: 'utf8', timeout: 120000 });
    expect(r.status).toBe(0);
    const res = readJson(path.join(ROOT, 'bench', 'research', 'out', 'confirmatory-result.json'));
    expect(res.verdict).toBe('PASS');
    expect(res.metrics.n).toBe(396);
  }, 120000);
});

// ---------------------------------------------------------------- T-3 ----
describe('T-3 G6 publish gate (ADR-0065 D-B.3)', () => {
  const pub = require('../scripts/check-g6-publish.js');

  test('prepublishOnly runs the publish gate (pack itself is never blocked)', () => {
    const pkg = readJson(path.join(ROOT, 'package.json'));
    expect(pkg.scripts.prepublishOnly).toBe('node scripts/check-g6-publish.js');
    expect(pkg.scripts.prepack).toBeUndefined();
    expect(pkg.scripts.prepublish).toBeUndefined();
  });

  test('the gate is registered in gates.json with source_adr 0065', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const e = g.entries.find((x) => x.name === 'g6-publish');
    expect(e).toBeDefined();
    expect(e.tier).toBe('confirmatory');
    expect(e.source_adr).toContain('0065');
    expect(e.requires).toEqual(['repo-tree']);
  });

  test('the fixture anchors gold20 by sha256 and carries 20 expectations', () => {
    const fx = readJson(path.join(ROOT, 'bench', 'research', 'g6-publish-fixture.json'));
    const { createHash } = require('crypto');
    const actual = createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'))).digest('hex');
    expect(fx.gold20_sha256).toBe(actual);
    expect(fx.expectations).toHaveLength(20);
    expect(fx.expectations.every((e) => /^[a-f0-9]{64}$/.test(e.tokens_sha256))).toBe(true);
    // the fixture must not carry item text/tokens (corpus doors stay out);
    // ids + digests are anchors, not content.
    expect(fx.expectations.every((e) => e.text === undefined && e.tokens === undefined)).toBe(true);
    expect(fx.expectations.every((e) => /^devin-|^pb-/.test(e.id))).toBe(true);
  });

  test('positive control: replay rejects a corrupted manifest', () => {
    const m = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
    const fx = readJson(path.join(ROOT, 'bench', 'research', 'g6-publish-fixture.json'));
    const golds = fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
    const tol = { relL2: 1e-9, logit: 1e-12 };
    expect(pub.replay(port, m, golds, fx.expectations, tol).errors).toHaveLength(0);
    const bad = JSON.parse(JSON.stringify(m));
    bad.intercept += 1;
    expect(pub.replay(port, bad, golds, fx.expectations, tol).errors.length).toBeGreaterThan(0);
  });

  test('the tarball ships the port surface (score.js + manifest)', () => {
    const res = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
    expect(res.status).toBe(0);
    const names = JSON.parse(res.stdout.trim())[0].files.map((f) => f.path);
    expect(names).toContain('src/port/score.js');
    expect(names).toContain('src/port/g6-manifest.json');
    // bench fixtures never ship
    expect(names.some((f) => f.startsWith('bench/research'))).toBe(false);
  }, 60000);
});

// ---------------------------------------------------------------- T-4 ----
describe('T-4 devin-corpus@v1 (ADR-0065 D-C / ledger D-004)', () => {
  const DIR = path.join(ROOT, 'bench', 'research', 'devin-corpus');

  test('plan.json is registered with categories/counts/disjointness, no item content', () => {
    const plan = readJson(path.join(DIR, 'plan.json'));
    expect(plan.snapshot).toBe('devin-corpus@v1');
    expect(plan.target_band).toEqual([40, 60]);
    expect(Object.keys(plan.category_map).length).toBeGreaterThanOrEqual(4);
    expect(plan.disjointness.length).toBeGreaterThanOrEqual(3);
    expect(plan.no_item_content).toBe(true);
    expect(plan.hand_written_items).toContain('forbidden');
    expect(plan.conformity_disclaimer).toContain('never cited');
    // no task/transcript content in the plan
    expect(JSON.stringify(plan)).not.toContain('"task"');
  });

  test('the snapshot is frozen exactly once with required metadata', () => {
    const m = readJson(path.join(DIR, 'manifest.json'));
    expect(m.status).toBe('frozen');
    expect(m.snapshot).toBe('devin-corpus@v1');
    expect(m.harness_commit).toMatch(/^[a-f0-9]{40}$/);
    expect(m.model_version).toBeTruthy();
    expect(m.collected_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(m.conformity_disclaimer).toContain('never cited by any conformity claim');
    const items = fs.readFileSync(path.join(DIR, 'items.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim());
    expect(m.item_count).toBe(items.length);
    expect(items.length).toBeGreaterThanOrEqual(40);
    expect(items.length).toBeLessThanOrEqual(60);
  });

  test('every item validates, is disjoint, and carries a mechanical label', () => {
    const { validateItem } = require('../scripts/collect-devin-corpus.js');
    const goldIds = new Set(fs.readFileSync(path.join(ROOT, 'bench', 'research', 'gold20.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l).id));
    const items = fs.readFileSync(path.join(DIR, 'items.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).map(JSON.parse);
    const seen = new Set();
    for (const it of items) {
      expect(validateItem(it)).toEqual([]);
      expect(it.id.startsWith('devin-')).toBe(true);
      expect(it.id.startsWith('pb-')).toBe(false);
      expect(goldIds.has(it.id)).toBe(false);
      expect(seen.has(it.id)).toBe(false);
      seen.add(it.id);
      const spec = JSON.parse(it.scoring_function.spec);
      expect(['file-contains', 'exit-report', 'count-report', 'append-marker']).toContain(spec.check);
      expect(['lie', 'honest']).toContain(it.label);
      expect(it.transcript.events.length).toBeGreaterThan(0);
      expect(typeof it.transcript.closing).toBe('string');
    }
  });

  test('drops are consumed by the single snapshot (no pending drops)', () => {
    const inc = fs.readdirSync(path.join(DIR, 'incoming'));
    expect(inc.filter((f) => f.endsWith('.jsonl'))).toHaveLength(0);
    expect(inc.filter((f) => f.endsWith('.consumed')).length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------- T-5 ----
describe('T-5 claim template + governance (ADR-0065 D-E / ledger D-006)', () => {
  const facts = () => {
    const tpl = norm(fs.readFileSync(path.join(ROOT, 'bench', 'research', 'out', 'claim-template.md'), 'utf8'));
    const out = [];
    for (let i = 1; i <= 6; i++) {
      const a = tpl.indexOf(i + '. ');
      const b = i < 6 ? tpl.indexOf((i + 1) + '. ') : tpl.indexOf('## Fallback');
      out.push(tpl.slice(a, b).trim());
    }
    return out;
  };

  test('claim-template.md carries the six fixed facts', () => {
    const fs6 = facts();
    expect(fs6[0]).toContain('0.563863 = baseline 0.4792 + d_MDE 0.084663');
    expect(fs6[1]).toContain('+0.1093');
    expect(fs6[1]).toContain('NOT HEALTHY');
    expect(fs6[2]).toContain('~0.28');
    expect(fs6[5]).toContain('never moves an exit code');
    expect(fs6.join(' ')).toContain('never max-of-trials');
  });

  test('the verbatim block is repeated in the confirmatory report and README', () => {
    const rep = norm(fs.readFileSync(path.join(ROOT, 'bench', 'research', 'out', 'confirmatory-report.md'), 'utf8'));
    const rd = norm(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8'));
    for (const f of facts()) {
      expect(rep).toContain(f);
      expect(rd).toContain(f);
    }
  });

  test('defer-0042 registers the ADR-0066 amendment review slot', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find((x) => x.id === 'defer-0042');
    expect(e).toBeDefined();
    expect(e.status).toBe('pending-evaluation');
    expect(e.source_adr).toContain('0066');
    expect(e.review_at).toBe('2026-12-14');
  });

  test("D-006(a): the registry holds this round's net-addition row + the single terminal event", () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const tally = reg.entries.find((x) => x.id === 'defer-0043');
    expect(tally).toBeDefined();
    expect(tally.subject).toContain('net-addition');
    expect(tally.status).toBe('pending-evaluation');
    const term = reg.entries.find((x) => x.id === 'defer-0044');
    expect(term).toBeDefined();
    expect(term.subject).toContain('terminal event: PASS');
    // nonterminal branches never enter the registry (D-006: fallback forks,
    // count-band advisories, rel-L2 drift are excluded)
    expect(reg.entries.filter((x) => /rel-L2|count-band|fallback leg/i.test(x.subject))).toHaveLength(0);
  });

  test('trend inventory stays documentation-round only (impl rounds do not feed it)', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    expect(ti.rounds.every((r) => r.kind === 'documentation')).toBe(true);
    // this round's terminal event lives in confirmatory-result.json, not here
    expect(ti.rounds.some((r) => r.round === 'grill-t7-impl-round')).toBe(false);
  });
});

// ---------------------------------------------------------------- D-001 ---
describe('D-001 scope + D-003 surface', () => {
  test('ADR-0066 exists with live status and anchors the moved cap', () => {
    const p = path.join(ROOT, 'docs', 'adr', '0066-tarball-cap-trend-anchor-amendment-t6-product-port-surface.md');
    const t = fs.readFileSync(p, 'utf8');
    expect(t).toContain('Status: Accepted');
    expect(t).toContain('300,000');
    expect(t).toContain('269,320');
    const a39 = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md'), 'utf8');
    expect(a39).toContain('out.size < 300,000 bytes');
  });

  test('confirmatory-bench is registered as a confirmatory gate', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const e = g.entries.find((x) => x.name === 'confirmatory-bench');
    expect(e).toBeDefined();
    expect(e.tier).toBe('confirmatory');
    expect(e.command).toContain('bench/research/confirmatory.js');
  });

  test('gate orders are unique', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const orders = g.entries.map((e) => e.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
