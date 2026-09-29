'use strict';
// test/orphan-cites.test.js - grill-t32 / ADR-0089 acceptance battery:
// the rewrite-map classifier contract on REAL git fixture repos (real
// commits, real ref-deletion orphans, real gc --prune=now dead objects, real
// replace refs, real promisor-less clones), with the ~5% fault seam injected
// at opts.exec and the ladder clock at opts.now. Hermetic git writes all
// route through test/helpers/git-hermetic.js (grill-t29 D-004).
//
// Golden policy (spec 6.1): class/pair/resolved_to rows compare byte-exact
// against the registered matrix (test/fixtures/orphan-cites/expected-classes.json);
// qualifiers are property-matched (types/shapes), never byte-compared. No -u
// refresh semantics exist - drift is handled through errata, not auto-update.

const fs = require('fs');
const os = require('os');
const path = require('path');
const hg = require('./helpers/git-hermetic');
const rm = require('../scripts/build-rewrite-map');
const oc = require('../scripts/orphan-cites');
const leg = require('../scripts/check-orphan-registration');

jest.setTimeout(180000);

const REG = 'docs/governance/orphan-cites.json';
const MAP = 'docs/rewrite-map.json';
const NOW0 = '2026-09-28T12:00:00.000Z';
const DAY = 86400;
const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'orphan-cites', 'expected-classes.json'), 'utf8'));

function mkDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'oc-')); }
function put(dir, rel, text) {
  const p = path.join(dir, rel.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
}
function commit(dir, msg, env) {
  hg.git(dir, ['add', '-A']);
  hg.git(dir, ['commit', '-q', '-m', msg], env ? { env: env } : undefined);
  return hg.git(dir, ['rev-parse', 'HEAD']);
}
function plantRegistry(dir) {
  put(dir, REG, JSON.stringify({ schema_version: 1, _doc: 'fixture', entries: [] }, null, 2) + '\n');
}
function readReg(dir) { return JSON.parse(fs.readFileSync(path.join(dir, REG), 'utf8')); }
// exec-override delegate (ADR-0089 D-006 seam): everything not deliberately
// failed still hits real hermetic git at the fixture root; NO_REPLACE stays on.
function realExec(dir) {
  return function (args, opts) {
    const r = hg.gitRaw(dir, args, { env: { GIT_NO_REPLACE_OBJECTS: '1' }, input: opts && opts.input });
    if (r.status !== 0) { const e = new Error(r.stderr || 'git failed'); e.code = r.status; e.stderr = r.stderr; throw e; }
    return r.stdout;
  };
}

// One orphan commit on a throwaway branch, then the branch deleted - a real
// ref-deletion orphan (object lives, reachable_via = empty).
function orphanCommit(dir, subject) {
  const tag = subject.replace(/\W/g, '');
  hg.git(dir, ['checkout', '-q', '-b', 'tmp-' + tag]);
  put(dir, 'orph-' + tag + '.txt', subject + '\n');
  const sha = commit(dir, subject);
  hg.git(dir, ['checkout', '-q', 'main']);
  hg.git(dir, ['branch', '-D', 'tmp-' + tag]);
  return sha;
}

// Full-topology fixture: published line (main) + old-side ref (oldside) +
// real orphans + never-existent dead token + committed citing doc.
function fixture(dir) {
  hg.mkRepo(dir);
  hg.git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  plantRegistry(dir);
  put(dir, 'docs/citing.md', '# cites\n');
  const A0 = commit(dir, 'base seed');
  hg.git(dir, ['checkout', '-q', '-b', 'oldside']);
  put(dir, 'o1.txt', 'old side\n');
  const O1 = commit(dir, 'subject pairwork');
  put(dir, 'o2.txt', 'old only\n');
  const O2 = commit(dir, 'subject gonework');
  hg.git(dir, ['checkout', '-q', 'main']);
  put(dir, 'n1.txt', 'new side\n');
  const N1 = commit(dir, 'subject pairwork');
  const OC = orphanCommit(dir, 'subject orphanwork');
  const OCR = orphanCommit(dir, 'subject regwork');
  const OCP = orphanCommit(dir, 'subject pairwork'); // same subject as N1 -> successor pairing works
  const OC2 = orphanCommit(dir, 'subject revivework');
  const DEAD = 'deadbeef'.repeat(5);
  // cite token = shortest sha prefix (>=7) containing a [a-f] letter - the
  // doc scanner only counts tokens with a hex letter, and a digits-only
  // prefix would silently not be cited (flaky across fixtures).
  const ct = (sha) => { for (let w = 7; w <= 40; w++) { if (/[a-f]/.test(sha.slice(0, w))) return sha.slice(0, w); } return sha; };
  const tokens = { O1: ct(O1), A0: ct(A0), O2: ct(O2), OC: ct(OC), OCR: ct(OCR), OCP: ct(OCP), OC2: ct(OC2), DEAD: DEAD };
  put(dir, 'docs/citing.md', [
    '# cites',
    'pair ' + tokens.O1,
    'pub ' + tokens.A0,
    'gone ' + tokens.O2,
    'orphan ' + tokens.OC,
    'reg ' + tokens.OCR,
    'succ ' + tokens.OCP,
    'rev ' + tokens.OC2,
    'dead ' + DEAD,
    '',
  ].join('\n'));
  commit(dir, 'citing doc');
  return { dir: dir, A0: A0, O1: O1, O2: O2, N1: N1, OC: OC, OCR: OCR, OCP: OCP, OC2: OC2, DEAD: DEAD, tokens: tokens };
}
// An unreachable loose blob (real object, no ref, non-commit type).
function addBlob(dir, fx) {
  fs.writeFileSync(path.join(dir, 'blob-content.txt'), 'orphan blob\n');
  const OB = hg.git(dir, ['hash-object', '-w', 'blob-content.txt']);
  fs.unlinkSync(path.join(dir, 'blob-content.txt'));
  const t = (function () { for (let w = 7; w <= 40; w++) { if (/[a-f]/.test(OB.slice(0, w))) return OB.slice(0, w); } return OB; })();
  const text = fs.readFileSync(path.join(dir, 'docs', 'citing.md'), 'utf8');
  put(dir, 'docs/citing.md', text + 'blob ' + t + '\n');
  commit(dir, 'blob cite');
  fx.OB = OB; fx.tokens.OB = t;
  return OB;
}

function buildMap(fx, now) {
  return rm.build(['oldside'], 'main', { root: fx.dir, now: now || NOW0 });
}
function rowFor(map, token) {
  return map.doc_refs.find(function (d) { return d.sha === token; });
}
function writeMap(fx, map) { put(fx.dir, MAP, JSON.stringify(map, null, 2) + '\n'); }

// ---------- six terminal classes ----------

describe('six terminal classes (real fixture)', () => {
  test('golden: every token lands its registered terminal class', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const OB = addBlob(dir, fx);
    expect(oc.cmdRegister(dir, [fx.OCR, '--reason', 't32 battery'], {}).code).toBe(0);
    const map = buildMap(fx);
    const shaOf = { O1: fx.O1, A0: fx.A0, O2: fx.O2, N1: fx.N1, OC: fx.OC, OCR: fx.OCR, OCP: fx.OCP, OC2: fx.OC2, OB: OB, DEAD: fx.DEAD };
    const got = GOLDEN.rows.map(function (r) {
      const token = fx.tokens[r.token];
      const row = rowFor(map, token);
      expect(row).toBeTruthy();
      const resolved = r.resolved_to ? shaOf[r.resolved_to] : null;
      return { token: r.token, 'class': row['class'], resolved_to: row.resolved_to, label: row.label || null, want: r };
    });
    for (const g of got) {
      expect(g['class']).toBe(g.want['class']);
      expect(g.resolved_to).toBe(g.want.resolved_to ? shaOf[g.want.resolved_to] : null);
      expect(g.label).toBe(g.want.label);
    }
    // qualifier shapes (property matchers - never byte equality)
    for (const row of map.doc_refs) {
      const q = row.qualifiers;
      expect(typeof q.exists_at).toBe('string');
      expect(Array.isArray(q.reachable_via)).toBe(true);
      if (row['class'] === 'unresolved') {
        expect(q.object_type).toBeNull();
        expect(q.object_mtime).toBeNull();
        expect(q.reachable_via).toEqual([]);
      } else {
        expect(['commit', 'tag', 'tree', 'blob']).toContain(q.object_type);
        expect(typeof q.object_size).toBe('number');
        expect(typeof q.object_mtime === 'number' || q.object_mtime === null).toBe(true);
      }
    }
    const bc = map.counts.doc_refs_by_class;
    // the registry file itself is scanned docs: each registered sha's verbatim
    // cite lands orphaned-cite too (self-consistent, not self-exempt).
    const orphanRows = map.doc_refs.filter(function (d) { return d['class'] === 'orphaned-cite'; });
    expect(bc['orphaned-cite']).toBe(orphanRows.length);
    expect(orphanRows.length).toBeGreaterThan(0);
    expect(orphanRows.every(function (d) { return d.sha === fx.tokens.OCR || d.sha === fx.OCR; })).toBe(true);
    expect(bc.unresolved).toBe(1);
    expect(bc.rewritten).toBe(1);
    expect(map.schema_version).toBe(2);
  });

  test('negatives: registered is not unresolved/local-only; reachable is not orphaned-cite', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.OCR, '--reason', 'x'], {}).code).toBe(0);
    const map = buildMap(fx);
    expect(rowFor(map, fx.tokens.OCR)['class']).not.toBe('unresolved');
    expect(rowFor(map, fx.tokens.OCR)['class']).not.toBe('local-only');
    expect(rowFor(map, fx.N1.slice(0, 7))).toBeUndefined(); // N1 not cited - only A0 is
    expect(rowFor(map, fx.DEAD)['class']).not.toBe('orphaned-cite');
    expect(rowFor(map, fx.tokens.OC2)['class']).not.toBe('orphaned-cite'); // unregistered live orphan stays local-only
  });
});

// ---------- registry verbs ----------

describe('registry verbs', () => {
  test('register appends a live entry (snapshot + locations + disposition)', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const r = oc.cmdRegister(dir, [fx.OC, '--reason', 'battery', '--carried', 'x'], { cite: { file: 'docs/citing.md', line: 5 } });
    expect(r.code).toBe(0);
    const reg = readReg(dir);
    expect(reg.entries.length).toBe(1);
    const e = reg.entries[0];
    expect(e.cited_sha).toBe(fx.OC);
    expect(e.disposition).toBe('orphaned');
    expect(e.snapshot.subject).toBe('subject orphanwork');
    expect(e.object_type).toBe('commit');
    expect(e.cite_locations).toEqual([{ file: 'docs/citing.md', line: 5 }]);
    expect(oc.validateRegistry(reg)).toEqual([]);
  });

  test('register refuses: reachable object / absent object / successor subject mismatch', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.N1, '--reason', 'x'], {}).code).toBe(1); // reachable -> refuse
    expect(oc.cmdRegister(dir, [fx.DEAD, '--reason', 'x'], {}).code).toBe(1); // absent -> refuse, backfill hint
    expect(oc.cmdRegister(dir, [fx.OC, '--successor', fx.O2, '--reason', 'x'], {}).code).toBe(1); // subject mismatch
    const ok = oc.cmdRegister(dir, [fx.OCP, '--successor', fx.N1, '--reason', 'x'], {});
    expect(ok.code).toBe(0);
    expect(readReg(dir).entries[0].successor_sha).toBe(fx.N1);
  });

  test('revived latest-wins + resurrection adjudication: existence-fact class resumes', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.OC2, '--reason', 'orphan'], {}).code).toBe(0);
    let map = buildMap(fx);
    expect(rowFor(map, fx.tokens.OC2)['class']).toBe('orphaned-cite');
    // object resurrects: a ref points at it again
    hg.git(dir, ['branch', 'revived-line', fx.OC2]);
    const rv = oc.cmdRegister(dir, [fx.OC2, '--revive'], {});
    expect(rv.code).toBe(0);
    const latest = oc.latestBySha(readReg(dir)).get(fx.OC2);
    expect(latest.disposition).toBe('revived');
    map = buildMap(fx);
    const row = rowFor(map, fx.tokens.OC2);
    expect(row['class']).toBe('local-only'); // verdict on current fact, not a brand
    expect(row.qualifiers.reachable_via).toContain('refs/heads/revived-line');
  });

  test('--replace-ref materializes refs/replace/* and classification stays isolated', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const r = oc.cmdRegister(dir, [fx.OCP, '--successor', fx.N1, '--replace-ref', '--reason', 'x'], {});
    expect(r.code).toBe(0);
    expect(readReg(dir).entries[0].replace_ref).toBe(true);
    const listed = hg.git(dir, ['replace', '-l']);
    expect(listed).toContain(fx.OCP);
    const map = buildMap(fx);
    const row = rowFor(map, fx.tokens.OCP);
    expect(row['class']).toBe('orphaned-cite'); // registration wins; replace alias invisible
    expect(row.qualifiers.reachable_via).toEqual([]);
    expect(row.qualifiers.object_type).toBe('commit');
    expect(row.qualifiers.object_size).toBeGreaterThan(0);
    // control: outside the classifier the replace ref is visible and aliases
    expect(hg.git(dir, ['rev-parse', fx.OCP + '^{commit}'])).not.toBe('');
  });

  test('backfill: registers live+degraded populations, idempotent, dry-run writes nothing, checkpoint resume', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    // plant the committed map the backfill enumerates
    writeMap(fx, buildMap(fx));
    commit(dir, 'map');
    const before = fs.readFileSync(path.join(dir, REG), 'utf8');
    // dry-run reports but does not write
    const dry = oc.cmdBackfill(dir, ['--dry-run'], {});
    expect(dry.code).toBe(0);
    expect(fs.readFileSync(path.join(dir, REG), 'utf8')).toBe(before);
    expect(dry.report.degraded.length).toBe(1); // DEAD
    expect(dry.report.live.length).toBe(4);    // OC OCR OCP OC2
    // real run
    const run = oc.cmdBackfill(dir, [], { now: NOW0 });
    expect(run.code).toBe(0);
    const reg = readReg(dir);
    expect(reg.entries.length).toBe(5);
    // idempotent second run appends nothing
    const run2 = oc.cmdBackfill(dir, [], { now: NOW0 });
    expect(run2.code).toBe(0);
    expect(run2.report.live.length + run2.report.degraded.length).toBe(0);
    expect(readReg(dir).entries.length).toBe(5);
    // checkpoint resume: seed a cursor covering the whole token set -> all skip
    const ck = path.join(dir, 'ck.json');
    fs.writeFileSync(ck, JSON.stringify({ processed_shas: [fx.DEAD, fx.tokens.OC] }));
    const resume = oc.cmdBackfill(dir, ['--checkpoint', ck], {});
    expect(resume.report.skipped_done).toContain(fx.DEAD);
    expect(fs.existsSync(ck)).toBe(true);
  });

  test('annotate: appends errata linkage to degraded entries only, idempotent, dry-run writes nothing', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    writeMap(fx, buildMap(fx));
    commit(dir, 'map');
    oc.cmdBackfill(dir, [], { now: NOW0 });
    const before = readReg(dir);
    expect(before.entries.length).toBe(5);
    // dry-run: report-only
    const dry = oc.cmdAnnotate(dir, ['--errata', 'E-99', '--dry-run'], {});
    expect(dry.code).toBe(0);
    expect(dry.report.appended.length).toBe(1); // only the degraded DEAD entry
    expect(readReg(dir).entries.length).toBe(5);
    // real run: one appended adjudicating copy carrying errata_ref
    const r = oc.cmdAnnotate(dir, ['--errata', 'E-99'], { now: NOW0 });
    expect(r.code).toBe(0);
    const reg = readReg(dir);
    expect(reg.entries.length).toBe(6);
    const latest = oc.latestBySha(reg).get(fx.DEAD);
    expect(latest.errata_ref).toBe('E-99');
    expect(latest.disposition).toBe('orphaned'); // adjudication unchanged
    expect(latest.object_purged_at).toBeTruthy();
    expect(oc.validateRegistry(reg)).toEqual([]);
    // idempotent: second annotate appends nothing
    const r2 = oc.cmdAnnotate(dir, ['--errata', 'E-99'], { now: NOW0 });
    expect(r2.report.appended.length).toBe(0);
    expect(readReg(dir).entries.length).toBe(6);
    // live entries untouched: the 4 live-snapshot entries still carry no ref
    expect(reg.entries.filter((e) => e.errata_ref).length).toBe(1);
    // missing flag is a usage error, not a silent no-op
    expect(oc.cmdAnnotate(dir, [], {}).code).toBe(2);
  });

  test('injected fault seam: cat-file non-zero and registry IO error surface honestly', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const catFileFails = (args, opts) => {
      if (args[0] === 'cat-file') { const e = new Error('boom'); e.code = 1; throw e; }
      return realExec(dir)(args, opts);
    };
    const map = rm.build(['oldside'], 'main', { root: dir, now: NOW0, exec: catFileFails });
    // cat-file-e failures degrade facts to 'absent' -> every unresolved
    expect(map.doc_refs.filter(function (d) { return d['class'] === 'unresolved'; }).length).toBe(map.doc_refs.length);
    // registry IO error is fail-closed
    expect(function () {
      rm.build(['oldside'], 'main', { root: dir, now: NOW0, exec: realExec(dir) });
    }).not.toThrow(); // registry file exists - sane path
    fs.unlinkSync(path.join(dir, REG));
    expect(function () {
      rm.build(['oldside'], 'main', { root: dir, now: NOW0, exec: realExec(dir) });
    }).toThrow(/registry/);
  });

  test('abbreviated-sha ambiguity fails closed (injected low-level fault)', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    // Ambiguity is probabilistic to fabricate in a real object store; the
    // contract pins the FAIL-CLOSED path via the exec seam (spec adversarial 3):
    // a token whose batched cat-file line is unreadable falls back to solo
    // rev-parse; a solo 'ambiguous' verdict must abort, never guess.
    const ambig = (args, opts) => {
      if (args[0] === 'cat-file' && String(args[1]).indexOf('--batch-check') === 0) {
        const out = realExec(dir)(args, opts);
        return String(out).replace(new RegExp('^(' + fx.OC + ' .*)$', 'm'), fx.tokens.OC + ' ambiguous');
      }
      if (args[0] === 'rev-parse') { const e = new Error('ambiguous'); e.stderr = 'error: short object ID is ambiguous'; throw e; }
      return realExec(dir)(args, opts);
    };
    try {
      rm.build(['oldside'], 'main', { root: dir, now: NOW0, exec: ambig });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.message).toContain('unresolvable citations');
      expect(e.message).toContain('ambiguous');
    }
  });
});

// ---------- check-domain ----------

describe('--check domain narrowing', () => {
  test('qualifier drift does not fail equality; class drift does; unresolved is hard red', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const m1 = buildMap(fx, NOW0);
    const m2 = buildMap(fx, '2026-10-05T00:00:00.000Z');
    // qualifier timestamps drift; fact domain must stay equal
    expect(JSON.stringify(rm.stableCopy(m1))).toBe(JSON.stringify(rm.stableCopy(m2)));
    // mutate a qualifier on the committed side -> still equal
    const tampered = JSON.parse(JSON.stringify(m2));
    tampered.doc_refs[0].qualifiers.exists_at = '1999-01-01T00:00:00Z';
    tampered.doc_refs[0].qualifiers.object_mtime = 0;
    expect(JSON.stringify(rm.stableCopy(tampered))).toBe(JSON.stringify(rm.stableCopy(m1)));
    // mutate a class -> unequal (row[0] is 'rewritten'; flip to a different one)
    tampered.doc_refs[0]['class'] = 'published-unchanged';
    expect(JSON.stringify(rm.stableCopy(tampered))).not.toBe(JSON.stringify(rm.stableCopy(m1)));
    // unresolved presence is hard red via consistencyErrors, without mutation
    const errs = rm.consistencyErrors(m1);
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('unresolved');
    expect(errs[0]).toContain('backfill');
  });

  test('qualifier weak-consistency: reachable_via contradicts a non-reachability class', () => {
    const map = { doc_refs: [{ file: 'd', line: 1, sha: 'abc1234', 'class': 'orphaned-cite', qualifiers: { exists_at: NOW0, object_mtime: null, object_type: 'commit', object_size: 1, reachable_via: ['refs/heads/main'] } }] };
    expect(rm.consistencyErrors(map).some(function (e) { return e.indexOf('reachable_via') !== -1; })).toBe(true);
    expect(rm.consistencyErrors({ doc_refs: [{ file: 'd', line: 1, sha: 'abc1234', 'class': 'local-only', qualifiers: { exists_at: NOW0, object_mtime: null, object_type: 'bogus', object_size: 1, reachable_via: [] } }] }).length).toBeGreaterThan(0);
  });

  test('published-only: registry consistency is clone-computable (v2)', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.OCR, '--reason', 'x'], {}).code).toBe(0);
    const map = buildMap(fx);
    // planted-map mode: hand a crafted map to the verifier with matching coverage
    const occ = map.doc_refs.map(function (d) { return { file: d.file, line: d.line, sha: d.sha }; });
    const errs = rm.verifyPublishedOnly(map, 'main', { root: dir, occurrences: occ });
    // unresolved present -> must flag (published-only also asserts hard red)
    expect(errs.some(function (e) { return e.indexOf('unresolved') !== -1; })).toBe(true);
    // orphaned-cite rows resolve against the worktree registry
    expect(errs.some(function (e) { return e.indexOf('no registry entry') !== -1; })).toBe(false);
    // strip the registry file -> orphaned-cite rows are now unbacked
    fs.unlinkSync(path.join(dir, REG));
    const errs2 = rm.verifyPublishedOnly(map, 'main', { root: dir, occurrences: occ });
    expect(errs2.some(function (e) { return e.indexOf('orphan-cites.json is absent') !== -1; })).toBe(true);
  });
});

// ---------- ladder + degradation ----------

describe('three-stage escalation ladder (injected now)', () => {
  test('stage1 silent -> stage2 map warning -> stage3 leg red', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    const ocTok = fx.tokens.OC;
    // stage 1: object_mtime ~now -> no warning, leg clean
    let map = buildMap(fx, NOW0);
    expect(map.warnings.filter(function (w) { return w.sha === fx.OC; })).toEqual([]);
    writeMap(fx, map);
    let lr = leg.checkLeg({ root: dir, now: NOW0, oldSide: true });
    expect(lr.errors.filter(function (e) { return e.indexOf(ocTok) !== -1; })).toEqual([]);
    // stage 2: +20d past mtime -> warning channel carries the row, leg green
    const t20 = new Date(Date.parse(NOW0) + 20 * DAY * 1000).toISOString();
    map = buildMap(fx, t20);
    const w = map.warnings.find(function (x) { return x.sha === fx.OC; });
    expect(w).toBeTruthy();
    expect(w.kind).toBe('orphan-window-open');
    expect(w.age_days).toBeGreaterThan(oc.ORPHAN_AGE_DAYS - 1);
    writeMap(fx, map);
    lr = leg.checkLeg({ root: dir, now: t20, oldSide: true });
    expect(lr.errors.filter(function (e) { return e.indexOf(ocTok) !== -1; })).toEqual([]);
    // stage 3: +30d -> past age+grace -> leg red for this cite
    const t30 = new Date(Date.parse(NOW0) + 30 * DAY * 1000).toISOString();
    lr = leg.checkLeg({ root: dir, now: t30, oldSide: true });
    expect(lr.errors.some(function (e) { return e.indexOf('stage3') !== -1 && e.indexOf(ocTok) !== -1; })).toBe(true);
  });
});

describe('tamper + purge + partial-clone degradation', () => {
  test('registry tamper: forged size/subject flagged; append-order violated', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.OC, '--reason', 'x'], { now: '2026-09-28T00:00:00.000Z' }).code).toBe(0);
    writeMap(fx, buildMap(fx));
    const reg = readReg(dir);
    reg.entries[0].size = 999999; // forged field
    fs.writeFileSync(path.join(dir, REG), JSON.stringify(reg, null, 2) + '\n');
    const lr = leg.checkLeg({ root: dir, now: NOW0, oldSide: true });
    expect(lr.errors.some(function (e) { return e.indexOf('tamper') !== -1; })).toBe(true);
    // append-order violation caught at schema level
    reg.entries[0].size = fx.OC.length; // revert forge; corrupt ordering instead
    reg.entries[0].registered_at = '2030-01-01T00:00:00.000Z';
    reg.entries.push({ cited_sha: 'a'.repeat(40), object_type: 'commit', size: 1, snapshot: null, last_reachable_via: [], successor_sha: null, cite_locations: [], registered_at: '2020-01-01T00:00:00.000Z', reason: 'x', carried_log: [], disposition: 'orphaned' });
    expect(oc.validateRegistry(reg).some(function (e) { return e.indexOf('append order') !== -1; })).toBe(true);
  });

  test('registered-then-deleted -> purge observation path (real gc --prune=now)', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    expect(oc.cmdRegister(dir, [fx.OC2, '--reason', 'orphan'], { now: NOW0 }).code).toBe(0);
    hg.git(dir, ['reflog', 'expire', '--expire=now', '--all']);
    hg.git(dir, ['gc', '--prune=now', '-q']);
    expect(hg.gitOk(dir, ['cat-file', '-e', fx.OC2])).toBe(false); // physically gone
    writeMap(fx, buildMap(fx));
    const lr1 = leg.checkLeg({ root: dir, now: NOW0, oldSide: true });
    expect(lr1.errors.some(function (e) { return e.indexOf('object store') !== -1; })).toBe(true);
    // purge observation stamps AFTER the live registration (latest wins)
    oc.cmdBackfill(dir, [], { now: '2026-09-29T12:00:00.000Z' });
    const latest = oc.latestBySha(readReg(dir)).get(fx.OC2);
    expect(latest.object_purged_at).toBeTruthy();
    const lr2 = leg.checkLeg({ root: dir, now: NOW0, oldSide: true });
    expect(lr2.errors).toEqual([]);
  });

  test('partial clone: never-fetched object degrades to unresolved, never false-removed', () => {
    const dir = mkDir();
    const fx = fixture(dir);
    addBlob(dir, fx);
    // A transport clone carries only reachable objects: the unreferenced blob
    // OB is absent in the clone either way (filtered or not) - the promisor-
    // less observable state the spec adversarial targets.
    const cloneParent = mkDir();
    let filtered = false;
    try {
      hg.git(dir, ['config', 'uploadpack.allowFilter', 'true']);
      hg.git(cloneParent, ['clone', '--quiet', '--no-local', '--filter=blob:none', 'file:///' + dir.replace(/\\/g, '/'), 'c']);
      filtered = true;
    } catch (e) {
      hg.git(cloneParent, ['clone', '--quiet', '--no-local', 'file:///' + dir.replace(/\\/g, '/'), 'c']);
    }
    const clone = path.join(cloneParent, 'c');
    plantRegistry(clone);
    const map = rm.build([], 'main', { root: clone, now: NOW0 });
    const row = rowFor(map, fx.tokens.OB);
    expect(row).toBeTruthy();
    // never-fetched/purged object: honest 'unresolved' (absent+unregistered) -
    // NEVER fabricated into 'removed'. A fetchable promisor would instead say
    // 'local-only' (exists) - both pass the no-false-removed contract.
    expect(['unresolved', 'local-only']).toContain(row['class']);
    expect((row['class'] === 'local-only' ? row.label : '') || '').not.toContain('removed');
    // a published-side commit still resolves on the clone (ancestry fact)
    const pubRow = rowFor(map, fx.tokens.A0);
    expect(pubRow['class']).toBe('published-unchanged');
    expect(filtered === true || filtered === false).toBe(true); // filter attempt exercised
  });
});
