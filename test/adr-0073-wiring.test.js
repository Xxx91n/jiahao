'use strict';
// test/adr-0073-wiring.test.js -- ADR-0073 (grill-t12 ledger D-001..D-004):
// doc-round wiring seeds for the closure + stewardship round. Locks the
// PRE-ACTION surface: the four provenance classes with the mechanical
// session->project-dir rule and conservative unclassified fallback, the
// tightening-only G1 organic amendment, the carried-item registered wording
// (F-A1/O-1/W-1/O-2, W-2 closed-by-design), the bake stewardship protocol
// (dry-run shape, checkpoint cadence, diversity-qualifier framework), the
// R1->R2 boundary, and the registry/ceremony rows. The doc commit is the
// stage gate: no untrack/flip/relabel precedes it.
// Const/style follows test/adr-0072-wiring.test.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0073-provenance-tiered-corpus-g1-organic-amendment-audit-carryover-bake-stewardship.md');
const README = path.join(ROOT, 'README.md');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('ADR-0073 doc surface (grill-t12 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0073 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0073: Provenance-Tiered Corpus');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-17');
    expect(a).toContain('D-001..D-004');
    expect(a).toContain('decision-ledger-t12');
  });

  test('all five decision clauses land (provenance, G1 amendment, dispositions, stewardship, round surface)', () => {
    const a = adr();
    expect(a).toContain('### D-A - Provenance class registration');
    expect(a).toContain('### D-B - ADR-0070 amendment: G1 narrowed to the organic leg');
    expect(a).toContain('### D-C - grill-t11 audit carry-over dispositions');
    expect(a).toContain('### D-D - Bake stewardship protocol');
    expect(a).toContain('### D-E - Round surface and registrations');
  });

  test('the provenance rule is registered: four classes, mechanical map, conservative fallback, no deletion', () => {
    const a = norm(adr());
    for (const c of ['organic', 'automated_harness', 'synthetic_selfcheck', 'unclassified']) {
      expect(a).toContain('`' + c + '`');
    }
    expect(a).toContain('~/.claude/projects/<slug>/<sid>.jsonl');
    expect(a).toContain('excluded from every organic count');
    expect(a).toContain('No record is deleted');
    expect(a).toContain('queue-operation');
    expect(a).toContain('{t11-live-regcheck-s2, t11-live-regcheck-s3}');
    expect(a).toContain('{D--Aworker-e2e-r66-claude}');
  });

  test('the G1 amendment is registered verbatim (before/after + tightening-direction disclosure)', () => {
    const a = norm(adr());
    expect(a).toContain('G1 >= 200 real Stop events carrying lane records');
    expect(a).toContain('G1 >= 200 organic Stop events carrying lane records');
    expect(a).toContain('forward-effective from this');
    expect(a).toContain('31 to 0 organic');
    expect(a).toContain('the flip remains a separate registered act');
  });

  test('carried-item wording is registered verbatim (F-A1/O-1/W-1/O-2, W-2 closed-by-design)', () => {
    const a = norm(adr());
    expect(a).toContain('untracked, history blob retained');
    expect(a).toContain('live-observed: independent-audit reproduction + automated-harness events; organic pending');
    expect(a).toContain('src/instrument-state.json');
    expect(a).toContain('scripts/check-host-contracts.js');
    expect(a).toContain('05fa697');
    expect(a).toContain('external exposure window is zero');
    expect(a).toContain('host configuration backups never enter git-tracked');
    expect(a).toContain('closed-by-D-002');
  });

  test('the bake stewardship protocol lands (dry-run shape, cadence, diversity framework)', () => {
    const a = norm(adr());
    expect(a).toContain('post-exclusion population empty');
    expect(a).toContain('synthesizing a population to make the exercise productive is forbidden');
    expect(a).toContain('>= N independent sessions x >= M task-intent shapes');
    expect(a).toContain('deliberately NOT deferred-registry rows');
    expect(a).toContain('scripts/pairer-lane-telemetry.js');
  });

  test('rejected clauses land (inflated G1, record deletion, naming convention, loosening, history rewrite, organic-overclaim, flat verdict, registry N/M, synthetic bake)', () => {
    const a = adr();
    for (const r of ['wrong-population validity failure', 'classification is labeling, not removal', 'naming convention', 'away from the target', 'untracked is the honest word', 'does not imply organic use', 'closed as records, not ended as issues', 'pre-review pre-registrations, not deferrals', 'empty post-exclusion population']) {
      expect(a).toContain(r);
    }
  });
});

describe('ADR-0070 amendments (ADR-0073 D-B/D-C)', () => {
  const A70 = path.join(ROOT, 'docs', 'adr', '0070-hook-side-conviction-lane-pairer-shadow-wiring-promotion-gate.md');

  test('ADR-0070 carries the extended Amended-by line and the appended 2026-09-17 amendment note', () => {
    const a = read(A70);
    const n = norm(a);
    expect(a).toContain('ADR-0073 D-B');
    expect(a).toContain('## Amendment note (2026-09-17, ADR-0073)');
    expect(n).toContain('>= 200 organic Stop events');
    expect(n).toContain('live-observed: independent-audit reproduction + automated-harness events; organic pending');
    // the earlier amendment note is preserved (append-only)
    expect(a).toContain('## Amendment note (2026-09-16, ADR-0072)');
  });
});

describe('registry + ceremony rows (ADR-0027 D2 same-commit discipline)', () => {
  test('defer-0053 lands the collection-side provenance instrument agenda', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0053'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0073');
    expect(e.status).toBe('pending-evaluation');
    expect(e.subject).toContain('provenance');
  });

  test('defer-0054 lands the pre-commit scanner agenda (gitleaks class, O-2 recurrence prevention)', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0054'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0073');
    expect(e.subject).toContain('gitleaks');
    // T-3 F-5: post-action trigger (rules >3 or a miss incident) is an
    // external-event, replacing the stale pre-action presence-condition.
    expect(e.unfreeze_if.type).toBe('external-event');
    expect(e.unfreeze_if.check).toContain('gitleaks');
    expect(e.detection_limit).toContain('blind to unknown');
  });

  test('defer-0055 lands the organic routing-rate watch (external-event)', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0055'; });
    expect(e).toBeDefined();
    expect(e.unfreeze_if.type).toBe('external-event');
    expect(e.status).toBe('pending-evaluation');
  });

  test('defer-0056 lands as this round net-addition tally row', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const e = reg.entries.find(function (x) { return x.id === 'defer-0056'; });
    expect(e).toBeDefined();
    expect(e.source_adr).toContain('0073');
    // R2 disposition: closed via the same-commit ledger note (t13 ledger
    // "T-2 dispositions" section); closed state is the current truth.
    expect(e.status).toBe('closed');
    expect(e.closed_via).toContain('T-2 dispositions');
    expect(e.subject).toContain('net-addition');
    expect(e.rationale).toContain('D-006(a)(i)');
  });

  test('trend-inventory gains the grill-t12 doc-round row', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t12-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0073']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0056');
  });

  test('anchors.json lists decision-ledger-t12.md under ADR-0073, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t12.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0073');
    expect(e.origin).toBe('.scratch/grill-t12/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t12.md'));
    expect(sha256(copy)).toBe(e.sha256);
    // ADR-0074 D-B: the governance copy carries a registered head note block
    // prepended to the byte-identical scratch authority. The block text is
    // derived from the copy itself (duplicating it here would be a second
    // source of truth); the assertions pin its registered markers.
    const scratch = read(path.join(ROOT, '.scratch', 'grill-t12', 'decision-ledger.md'));
    // ADR-0074 D-B: the governance copy carries a registered head note block,
    // pinned BYTE-EXACT below (T-3 F-8: the substring form allowed drift).
    const POINTER_HEAD = [
      '> Pointer note (ADR-0074, 2026-09-17): this record predates the sanitized-history publish; pre-rewrite SHA citations below name local-only objects - resolve them through docs/rewrite-map.json.',
      "> Annotation (ADR-0074 D-B, 2026-09-17): D-003's \"历史 blob 保留\" reads local-only post-purge - the retained pre-rewrite objects live on local refs (gb-local/*) and are unreachable from origin/*.",
    ].join('\n');
    expect(copy).toBe(POINTER_HEAD + '\n\n' + scratch);
  });

  test('the README ADR index carries ADR-0073 (rebuilt, 73 records)', () => {
    const r = read(README);
    expect(r).toContain('77 architecture decision records');
    expect(r).toContain('[ADR-0073](docs/adr/0073-provenance-tiered-corpus-g1-organic-amendment-audit-carryover-bake-stewardship.md)');
  });

  test('the instrument-side registration event is recorded on the hash chain (bounded delegation: scope + expiry)', () => {
    const st = readJson(path.join(ROOT, 'src', 'instrument-state.json'));
    const ev = st.history.find(function (e) {
      return e.kind === 'record_only_change' && e.after && JSON.stringify(e.after).indexOf('ADR-0073') !== -1;
    });
    expect(ev).toBeDefined();
    expect(ev.maker_id).toBeDefined();
    expect(ev.authorization).toBeDefined();
    expect(ev.authorization).toContain('scope:');
    expect(ev.authorization).toContain('expiry:');
  });
});

describe('provenance segmentation (ADR-0073 D-A + R2 telemetry extension)', () => {
  const TEL = require('../scripts/pairer-lane-telemetry.js');
  const os = require('os');

  function mkProjects() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-'));
    const harness = path.join(dir, 'D--Aworker-e2e-r66-claude');
    const real = path.join(dir, 'D--Work-realproj');
    fs.mkdirSync(harness, { recursive: true });
    fs.mkdirSync(real, { recursive: true });
    // scripted-driver transcript: headless bookkeeping types present
    fs.writeFileSync(path.join(real, 'sid-scripted.jsonl'),
      JSON.stringify({ type: 'queue-operation', sessionId: 'sid-scripted' }) + '\n' +
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Reply' } }) + '\n');
    // interactive transcript: user/assistant turns only
    fs.writeFileSync(path.join(real, 'sid-organic.jsonl'),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'fix the flaky test' } }) + '\n' +
      JSON.stringify({ type: 'assistant' }) + '\n' +
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'now run it' } }) + '\n');
    // harness-workspace transcript
    fs.writeFileSync(path.join(harness, 'sid-harness.jsonl'),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'x' } }) + '\n');
    return dir;
  }

  function ctxFor(dir) {
    return {
      projectsDir: dir,
      selftestSessions: TEL.REGISTERED_SELFTEST_SESSIONS.slice(),
      harnessProjectDirs: TEL.REGISTERED_HARNESS_PROJECT_DIRS.slice(),
    };
  }

  function laneRecord(sid, state) {
    return { session_id: sid, detector: { source: 'pairer-instrument', shadow: true, pairer: { state: state || 'undetermined', latency_ms: 2 } } };
  }

  test('the mechanical rule classifies all four classes in the registered order', () => {
    const dir = mkProjects();
    const ctx = ctxFor(dir);
    expect(TEL.classifyProvenance(laneRecord('t11-live-regcheck-s2'), ctx).cls).toBe('synthetic_selfcheck');
    expect(TEL.classifyProvenance(laneRecord('sid-no-such-transcript'), ctx).cls).toBe('unclassified');
    expect(TEL.classifyProvenance(laneRecord('sid-harness'), ctx).cls).toBe('automated_harness');
    expect(TEL.classifyProvenance(laneRecord('sid-scripted'), ctx).cls).toBe('automated_harness');
    expect(TEL.classifyProvenance(laneRecord('sid-organic'), ctx).cls).toBe('organic');
    expect(TEL.classifyProvenance(laneRecord(undefined), ctx).cls).toBe('unclassified');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('self-test set membership beats transcript resolution (registered order)', () => {
    const dir = mkProjects();
    const ctx = ctxFor(dir);
    // even if a transcript existed for a registered self-test id, the set wins
    fs.writeFileSync(path.join(dir, 'D--Work-realproj', 't11-live-regcheck-s2.jsonl'),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }) + '\n');
    expect(TEL.classifyProvenance(laneRecord('t11-live-regcheck-s2'), ctx).cls).toBe('synthetic_selfcheck');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('collect() segments provenance counts + flagged-by-class; the G1 leg counts organic only', () => {
    const dir = mkProjects();
    const out = TEL.collect([
      laneRecord('t11-live-regcheck-s2', 'flagged'),
      laneRecord('t11-live-regcheck-s3', 'flagged'),
      laneRecord('sid-harness', 'undetermined'),
      laneRecord('sid-scripted', 'undetermined'),
      laneRecord('sid-organic', 'consistent'),
      laneRecord('sid-missing', 'undetermined'),
      { detector: { source: 'other' }, session_id: 'noise' },
    ], { provenanceCtx: ctxFor(dir) });
    expect(out.provenance.counts).toEqual({ organic: 1, automated_harness: 2, synthetic_selfcheck: 2, unclassified: 1 });
    expect(out.provenance.flagged_by_class.synthetic_selfcheck).toBe(2);
    expect(out.provenance.flagged_by_class.organic).toBe(0);
    expect(out.promotion_gate.G1_organic_count).toBe(1);
    expect(out.promotion_gate.G1_organic_ge_200).toBe(false);
    expect(out.promotion_gate.G1_events_total).toBe(6);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('collect() without a provenance ctx stays honest (null, never an inflated count)', () => {
    const out = TEL.collect([laneRecord('sid-x')]);
    expect(out.provenance).toBeNull();
    expect(out.promotion_gate.G1_organic_ge_200).toBeNull();
    expect(out.promotion_gate.G1_organic_count).toBeNull();
  });
});

describe('R1->R2 boundary: the flip executed in R2 carries the registered wording', () => {
  test('the three claude-code contracts carry measured-present; every other host does not', () => {
    const cfg = readJson(path.join(ROOT, 'test', 'fixtures', 'host-contracts.json'));
    const claude = cfg.contracts.filter(function (c) { return c.host === 'claude-code'; });
    expect(claude.length).toBeGreaterThan(0);
    for (const c of claude) expect(c.transcript_file).toBe('measured-present');
    for (const c of cfg.contracts) {
      if (c.host !== 'claude-code') expect(c.transcript_file).not.toBe('measured-present');
    }
  });

  test('the evidence-layer parenthetical sits verbatim in all three claim homes (ADR-0073 D-C O-1)', () => {
    const s = 'currently `measured-present` (live-observed: independent-audit reproduction + automated-harness events; organic pending) only for claude-code';
    for (const f of ['README.md', path.join('bench', 'research', 'out', 'claim-template.md'), path.join('bench', 'research', 'out', 'devin-oot-v3-report.md')]) {
      expect(read(path.join(ROOT, f))).toContain(s);
    }
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
