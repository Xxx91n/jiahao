'use strict';
// test/adr-0099-wiring.test.js - grill-t39 T-11/T-12 (ADR-0099 sections P-A/P-B/P-C).
//
// Section P-A's leg and section P-B's field land in the same commit as their
// governing text (ADR-0095 D-B); this file is the wiring pin for both, plus the
// presence checks for section P-C's prose triple (a prose clause has no machine
// surface of its own this round - the mechanical backstop is defer-0091's anchor).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const leg = require('../scripts/check-claim-registration');
const deferred = require('../scripts/check-deferred');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p.split('/').join(path.sep)), 'utf8');
const ADR99 = 'docs/adr/0099-disposition-evidence-closure-row-id-cash-out-optional-check-channel-and-the-prose-triple.md';
const registry = () => JSON.parse(read('docs/deferred-registry.json'));
const gates = () => JSON.parse(read('docs/gates.json')).entries;

describe('ADR-0099 section P-A: a claim of registration must resolve to a row id', () => {
  test('the statutory sentence forms are recognized', () => {
    expect(leg.claimsIn('已登记 `defer-0094` 行。')).toEqual(['defer-0094']);
    expect(leg.claimsIn('this row is registered as defer-0101 in the registry')).toEqual(['defer-0101']);
    expect(leg.claimsIn('the question rides defer-0091 anchor')).toEqual(['defer-0091']);
    expect(leg.claimsIn('§P-A is the disposition that cashes out defer-0089')).toEqual(['defer-0089']);
    // The completed-act tense is the form the legislation itself uses ("cashed out
    // defer-NNNN"); a set that matches only the present tense is a silent review
    // blind spot, not a narrower rule (grill-t39 audit finding - the pattern read
    // (?:es|es|ing) and dropped the ed).
    expect(leg.claimsIn('this section cashed out defer-0089 in the registry')).toEqual(['defer-0089']);
    expect(leg.claimsIn('cash out deferred row `defer-0090`')).toEqual(['defer-0090']);
  });

  test('a bare id in a table cell is a reference, not a registration act', () => {
    expect(leg.claimsIn('| #3 label family | `defer-0094` | deferred | unfreeze condition |')).toEqual([]);
  });

  test('naming an id while describing it is a reference, never a registration act', () => {
    // ADR-0099 section P-A excludes explanatory mentions; the earlier pattern set
    // promoted "row id defer-NNNN" and "the deferred row defer-NNNN" into claims,
    // which is an over-broad capture surface (grill-t39 audit finding, spec axis).
    expect(leg.claimsIn('the row id `defer-0094` is listed in the table above')).toEqual([]);
    expect(leg.claimsIn('this is the deferred row `defer-0095` of ADR-0097')).toEqual([]);
    expect(leg.claimsIn('see defer-0096 for the sunset channel')).toEqual([]);
  });

  test('GREEN SIDE: every claim on the committed surface resolves', () => {
    const r = leg.check();
    expect(r.errors).toEqual([]);
    expect(r.claims).toBeGreaterThan(0);
  });

  test('RED SIDE: a claim naming an absent row is an error, never a silent pass', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0099-'));
    fs.mkdirSync(path.join(tmp, '.scratch', 'grill-t99', 'reports'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    // The fixture carries its own registry: reading the registry from the root the
    // caller named is the point (grill-t39 audit finding - the helper hardcoded
    // the ambient repo, so an isolated fixture inherited global state).
    fs.copyFileSync(path.join(ROOT, 'docs', 'deferred-registry.json'), path.join(tmp, 'docs', 'deferred-registry.json'));
    const rel = '.scratch/grill-t99/reports/2026-10-07-report.md';
    fs.writeFileSync(path.join(tmp, rel.split('/').join(path.sep)), '已登记 `defer-9999` 行，处置已闭合。\n');
    try {
      const r = leg.check({ root: tmp, files: [rel], legAnchor: null, forceAnchor: null });
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]).toMatch(/defer-9999/);
      expect(r.errors[0]).toMatch(/is not a registration/);
      expect(r.warnings.join('\n')).toMatch(/no resolvable claim anchor/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('the judged root is the caller root: no ambient registry leak', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0099-bare-'));
    fs.mkdirSync(path.join(tmp, '.scratch', 'grill-t99', 'reports'), { recursive: true });
    const rel = '.scratch/grill-t99/reports/2026-10-07-report.md';
    fs.writeFileSync(path.join(tmp, rel.split('/').join(path.sep)), '已登记 `defer-0094` 行。\n');
    try {
      // defer-0094 exists in the AMBIENT registry and would pass silently there;
      // this root carries no registry, so the leg must fail closed.
      const r = leg.check({ root: tmp, files: [rel], legAnchor: null, forceAnchor: null });
      expect(r.errors.join('\n')).toMatch(/unreadable in the worktree - fail closed/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('forward-only: the leg never retro-convicts prose older than its anchor', () => {
    const r = leg.check();
    expect(typeof r.exempt).toBe('number');
    expect(r.claims).toBe(r.judged + r.exempt);
  });

  test('the leg is registered once, confirmatory, with the ADR-0099 authority', () => {
    const rows = gates().filter((g) => g.name === 'claim-registration');
    expect(rows.length).toBe(1);
    expect(rows[0].tier).toBe('confirmatory');
    expect(rows[0].source_adr).toBe(ADR99);
    expect(rows[0].command).toBe('node scripts/check-claim-registration.js');
    expect(rows[0].requires).toEqual(['repo-tree']);
    expect(fs.existsSync(path.join(ROOT, 'docs', 'adr', '0099-disposition-evidence-closure-row-id-cash-out-optional-check-channel-and-the-prose-triple.md'))).toBe(true);
  });

  test('defer-0089 is cashed out as actioned, not deleted', () => {
    const e = registry().entries.find((x) => x.id === 'defer-0089');
    expect(e.status).toBe('actioned');
    expect(String(e.actioned_via)).toMatch(/ADR-0099/);
    expect(e.actioned_at).toBe('2026-10-07');
  });

  test('the cash-out record names the gate order the leg actually landed at', () => {
    // A tracking entry that disagrees with the thing it tracks is a ledger desync
    // (grill-t39 audit finding - the row said order 236 while the leg sits at 217).
    const row = gates().find((g) => g.name === 'claim-registration');
    const e = registry().entries.find((x) => x.id === 'defer-0089');
    expect(String(e.actioned_via)).toContain('order ' + row.order);
    expect(String(e.actioned_via)).not.toMatch(/order 236/);
  });
});

describe('ADR-0099 section P-B: check_channel is optional, closed, and yellow when absent', () => {
  test('the channel enum is the legislated three, no more', () => {
    expect(deferred.CHECK_CHANNELS).toEqual(['gate-leg', 'owner-only', 'mechanical-trigger']);
  });

  test('a value outside the closed set is a shape error naming the fenced widening', () => {
    const base = registry().entries.find((e) => e.check_channel !== undefined);
    const bad = JSON.parse(JSON.stringify(base));
    bad.check_channel = 'auto-cleanup';
    const errs = deferred.validateShape({ schema_version: 1, _doc: registry()._doc, source_adr: registry().source_adr || 'x', entries: [bad] });
    expect(errs.join('\n')).toMatch(/outside the closed set/);
    expect(errs.join('\n')).toMatch(/countersign/);
  });

  test('new rows minted this round declare a channel; existing rows are not partially backfilled', () => {
    const reg = registry();
    const mine = ['defer-0094', 'defer-0095', 'defer-0096', 'defer-0097', 'defer-0098', 'defer-0099', 'defer-0100', 'defer-0101'];
    for (const id of mine) {
      const e = reg.entries.find((x) => x.id === id);
      expect(e).toBeTruthy();
      expect(deferred.CHECK_CHANNELS).toContain(e.check_channel);
    }
    // Partial backfill is forbidden: no pre-t39 row may carry the field.
    const preexisting = reg.entries.filter((e) => mine.indexOf(e.id) === -1 && e.status !== 'actioned' && e.status !== 'closed');
    for (const e of preexisting) expect(e.check_channel).toBeUndefined();
  });

  test('a missing channel is a YELLOW disclosure, never a red verdict', () => {
    const reg = registry();
    expect(deferred.validateShape(reg).filter((s) => /check_channel/.test(s))).toEqual([]);
    const warns = deferred.validateDiscipline(reg, '2026-10-08');
    const yellow = warns.filter((w) => /check_channel/.test(w));
    expect(yellow.length).toBe(1);
    expect(yellow[0]).toMatch(/yellow by design/);
    expect(yellow[0]).toMatch(/defer-0100/);
    // and the yellow never moves the exit code
    const errs = deferred.validateShape(reg);
    expect(errs.filter((s) => /check_channel/.test(s))).toEqual([]);
  });

  test('the deferred gate still passes with the field present', () => {
    const r = spawnSync(process.execPath, ['scripts/check-deferred.js'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[deferred\] OK/);
  });
});

describe('ADR-0099 section P-C: the prose triple and the gauge disclosure', () => {
  test('the ADR refines ADR-0096 section P-1 and records the consistency-leg veto with its anchor', () => {
    const t = read(ADR99);
    expect(t).toMatch(/instrument gauge name/);
    expect(t).toMatch(/§P-1's text is \*\*not\*\* edited|not\*\* edited/);
    expect(t).toMatch(/consistency leg is vetoed/);
    expect(t).toMatch(/defer-0091/);
  });

  test('AGENTS.md carries the triple clause and the row-id claim clause', () => {
    const a = read('AGENTS.md');
    expect(a).toMatch(/instrument gauge name/);
    expect(a).toMatch(/Claim-registration prose cites a row id/);
    expect(a).toMatch(/yellow disclosure obligation|yellow disclosure/);
  });
});
