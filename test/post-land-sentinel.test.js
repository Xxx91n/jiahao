'use strict';
// test/post-land-sentinel.test.js - ADR-0092 D-S1 (grill-t35 D-004/D-007):
// wiring for the post-land-verify assertion leg. Pure-core driven: the segment
// extractor and the per-segment judge are exercised as functions, including the
// anti-masking property that the whole two-segment design exists to guarantee.

const fs = require('fs');
const path = require('path');
const sentinel = require('../scripts/check-post-land-sentinel');
const hg = require('./helpers/git-hermetic');
const os = require('os');
const { execFileSync } = require('child_process');
const { SENTINEL } = require('../scripts/check-post-land');

function block(pre, post) {
  const seg = (tag, obj) => '<!-- segment: ' + tag + ' -->\n```json\n' + JSON.stringify(obj, null, 2) + '\n```\n';
  return SENTINEL + '\n\n' + (pre ? seg('pre_land', pre) + '\n' : '') + (post ? seg('post_land', post) + '\n' : '');
}

const GREEN_CHECK = [{ name: 'doc-hygiene', status: 'pass', detail: 'clean' }];
const RED_CHECK = [{ name: 'doc-hygiene', status: 'fail', detail: 'control byte 0x8 @1424' }];

function pre(over) {
  return Object.assign({
    object: 'workspace merge tree',
    last_claim_mutation: 'a'.repeat(40),
    ran_at: '2026-10-01T12:00:00.000Z',
    checks: GREEN_CHECK,
  }, over || {});
}
function post(over) {
  return Object.assign({
    object: 'landed public tip',
    tip: 'b'.repeat(40),
    checks: GREEN_CHECK,
  }, over || {});
}

describe('post-land-verify sentinel block (ADR-0092 D-S1)', () => {
  test('both segments extract cleanly from a two-segment block', () => {
    const out = sentinel.extractSegments(block(pre(), post()));
    expect(out.error).toBeUndefined();
    expect(out.pre.last_claim_mutation).toBe('a'.repeat(40));
    expect(out.post.tip).toBe('b'.repeat(40));
  });

  test('a missing block fails closed', () => {
    expect(sentinel.extractSegments('no block here').error).toMatch(/missing/);
  });

  test('a single-segment block FAILS - one segment never substitutes for the other', () => {
    // The whole point of splitting the block: a writer who ran only one half must
    // not be able to satisfy the contract.
    expect(sentinel.extractSegments(block(pre(), null)).error).toMatch(/post_land/);
    expect(sentinel.extractSegments(block(null, post())).error).toMatch(/pre_land/);
  });

  test('a malformed segment (no checks array) fails closed', () => {
    const bad = block(pre(), { tip: 'c'.repeat(40) });
    expect(sentinel.extractSegments(bad).error).toMatch(/checks array/);
  });
});

describe('pre_land / post_land are judged INDEPENDENTLY (anti-masking, ADR-0091 D-D)', () => {
  test('a red pre_land next to a green post_land yields a pre_land error', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    const preErrs = sentinel.judgeSegment('pre_land', pre({ checks: RED_CHECK }), ctx);
    const postErrs = sentinel.judgeSegment('post_land', post(), ctx);
    expect(preErrs.length).toBeGreaterThan(0);
    expect(preErrs.join(' ')).toContain('doc-hygiene');
    // the green segment contributes nothing - and is never consulted to excuse
    expect(postErrs).toEqual([]);
  });

  test('a red post_land next to a green pre_land yields a post_land error', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    const preErrs = sentinel.judgeSegment('pre_land', pre(), ctx);
    const postErrs = sentinel.judgeSegment('post_land', post({ checks: RED_CHECK }), ctx);
    expect(preErrs).toEqual([]);
    expect(postErrs.join(' ')).toContain('doc-hygiene');
  });

  test('both green yields no errors from either segment', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    expect(sentinel.judgeSegment('pre_land', pre(), ctx)).toEqual([]);
    expect(sentinel.judgeSegment('post_land', post(), ctx)).toEqual([]);
  });
});

describe('pre_land timing and anchoring fields', () => {
  test('ran_at predating the last claim mutation FAILS (F-6 window narrowing)', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T13:00:00Z') };
    const errs = sentinel.judgeSegment('pre_land', pre({ ran_at: '2026-10-01T12:00:00.000Z' }), ctx);
    expect(errs.join(' ')).toContain('predates');
  });

  test('ran_at after the last claim mutation passes', () => {
    const ctx = { lastClaimMs: Date.parse('2026-10-01T11:00:00Z') };
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: '2026-10-01T12:00:00.000Z' }), ctx)).toEqual([]);
  });

  test('a missing or unparseable ran_at fails closed (the timestamp is a required field)', () => {
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: undefined }), {}).join(' ')).toContain('ran_at');
    expect(sentinel.judgeSegment('pre_land', pre({ ran_at: 'not-a-date' }), {}).join(' ')).toContain('unparseable');
  });

  test('a missing last_claim_mutation fails closed', () => {
    expect(sentinel.judgeSegment('pre_land', pre({ last_claim_mutation: null }), {}).join(' ')).toContain('last_claim_mutation');
  });

  test('post_land without a tip sha fails closed (the verdict must anchor to an object)', () => {
    expect(sentinel.judgeSegment('post_land', post({ tip: null }), {}).join(' ')).toContain('tip');
    expect(sentinel.judgeSegment('post_land', post({ tip: 'nothex' }), {}).join(' ')).toContain('tip');
  });
});

describe('registration', () => {
  test('the ADR-0092 carrier exists and declares both segments independently', () => {
    const a = fs.readFileSync(path.join(__dirname, '..', 'docs', 'adr',
      '0092-public-object-equivalence-and-post-land-verification-contract.md'), 'utf8');
    expect(a).toContain('Declaration 2 of 3');
    expect(a).toContain('pre_land');
    expect(a).toContain('post_land');
    expect(a).toMatch(/read and judged\s*\n?INDEPENDENTLY/);
  });

  // The class form of the check ADR-0092's own note asks for ("a grep for
  // 'Declaration N of M' must return exactly M hits"). A `toContain('Declaration
  // 2 of 3')` asserts one label exists and says nothing about the count the
  // document claims - which is precisely the claim/sample gap this round spent
  // three waves learning, and precisely how an earlier draft of this ADR ended up
  // describing three numbered declarations while labelling them "of 4".
  //
  // Extended to a per-carrier loop by grill-t36 (ADR-0093 adds its own
  // independent N of M count: six declarations, and ADR-0092's existing "of 3"
  // is NOT renumbered - a carrier that grows its label set does not renumber a
  // sibling carrier's). The property is per-document, so the loop asserts it per
  // document: a maintained list of totals would be the exact rot class this test
  // was written to kill.
  const DECLARATION_CARRIERS = [
    '0092-public-object-equivalence-and-post-land-verification-contract.md',
    '0093-observer-equivalence-contract.md',
  ];

  function readAdr(name) {
    return fs.readFileSync(path.join(__dirname, '..', 'docs', 'adr', name), 'utf8');
  }

  function assertDeclarationLabelsSelfConsistent(name) {
    const a = readAdr(name);
    const labels = [];
    const re = /Declaration (\d+) of (\d+)/g;
    for (let m = re.exec(a); m !== null; m = re.exec(a)) {
      labels.push({ n: Number(m[1]), statedTotal: Number(m[2]) });
    }
    expect(labels.length).toBeGreaterThan(0);
    // One declared total, not a document arguing with itself about how many
    // declarations it carries.
    const totals = new Set(labels.map((l) => l.statedTotal));
    expect(Array.from(totals)).toEqual([labels[0].statedTotal]);
    // The count of labels equals the count the labels state.
    expect(labels.length).toBe(labels[0].statedTotal);
    // And the ordinals are exactly 1..M with no gaps and no duplicates.
    const ordinals = labels.map((l) => l.n).sort((p, q) => p - q);
    expect(ordinals).toEqual(Array.from({ length: labels[0].statedTotal }, (unused, i) => i + 1));
  }

  test.each(DECLARATION_CARRIERS)(
    'declaration labels are internally consistent, counted FROM the labels: %s',
    (name) => { assertDeclarationLabelsSelfConsistent(name); });

  // grill-t36 (D-004 / D-003 / D-005 / D-006): ADR-0093 carries its own
  // declaration count, so it joins DECLARATION_CARRIERS above and receives the
  // same class check - no second copy of the counting logic, no restated total.
  //
  // The Δ2 channel is only real if the count is per-carrier: a carrier growing its
  // own label set must not renumber a sibling carrier's. Asserted as each
  // carrier's self-consistency (above) plus the header cross-references that make
  // the supersession findable - never as a restated pair of totals, which is the
  // maintained-count shape t33 D-002 forbade for the countersign queue.
  test('ADR-0093 adds declarations without renumbering ADR-0092', () => {
    const a92 = readAdr('0092-public-object-equivalence-and-post-land-verification-contract.md');
    const a93 = readAdr('0093-observer-equivalence-contract.md');
    expect(a92).toContain('Declaration 1 of 3');
    expect(a92).toContain('Declaration 3 of 3');
    expect(a93).toContain('Declaration 1 of 6');
    expect(a93).toContain('Declaration 6 of 6');
    // The cross-membership is stated in prose, not merely implied by two
    // documents that happen to use different totals: ADR-0093's header names
    // which prior clause it amends and which selectors it relieves, so a reader
    // landing on 0093 alone can find the superseded selectors.
    expect(a93).toMatch(/Amends:\s*ADR-0092 D-M1/);
    expect(a93).toMatch(/Relieves:.*ADR-0091 D-E.*ADR-0092 D-S1/);
  });

  test('the post-land carrier names the subset and states its non-CI positioning', () => {
    const s = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'check-post-land.js'), 'utf8');
    // Matched with /\s+/ across line breaks: these phrases are wrapped in the
    // source comment, so a plain toContain would pin the wrapping, not the claim.
    const flat = s.replace(/\s+/g, ' ');
    expect(flat).toContain('WAVE-BOUNDED SUBSET');
    expect(flat).toMatch(/Not a gates\.json CI leg/);
    expect(flat).toContain('SUBORDINATES');
    expect(flat).toContain('forensic');
  });
});

describe('doc-hygiene signature set: the mid-line TAB predicate has a positive fixture (round-2 audit)', () => {
  const { docHygiene } = require('../scripts/shared/doc-hygiene');
  test('POSITIVE: the exact R-A byte shape is flagged - TAB then a lowercase letter, mid-line', () => {
    // The real corruption: '$trend-inventory.json' lost its $ and the t became a
    // TAB. This is the SECOND R-A byte, the one the t18 set exempted and the
    // battery let through in the same file that caught the first.
    const corrupt = Buffer.concat([
      Buffer.from('uncommitted docs/governance/anchors.json + '),
      Buffer.from([0x09]),
      Buffer.from('rend-inventory.json).\n'),
    ]);
    expect(docHygiene(corrupt).join(' | ')).toContain('mid-line TAB');
  });

  test('NEGATIVE: a TAB used as code-block indentation stays clean', () => {
    const indented = Buffer.from('- example\n\n```\n\tindented code\n```\n');
    expect(docHygiene(indented)).toEqual([]);
  });

  test('NEGATIVE: a TAB at the start of a line in prose stays clean', () => {
    expect(docHygiene(Buffer.from('\tleading tab\n'))).toEqual([]);
  });

  // Round-3 audit p-3: the hits array mixed two addressing units. The control
  // byte branch iterates the BYTE buffer; the TAB branch iterated the decoded
  // STRING, so its index was a character offset in a list of byte offsets. Any
  // multi-byte character earlier in the file shifts that number silently - the
  // shipped block printed @1589 where the true byte index was 1597. A forensic
  // address an auditor cannot replay is worse than no address, so the unit is
  // now pinned: every '@N' in the hits array is a byte offset.
  test('ADDRESSING UNIT: the TAB offset is a BYTE offset, not a character offset', () => {
    const eAcute = Buffer.from('\u00e9'); // 2 bytes in UTF-8, 1 JS char
    expect(eAcute.length).toBe(2);
    // 8 multi-byte CHARS = 16 bytes. `fill(buf)` repeats the buffer, so allocate
    // the byte length, not the char count - that mistake is the same class of
    // unit confusion this test exists to pin.
    const buf = Buffer.concat([Buffer.alloc(16).fill(eAcute), Buffer.from('\tx')]);
    const trueByteIndex = buf.indexOf(0x09);
    expect(trueByteIndex).toBe(16); // 8 chars x 2 bytes
    const hit = docHygiene(buf).find((h) => h.includes('mid-line TAB'));
    expect(hit).toContain('@' + trueByteIndex);
    // Under the old character-indexed code this read '@8' - the character index.
    // Guard the regression by asserting the two units are distinguishable here.
    expect(hit).not.toMatch(/@8\b/);
    expect(hit).toContain('byte offset');
  });

  test('ADDRESSING UNIT: control-byte and TAB offsets share one unit', () => {
    // 0x08 at byte 1420; then a line-start TAB (exempt) at 1422 and a mid-line
    // TAB. Only the mid-line one may be reported, and it must be byte-addressed.
    const buf = Buffer.concat([
      Buffer.alloc(1420, 0x78),
      Buffer.from([0x08]),
      Buffer.from('\n\tindented\nmid\tline'),
    ]);
    const hits = docHygiene(buf);
    const bs = hits.find((h) => h.includes('0x8'));
    const tab = hits.find((h) => h.includes('mid-line TAB'));
    expect(bs).toContain('@1420');
    // buf.indexOf(0x09, 1421) is the EXEMPT line-start TAB; the reported one is
    // the last TAB in the buffer.
    expect(tab).toContain('@' + buf.lastIndexOf(0x09));
    expect(tab).not.toContain('@1422');
    expect(tab).toContain('byte offset');
  });
});

// Round-2 audit R2-2b: the judgeSegment tests above only exercise ARITHMETIC.
// These call checkSentinels end to end in a hermetic repo, so the PROVENANCE
// rule is under test: the wave boundary is derived from history and the block's
// declaration is CHECKED AGAINST it. A stale block must be red.
describe('checkSentinels provenance (round-2 audit R2-2b)', () => {
  // Fixture repos live in the OS temp dir; this suite creates several per run and
  // must not leave them behind (a leaked repo is a disk leak AND a confusing
  // artifact for the next run).
  const PROBE_DIRS = [];
  const mkProbe = function () {
    const d = require('fs').mkdtempSync(require('path').join(os.tmpdir(), 'pls-'));
    PROBE_DIRS.push(d);
    return d;
  };
  afterAll(function () {
    for (const d of PROBE_DIRS) {
      // git WRITE ops in tests route through the hermetic helper (grill-t29 D-004);
      // 'worktree prune' is a write, so it is not exempt.
      try { hg.git(d, ['worktree', 'prune']); } catch (e) { /* best effort */ }
      try { require('fs').rmSync(d, { recursive: true, force: true }); } catch (e) { /* best effort */ }
    }
  });
  const TAXONOMY = JSON.stringify({
    freshness: {
      claim_surfaces: { closed_enum: ['reports/', 'handoffs/'], scope: 'round dir .scratch/grill-<id>/', exceptions: [] },
      non_anchoring_classes: {
        evidence_dirs: ['evidence/'],
        seal_file: 'SEAL',
        round_bookkeeping: ['GOAL.md', 'decision-ledger.md', 'round-facts.json', 'handoffs/next-round.md'],
        round_bookkeeping_glob: ['spec-*.md'],
        mechanism_regen_outputs: ['docs/rewrite-map.json'],
      },
      rounds: { 'grill-t99': { base: null } },
      orphan_ancestry: {
        artifact_scope: '\\.scratch/grill-[^/]+/',
        pin_patterns: ['^captured-at-head:\\s*([0-9a-f]{7,40})\\s*$'],
        workspace_ref: 'refs/heads/gitbutler/workspace',
        errata_exemptions: [],
      },
    },
  });

  function put(dir, rel, text) {
    const p = require('path').join(dir, rel.split('/').join(require('path').sep));
    require('fs').mkdirSync(require('path').dirname(p), { recursive: true });
    require('fs').writeFileSync(p, text, 'utf8');
  }
  function commitIn(dir, msg) {
    hg.git(dir, ['add', '-A']);
    hg.git(dir, ['commit', '-q', '-m', msg]);
    return hg.git(dir, ['rev-parse', 'HEAD']);
  }
  function blockFor(sha, ranAt, tipSha) {
    return SENTINEL + '\n\n<!-- segment: pre_land -->\n```json\n' + JSON.stringify({
      object: 'workspace merge tree',
      last_claim_mutation: sha,
      ran_at: ranAt,
      checks: GREEN_CHECK,
    }, null, 2) + '\n```\n\n<!-- segment: post_land -->\n```json\n' + JSON.stringify({
      object: 'landed public tip',
      tip: tipSha,
      checks: GREEN_CHECK,
    }, null, 2) + '\n```\n';
  }

  test('a block naming the LATEST claim commit passes (the correct shape)', () => {
    const dir = mkProbe();
    hg.mkRepo(dir);
    put(dir, 'docs/governance/surface-taxonomy.json', TAXONOMY);
    put(dir, 'docs/adr/0000-placeholder.md', 'x\n');
    commitIn(dir, 'seed');
    // the leg registers here (its own file) -> the forward-only anchor
    put(dir, 'scripts/check-post-land-sentinel.js', '// registration marker\n');
    const reg = commitIn(dir, 'leg registers');
    // a claim-surface commit, then the artifact carrying a block that names it
    put(dir, '.scratch/grill-t99/reports/a.md', 'report\n');
    const claim = commitIn(dir, 'claim change');
    put(dir, '.scratch/grill-t99/handoffs/closeout.md',
      blockFor(claim, new Date(Number(hg.git(dir, ['log', '-1', '--format=%ct', claim])) * 1000 + 60000).toISOString(), 'b'.repeat(40)));
    commitIn(dir, 'land block');
    const out = sentinel.checkSentinels(dir);
    const stale = out.errors.filter((e) => /NOT the newest claim-surface commit/.test(e));
    expect(stale).toEqual([]);
  });

  test('a STALE block (naming an earlier claim commit) is RED - the R2-1 shape', () => {
    const dir = mkProbe();
    hg.mkRepo(dir);
    put(dir, 'docs/governance/surface-taxonomy.json', TAXONOMY);
    put(dir, 'docs/adr/0000-placeholder.md', 'x\n');
    commitIn(dir, 'seed');
    put(dir, 'scripts/check-post-land-sentinel.js', '// registration marker\n');
    commitIn(dir, 'leg registers');
    put(dir, '.scratch/grill-t99/handoffs/closeout.md', 'wave report, no block yet\n');
    const older = commitIn(dir, 'first claim change');
    // the block lands in that SAME artifact, naming the claim commit
    put(dir, '.scratch/grill-t99/handoffs/closeout.md',
      'wave report\n\n' + blockFor(older, new Date(Number(hg.git(dir, ['log', '-1', '--format=%ct', older])) * 1000 + 60000).toISOString(), 'b'.repeat(40)));
    commitIn(dir, 'land block');
    // ...then a LATER claim commit lands that does NOT touch the artifact (a
    // non-carrier), and the block is NOT regenerated. This is the R2-1 shape.
    put(dir, '.scratch/grill-t99/reports/later.md', 'later claim change\n');
    commitIn(dir, 'later claim change elsewhere, block NOT regenerated');
    // the block's own artifact is re-landed, making it the newest carrier;
    // its declared boundary (the FIRST claim commit) now predates `later.md`.
    put(dir, '.scratch/grill-t99/handoffs/closeout.md',
      'wave report (touched again)\n\n' + blockFor(older, new Date(Number(hg.git(dir, ['log', '-1', '--format=%ct', older])) * 1000 + 60000).toISOString(), 'b'.repeat(40)));
    commitIn(dir, 're-land the closeout, block NOT regenerated');
    const out = sentinel.checkSentinels(dir);
    const stale = out.errors.filter((e) => /NOT the newest claim-surface commit/.test(e));
    expect(stale.length).toBe(1);
    expect(stale[0]).toContain('the block is stale');
  });
});
