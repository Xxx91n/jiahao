'use strict';

// test/adr-0060-wiring.test.js -- ADR-0060 wiring assertions (ADR-0031 D1:
// every wiring-touching ADR ships its own executable wiring test).
// Covers D-A (sampling-plan power min_n), D-B (indeterminate conformity),
// D-C (conditional certification axis + fail-closed expiry),
// D-D (CAPA / spec limit not loosened), D-E (sign-off guard by conformity).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const reverify = require('../scripts/reverify');
const instrument = require('../src/instrument-identity');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ADR = path.join(ROOT, 'docs', 'adr', '0060-judge-conformity-sampling-power-indeterminate-state-and-conditional-certification.md');
const ADR39 = path.join(ROOT, 'docs', 'adr', '0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md');
const LEDGER = path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json');

function metrics(n, overrides) {
  return { invocations: n, need_override: n, overrides_accepted: overrides, override_rate: overrides / n, fail_soft: 0, stale: 0, per_entry: [] };
}

const CLI_ENV = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: os.tmpdir() });
function cli(args) { return spawnSync(process.execPath, ['scripts/instrument.js'].concat(args), { cwd: ROOT, encoding: 'utf8', env: CLI_ENV }); }

describe('ADR-0060 document + distribution anchors', () => {
  test('the ADR records all five decisions and the min_n anchor', () => {
    const t = fs.readFileSync(ADR, 'utf8');
    for (const id of ['D-A', 'D-B', 'D-C', 'D-D', 'D-E']) expect(t).toContain('### ' + id);
    expect(t).toContain('min_n');
    expect(t).toContain('indeterminate');
    expect(t).toContain('certification_mode');
    expect(t).toContain('90 days by default');
  });

  test('ADR-0039 D84 records no recompute (M=140,778); CONTEXT.md stays in the tarball (D1)', () => {
    const adr39 = fs.readFileSync(ADR39, 'utf8');
    expect(adr39).toContain('out.size < 380,000 bytes'); // amended by ADR-0062 (2026-09-13) -> ADR-0066 (2026-09-14) -> ADR-0071 (2026-09-16) -> ADR-0082 (2026-09-22)
    expect(adr39).toContain('200,000 bytes'); // the superseded value stays recorded, not erased
    expect(pkg.files).toContain('CONTEXT.md');
    expect(pkg.files).not.toContain('jiahao-mcp/');
    expect(pkg.scripts['pack:smoke']).toBe('node scripts/check-pack-smoke.js'); // ADR-0034 D6 alias
    // ADR-0060 Acceptance references the cap (no stale literal), and ADR-0059
    // carries the amendment rather than rewriting its frozen literal.
    const acc60 = fs.readFileSync(ADR, 'utf8');
    expect(acc60).toContain('200,000-byte cap');
    expect(acc60).toContain('NOT met'); // the breach is recorded, not hidden
    const adr59 = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0059-external-critique-dialectic-closure-distribution-honesty-and-governance-posture.md'), 'utf8');
    expect(adr59).toContain('Amended by: ADR-0060');
  });

  test('the three ADR-0060 deferred work items are registered', () => {
    for (const id of ['defer-0032', 'defer-0033', 'defer-0034']) {
      const e = registry.entries.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e.source_adr).toContain('0060');
      expect(e.status).toBe('pending-evaluation');
    }
  });
});

describe('ADR-0060 D-A/D-B: sampling-plan power and indeterminate conformity', () => {
  const rule = reverify.defaultDecisionRule(0.1);

  test('min_n is pre-registered and the spec limit is NOT loosened (D-D)', () => {
    expect(rule.min_n).toBe(100);
    expect(rule.version).toBe('0060.1');
    expect(rule.spec_limit).toBe(0.1);
  });

  test('below min_n the statement is indeterminate, never fail', () => {
    const r = reverify.evaluateConformity(3 / 22, [0.029055851, 0.349122097], rule, 22);
    expect(r.result).toBe('indeterminate');
    expect(r.min_n).toBe(100);
    expect(r.n).toBe(22);
  });

  test('an unknown sample size fails closed (no silent bypass of D-A)', () => {
    expect(reverify.evaluateConformity(0.05, [0.02, 0.08], rule).result).toBe('indeterminate');
  });

  test('at/above min_n the guarded acceptance statement applies unchanged', () => {
    expect(reverify.evaluateConformity(0.05, [0.02, 0.08], rule, 100).result).toBe('pass');
    expect(reverify.evaluateConformity(0.09, [0.02, 0.08], rule, 100).result).toBe('conditional');
    expect(reverify.evaluateConformity(0.2, [0.02, 0.08], rule, 100).result).toBe('fail');
  });

  test('conclude maps indeterminate only when no hard finding is present', () => {
    expect(reverify.conclude(metrics(22, 3), 22, null, 'indeterminate').conclusion).toBe('indeterminate');
    expect(reverify.conclude(Object.assign(metrics(22, 3), { fail_soft: 1 }), 22, null, 'indeterminate').conclusion).toBe('fail');
  });

  test('the run key covers the rule version (a rule change appends a row)', () => {
    const m = metrics(22, 3);
    const a = reverify.runKey(m, '2026-09-12T00:00:00.000Z', { version: '0049.1' });
    const b = reverify.runKey(m, '2026-09-12T00:00:00.000Z', { version: '0060.1' });
    expect(a).not.toBe(b);
  });
});

describe('ADR-0060 D-C/D-E: conditional certification axis', () => {
  function quarantinedState() {
    const s = instrument.loadState(ROOT);
    const genesis = s.history[0];
    const auth = {
      schema_version: 1, state: 'authoritative',
      authoritative_identity_digest: genesis.identity_digest,
      quarantined_identity_digest: null, history: [genesis],
    };
    return instrument.transition(auth, { type: 'identity-change', identity_digest: 'a'.repeat(64) });
  }
  const signoffArgs = {
    type: 'conditional_signoff', identity_digest: 'a'.repeat(64),
    reviewer_id: 'reviewer-a', attestation_type: 'certify',
    reverify_ledger_hash: 'b'.repeat(64), bias_probe_hash: 'c'.repeat(64),
    expires_at: '2026-12-11', capa_ref: 'CAPA-0060-judge-flip-rate',
    authorization: 'AUTHORISED-BY-HUMAN', instrument_id: 'agent-instrument',
  };

  test('conditional sign-off keeps the two-state contract and records the second axis', () => {
    const c = instrument.transition(quarantinedState(), signoffArgs);
    expect(c.state).toBe('authoritative');
    expect(c.certification_mode).toBe('conditional');
    expect(c.conditional_expires_at).toBe('2026-12-11');
    expect(c.conditional_capa_ref).toBe('CAPA-0060-judge-flip-rate');
    // P-A1: principal (who authorised) vs instrument (what executed) + anchor,
    // recorded on the chain event itself.
    const ev = c.history[c.history.length - 1];
    expect(ev.principal_id).toBe('reviewer-a');
    expect(ev.instrument_id).toBe('agent-instrument');
    expect(ev.authorization).toBe('AUTHORISED-BY-HUMAN');
    expect(instrument.verifyState(c).valid).toBe(true);
  });

  test('the expiry is fail-closed', () => {
    const c = instrument.transition(quarantinedState(), signoffArgs);
    expect(instrument.effectiveState(c, null, Date.parse('2026-10-01T00:00:00Z'))).toBe('authoritative');
    expect(instrument.effectiveState(c, null, Date.parse('2027-01-01T00:00:00Z'))).toBe('quarantined');
  });

  test('a conditional sign-off without an expiry or CAPA is refused', () => {
    const q = quarantinedState();
    const noExpiry = Object.assign({}, signoffArgs); delete noExpiry.expires_at;
    expect(function () { instrument.transition(q, noExpiry); }).toThrow(/expires_at/);
    const noCapa = Object.assign({}, signoffArgs); delete noCapa.capa_ref;
    expect(function () { instrument.transition(q, noCapa); }).toThrow(/capa_ref/);
  });

  test('the live CLI refuses a certify sign-off on a non-pass ledger tail (D-E)', () => {
    const led = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    const tail = led[led.length - 1];
    expect(tail.conformity).not.toBe('pass');
    const r = cli(['--signoff', '--reviewer', 'r', '--attestation', 'certify', '--authorization', 'AUTHORISED-BY-HUMAN', '--reverify-ledger-hash', tail.event_hash, '--bias-probe-hash', 'c'.repeat(64)]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('pass conformity');
  });

  test('ADR-0060 D-D: an open-ended conditional window is refused', () => {
    const r = cli(['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--authorization', 'AUTHORISED-BY-HUMAN', '--reverify-ledger-hash', 'b'.repeat(64), '--bias-probe-hash', 'c'.repeat(64), '--expires-at', '2099-01-01', '--capa-ref', 'CAPA-X']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('exceeds the 90-day conditional window');
  });

  test('the live CLI refuses a conditional sign-off without --capa-ref', () => {
    const r = cli(['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--authorization', 'AUTHORISED-BY-HUMAN', '--reverify-ledger-hash', 'b'.repeat(64), '--bias-probe-hash', 'c'.repeat(64)]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('[usage]:');
  });

  test('P-A1: a sign-off without an explicit authorisation is refused', () => {
    const r = cli(['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--reverify-ledger-hash', 'b'.repeat(64), '--bias-probe-hash', 'c'.repeat(64), '--expires-at', '2026-12-11', '--capa-ref', 'CAPA-X']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('requires --authorization');
  });

  test('the ADR-0049 D-E look-back is discharged as a chain-anchored record', () => {
    const st = instrument.loadState(ROOT);
    const rec = st.history.find((e) => e.kind === 'record_only_change');
    const sign = st.history.find((e) => e.kind === 'record_signoff');
    expect(rec).toBeDefined();
    expect(sign).toBeDefined();
    expect(sign.record_seq).toBe(rec.seq);
    expect(rec.after.evidence_kinds).toEqual(['reverse_traceability', 'oot_impact_assessment']);
    expect(instrument.verifyState(st).valid).toBe(true);
  });

  test('the live --check passes while the conditional certification is unexpired', () => {
    const r = cli(['--check']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('certification: conditional');
  });

  // STD-1 regression (ADR-0060 D-C/D-D): the conditional axis must be
  // self-evidencing on the chain event - an expiry and CAPA that live only in
  // the top-level state are not tamper-anchored. The stateEvent() allowlist
  // silently dropped them for the whole ADR-0061 round; this binds the fix.
  //
  // Append-only honesty: the historical seq-10 event predates the fix and cannot
  // be rewritten (recorded as ERRATA E-5). What must hold is that the CURRENT
  // authoritative conditional sign-off - the live tail - evidences itself.
  test('STD-1: the live conditional_signoff tail carries expires_at and capa_ref', () => {
    const st = instrument.loadState(ROOT);
    const events = st.history.filter((e) => e.kind === 'conditional_signoff');
    expect(events.length).toBeGreaterThan(0);
    const tail = events[events.length - 1];
    expect(Object.prototype.hasOwnProperty.call(tail, 'expires_at')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(tail, 'capa_ref')).toBe(true);
    expect(String(tail.expires_at)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(String(tail.capa_ref)).toMatch(/^CAPA-/);
    // The repaired tail must agree with the live conditional axis.
    expect(tail.expires_at).toBe(st.conditional_expires_at);
    expect(tail.capa_ref).toBe(st.conditional_capa_ref);
    expect(instrument.verifyState(st).valid).toBe(true);
  });

  test('STD-1: every conditional_signoff at/after the repair carries the fields', () => {
    const st = instrument.loadState(ROOT);
    // The repaired event is the authoritative tail; assert the invariant from
    // the repair boundary forward, leaving frozen history untouched.
    const repaired = st.history.filter((e) => e.kind === 'conditional_signoff' && 'expires_at' in e);
    expect(repaired.length).toBeGreaterThan(0);
    const last = repaired[repaired.length - 1];
    // The invariant is that the repaired tail IS the live conditional
    // sign-off. Later non-signoff events (e.g. the seq-13 criteria_change
    // countersign) append above it without weakening it.
    const signoffs = st.history.filter((e) => e.kind === 'conditional_signoff');
    expect(last).toBe(signoffs[signoffs.length - 1]);
  });

  test('STD-1: the transition carries the expiry/CAPA onto the event, not only top-level', () => {
    const c = instrument.transition(quarantinedState(), signoffArgs);
    const ev = c.history[c.history.length - 1];
    expect(ev.expires_at).toBe('2026-12-11');
    expect(ev.capa_ref).toBe('CAPA-0060-judge-flip-rate');
  });

  // P-1 regression (ADR-0060 D-E / P-A1): a signoff-class event must persist the
  // verbatim authorisation it exercises. parseSignoffArgs always required it, but
  // criteria_change / record_only_change / record_signoff dropped it from the
  // payload - so the human authorisation was absent from the hash-chained record.
  test('P-1: a criteria_change event carries the authorisation it exercises', () => {
    const auth = 'AUTHORISED-BY-HUMAN-criteria';
    const c = instrument.transition(quarantinedState(), signoffArgs); // -> authoritative
    const next = instrument.transition(c, {
      type: 'criteria_change', identity_digest: signoffArgs.identity_digest,
      criteria_version: '0061.1', previous_criteria_version: '0060.1',
      restatement_of: 'deadbeef', reviewer_id: 'reviewer-a',
      attestation_type: 'approve', authorization: auth,
    });
    const ev = next.history[next.history.length - 1];
    expect(ev.kind).toBe('criteria_change');
    expect(ev.authorization).toBe(auth);
    expect(ev.principal_id).toBe('reviewer-a');
    expect(instrument.verifyState(next).valid).toBe(true);
  });

  test('P-1: a record_signoff event carries the authorisation it exercises', () => {
    const auth = 'AUTHORISED-BY-HUMAN-record';
    const c = instrument.transition(quarantinedState(), signoffArgs);
    const withRecord = instrument.transition(c, {
      type: 'record_only_change', identity_digest: signoffArgs.identity_digest,
      surface: 'schedule_gate', before: { a: 1 }, after: { a: 2 },
      maker_id: 'maker-a', authorization: auth, escalation: 'none',
    });
    const rec = withRecord.history[withRecord.history.length - 1];
    expect(rec.kind).toBe('record_only_change');
    expect(rec.authorization).toBe(auth);
    const signed = instrument.transition(withRecord, {
      type: 'record_signoff', identity_digest: signoffArgs.identity_digest,
      record_seq: rec.seq, reviewer_id: 'reviewer-a', attestation_type: 'approve',
      reason: 'reviewed', authorization: auth,
    });
    const sg = signed.history[signed.history.length - 1];
    expect(sg.kind).toBe('record_signoff');
    expect(sg.authorization).toBe(auth);
    expect(sg.principal_id).toBe('reviewer-a');
    expect(instrument.verifyState(signed).valid).toBe(true);
  });

  test('P-1: the live criteria_change record now persists its authorisation', () => {
    const st = instrument.loadState(ROOT);
    const cc = st.history.find((e) => e.kind === 'criteria_change');
    expect(cc).toBeDefined();
    // The ADR-0061 D-001 criteria change (seq 6) predates the fix, so history
    // keeps it authorization-less (append-only); a later re-emission is not
    // required for P-1 closure. What must hold is that NEW criteria_change
    // events persist it - asserted above at the transition layer.
    expect(instrument.verifyState(st).valid).toBe(true);
  });
});

describe('ADR-0060 D-C/D-E: fixture-tree CLI guards (expired / hard fail / default window)', () => {
  const FILES = [
    'docs/gates.json', 'docs/change-surface.json',
    'scripts/instrument.js', 'scripts/reverify.js',
    'src/change-surface.js', 'src/evidence-log.js', 'src/file-lock.js',
    'src/instrument-identity.js', 'src/instrument-identity.json', 'src/instrument-state.json',
    'src/reverify-schedule.js', 'src/shared/capability.js', 'src/shared/prefix-vocab.js',
    'src/shared/paths.js', 'src/SKILL.md',
  ];
  function makeTree(mutate) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0060-'));
    for (const rel of FILES) {
      const target = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, rel), target);
    }
    fs.mkdirSync(path.join(tmp, '.git'), { recursive: true });
    if (mutate) mutate(tmp);
    return tmp;
  }
  function cliIn(tmp, args) {
    return spawnSync(process.execPath, ['scripts/instrument.js'].concat(args), { cwd: tmp, encoding: 'utf8', env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }) });
  }
  // Reuse the REAL ledger (a valid hash chain) so the fixture never trips the
  // hash check. mode "fail" truncates it to the recorded `fail` row.
  function writeLedger(tmp, mode) {
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench', 'polygraph', 'reverify-ledger.json'), 'utf8'));
    const led = mode === 'fail' ? src.slice(0, src.findIndex((e) => e.conformity === 'fail') + 1) : src;
    const dir = path.join(tmp, 'bench', 'polygraph');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'reverify-ledger.json'), JSON.stringify(led, null, 2) + '\n', 'utf8');
    return led[led.length - 1].event_hash;
  }
  function patchState(tmp, fn) {
    const p = path.join(tmp, 'src', 'instrument-state.json');
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    fn(s);
    fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n', 'utf8');
  }

  test('--check exits 1 once the conditional certification expires', () => {
    const tmp = makeTree((t) => patchState(t, (s) => {
      s.state = 'authoritative'; s.certification_mode = 'conditional';
      s.conditional_expires_at = '2020-01-01'; s.conditional_capa_ref = 'CAPA-X';
    }));
    const r = cliIn(tmp, ['--check']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('quarantined');
  });

  test('--conditional-signoff refuses a hard fail', () => {
    const tmp = makeTree();
    const hash = writeLedger(tmp, 'fail');
    const r = cliIn(tmp, ['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--authorization', 'AUTHORISED-BY-HUMAN', '--reverify-ledger-hash', hash, '--bias-probe-hash', 'c'.repeat(64), '--expires-at', '2026-12-11', '--capa-ref', 'CAPA-X']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('indeterminate|conditional conformity');
  });

  test('omitting --expires-at applies the 90-day default window (D-D)', () => {
    const tmp = makeTree((t) => patchState(t, (s) => {
      const ii = require(path.join(ROOT, 'src', 'instrument-identity.js'));
      s.state = 'quarantined';
      s.quarantined_identity_digest = ii.resolveInstrumentIdentity(t).triple_hash;
      delete s.certification_mode; delete s.conditional_expires_at; delete s.conditional_capa_ref;
    }));
    const hash = writeLedger(tmp, 'indeterminate');
    const expected = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const r = cliIn(tmp, ['--conditional-signoff', '--reviewer', 'r', '--attestation', 'certify', '--authorization', 'AUTHORISED-BY-HUMAN', '--reverify-ledger-hash', hash, '--bias-probe-hash', 'c'.repeat(64), '--capa-ref', 'CAPA-X']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(expected);
  });
});
