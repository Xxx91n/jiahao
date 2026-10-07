'use strict';
// test/adr-0093-wiring.test.js - grill-t36 documentation-wave wiring seed.
// Scope is deliberately THIS LANE'S OWN PRODUCTS ONLY: the five CONTEXT.md
// glossary entries landed by the t36 docs wave. It pins no assertion about
// docs/adr/0093* content - that carrier's own suite (f-2 declaration-label
// counting) lives in test/post-land-sentinel.test.js and is owned by the T-1
// lane. Rationale: a wiring seed that asserted another lane's unlanded
// artifact would be red for a reason outside its own subject, and coupling
// the two would make either lane's landing order load-bearing.
// House pattern for term-block extraction: split on '**' and take the run
// between the term head and the next bold marker (cf. adr-0083's CONTEXT
// umbrella-term assertion).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CTX = path.join(ROOT, 'CONTEXT.md');
const ctx = () => fs.readFileSync(CTX, 'utf8');

// The five t36 terms, each with the ledger decision it derives from.
const TERMS = [
  { head: '**Tracked-Text Enumeration (受跟踪文本枚举面)**', ledger: 'D-004' },
  { head: '**Instrument Non-Intrusion (仪器无侵入)**', ledger: 'D-006' },
  { head: '**Claim-Surface Role Registry (claim 面角色注册表)**', ledger: 'D-005' },
  { head: '**Generation-Surface Equivalence (生成面等价)**', ledger: 'D-003' },
  { head: '**generated_from (派生源字段)**', ledger: 'D-003' },
];

// The body of a term entry: everything after its head up to the next bold
// marker or heading.
function entryBody(text, head) {
  const i = text.indexOf(head);
  expect(i).toBeGreaterThanOrEqual(0);
  const rest = text.slice(i + head.length);
  const stop = rest.search(/\n\*\*|\n#{1,6} /);
  return (stop === -1 ? rest : rest.slice(0, stop));
}

describe('grill-t36 CONTEXT glossary entries (M1-M4 vocabulary)', () => {
  test.each(TERMS)('$head exists exactly once, is attributed to grill-t36 + its ledger decision, and carries a definition and an _Avoid_ line', (t) => {
    const c = ctx();
    const occurrences = c.split(t.head).length - 1;
    expect(occurrences).toBe(1);
    const body = entryBody(c, t.head);
    // Attribution: the round and the originating ledger decision, so a later
    // reader can walk back from the word to the decision that minted it.
    expect(body).toContain('(grill-t36, ledger ' + t.ledger + ')');
    // A definition, not just a heading.
    expect(body.replace(/_Avoid_[\s\S]*/, '').trim().length).toBeGreaterThan(120);
    // The house domain-modeling convention: every entry names its
    // near-neighbours so the vocabulary stays disambiguated.
    expect(body).toContain('_Avoid_');
  });

  test('no t36 term name collides with an existing glossary entry', () => {
    const c = ctx();
    for (const t of TERMS) {
      const heads = c.match(/^\*\*[^*]+\*\*/gm) || [];
      const same = heads.filter((h) => h === t.head);
      expect(same).toHaveLength(1);
    }
  });

  test('the two generation-side entries cross-name each other', () => {
    // generated_from is the field Generation-Surface Equivalence obliges a
    // derived artifact to carry; the pairing is the point of D-003, so a
    // future edit that drops one side silently would break the vocabulary.
    const c = ctx();
    expect(entryBody(c, '**Generation-Surface Equivalence (生成面等价)**'))
      .toContain('`generated_from`');
    expect(entryBody(c, '**generated_from (派生源字段)**')).toContain('declared facts');
  });

  test('the role registry is excluded from generated_from stamping', () => {
    // D-005: the registry is a declared-facts surface. D-003: generated_from
    // is the presence signal of derivation, so a discretionary judgment must
    // not carry it. This pins the boundary from both sides.
    const c = ctx();
    const registry = entryBody(c, '**Claim-Surface Role Registry (claim 面角色注册表)**');
    expect(registry).toContain('stamping `generated_from` on it');
    expect(entryBody(c, '**generated_from (派生源字段)**')).toContain('must not carry it');
  });

  test('the M1/M4 closability boundary is stated without borrowing phrasing', () => {
    // D-004 pins "repaired, never closed" for the byte-corruption class; D-003
    // pins that M4 really closes. The prohibition on cross-wearing the two is
    // the exact reason this entry exists, so it is worth pinning.
    const gen = entryBody(ctx(), '**Generation-Surface Equivalence (生成面等价)**');
    expect(gen).toContain("borrowing M1's \"repaired, never");
    expect(gen).toContain('the two closabilities differ in kind');
  });
});