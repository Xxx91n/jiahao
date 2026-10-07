'use strict';
// test/drift-declarations.test.js - grill-t39 T-8 (ADR-0100 D-C/D-D/D-E, ledger D-002).
//
// Both directions are measured, per the task book's requirement that the leg-224
// input change carry a red-side AND a green-side fixture: a test that only proves
// the registered rows are admitted would pass equally well if the check had been
// weakened to admit anything.
//
// Fixture registries are synthetic so every negative is a real measurement of the
// validator rather than a claim about it; the integration tests then run the
// committed registry against the real published tree.
const fs = require('fs');
const os = require('os');
const path = require('path');
const hg = require('./helpers/git-hermetic');
const dd = require('../scripts/shared/drift-declarations');
const rm = require('../scripts/build-rewrite-map');

const ROOT = path.join(__dirname, '..');
const FILE = '.scratch/grill-t38/handoffs/next-round.md';
const KEYS = [FILE + ':45:68c8ec2f', FILE + ':86:0f58ba60'];

jest.setTimeout(240000);

const committed = () => JSON.parse(fs.readFileSync(path.join(ROOT, dd.REGISTRY_REL.split('/').join(path.sep)), 'utf8'));

function entry(overrides) {
  const base = {
    id: 'drift-0001',
    file: FILE,
    line: 45,
    cited_sha: '68c8ec2f',
    cited_by: '4759d243786753060e98ac47ca12c4c341c0d15b',
    overwritten_by: 'fa654a0549685077028d6b9589b0f39300deb071',
    cite_locations: [{ file: FILE, line: 45, text: 'restored line bytes' }],
    registered_at: '2026-10-07',
    declared_by: 'grill-t39 T-8 fixture',
    reason: 'fixture declaration for a line removed by a named overwrite commit',
  };
  return Object.assign(base, overrides || {});
}

function fixture(entries) {
  return {
    schema_version: 1,
    _doc: 'fixture drift registry - registered line-level drift declarations',
    source_adr: 'docs/adr/0100-mutable-claim-surface-governance-append-only-taskbook-pointer-degradation-and-the-drift-declaration-registry.md',
    entries: entries,
  };
}

describe('drift-declaration registry (ADR-0100 D-C): shape, wording law, dedup', () => {
  test('the committed registry validates clean', () => {
    expect(dd.validateShape(committed())).toEqual([]);
  });

  test('eight entries over two line facts materialize two occurrence keys (D-C dedup rule)', () => {
    const reg = committed();
    expect(reg.entries.length).toBe(8);
    expect(dd.declaredOccurrences(reg).map((o) => o.file + ':' + o.line + ':' + o.sha).sort()).toEqual(KEYS.slice().sort());
  });

  test('the forbidden 豁免/waiver wording is rejected, not merely discouraged', () => {
    const w = dd.validateShape(fixture([entry({ reason: 'this entry is a 豁免 for the vanished line' })]));
    expect(w.join('\n')).toMatch(/forbidden wording/);
    const w2 = dd.validateShape(fixture([entry({ reason: 'a standing waiver channel for stale cites' })]));
    expect(w2.join('\n')).toMatch(/forbidden wording/);
  });

  test('no TTL is legislated: expires_at is rejected and registered_at is required', () => {
    expect(dd.validateShape(fixture([entry({ expires_at: '2026-12-15' })])).join('\n')).toMatch(/expires_at is forbidden/);
    expect(dd.validateShape(fixture([entry({ registered_at: undefined })])).join('\n')).toMatch(/registered_at must be an ISO date/);
  });

  test('evidence, not claim: the overwriting commit and the restored line text are both mandatory', () => {
    expect(dd.validateShape(fixture([entry({ overwritten_by: undefined })])).join('\n')).toMatch(/overwritten_by must be a full sha/);
    expect(dd.validateShape(fixture([entry({ cite_locations: [{ file: FILE, line: 45 }] })])).join('\n')).toMatch(/restored line verbatim/);
  });

  test('append-only surfaces reject a duplicate id and a duplicate declaration of the same fact-by-the-same-claimer', () => {
    expect(dd.validateShape(fixture([entry(), entry()])).join('\n')).toMatch(/duplicate id/);
    expect(dd.validateShape(fixture([entry(), entry({ id: 'drift-0002' })])).join('\n')).toMatch(/duplicate declaration/);
  });

  test('supersession adjudicates by latest registered_at while older entries stay as history', () => {
    const reg = fixture([
      entry({ id: 'drift-0001', registered_at: '2026-10-07' }),
      entry({ id: 'drift-0002', registered_at: '2027-01-01', reason: 'a later declaration of the same line fact' }),
    ]);
    expect(dd.entryFor(reg, FILE, 45, '68c8ec2f').id).toBe('drift-0002');
  });
});

describe('drift-declaration registry: classifier input and the gate-close condition', () => {
  let repo = null;
  function mkFixtureRepo() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-drift-'));
    hg.mkRepo(dir);
    fs.mkdirSync(path.join(dir, 'docs', 'governance'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.scratch'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'README.md'), '# fixture\n');
    hg.git(dir, ['add', '.']);
    hg.git(dir, ['commit', '-q', '-m', 'fixture base']);
    return dir;
  }

  function writeRegistry(dir, reg) {
    fs.writeFileSync(path.join(dir, dd.REGISTRY_REL), JSON.stringify(reg, null, 2) + '\n');
  }

  beforeAll(() => { repo = mkFixtureRepo(); });
  afterAll(() => { if (repo) fs.rmSync(repo, { recursive: true, force: true }); });

  test('a registry that postdates the judged tree is read forward-only WITH a disclosed note, never silently', () => {
    writeRegistry(repo, fixture([entry()]));
    hg.git(repo, ['add', '.']);
    hg.git(repo, ['commit', '-q', '-m', 'register the drift declaration']);
    const treeInternal = dd.loadDeclared({ root: repo, ref: 'HEAD', commitBound: true });
    expect(treeInternal.registry.entries.length).toBe(1);
    expect(treeInternal.source).toBe('HEAD:' + dd.REGISTRY_REL);
    expect(treeInternal.note).toBe(null);
    // Ask for a ref that does not carry the file: the fallback fires and says so.
    const first = hg.git(repo, ['rev-parse', 'HEAD^']);
    const fb = dd.loadDeclared({ root: repo, ref: first, commitBound: true });
    expect(fb.registry.entries.length).toBe(1);
    expect(fb.source).toBe('worktree:' + dd.REGISTRY_REL);
    expect(fb.note).toMatch(/forward-only/);
  });

  test('gate-close: an entry added after the landing commit is a red-level signal (D-D)', () => {
    // With no derivable add-commit the condition fails CLOSED rather than
    // passing silently - an unassertable gate is not a gate.
    const noAnchor = dd.gateCloseErrors(repo, fixture([entry()]), { root: repo, anchor: null });
    expect(noAnchor.length).toBe(1);
    expect(noAnchor[0]).toMatch(/anchor not derivable/);
    // The previous test committed exactly one entry (drift-0001); that commit is
    // the derived add-commit, so the current registry adjudicates clean.
    const anchor = dd.registrationAddCommit(repo);
    expect(anchor).toBeTruthy();
    expect(dd.gateCloseErrors(repo, null, { root: repo, anchor: anchor })).toEqual([]);
    // Append a ninth entry WITHOUT committing it: judging the worktree registry
    // against the add-commit is exactly the discipline breach D-D names.
    const grown = fixture(committed.call(null).entries.slice(0, 1).concat([entry({
      id: 'drift-0009', line: 86, cited_sha: '0f58ba60',
      cited_by: 'a007aacb9e887cd02c907617a45ad95135b0958b',
      reason: 'an entry appended after the gate closed, i.e. an append-only discipline breach',
    })]));
    writeRegistry(repo, grown);
    const errs = dd.gateCloseErrors(repo, null, { root: repo, anchor: anchor });
    expect(errs.length).toBe(1);
    expect(errs[0]).toMatch(/drift-0009/);
    expect(errs[0]).toMatch(/append-only discipline/);
  });

  test('RED SIDE: the overwritten line is genuinely absent from the published tree, so no regeneration alone can produce the row', () => {
    const scanned = rm.scanDocTokensAt(ROOT, 'origin/main');
    const keys = scanned.map((o) => o.file + ':' + o.line + ':' + o.sha);
    for (const k of KEYS) expect(keys).not.toContain(k);
    // and the file carries no citation row at all in the tree - the exact reason
    // the tip-map coverage assertion was unsatisfiable before this ADR.
    expect(scanned.filter((o) => o.file === FILE).length).toBe(0);
  });

  test('GREEN SIDE: the declared fact enters the single shared occurrence read', () => {
    const occ = rm.generationOccurrences(ROOT, 'origin/main', { registryFromWorktree: true });
    const keys = occ.map((o) => o.file + ':' + o.line + ':' + o.sha);
    for (const k of KEYS) expect(keys).toContain(k);
    // The scan rows stay verbatim: the input side EXTENDS the set, it does not
    // narrow duplicate occurrences (measured at landing - deduping the scan
    // dropped 177 rows, a semantic change this clause has no mandate to make).
    const scanned = rm.scanDocTokensAt(ROOT, 'origin/main');
    expect(occ.length).toBe(scanned.length + KEYS.length);
  });

  test('GREEN SIDE: the committed map carries the declared rows and they resolve to registry entries', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));
    const reg = committed();
    for (const k of KEYS) {
      const rows = map.doc_refs.filter((d) => d.file + ':' + d.line + ':' + d.sha === k);
      expect(rows.length).toBe(1);
      expect(rows[0]['class']).toBe('published-unchanged');
      expect(dd.entryFor(reg, rows[0].file, rows[0].line, rows[0].sha)).toBeTruthy();
    }
  });

  test('RED SIDE: a row that is neither in the tree nor a registered declaration is fail-closed', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));
    const treeOnly = rm.scanDocTokensAt(ROOT, 'origin/main');
    const opts = { root: ROOT, occurrences: treeOnly, registryFromWorktree: true, treeFiles: new Set([FILE]) };
    // Green twin: the real map's declared rows resolve, so the drift clause stays
    // silent when the same read adjudicates them.
    expect(rm.verifyPublishedOnly(map, 'origin/main', opts).join('\n')).not.toMatch(/neither in the tree nor a registered line-level drift declaration/);
    // Red twin: one fabricated row at a line the tree does not carry and nothing
    // registers. This is the shape a laundered phantom would take, and it is the
    // proof that extending the input set did not weaken the assertion.
    const poisoned = JSON.parse(JSON.stringify(map));
    poisoned.doc_refs.push({
      file: FILE, line: 999, sha: '68c8ec2f', 'class': 'published-unchanged', resolved_to: null,
      qualifiers: { exists_at: map.generated_at, object_mtime: null, object_type: 'commit', object_size: 470, reachable_via: [] },
    });
    const errs = rm.verifyPublishedOnly(poisoned, 'origin/main', opts);
    expect(errs.join('\n')).toMatch(/neither in the tree nor a registered line-level drift declaration/);
  });

  // DEFAULT-PATH regression pin (grill-t39 audit finding). The clause above was
  // reachable only because the test handed in a raw tree scan: the production
  // read passed the UNION of tree and declared rows, so every declared row looked
  // like a tree row and the declared-row resolution loop never ran. These two
  // assertions call the leg with NO opts.occurrences - the shape `--check`,
  // `--published-only` and gate 224 actually use.
  test('DEFAULT PATH: with no caller-supplied scan the declared rows still resolve', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));
    const errs = rm.verifyPublishedOnly(map, 'origin/main').join('\n');
    expect(errs).not.toMatch(/drift declaration/);
    expect(errs).not.toMatch(/phantom row/);
  });

  test('DEFAULT PATH: an unregistered row is still fail-closed without a supplied scan', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));
    const poisoned = JSON.parse(JSON.stringify(map));
    poisoned.doc_refs.push({
      file: FILE, line: 999, sha: '68c8ec2f', 'class': 'published-unchanged', resolved_to: null,
      qualifiers: { exists_at: map.generated_at, object_mtime: null, object_type: 'commit', object_size: 470, reachable_via: [] },
    });
    const errs = rm.verifyPublishedOnly(poisoned, 'origin/main').join('\n');
    expect(errs).toMatch(/neither in the tree nor a registered line-level drift declaration|no registered line-level drift declaration to resolve them/);
  });
});

describe('ADR-0100 wiring: the append-only task book and the pointer degradation', () => {
  test('the fixed-name task book is the one-line pointer and the frozen body is byte-stable beside it', () => {
    const pointer = fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t39', 'handoffs', 'next-round.md'), 'utf8');
    expect(pointer.split('\n').filter((l) => l.trim()).length).toBe(1);
    expect(pointer).toMatch(/2026-10-07-next-round\.md/);
    const frozen = fs.readFileSync(path.join(ROOT, '.scratch', 'grill-t39', 'handoffs', '2026-10-07-next-round.md'), 'utf8');
    expect(frozen.length).toBeGreaterThan(4000);
    expect(frozen).toMatch(/grill-t39 任务书（next-round）/);
  });

  test('the round-frozen task book is registered as a claim artifact (it is NOT excepted)', () => {
    const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'claim-surface-roles.json'), 'utf8'));
    expect(roles.entries.some((e) => e.path === '.scratch/grill-t39/handoffs/2026-10-07-next-round.md')).toBe(true);
    const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json'), 'utf8'));
    const exc = tax.freshness.claim_surfaces.exceptions.filter((e) => e.path === 'handoffs/next-round.md');
    expect(exc.length).toBe(1);
    expect(exc[0].reason).toMatch(/POINTER/);
    expect(exc[0].scope).toMatch(/only while that file remains the one-line pointer/);
  });

  test('the registry never becomes a scanned citation surface (self-c exemption, ADR-0089 Cutover-notes form)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-rewrite-map.js'), 'utf8');
    expect(src).toMatch(/DRIFT_REGISTRY_INPUT/);
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'rewrite-map.json'), 'utf8'));
    expect(map.doc_refs.some((d) => d.file === dd.REGISTRY_REL)).toBe(false);
  });
});
