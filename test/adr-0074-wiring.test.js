'use strict';
// test/adr-0074-wiring.test.js -- ADR-0074 (grill-t13 ledger D-001..D-005):
// doc-round wiring seeds for the post-publish checkpoint round. Locks the
// PRE-ACTION surface: the publish event record (bounded-break scope, empty
// commits, published-side-only commits), the disclosure carriers and the
// verbatim pointer note, the rewrite-map single translation point with its
// three-class citation taxonomy and completeness invariant, the tip-pinned
// install claim invalidation + verified-at note form, the pre-registered
// published-tip re-verification plan (assertions, evidence fields, downgrade
// trigger), the independence-grade audit convention, and the round's
// registration surface (defer-0057, t13 ledger anchor, trend row). The doc
// commit is the stage gate: no map generation or re-verification precedes it.
// Const/style follows test/adr-0073-wiring.test.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0074-sanitized-history-publish-rewrite-map-reverification-preregistration-independence-grade.md');
const RUNBOOK = path.join(ROOT, 'docs', 'governance', 'sanitized-history-runbook-2026-09-17.md');
const SPEC = path.join(ROOT, 'docs', 'rewrite-map-generator-spec.md');
const README = path.join(ROOT, 'README.md');

const POINTER_NOTE = '> Pointer note (ADR-0074, 2026-09-17): this record predates the sanitized-history publish; pre-rewrite SHA citations below name local-only objects - resolve them through docs/rewrite-map.json.';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('ADR-0074 doc surface (grill-t13 doc round)', () => {
  const adr = () => read(ADR);

  test('ADR-0074 exists with title, status, date and ledger anchor', () => {
    const a = adr();
    expect(a).toContain('# ADR-0074: Sanitized-History Publish Record');
    expect(a).toContain('Status: Accepted');
    expect(a).toContain('Date: 2026-09-17');
    expect(a).toContain('D-001..D-005');
    expect(a).toContain('decision-ledger-t13');
  });

  test('all seven decision clauses land', () => {
    const a = adr();
    expect(a).toContain('### D-A - The publish event is recorded as a bounded sanitization break');
    expect(a).toContain('### D-B - Disclosure carriers and the pointer-note convention');
    expect(a).toContain('### D-C - docs/rewrite-map.json is the single translation point');
    expect(a).toContain('### D-D - The tip-pinned install claim auto-invalidated at publish');
    expect(a).toContain('### D-E - Published-tip re-verification plan, pre-registered');
    expect(a).toContain('### D-F - Governance rules: second-party triggers and the independence-grade declaration');
    expect(a).toContain('### D-G - Round surface and registrations');
  });

  test('the publish record names the bounded scope precisely (region, base, empty commits, published-only)', () => {
    const a = norm(adr());
    for (const s of ['051744a7a1b4027a42720814c819bf051e0831a8', '05fa697..2c93a30', '2e9cdc9..3454d13', '1ca81f5', 'b73e558', 'e54c267', 'a6729a9', 'kxo/wko', '295 commits']) {
      expect(a).toContain(s);
    }
  });

  test('the rewrite map is registered: single translation point, three classes, completeness invariant, append-only', () => {
    const a = norm(adr());
    for (const s of ['single translation point', 'append-only', 'rewritten', 'local-only', 'published-unchanged', 'every cited SHA must receive a class', 'Hand-built mappings are forbidden']) {
      expect(a).toContain(s);
    }
    expect(a).toContain('refs/replace');
  });

  test('the tip-pinned claim rule and the verified-at note form are registered verbatim', () => {
    const a = norm(adr());
    expect(a).toContain('verified-at-published-tip:<full-sha> + tool + date + evidence-class');
    expect(a).toContain('suspends the claim until re-verified');
    expect(a).toContain('never a rolling refresh');
  });

  test('the re-verification plan is pre-registered: assertions, evidence fields, npm pin, whitelist, downgrade', () => {
    const a = norm(adr());
    for (const s of ['A1 install', 'A2 liveness smoke', 'A3 whitelist diff', 'A4 commit-sequence alignment', 'A5 no-collateral check',
      'npx -y github:Xxx91n/jiahao init --profile verifier -y', 'git rev-parse HEAD', 'git diff 2c93a30..051744a',
      'installed-artifact content fingerprint', 'Downgrade trigger', 'claim is suspended', 'clean environment']) {
      expect(a).toContain(s);
    }
  });

  test('the governance rules land: triggers, independence-grade declaration, push split', () => {
    const a = norm(adr());
    for (const s of ['Independent-verification triggers', 'weak-independent', 'independence grade', 'owner-only explicit order', 'a disclosure that sits local is a disclosure that has not happened']) {
      expect(a).toContain(s);
    }
  });
});

describe('companion docs (runbook + generator spec)', () => {
  test('the runbook records facts and re-runnable evidence without restating redacted content', () => {
    const r = read(RUNBOOK);
    for (const s of ['# Sanitized-History Runbook', 'owner-ordered', '051744a7a1b4027a42720814c819bf051e0831a8',
      'git log --name-status origin/main -- .scratch/grill-t11/host-config-backup/ jiahao-0.0.1.tgz',
      'git diff 2c93a30 3454d13', 'git diff 2c93a30..051744a --stat', '05fa697', '2e9cdc9', '112686a', '3692a86',
      'local-only', 'never restate']) {
      expect(r).toContain(s);
    }
    // the redacted literal is never restated: no raw host:port literal
    expect(r).not.toMatch(/127\.0\.0\.1/);
  });

  test('the generator spec pins schema, three classes, completeness, and the append-only/no-replace guards', () => {
    const s = read(SPEC);
    for (const x of ['scripts/build-rewrite-map.js', 'docs/rewrite-map.json', 'schema_version', 'rewritten', 'local-only', 'published-unchanged',
      'Completeness invariant', 'refs/replace', 'Zero runtime dependencies', '--check', '--verify', 'published_only']) {
      expect(s).toContain(x);
    }
  });

  test('spec-code bidirectional pin: the spec registers the union enumeration and the generator carries both call sites (grill-t15 D-004)', () => {
    const s = read(SPEC);
    const inputs = s.slice(s.indexOf('## Inputs'), s.indexOf('## Alignment'));
    const bullet = inputs.slice(inputs.indexOf('Doc citations'));
    expect(bullet).toContain('git ls-files');
    expect(bullet).toContain('ls-tree -r HEAD');
    expect(bullet.toLowerCase()).toContain('untracked');
    const gen = read(path.join(ROOT, 'scripts', 'build-rewrite-map.js'));
    expect(gen).toContain('ls-files');
    expect(gen).toContain('ls-tree');
  });
});

describe('README + governance-surface sync', () => {
  test('the Distribution boundary disclosure line lands', () => {
    const r = read(README);
    expect(r).toContain('**History note (ADR-0074).**');
    expect(r).toContain('sanitized-history rewrite');
    expect(r).toContain('docs/rewrite-map.json');
  });

  test('the Install verified-at note is filled (R2 re-verification passed)', () => {
    const r = read(README);
    expect(r).toContain('**Install-channel verification (ADR-0074 D-D).**');
    expect(r).toContain('verified-at-published-tip:051744a7a1b4027a42720814c819bf051e0831a8');
    expect(r).not.toContain('suspended pending re-verification');
  });

  test('the README ADR index carries ADR-0074 (rebuilt, 74 records)', () => {
    const r = read(README);
    expect(r).toContain('81 architecture decision records');
    expect(r).toContain('0074-sanitized-history-publish-rewrite-map-reverification-preregistration-independence-grade.md');
  });

  test('the registered pointer note sits on ADR-0073 and heads the t12 governance copy', () => {
    const a73 = read(path.join(ROOT, 'docs', 'adr', '0073-provenance-tiered-corpus-g1-organic-amendment-audit-carryover-bake-stewardship.md'));
    expect(a73).toContain(POINTER_NOTE);
    const t12 = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t12.md'));
    expect(t12.startsWith(POINTER_NOTE)).toBe(true);
  });

  test('anchors.json lists decision-ledger-t13.md under ADR-0074, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t13.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0074');
    expect(e.origin).toBe('.scratch/grill-t13/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t13.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t13', 'decision-ledger.md')));
  });

  test('the trend inventory and registry carry this round', () => {
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t13-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0074']);
    expect(r.net_additions).toBe(1);
    expect(r.deferred_entry).toBe('defer-0057');
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const d = reg.entries.find(function (x) { return x.id === 'defer-0057'; });
    expect(d).toBeDefined();
    expect(d.source_adr).toContain('0074-sanitized-history-publish');
    expect(d.status).toBe('pending-evaluation');
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

describe('R2 action round (2026-09-17): map, re-verification note, dispositions', () => {
  test('docs/rewrite-map.json is the generated, classified translation point', () => {
    const m = readJson(path.join(ROOT, 'docs', 'rewrite-map.json'));
    expect(m.schema_version).toBe(1);
    expect(m.generated_by).toBe('scripts/build-rewrite-map.js');
    expect(m.published_tip).toBe('dc6d21b95b7edc18d895ebbe41f649726ead3659'); // grill-t21: tip advanced to the t20 post-repair fixpoint base (stale pin re-pinned, disclosed)
    expect(m.commits.length).toBe(15);
    expect(m.counts.doc_refs).toBe(m.doc_refs.length);
    expect(m.doc_refs.length).toBeGreaterThan(0);
  });

  test('README carries the filled verified-at-published-tip note (re-verification passed)', () => {
    const r = read(README);
    expect(r).toContain('verified-at-published-tip:051744a7a1b4027a42720814c819bf051e0831a8');
    expect(r).toContain('clean-env-reverify');
    expect(r).not.toContain('suspended pending re-verification');
  });

  test('reverify evidence artifact exists with all five assertions PASS', () => {
    const ev = readJson(path.join(ROOT, '.scratch', 'grill-t13', 'audit-evidence', 'reverify-2026-09-17.json'));
    expect(ev.resolved_sha).toBe('051744a7a1b4027a42720814c819bf051e0831a8');
    expect(ev.clone_rev_parse).toBe(ev.resolved_sha);
    for (const k of Object.keys(ev.assertions)) expect(ev.assertions[k]).toMatch(/^PASS/);
    expect(ev.verdict).toContain('PASS');
  });

  test('registry terminal dispositions landed (closed/actioned rows keep resolving)', () => {
    const reg = readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));
    const by = id => reg.entries.find(e => e.id === id);
    for (const id of ['defer-0050', 'defer-0052', 'defer-0056']) {
      expect(by(id).status).toBe('closed');
      expect(by(id).closed_via).toContain('T-2 dispositions');
    }
    // T-3 F-4: defer-0051 closure reverted - its own unfreeze condition was
    // never satisfied. grill-t14 R2 executed the live legs (pinned-protocol
    // re-measure + weak-independent countersign) and closed it by trigger.
    expect(by('defer-0051').status).toBe('closed');
    expect(by('defer-0051').closed_via).toContain('discharged-by-trigger');
    expect(by('defer-0054').status).toBe('actioned');
    expect(by('defer-0054').actioned_via).toContain('check-secret-scan');
    expect(by('defer-0054').unfreeze_if).toBeDefined(); // unfreeze retained per task book
    expect(by('defer-0053').unfreeze_frozen).toBe(true);
    expect(by('defer-0055').closes_if.check).toContain('six consecutive months');
    expect(by('defer-0058').status).toBe('pending-evaluation');
  });

  test('secret-scan and rewrite-map gates are registered', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    expect(g.entries.some(e => e.name === 'secret-scan')).toBe(true);
    expect(g.entries.some(e => e.name === 'rewrite-map')).toBe(true);
  });
});
