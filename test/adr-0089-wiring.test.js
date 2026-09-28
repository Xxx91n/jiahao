'use strict';
// test/adr-0089-wiring.test.js - grill-t32 / ADR-0089 wiring seeds: the
// declared-facts classifier contract's registration surface. Pins the ADR's
// carrier content, ADR-0074's scoped succession note, the orphan-cites
// registry's fenced registration, the gate-leg entry, the shared git facade,
// and the committed map's schema/class-enum migration state.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0089-rewrite-map-classifier-declared-facts-contract.md');
const ADR74 = path.join(ROOT, 'docs', 'adr', '0074-sanitized-history-publish-rewrite-map-reverification-preregistration-independence-grade.md');
const REG = path.join(ROOT, 'docs', 'governance', 'orphan-cites.json');
const TAX = path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json');
const GATES = path.join(ROOT, 'docs', 'gates.json');
const README = path.join(ROOT, 'README.md');
const MAP = path.join(ROOT, 'docs', 'rewrite-map.json');
const GEN = path.join(ROOT, 'scripts', 'build-rewrite-map.js');
const FACADE = path.join(ROOT, 'scripts', 'git-facade.js');
const ORPHAN = path.join(ROOT, 'scripts', 'orphan-cites.js');
const LEG = path.join(ROOT, 'scripts', 'check-orphan-registration.js');

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('ADR-0089 carrier (grill-t32 doc round)', () => {
  test('exists with title, status, and the ledger anchor', () => {
    const a = read(ADR);
    expect(a).toContain('ADR-0089:');
    expect(a).toContain('Status: Proposed'); // countersign-queue ADR: never Accepted pre-adjudication
    expect(a).toContain('grill-t32');
  });

  test('the declared-facts contract lands: four facts, qualifier demotion, terminal classes', () => {
    const a = norm(read(ADR));
    for (const s of ['declared facts', 'orphaned-cite', 'unresolved', 'reachable_via', 'latest', 'registered_at', 'append-only']) {
      expect(a).toContain(s);
    }
  });

  test('the escalation ladder and the atomic cutover are registered', () => {
    const a = norm(read(ADR));
    expect(a).toContain('orphan window open');
    expect(a).toContain('register while');
    expect(a).toContain('unresolved');
    for (const s of ['backfill', 'migrate', 'one commit']) {
      expect(a.toLowerCase()).toContain(s.toLowerCase());
    }
  });

  test('ADR-0074 carries the scoped succession note (classification surface only)', () => {
    const a = norm(read(ADR74));
    expect(a).toContain('ADR-0089');
    expect(a).toContain('supersedes ONLY this record');
    expect(a).toContain('classification input surface');
    expect(a).toContain('orphaned-cite');
    expect(a).toContain('unresolved');
  });
});

describe('registry + wiring surface', () => {
  test('docs/governance/orphan-cites.json exists, schema_version 1, fenced-registered in the taxonomy', () => {
    const reg = readJson(REG);
    expect(reg.schema_version).toBe(1);
    expect(Array.isArray(reg.entries)).toBe(true);
    const tax = read(TAX);
    expect(tax).toContain('docs/governance/orphan-cites.json');
  });

  test('gates.json registers the orphan-registration leg (order 225, confirmatory, repo-tree)', () => {
    const g = readJson(GATES);
    const e = g.entries.find((x) => x.name === 'orphan-registration');
    expect(e).toBeTruthy();
    expect(e.command).toBe('node scripts/check-orphan-registration.js');
    expect(e.tier).toBe('confirmatory');
    expect(e.order).toBe(225);
    expect(e.requires).toEqual(['repo-tree']);
    expect(e.source_adr).toBe('docs/adr/0089-rewrite-map-classifier-declared-facts-contract.md');
  });

  test('the machinery files exist and export the contract surface', () => {
    for (const p of [FACADE, ORPHAN, LEG]) expect(fs.existsSync(p)).toBe(true);
    const facade = read(FACADE);
    expect(facade).toContain('GIT_NO_REPLACE_OBJECTS');
    const oc = require('../scripts/orphan-cites');
    expect(oc.ORPHAN_AGE_DAYS).toBe(14);
    expect(oc.ORPHAN_REGISTER_GRACE_DAYS).toBe(7);
    expect(oc.DISPOSITIONS).toEqual(['orphaned', 'revived']);
    const gen = read(GEN);
    for (const frag of ['orphaned-cite', 'unresolved', 'qualifiers', 'reachable_via', 'stableCopy', 'consistencyErrors']) {
      expect(gen).toContain(frag);
    }
  });

  test('committed map migrated to schema_version 2 with the five-class enum', () => {
    const m = readJson(MAP);
    expect(m.schema_version).toBe(2);
    for (const k of ['rewritten', 'local-only', 'published-unchanged', 'orphaned-cite', 'unresolved']) {
      expect(Object.keys(m.counts.doc_refs_by_class)).toContain(k);
    }
    // every row carries the qualifier object (volatile fields exempt from --check)
    for (const d of m.doc_refs) {
      expect(d.qualifiers).toBeTruthy();
      expect(d.qualifiers).toHaveProperty('reachable_via');
      expect(d.qualifiers).toHaveProperty('object_mtime');
      expect(d.qualifiers).toHaveProperty('exists_at');
    }
    // post-cutover invariant: zero unresolved rows remain
    expect(m.counts.doc_refs_by_class.unresolved).toBe(0);
  });

  test('README ADR index lists 0089', () => {
    expect(read(README)).toContain('0089-rewrite-map-classifier-declared-facts-contract');
  });
});
