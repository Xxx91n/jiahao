// test/adr-0030.test.js -- ADR-0030 acceptance closure:
// D1 interval coverage gate, D3 reverify runbook + ledger chain,
// D4 dead-man degradation state.

const path = require('path');

const corpus = require('../bench/polygraph/check-probe-corpus.js');
const reverify = require('../scripts/reverify.js');
const sched = require('../src/reverify-schedule.js');
const { checkDeadlineAnchors } = require('../scripts/check-bench-thresholds.js');

function probe(id, law, kind) {
  return JSON.stringify({
    schema_version: '1.0',
    id,
    law,
    kind,
    expected_verdict: kind === 'violation-probe' ? 'lie' : 'honest',
    provenance: 'test',
    collected_at: '2026-08-29',
    rationale: 'fixture',
    events: [{ type: 'tool_call', call_id: 1, name: 't', arguments: {} }],
    closing: 'x',
  });
}
// valid 14-entry corpus: IL1..IL7 x {violation, benign}
function baseCorpus() {
  const lines = [];
  for (let n = 1; n <= 7; n++) {
    lines.push(probe('pb-t-v-10' + n, 'IL' + n + '-t', 'violation-probe'));
    lines.push(probe('pb-t-b-10' + n, 'IL' + n + '-t', 'benign-near-miss'));
  }
  return lines;
}
const NOW = Date.parse('2026-08-29T00:00:00Z');

describe('D1 interval coverage gate', () => {
  test('growth: two probes per side per law passes (exactly-once removed)', () => {
    const lines = baseCorpus();
    lines.push(probe('pb-t-v-201', 'IL3-v2-t', 'violation-probe'));
    lines.push(probe('pb-t-b-201', 'IL3-v2-t', 'benign-near-miss'));
    const problems = corpus.checkCorpus(lines, 14, NOW);
    expect(problems).toEqual([]);
  });
  test('shrinkage below the registered floor fails', () => {
    const problems = corpus.checkCorpus(baseCorpus(), 15, NOW);
    expect(problems.join('\n')).toMatch(/coverage floor/);
  });
  test('missing floor entry is fail-closed', () => {
    const problems = corpus.checkCorpus(baseCorpus(), null, NOW);
    expect(problems.join('\n')).toMatch(/fail-closed/);
  });
  test('coverageFloor only accepts the source_adr 0030 total_count gate', () => {
    expect(corpus.coverageFloor({ probe_gates: [{ source_adr: '0030', metric: 'total_count', op: '>=', value: 14 }] })).toBe(14);
    expect(corpus.coverageFloor({ probe_gates: [{ source_adr: '0029', metric: 'total_count', op: '>=', value: 14 }] })).toBeNull();
  });
  test('real corpus + real thresholds: 14 entries pass the floor', () => {
    const fs = require('fs');
    const lines = fs.readFileSync(path.join(__dirname, '..', 'bench', 'polygraph', 'probes.jsonl'), 'utf8').split('\n').filter(s => s.trim());
    const floor = corpus.coverageFloor(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bench', 'polygraph', 'thresholds.json'), 'utf8')));
    expect(corpus.checkCorpus(lines, floor, NOW)).toEqual([]);
  });
});

describe('D3 reverify runbook + evidence ledger', () => {
  test('computeMetrics counts the ADR-0025 D3 contract fields', () => {
    const entries = [
      { id: 'a', expected_heuristic: 'suspicious', expected_judge: 'override', collected_at: '2026-08-01' },
      { id: 'b', expected_heuristic: 'suspicious', expected_judge: 'override', collected_at: '2026-08-01' },
    ];
    const m = reverify.computeMetrics(entries, () => { throw new Error('boom'); }, NOW);
    expect(m.invocations).toBe(2);
    expect(m.fail_soft).toBe(2);
    expect(m.overrides_accepted).toBe(0);
    expect(m.override_rate).toBe(0);
    expect(m.stale).toBe(0);
    expect(Array.isArray(m.override_rate_ci95)).toBe(true);
  });
  test('overrides counted only when judge rescues a heuristic-suspicious twin', () => {
    const entries = [{ id: 'a', expected_heuristic: 'suspicious', expected_judge: 'override', collected_at: '2026-08-01' }];
    const m = reverify.computeMetrics(entries, () => ({ verdict: 'honest' }), NOW);
    expect(m.overrides_accepted).toBe(1);
  });
  test('ledger chain: append, verify; tamper/missing-link detected', () => {
    let ledger = [];
    ledger = reverify.appendEntry(ledger, { collected_at: '2026-08-01T00:00:00Z', metrics: { invocations: 2 }, conclusion: 'pass' });
    ledger = reverify.appendEntry(ledger, { collected_at: '2026-08-29T00:00:00Z', metrics: { invocations: 2 }, conclusion: 'pass' });
    expect(reverify.verifyLedger(ledger)).toBeNull();
    expect(ledger[0].prev_hash).toBe(reverify.GENESIS);
    expect(ledger[1].prev_hash).toBe(ledger[0].event_hash);
    const tampered = ledger.map(e => ({ ...e }));
    tampered[1].metrics.invocations = 999;
    expect(reverify.verifyLedger(tampered)).toMatch(/event_hash mismatch/);
    const relinked = ledger.map(e => ({ ...e }));
    relinked[0].event_hash = relinked[1].event_hash; // chain break under prev_hash
    expect(reverify.verifyLedger(relinked)).toMatch(/mismatch/);
  });
  test('canonical: key order independent', () => {
    expect(reverify.canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(reverify.canonical({ a: { c: 3, d: 2 }, b: 1 }));
  });
  test('staleWarning: fresh -> null, > 6 months -> message, empty -> message', () => {
    const fresh = reverify.appendEntry([], { collected_at: new Date(NOW - 10 * 24 * 3600 * 1000).toISOString(), metrics: {}, conclusion: 'pass' });
    expect(reverify.staleWarning(fresh, NOW)).toBeNull();
    const old = reverify.appendEntry([], { collected_at: new Date(NOW - 200 * 24 * 3600 * 1000).toISOString(), metrics: {}, conclusion: 'pass' });
    expect(reverify.staleWarning(old, NOW)).toMatch(/6 months/);
    expect(reverify.staleWarning([], NOW)).toMatch(/no re-verification/);
  });
});

describe('D4 dead-man degradation', () => {
  const schedule = { interval_months: 6, hard_interval_months: 9, recovery_condition: 'reverify it' };
  const ledgerAt = iso => [{ collected_at: iso }];
  test('fresh < 6mo, warn [6,9), degraded >= 9mo (boundaries pinned)', () => {
    const mo = sched.MONTH_MS;
    expect(sched.degradationState(schedule, ledgerAt(new Date(NOW - 3 * mo).toISOString()), NOW).state).toBe('fresh');
    expect(sched.degradationState(schedule, ledgerAt(new Date(NOW - 6 * mo).toISOString()), NOW).state).toBe('warn');
    expect(sched.degradationState(schedule, ledgerAt(new Date(NOW - 8 * mo).toISOString()), NOW).state).toBe('warn');
    expect(sched.degradationState(schedule, ledgerAt(new Date(NOW - 8 * mo - 1).toISOString()), NOW).state).toBe('warn');
    expect(sched.degradationState(schedule, ledgerAt(new Date(NOW - 9 * mo).toISOString()), NOW).state).toBe('degraded');
  });
  test('missing/empty ledger degrades (deletion cannot restore freshness)', () => {
    expect(sched.degradationState(schedule, null, NOW).state).toBe('degraded');
    expect(sched.degradationState(schedule, [], NOW).state).toBe('degraded');
    expect(sched.degradationState(schedule, ledgerAt('not-a-date'), NOW).state).toBe('degraded');
  });
  test('banners carry the recovery condition; fresh has no banner', () => {
    expect(sched.banner('degraded', schedule)).toMatch(/reverify it/);
    expect(sched.banner('warn', schedule)).toMatch(/reverify it/);
    expect(sched.banner('fresh', schedule)).toBeNull();
  });
  test('real deadline.json anchors against ADR-0030 text; tampered value fails', () => {
    const fs = require('fs');
    const dl = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bench', 'polygraph', 'deadline.json'), 'utf8'));
    expect(checkDeadlineAnchors(dl)).toEqual([]);
    const bad = { ...dl, hard_interval_months: 42 };
    expect(checkDeadlineAnchors(bad).join('\n')).toMatch(/not anchored/);
  });
  test('real assets load: state is fresh right after the baseline run', () => {
    const loaded = sched.load(path.join(__dirname, '..'));
    expect(loaded).not.toBeNull();
    expect(loaded.state.state).toBe('fresh');
  });
});
