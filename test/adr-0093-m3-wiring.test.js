'use strict';
// test/adr-0093-m3-wiring.test.js - grill-t36 T-7 (ADR-0093 D-5, ledger D-005):
// the claim-surface role registry - its schema, its closed enum, the three-class
// field governance, the examiner exception channel, and the FAIL-CLOSED
// direction that is the whole reason the registry exists.
//
// Fixtures are synthetic registries so every negative is a real measurement of
// the validator rather than a claim about it; the integration tests then run the
// committed registry against the real tracked claim surface.
const fs = require('fs');
const path = require('path');
const lib = require('../scripts/shared/claim-surface-roles');

const ROOT = path.join(__dirname, '..');
const P = '.scratch/grill-t36/reports/2026-10-02-report.md';

function fixture(overrides) {
  const base = {
    schema_version: 1,
    _doc: 'fixture',
    source_adr: 'docs/adr/0093-observer-equivalence-contract.md',
    roles_enum: ['examiner', 'implementer', 'mechanical'],
    field_governance: { classification: {
      'entries[].path': 'fenced',
      'entries[].role': 'fenced',
      'entries[].status': 'fenced',
      'entries[].declared_by': 'fenced',
      'entries[].examiner_channel': 'exception-channel',
      '_doc': 'editorial',
      'source_adr': 'editorial',
      'schema_version': 'editorial',
    } },
    entries: [{ path: P, role: 'implementer', declared_by: 'fixture', declared_at: '2026-10-02', status: 'active' }],
  };
  return Object.assign(base, overrides || {});
}

const committed = () => JSON.parse(fs.readFileSync(path.join(ROOT, lib.REGISTRY_REL.split('/').join(path.sep)), 'utf8'));

describe('claim-surface role registry (ADR-0093 D-5): the schema and the closed enum', () => {
  test('the committed registry validates clean against the real tracked claim surface', () => {
    const tracked = lib.claimSurfacePaths(ROOT);
    expect(tracked.length).toBeGreaterThan(0);
    expect(lib.validateRegistry(committed(), { trackedClaimPaths: tracked })).toEqual([]);
  });

  test('the fail-closed direction is green on the committed tree: every tracked claim artifact has a row', () => {
    expect(lib.unregisteredPaths(committed(), lib.claimSurfacePaths(ROOT))).toEqual([]);
  });

  test('the closed enum is three names, declared identically in code and in the registry', () => {
    expect(lib.ROLES).toEqual(['examiner', 'implementer', 'mechanical']);
    expect(committed().roles_enum).toEqual(lib.ROLES);
  });

  test('a role outside the closed enum is an error, and so is a widened roles_enum', () => {
    const badRole = fixture();
    badRole.entries[0].role = 'owner';
    expect(lib.validateRegistry(badRole).join('\n')).toMatch(/outside the closed enum/);
    const widened = fixture({ roles_enum: ['examiner', 'implementer', 'mechanical', 'owner'] });
    expect(lib.validateRegistry(widened).join('\n')).toMatch(/does not equal the closed enum/);
  });

  test('generated_from is forbidden anywhere in the registry (declared facts, not a derived surface)', () => {
    const stamped = fixture({ generated_from: { tree_ish: 'HEAD' } });
    expect(lib.validateRegistry(stamped).join('\n')).toMatch(/declared-facts surface/);
    const nested = fixture();
    nested.entries[0].generated_from = 'scripts/build-x.js';
    expect(lib.validateRegistry(nested).join('\n')).toMatch(/generated_from is forbidden/);
    expect(lib.findKey(committed(), 'generated_from', '', [])).toEqual([]);
  });

  test('the three-class field governance is asserted, not assumed', () => {
    const noGov = fixture();
    delete noGov.field_governance;
    expect(lib.validateRegistry(noGov).join('\n')).toMatch(/three-class split/);
    const eroded = fixture();
    eroded.field_governance.classification['entries[].role'] = 'editorial';
    expect(lib.validateRegistry(eroded).join('\n')).toMatch(/the governance split is declared, not conventional/);
  });

  test('malformed structure fails closed: missing header, wrong schema_version, empty entries', () => {
    expect(lib.validateRegistry(null).join('\n')).toMatch(/not an object/);
    expect(lib.validateRegistry(fixture({ schema_version: 2 })).join('\n')).toMatch(/schema_version/);
    expect(lib.validateRegistry(fixture({ entries: [] })).join('\n')).toMatch(/missing or empty/);
    const noSource = fixture();
    delete noSource.source_adr;
    expect(lib.validateRegistry(noSource).join('\n')).toMatch(/source_adr/);
  });

  test('rows stay reviewable: literal paths, no duplicates, sorted', () => {
    const wildcard = fixture();
    wildcard.entries[0].path = '.scratch/grill-t36/reports/*.md';
    expect(lib.validateRegistry(wildcard).join('\n')).toMatch(/literal repo-relative claim-surface path/);
    const dup = fixture();
    dup.entries.push(Object.assign({}, dup.entries[0]));
    expect(lib.validateRegistry(dup).join('\n')).toMatch(/duplicate row/);
    const unsorted = fixture();
    unsorted.entries = [
      { path: '.scratch/grill-t36/reports/b.md', role: 'implementer', declared_by: 'f', declared_at: '2026-10-02', status: 'active' },
      { path: '.scratch/grill-t36/reports/a.md', role: 'implementer', declared_by: 'f', declared_at: '2026-10-02', status: 'active' },
    ];
    expect(lib.validateRegistry(unsorted).join('\n')).toMatch(/not sorted/);
  });
});

describe('claim-surface role registry: fail-closed, and the forgery shape it exists for', () => {
  const FORGED = '.scratch/grill-t36/handoffs/2026-10-02-audit-report.md';

  test('an unregistered claim artifact is RED - the reverse assertion', () => {
    // The registry knows nothing about FORGED; the enumeration does. That is the
    // direction: asserting the registry cannot catch a self-labelled file, only
    // enumerating the surface can.
    const errors = lib.validateRegistry(fixture(), { trackedClaimPaths: [P, FORGED] });
    expect(errors.join('\n')).toContain(FORGED + ': tracked claim-surface artifact with NO registry row');
    expect(errors.join('\n')).toMatch(/fail-closed/);
  });

  test('the forged file is invisible to a checker that reads only examiner rows - which is why the direction is fail-closed', () => {
    const reg = fixture();
    expect(lib.roleOf(reg, FORGED)).toBeNull();
    expect(lib.registeredPaths(reg)).not.toContain(FORGED);
    // It is a red in the registry leg, not a silent pass.
    expect(lib.unregisteredPaths(reg, [P, FORGED])).toEqual([FORGED]);
  });

  test('a registered path must exist in the tree; an archived row may outlive its path (honest history)', () => {
    const ghost = fixture();
    ghost.entries[0].path = P;
    const errors = lib.validateRegistry(ghost, { trackedClaimPaths: ['.scratch/grill-t36/reports/other.md'] });
    expect(errors.join('\n')).toMatch(/is not a tracked claim-surface artifact in the tree/);
    const archived = ghost;
    archived.entries[0].status = 'archived';
    expect(lib.validateRegistry(archived, { trackedClaimPaths: [] })).toEqual([]);
    // ...and an archived row is not live claim surface for a consumer to select.
    expect(lib.registeredPaths(archived)).toEqual([]);
  });
});

describe('claim-surface role registry: the examiner exception channel', () => {
  function examinerRow(overrides) {
    return Object.assign({
      path: P,
      role: 'examiner',
      declared_by: 'grill-t36 T-7 (implementer agent)',
      declared_at: '2026-10-02',
      status: 'pending-confirmation',
      requested_by: 'grill-t36 T-7 (implementer agent)',
      reason: 'second-party audit artifact, owner ratification required',
      expires_at: '2026-12-15',
      scope: P,
    }, overrides || {});
  }

  test('a pending examiner request carries the ADR-0086 channel fields', () => {
    expect(lib.validateRegistry(fixture({ entries: [examinerRow()] }))).toEqual([]);
    const noExpiry = examinerRow();
    delete noExpiry.expires_at;
    expect(lib.validateRegistry(fixture({ entries: [noExpiry] })).join('\n')).toMatch(/expires_at: required/);
    // ADR-0086's channel is literal-scope only: a wildcard scope is how an
    // exception quietly turns into an exemption.
    const wildcard = examinerRow({ scope: '.scratch/grill-*/reports/*' });
    expect(lib.validateRegistry(fixture({ entries: [wildcard] })).join('\n')).toMatch(/literal-scope only/);
  });

  test('a ratified examiner row names a ratifier, and the declarer may not ratify itself', () => {
    const noRatifier = examinerRow({ status: 'ratified' });
    delete noRatifier.ratified_by;
    expect(lib.validateRegistry(fixture({ entries: [noRatifier] })).join('\n')).toMatch(/ratified_by: required/);
    const selfCertified = examinerRow({ status: 'ratified', ratified_by: 'grill-t36 T-7 (implementer agent)' });
    expect(lib.validateRegistry(fixture({ entries: [selfCertified] })).join('\n')).toMatch(/self-certification/);
    const ratified = examinerRow({ status: 'ratified', ratified_by: 'owner' });
    expect(lib.validateRegistry(fixture({ entries: [ratified] }))).toEqual([]);
  });

  test('the channel fields belong to examiner rows only', () => {
    const stray = fixture();
    stray.entries[0].requested_by = 'someone';
    expect(lib.validateRegistry(stray).join('\n')).toMatch(/belong to examiner rows only/);
  });

  test('an examiner row cannot wear an implementer status', () => {
    const bad = examinerRow({ status: 'active' });
    expect(lib.validateRegistry(fixture({ entries: [bad] })).join('\n')).toMatch(/not in the examiner status enum/);
  });

  test('no agent-authored row in the committed registry asserts examiner authority', () => {
    // The class is owner-ratified, so the committing agent's rows cannot populate
    // it. If this ever fails, the fix is an owner ratification, never an agent edit.
    for (const e of committed().entries) {
      if (e.role !== 'examiner') continue;
      expect(e.status === 'ratified' ? e.ratified_by !== e.declared_by : true).toBe(true);
    }
    expect(committed().entries.every((e) => e.role !== 'examiner' || e.ratified_by === undefined || e.ratified_by !== e.declared_by)).toBe(true);
  });
});

describe('the migration: both consumers read the registry, and the filename selectors are retired with it', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // Code lines only: the retired selectors are NAMED in comments (provenance -
  // which registered selector this migration supersedes is the point), so the
  // pins below ask whether they survive as executable selectors.
  const codeOf = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const auditSurface = () => codeOf(read(path.join('scripts', 'check-audit-surface.js')));
  const sentinel = () => codeOf(read(path.join('scripts', 'check-post-land-sentinel.js')));

  test('leg 229 no longer matches the date-audit/report filename selector', () => {
    // Retired in the SAME commit as the registry leg: a coexistence window between
    // the regex and the registry is dual reading (ADR-0083 D-003).
    expect(auditSurface()).not.toMatch(/\\d\{4\}-\\d\{2\}-\\d\{2\}-\(audit\|report\)/);
    expect(read(path.join('scripts', 'check-audit-surface.js'))).toContain('ADR-0091 D-E');
    expect(auditSurface()).toContain("require('./shared/claim-surface-roles')");
    expect(auditSurface()).toContain('roles.registeredPaths(registry)');
  });

  test('the sentinel closeout selector is registry consumption; CLAIM_RE is retained', () => {
    expect(sentinel()).not.toMatch(/CLOSEOUT_RE/);
    expect(sentinel()).toContain('roles.registeredPaths(registry)');
    // CLAIM_RE survives - a range assertion is not a role assertion, and dropping
    // it would widen what the sentinel treats as claim surface.
    expect(sentinel()).toMatch(/CLAIM_RE\.test\(f\)/);
    expect(sentinel()).toContain('const CLAIM_RE = roles.CLAIM_RE;');
    expect(lib.CLAIM_RE.test('.scratch/grill-t36/reports/x.md')).toBe(true);
    expect(lib.CLAIM_RE.test('.scratch/grill-t36/spec-t36-observer.md')).toBe(false);
  });

  test('the registry leg is registered in gates.json (order 232, confirmatory, repo-tree, ADR-0093)', () => {
    const g = JSON.parse(read(path.join('docs', 'gates.json')));
    const entry = g.entries.find((e) => e.name === 'claim-surface-roles');
    expect(entry).toBeTruthy();
    expect(entry.order).toBe(232);
    expect(entry.tier).toBe('confirmatory');
    expect(entry.requires).toEqual(['repo-tree']);
    expect(entry.source_adr).toBe('docs/adr/0093-observer-equivalence-contract.md');
    // The registry leg is registered, and the retired selectors are gone from the
    // consumers in the same tree - not one commit later.
    expect(new Set(g.entries.map((e) => e.order)).size).toBe(g.entries.length);
  });

  test('the registry is not a derived surface: no generated_from, and the shared lib says so', () => {
    const libSrc = read(path.join('scripts', 'shared', 'claim-surface-roles.js'));
    expect(libSrc).toContain('generated_from');
    expect(libSrc).toMatch(/forbidden/i);
    expect(committed().generated_from).toBeUndefined();
    expect(committed().generated_by).toBeUndefined();
  });
});
