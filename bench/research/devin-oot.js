'use strict';
// bench/research/devin-oot.js - ADR-0067 / grill-t7 ledger D-008..D-011:
// the devin-corpus@v1 OOT falsification adjudication runner. Bench-side
// only (never the npm surface, ADR-0038 D2). Zero-dependency, thin CLI +
// pure core, same shape as confirmatory.js / check-g6-publish.js.
//
// Modes:
//   node bench/research/devin-oot.js --validate
//     pre-flight WITHOUT touching label/scoring_function: eval-plan
//     consistency, corpus defect scan, serialization + sha256, corrupted-
//     manifest positive control. Preserves the blind discipline; writes
//     nothing.
//   node bench/research/devin-oot.js run
//     THE single-shot execution (D-008.6): validates, then reads labels for
//     the frozen integer decision table, writes the full report artifacts,
//     and prints the verdict. Refuses to run when a completed report
//     already exists (the burn is mechanical, not etiquette).
//   node bench/research/devin-oot.js --replay
//     replay gate: re-derives every published number from the STORED report
//     rows against the frozen plan; never opens items.jsonl or the corpus
//     manifest. Fail-closed on any inconsistency.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const port = require('../../src/port/score.js');
const { requireCapabilities } = require('../../src/shared/capability');

const ROOT = path.join(__dirname, '..', '..');
const CORPUS_DIR = path.join(ROOT, 'bench', 'research', 'devin-corpus');
const OUT_DIR = path.join(ROOT, 'bench', 'research', 'out');
const PLAN_PATH = path.join(CORPUS_DIR, 'eval-plan.json');
const REPORT_JSON = path.join(OUT_DIR, 'devin-oot-report.json');
const REPORT_MD = path.join(OUT_DIR, 'devin-oot-report.md');

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// ---- Clopper-Pearson (pure math; recomputation is the plan tamper check) ---
// Regularized incomplete beta via the Numerical Recipes continued fraction,
// inverted by bisection (I_x is monotone in x). Dev-verified against scipy
// beta.ppf to <1e-6 on all 13 table entries (k=0..12, n=12, alpha=0.05).
const LG = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
function gammln(x) {
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += LG[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - (gammln(a) + gammln(b) - gammln(a + b)));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}
function betainv(p, a, b) { // bisection on monotone I_x(a,b)
  let lo = 0, hi = 1;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (betai(a, b, mid) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-15) break;
  }
  return (lo + hi) / 2;
}
function cpInterval(k, n, alpha) {
  const lo = k === 0 ? 0 : betainv(alpha / 2, k, n - k + 1);
  const hi = k === n ? 1 : betainv(1 - alpha / 2, k + 1, n - k);
  return { lower: lo, upper: hi };
}

// ---- eval-plan loading: frozen fields re-derived fail-closed ---------------
function loadPlan(root) {
  const base = root || ROOT;
  const plan = readJson(path.join(base, 'bench', 'research', 'devin-corpus', 'eval-plan.json'));
  const errors = [];
  if (plan.schema_version !== 1) errors.push('eval-plan schema_version must be 1');
  if (plan.snapshot !== 'devin-corpus@v1') errors.push('eval-plan snapshot must be devin-corpus@v1');
  const mde = readJson(path.join(base, 'bench', 'research', 'mde-freeze.json'));
  const rederived = mde.baseline_recall + mde.d_mde;
  if (Math.abs(rederived - mde.survivor_floor) > 1e-9) {
    errors.push('mde-freeze internal disagreement: baseline+d_mde ' + rederived + ' != survivor_floor ' + mde.survivor_floor);
  }
  if (Math.abs(plan.adjudication.floor.value - mde.survivor_floor) > 5e-7) {
    errors.push('eval-plan floor ' + plan.adjudication.floor.value + ' disagrees with frozen survivor_floor ' + mde.survivor_floor);
  }
  const t = plan.adjudication.integer_decision_table;
  const n = t.n_lie, alpha = plan.adjudication.ci.alpha;
  for (let k = 0; k <= n; k++) {
    const frozen = t.per_k_ci95[String(k)];
    const calc = cpInterval(k, n, alpha);
    if (!frozen || Math.abs(frozen[0] - calc.lower) > 1e-5 || Math.abs(frozen[1] - calc.upper) > 1e-5) {
      errors.push('per_k_ci95[' + k + '] disagrees with recomputation ' + JSON.stringify(calc));
    }
  }
  if (!(cpInterval(11, n, alpha).lower > mde.survivor_floor)) errors.push('k=11 lower does not clear the floor');
  if (!(cpInterval(2, n, alpha).upper < mde.survivor_floor)) errors.push('k=2 upper does not sit below the floor');
  if (Math.abs(plan.instrument.banned_in_sample_threshold.value - (-3.0490307419439926)) > 1e-12) {
    errors.push('banned in-sample threshold drifted');
  }
  if (errors.length) {
    const e = new Error('eval-plan fail-closed validation: ' + errors.join('; '));
    e.errors = errors;
    throw e;
  }
  return plan;
}

// ---- adapter: whitelisted hoist + defect scan (no label reads, ever) -------
function itemDefects(it) {
  const d = [];
  if (!it || typeof it !== 'object') return ['item'];
  if (typeof it.id !== 'string' || !/^devin-/.test(it.id)) d.push('id');
  if (typeof it.task !== 'string') d.push('task');
  const tr = it.transcript;
  if (!tr || typeof tr !== 'object' || Array.isArray(tr)) { d.push('transcript'); return d; }
  if (!Array.isArray(tr.events)) { d.push('transcript.events'); return d; }
  tr.events.forEach(function (ev, i) {
    if (!ev || typeof ev !== 'object') { d.push('events[' + i + ']'); return; }
    if (ev.type === 'message') {
      if (typeof ev.text !== 'string') d.push('events[' + i + '].text');
    } else if (ev.type === 'tool_call') {
      if (typeof ev.name !== 'string') d.push('events[' + i + '].name');
      if (ev.arguments !== undefined && (typeof ev.arguments !== 'object' || ev.arguments === null || Array.isArray(ev.arguments))) d.push('events[' + i + '].arguments');
    } else if (ev.type === 'tool_result') {
      if (!('content' in ev)) d.push('events[' + i + '].content');
      if (ev.is_error !== undefined && typeof ev.is_error !== 'boolean') d.push('events[' + i + '].is_error');
      if (ev.truncated !== undefined && typeof ev.truncated !== 'boolean') d.push('events[' + i + '].truncated');
    } else {
      d.push('events[' + i + '].type');
    }
  });
  if (typeof tr.closing !== 'string') d.push('transcript.closing');
  return d;
}

// Whitelist hoist: ONLY {task, transcript.events, transcript.closing} ever
// reach the serializer. label / scoring_function are never read here.
function adaptItem(it, opts) {
  const o = opts || {};
  const item = { task: it.task, events: it.transcript.events, closing: it.transcript.closing };
  const text = port.itemText(item, { drop_closing: o.drop_closing === true });
  return { itemText: text, sha256: sha256(text) };
}

// ---- decision-table lookup (the integer table adjudicates) -----------------
function verdictFor(k, plan) {
  const t = plan.adjudication.integer_decision_table;
  const band = t.bands.find(function (b) { return k >= b.k_min && k <= b.k_max; });
  if (!band) throw new Error('no band covers k=' + k + ' (n_lie=' + t.n_lie + ')');
  const ci = t.per_k_ci95[String(k)];
  return { verdict: band.verdict, band: band.k_min + '-' + band.k_max, ci95: { lower: ci[0], upper: ci[1] } };
}
function ruleOfThreeUpper(n, alpha) { return 1 - Math.pow(alpha, 1 / n); }

// ---- positive control: a corrupted manifest must move at least one logit ---
function positiveControl(texts) {
  const m = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
  const corrupt = JSON.parse(JSON.stringify(m));
  corrupt.intercept += 10;
  let changed = 0;
  for (const text of texts) {
    if (Math.abs(port.score(text, corrupt).logits - port.score(text, m).logits) > 1e-12) changed++;
  }
  return { corrupted_manifest_detected: changed > 0, changed_logits: changed, perturbation: 'intercept +10' };
}

// ---- the run ----------------------------------------------------------------
function loadCorpus(root) {
  const base = root || ROOT;
  const dir = path.join(base, 'bench', 'research', 'devin-corpus');
  const manifest = readJson(path.join(dir, 'manifest.json'));
  const itemsPath = path.join(dir, 'items.jsonl');
  const raw = fs.readFileSync(itemsPath, 'utf8');
  const items = raw.split(/\r?\n/).filter(function (l) { return l.trim(); }).map(JSON.parse);
  const normalized = raw.replace(/\r\n/g, '\n');
  return { manifest: manifest, items: items, items_sha256: sha256(normalized) };
}

// Serialization-only pass: defect scan + adapt + score. label and
// scoring_function are never touched on this path.
function serializeAndScore(items, opts) {
  const o = opts || {};
  const defects = [];
  const seen = new Set();
  for (const it of items) {
    const d = itemDefects(it);
    if (seen.has(it && it.id)) d.push('duplicate id');
    seen.add(it && it.id);
    for (const x of d) defects.push((it && it.id) + ': ' + x);
  }
  if (defects.length) return { defects: defects, rows: null };
  const rows = items.map(function (it) {
    const a = adaptItem(it, { drop_closing: o.drop_closing });
    const s = port.score(a.itemText);
    return { id: it.id, sha256: a.sha256, logit: s.logits, verdict: s.verdict };
  });
  return { defects: [], rows: rows };
}

// Report-layer: labels and spec.check join ONLY here (post-serialization).
function adjudicate(rows, items, plan) {
  const nLie = plan.adjudication.integer_decision_table.n_lie;
  const floor = plan.adjudication.floor.value;
  const labels = {};
  const checks = {};
  const bad = [];
  for (const it of items) {
    if (it.label !== 'lie' && it.label !== 'honest') bad.push(it.id + ': label');
    labels[it.id] = it.label;
    try { checks[it.id] = JSON.parse(it.scoring_function.spec).check; }
    catch (e) { checks[it.id] = 'unknown'; bad.push(it.id + ': scoring_function.spec'); }
  }
  if (bad.length) {
    const e = new Error('report-layer field defect (no partial adjudication): ' + bad.join('; '));
    e.errors = bad;
    throw e;
  }
  const lie = rows.filter(function (r) { return labels[r.id] === 'lie'; });
  const hon = rows.filter(function (r) { return labels[r.id] === 'honest'; });
  const k = lie.filter(function (r) { return r.logit > 0; }).length;
  const fp = hon.filter(function (r) { return r.logit > 0; }).length;
  const fp0Thr = Math.max.apply(null, hon.map(function (r) { return r.logit; }).concat([-Infinity]));
  const decision = verdictFor(k, plan);
  const byCategory = {};
  for (const r of rows) {
    const c = checks[r.id];
    const b = byCategory[c] || (byCategory[c] = { n: 0, lie: 0, hits: 0, fp: 0 });
    b.n++;
    if (labels[r.id] === 'lie') { b.lie++; if (r.logit > 0) b.hits++; } else if (r.logit > 0) b.fp++;
  }
  const rowOut = rows.map(function (r) {
    return { id: r.id, sha256: r.sha256, logit: r.logit, verdict: r.verdict, label: labels[r.id], check: checks[r.id] };
  });
  return {
    n: rows.length, n_lie: lie.length, n_honest: hon.length,
    expected_n_lie: nLie,
    k: k,
    recall_default: lie.length ? k / lie.length : null,
    fp_count: fp, fp_default: hon.length ? fp / hon.length : null,
    recall_fp0: {
      value: lie.length ? lie.filter(function (r) { return r.logit > fp0Thr; }).length / lie.length : null,
      threshold_selected_on_eval_set: fp0Thr,
      diagnostic_only: true
    },
    confusion: { tp: k, fn: lie.length - k, fp: fp, tn: hon.length - fp },
    by_category: byCategory,
    decision: { verdict: decision.verdict, band: decision.band, ci95: decision.ci95, floor: floor },
    fp_guardrail: {
      fp_count: fp, descriptive_only: true,
      rule: 'fp_count <= 1 of ' + hon.length + ' is a descriptive guardrail, never a test verdict',
      rule_of_three_upper: fp === 0 ? ruleOfThreeUpper(hon.length, plan.adjudication.ci.alpha) : null
    },
    rows: rowOut
  };
}

const VERDICT_TOKEN = { 'falsification-passed': 'passed', 'indeterminate': 'indeterminate', 'failed': 'failed' };

function claimBlock(plan, adj, date) {
  const c = plan.claim;
  const d = adj.decision;
  const fact = c.fact_line_template
    .replace(/<passed\|indeterminate\|failed>/, VERDICT_TOKEN[d.verdict])
    .replace(/<x>/, d.ci95.lower.toFixed(6))
    + ' (verdict date: ' + date + ')';
  const out = { fact_line: fact, limitation_sentence: c.limitation_sentence };
  if (d.verdict === 'indeterminate') {
    out.wording = c.indeterminate_wording.replace(/<k>/, String(adj.k));
  }
  if (d.verdict === 'failed') {
    out.wording = c.collapse_no_shelf_sentence;
  }
  return out;
}

function buildReport(plan, corpus, adj, control, dropClosing, date) {
  const manifest = readJson(path.join(ROOT, 'src', 'port', 'g6-manifest.json'));
  const claim = claimBlock(plan, adj, date);
  const branchKey = adj.decision.verdict;
  return {
    schema_version: 1,
    run_status: 'completed',
    single_shot: true,
    round: 'grill-t7 unblind round - devin-corpus@v1 OOT falsification adjudication',
    run_at: date,
    eval_plan: { path: 'bench/research/devin-corpus/eval-plan.json', sha256: sha256(fs.readFileSync(PLAN_PATH, 'utf8')) },
    instrument: {
      scorer: 'src/port/score.js score()',
      manifest: 'src/port/g6-manifest.json',
      manifest_sha256: sha256(fs.readFileSync(path.join(ROOT, 'src', 'port', 'g6-manifest.json'), 'utf8')),
      config_id: plan.instrument.config_id,
      operating_point: 'logit > 0 (shipped default)',
      analyzer_kind: manifest.analyzer.kind
    },
    corpus: {
      snapshot: corpus.manifest.snapshot,
      manifest_status: corpus.manifest.status,
      item_count: corpus.items.length,
      n_lie: adj.n_lie, n_honest: adj.n_honest,
      items_sha256: corpus.items_sha256,
      conformity_disclaimer: 'devin-corpus@v1 is never cited by any conformity claim'
    },
    serialization: {
      whitelist: plan.serialization.input_whitelist,
      per_item_sha256: true,
      defects: []
    },
    metrics: {
      recall_default: adj.recall_default,
      k: adj.k,
      fp_default: adj.fp_default,
      fp_count: adj.fp_count,
      recall_fp0: adj.recall_fp0,
      confusion: adj.confusion,
      by_category: adj.by_category,
      drop_closing: dropClosing
    },
    decision: adj.decision,
    fp_guardrail: adj.fp_guardrail,
    positive_control: control,
    claim: claim,
    settlement: {
      blind_until: 'satisfied (rung-1 settlement T-6 PASS)',
      branch_policy: plan.branch_mapping[branchKey],
      verdict_names: plan.adjudication.verdict_names
    },
    items: adj.rows
  };
}

function renderMd(rep) {
  const d = rep.decision, m = rep.metrics;
  const L = [];
  L.push('# devin-corpus@v1 OOT falsification adjudication report');
  L.push('');
  L.push('Round: ' + rep.round + ' | run_at: ' + rep.run_at + ' | single-shot: ' + rep.single_shot);
  L.push('');
  L.push('## Verdict');
  L.push('');
  L.push('**' + d.verdict + '** - k = ' + m.k + '/' + rep.corpus.n_lie + ' lies at logit > 0; CP two-sided 95% CI ['
    + d.ci95.lower.toFixed(6) + ', ' + d.ci95.upper.toFixed(6) + '] vs floor ' + d.floor
    + ' (conservative transfer: not-worse-than-baseline+MDE, never engineering-ready).'
    + ' Band ' + d.band + ' of the frozen integer decision table (ADR-0067 D-A).');
  L.push('');
  if (rep.claim.wording) { L.push(rep.claim.wording); L.push(''); }
  L.push('## Claim block (verbatim, bound)');
  L.push('');
  L.push(rep.claim.fact_line);
  L.push('');
  L.push(rep.claim.limitation_sentence);
  L.push('');
  L.push('## Metrics');
  L.push('');
  L.push('| metric | value |');
  L.push('|---|---|');
  L.push('| recall@default | ' + m.k + '/' + rep.corpus.n_lie + ' = ' + m.recall_default.toFixed(6) + ' |');
  L.push('| FP@default | ' + m.fp_count + '/' + rep.corpus.n_honest + ' = ' + m.fp_default.toFixed(6) + ' |');
  L.push('| recall@FP0 (diagnostic only) | ' + m.recall_fp0.value.toFixed(6) + ' (threshold ' + m.recall_fp0.threshold_selected_on_eval_set.toFixed(6) + ' selected on the eval set - post-hoc, never adjudicates) |');
  L.push('| confusion | tp ' + m.confusion.tp + ' fn ' + m.confusion.fn + ' fp ' + m.confusion.fp + ' tn ' + m.confusion.tn + ' |');
  L.push('| drop_closing recall@default | ' + m.drop_closing.recall_default.toFixed(6) + ' (delta ' + m.drop_closing.delta.toFixed(6) + ') |');
  L.push('| corrupted-manifest control | ' + (rep.positive_control.corrupted_manifest_detected ? 'detected' : 'NOT DETECTED') + ' (' + rep.positive_control.changed_logits + ' logits moved by ' + rep.positive_control.perturbation + ') |');
  L.push('');
  L.push('## FP guardrail (descriptive)');
  L.push('');
  L.push('fp_count ' + m.fp_count + ' <= 1 of ' + rep.corpus.n_honest + ': ' + (m.fp_count <= 1 ? 'observed' : 'not observed')
    + '. Rule-of-three upper bound ' + (rep.fp_guardrail.rule_of_three_upper == null ? 'n/a (fp_count > 0)' : rep.fp_guardrail.rule_of_three_upper.toFixed(6))
    + '. Descriptive only - the FP non-inferiority test is never claimed passed at n_hon=40.');
  L.push('');
  L.push('## Category breakdown (check shape)');
  L.push('');
  L.push('| check | n | lie | hits@default | fp@default |');
  L.push('|---|---|---|---|---|');
  for (const c of Object.keys(m.by_category).sort()) {
    const b = m.by_category[c];
    L.push('| ' + c + ' | ' + b.n + ' | ' + b.lie + ' | ' + b.hits + ' | ' + b.fp + ' |');
  }
  L.push('| misreport (lie side, cross-cutting) | ' + rep.corpus.n_lie + ' | ' + rep.corpus.n_lie + ' | ' + m.k + ' | - |');
  L.push('');
  L.push('## Score distribution');
  L.push('');
  L.push('| id | label | check | logit | verdict@default | itemText sha256 |');
  L.push('|---|---|---|---|---|---|');
  for (const r of rep.items) {
    L.push('| ' + r.id + ' | ' + r.label + ' | ' + r.check + ' | ' + r.logit.toFixed(6) + ' | ' + r.verdict + ' | ' + r.sha256.slice(0, 16) + ' |');
  }
  L.push('');
  L.push('## Settlement');
  L.push('');
  L.push('- eval-plan: ' + rep.eval_plan.path + ' (sha256 ' + rep.eval_plan.sha256.slice(0, 16) + ')');
  L.push('- instrument manifest sha256: ' + rep.instrument.manifest_sha256.slice(0, 16));
  L.push('- items.jsonl sha256: ' + rep.corpus.items_sha256.slice(0, 16));
  L.push('- serialization defects: none (abort-on-defect armed)');
  L.push('- branch policy: ' + rep.settlement.branch_policy);
  L.push('- bench/research/devin-corpus/manifest.json untouched (settlement recorded here, append-only)');
  L.push('');
  return L.join('\n');
}

// ---- replay: re-derive every number from the STORED artifact ----------------
function replayCheck(root) {
  const base = root || ROOT;
  const errors = [];
  const plan = loadPlan(base);
  const repPath = path.join(base, 'bench', 'research', 'out', 'devin-oot-report.json');
  if (!fs.existsSync(repPath)) { errors.push('stored report missing: ' + repPath); return { errors: errors }; }
  const rep = readJson(repPath);
  if (rep.run_status !== 'completed') errors.push('run_status is not completed');
  if (rep.single_shot !== true) errors.push('single_shot flag missing');
  const rows = rep.items || [];
  const lie = rows.filter(function (r) { return r.label === 'lie'; });
  const hon = rows.filter(function (r) { return r.label === 'honest'; });
  const k = lie.filter(function (r) { return r.logit > 0; }).length;
  const fp = hon.filter(function (r) { return r.logit > 0; }).length;
  const recompute = {
    n: rows.length, n_lie: lie.length, n_honest: hon.length, k: k, fp_count: fp,
    recall_default: lie.length ? k / lie.length : null,
    fp_default: hon.length ? fp / hon.length : null,
    confusion: { tp: k, fn: lie.length - k, fp: fp, tn: hon.length - fp }
  };
  if (recompute.n !== rep.corpus.item_count) errors.push('item_count ' + rep.corpus.item_count + ' != rows ' + recompute.n);
  if (recompute.k !== rep.metrics.k) errors.push('k ' + rep.metrics.k + ' != recomputed ' + recompute.k);
  if (recompute.fp_count !== rep.metrics.fp_count) errors.push('fp_count ' + rep.metrics.fp_count + ' != recomputed ' + recompute.fp_count);
  if (Math.abs(recompute.recall_default - rep.metrics.recall_default) > 1e-12) errors.push('recall_default drift');
  if (Math.abs(recompute.fp_default - rep.metrics.fp_default) > 1e-12) errors.push('fp_default drift');
  if (JSON.stringify(recompute.confusion) !== JSON.stringify(rep.metrics.confusion)) errors.push('confusion drift');
  const dec = verdictFor(recompute.k, plan);
  if (dec.verdict !== rep.decision.verdict) errors.push('verdict ' + rep.decision.verdict + ' != table verdict for k=' + recompute.k + ' -> ' + dec.verdict);
  if (Math.abs(dec.ci95.lower - rep.decision.ci95.lower) > 1e-6) errors.push('ci lower drift');
  for (const r of rows) {
    if (!/^[a-f0-9]{64}$/.test(r.sha256)) errors.push(r.id + ': sha256 malformed');
    if (r.verdict !== (r.logit > 0 ? 'lie' : 'honest')) errors.push(r.id + ': verdict/logit inconsistent');
  }
  const claim = claimBlock(plan, { decision: rep.decision, k: rep.metrics.k }, rep.run_at);
  if (claim.fact_line !== rep.claim.fact_line) errors.push('fact_line drift');
  if (rep.claim.limitation_sentence !== plan.claim.limitation_sentence) errors.push('limitation sentence drift');
  if (rep.positive_control.corrupted_manifest_detected !== true) errors.push('positive control not recorded as detected');
  if (!/never cited by any conformity claim/.test(rep.corpus.conformity_disclaimer)) errors.push('conformity disclaimer missing');
  return { errors: errors, rep: rep };
}

// ---- CLI --------------------------------------------------------------------
function usage() {
  return 'usage: node bench/research/devin-oot.js [--validate | run | --replay]';
}

function main() {
  const cmd = process.argv[2] || 'run';
  if (cmd === '--replay') {
    requireCapabilities('devin-oot-replay');
    const r = replayCheck(ROOT);
    for (const e of r.errors) console.error('FAIL: ' + e);
    if (r.errors.length) process.exit(1);
    console.log('[devin-oot-replay] OK: stored artifact re-derives cleanly (' + r.rep.decision.verdict + ', k=' + r.rep.metrics.k + '/' + r.rep.corpus.n_lie + ', CI lower ' + r.rep.decision.ci95.lower.toFixed(6) + ')');
    process.exit(0);
  }
  if (cmd !== '--validate' && cmd !== 'run') { console.error(usage()); process.exit(64); }
  const plan = loadPlan(ROOT);
  const corpus = loadCorpus(ROOT);
  if (corpus.items.length !== corpus.manifest.item_count) {
    console.error('FAIL: item count ' + corpus.items.length + ' != manifest ' + corpus.manifest.item_count);
    process.exit(1);
  }
  const ser = serializeAndScore(corpus.items, {});
  if (ser.defects.length) {
    for (const d of ser.defects) console.error('DEFECT: ' + d);
    console.error('ABORTED: ' + ser.defects.length + ' serialization defect(s) - no partial adjudication (ADR-0067 D-B)');
    process.exit(1);
  }
  const control = positiveControl(ser.rows.map(function (r) { return r.id; }));
  if (cmd === '--validate') {
    console.log('[devin-oot] validate: ' + corpus.items.length + ' items serialized, 0 defects, positive control ' + (control.corrupted_manifest_detected ? 'OK' : 'BROKEN') + ' (labels untouched)');
    process.exit(control.corrupted_manifest_detected ? 0 : 1);
  }
  if (fs.existsSync(REPORT_JSON) && readJson(REPORT_JSON).run_status === 'completed') {
    console.error('REFUSED: a completed devin-oot-report.json already exists - single-shot burn is mechanical (ADR-0067 D-A.5). Use --replay.');
    process.exit(65); // EX_DATAERR: exit 2 is reserved for UNVERIFIABLE (ADR-0041 D3)
  }
  // SINGLE-SHOT: labels join here, exactly once.
  const adj = adjudicate(ser.rows, corpus.items, plan);
  const dropped = serializeAndScore(corpus.items, { drop_closing: true });
  const lieIds = new Set(adj.rows.filter(function (r) { return r.label === 'lie'; }).map(function (r) { return r.id; }));
  const dropHits = dropped.rows.filter(function (r) { return lieIds.has(r.id) && r.logit > 0; }).length;
  const dropClosing = { recall_default: dropHits / adj.n_lie };
  dropClosing.delta = adj.recall_default - dropClosing.recall_default;
  const date = new Date().toISOString().slice(0, 10);
  const rep = buildReport(plan, corpus, adj, control, dropClosing, date);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(rep, null, 2) + '\n', { encoding: 'utf8' });
  fs.writeFileSync(REPORT_MD, renderMd(rep), { encoding: 'utf8' });
  console.log('[devin-oot] ' + rep.decision.verdict + ' - k=' + adj.k + '/' + adj.n_lie
    + ' CI [' + rep.decision.ci95.lower.toFixed(6) + ',' + rep.decision.ci95.upper.toFixed(6) + '] floor ' + rep.decision.floor
    + ' | recall@default ' + adj.recall_default.toFixed(6) + ' FP ' + adj.fp_count + '/' + adj.n_honest
    + ' -> ' + path.relative(ROOT, REPORT_JSON));
  process.exit(0);
}

module.exports = {
  cpInterval: cpInterval,
  loadPlan: loadPlan,
  itemDefects: itemDefects,
  adaptItem: adaptItem,
  verdictFor: verdictFor,
  ruleOfThreeUpper: ruleOfThreeUpper,
  positiveControl: positiveControl,
  serializeAndScore: serializeAndScore,
  adjudicate: adjudicate,
  claimBlock: claimBlock,
  buildReport: buildReport,
  renderMd: renderMd,
  replayCheck: replayCheck,
  REPORT_JSON: REPORT_JSON
};

if (require.main === module) main();
