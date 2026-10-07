'use strict';
// test/countersign-overdue.test.js - ADR-0090 (grill-t34 D-003(v)(vi)) wiring:
// the three-stage countersign-overdue ladder with an injected clock and
// injected member sets (deterministic; no ambient reads for stage tests).
const { evaluate, stage, TIDE, GRACE_DAYS } = require('../scripts/check-countersign-overdue');

const MEMBERS = ['0086', '0087', '0088', '0089', '0090', '0091'];
const opts = { queue: MEMBERS };

describe('countersign-overdue leg (ADR-0090 D-003)', () => {
  test('registered constants carry their reasons, not bare numbers', () => {
    expect(TIDE).toBe('2026-12-15');
    expect(GRACE_DAYS).toBe(30);
  });

  test('stage ladder: in-term -> grace (+30d inclusive) -> past-grace', () => {
    const rb = Date.parse(TIDE + 'T23:59:59Z');
    expect(stage(new Date('2026-12-01'), rb)).toBe('in-term');
    expect(stage(new Date('2026-12-15'), rb)).toBe('in-term');
    expect(stage(new Date('2026-12-20'), rb)).toBe('grace');
    expect(stage(new Date('2027-01-14'), rb)).toBe('grace');
    expect(stage(new Date('2027-01-15'), rb)).toBe('past-grace');
  });

  test('in-term and grace windows are advisory: exit 0, SUGGEST output, never owner-blaming', () => {
    const a = evaluate(new Date('2026-10-01'), opts);
    expect(a.exit).toBe(0);
    expect(a.lines[0]).toMatch(/^SUGGEST:/);
    expect(a.lines.join('\n')).toMatch(/not yet due/);
    const g = evaluate(new Date('2026-12-20'), opts);
    expect(g.exit).toBe(0);
    expect(g.lines[0]).toMatch(/^SUGGEST:/);
    expect(g.lines.join('\n')).toMatch(/grace window/);
    expect(g.lines.join('\n')).not.toMatch(/owner must/);
  });

  test('past grace FAILS with declared-drift-shaped output naming the three exits and every member', () => {
    const r = evaluate(new Date('2027-02-01'), opts);
    expect(r.exit).toBe(1);
    expect(r.lines[0]).toMatch(/^FAIL:/);
    expect(r.lines.join('\n')).toContain('rebuild');
    expect(r.lines.join('\n')).toContain('re-seal');
    expect(r.lines.join('\n')).toContain('declared-drift');
    for (const m of MEMBERS) expect(r.lines.join('\n')).toContain(m);
    expect(r.lines.join('\n')).toMatch(/silently permanent is not a registered state/);
  });

  test('live derivation: the leg consumes the shared queue surface (member-level, no counts)', () => {
    const q = require('../scripts/countersign-queue');
    const live = [].concat.apply([], Object.values(q.queueMembers()));
    expect(live.length).toBeGreaterThan(0);
    const r = evaluate(new Date('2027-02-01'), { queue: live });
    expect(r.exit).toBe(1);
    expect(r.lines[0]).toContain(live.length + ' unadjudicated');
  });
});
