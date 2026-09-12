# ADR-0039: Tarball Runtime Surface Narrowing — docs/adr Archive Channel & Measured Size Budget

Status: Accepted
Date: 2026-08-31

Amends: ADR-0038 (narrows the D1 files whitelist: docs/adr and other
developer docs leave the npm artifact; replaces the falsified ~50 KB size
estimate with a measured-anchor budget)

Budget status (2026-09-12, ADR-0059/0060 implementation round). **D3’s
recompute trigger did not fire.** D3 keys the recompute on the measured M of
the *narrowed* tarball recorded at the narrowing round, and that note records
M = 140,778 bytes (< 160 kB) with D3’s own conclusion "no cap
recomputation: the 200,000-byte budget stands". The cap therefore remains
**200,000 bytes**, and `out.size < 200,000 bytes` stays the asserted value
below.

The tarball has since grown past that cap: measured 205,741 bytes / 92 files at
2026-09-12. D3 provides no recompute path for this situation — "Bumping the
cap later is only ever an ADR" — so the breach is recorded here and
**escalated**: the resolution is an ADR decision (raise the cap deliberately /
move CONTEXT.md out under a D1 amendment / narrow the shipped surface). One
measured lever: excluding the auto-included `bench/polygraph/README.md`
recovers 4,764 bytes (to 200,977 bytes / 91 files), which is still over the cap.

This note replaces an earlier amendment of the same date that (i) applied D3’s
formula to the *current* size instead of the narrowing-round M, and (ii) cited
a narrowing-round M of ~199,943 bytes that does not exist in this ADR. That
amendment is **withdrawn**.

## Context

ADR-0038 D1 whitelisted `docs/` wholesale into the npm tarball. Measured at
237.9 kB / 117 files (impl round, 2026-08-31), against an original taskbook
estimate of < 60 KB that was computed on a stale tree and is physically
unreachable while docs/adr (228 KB uncompressed across 38 ADRs) rides the
artifact. The impl round recorded the deviation and deferred the verdict to
a grill round.

Grill-round research (atomcode, two serialized rounds; 26 searches across
Exa/Tavily/AnySearch, 17 primary-source fetches, cross-verified):

- Industry is unanimous that installed artifacts never carry developer
  docs. Python Packaging User Guide: `wheels should never include tests and
  documentation, while sdists commonly do`. Cargo Book (10 MB cap)
  explicitly names `website documentation` as non-package content; docs.rs
  builds docs from the repo, not the crate. npm endorses the files
  whitelist as `by far the safest way` and the registry philosophy
  `want to debug/test it? git clone the repo`. prettier ships a files field
  of pure runtime entries (index.js, standalone.js, src, bin).
- ADR literature (Nygard, Fowler): the audience of an ADR is the codebase
  worker, not the runtime consumer. ADRs live in the source repository; if
  external readers need them, a build task publishes them to a website.
- This repo's own CONTEXT.md already defines the Runtime-Artifact Surface as
  `the git tree is the development surface (... ADRs)` — the D1 wholesale
  `docs/` whitelist contradicted the project's own vocabulary.
- Size-budget discipline (size-limit README `measure then +25%`, FAQ
  `measure, add 10-20%, review quarterly`; webpack/Lighthouse/Angular
  fixed absolute caps; Johnson ICSE 2013 false-alarm fatigue; Luo FSE 2014
  flaky-gate trust erosion): fixed cap with real headroom, measured anchor,
  single confirmatory tier. Tight caps train reflexive limit-bumping;
  relative budgets ratchet silently (ADR-0027: only silent change is
  forbidden). No warn band: telemetry without a consumer rots (ADR-0023).

## Decision

- D1 Whitelist narrowed. package.json `files` replaces the wholesale `docs/`
  entry with exactly three machine fact-sources: `docs/gates.json`,
  `docs/coverage-map.json`, `docs/deferred-registry.json` (~17 KB
  uncompressed). docs/adr, docs/agents, handoff material, and
  release-sampling leave the tarball. CONTEXT.md STAYS: it is a product
  vocabulary asset, not developer history (grill Q4 ruling; the glossary is
  part of what the prompt-installer delivers). bench/polygraph/thresholds.json
  keeps its existing explicit entry; npm's unconditional README.md inclusion
  is unchanged.
- D2 Archive channel = the git tree. No GitHub Releases, no sparse-checkout,
  no docs website. ADRs are reachable by cloning; the README distribution
  boundary section states this in one sentence. (docs.rs / pkg.go.dev /
  Fowler's build-task-to-website are the isomorphic industry forms; we
  build none of them today.)
- D3 Measured-anchor budget. The adr-0038-wiring test asserts
  `out.size < 200,000 bytes` (200 kB, npm's decimal display unit). The cap
  value must appear verbatim in this ADR's text (content anchor, reusing
  the ADR-0027 D2(a) mechanism: every gate value appears in its source_adr
  file). Single confirmatory tier, no warn band. The metric is npm pack's `size` field (packed tarball bytes), not `unpackedSize`. Impl round records the
  measured M of the narrowed tarball (expected ~140-150 kB) in an
  Implementation note; if M > 160 kB, the cap is recomputed as
  max(200,000, M * 1.25) and the formula and the new value are written into
  this ADR by amendment. Bumping the cap later is only ever an ADR.
- D4 Stale-claim corrections. CONTEXT.md line ~386 (ADR-0038 bullet) and the
  Runtime-Artifact Surface term definition lose the `~50KB` wording in
  favor of the measured figures and a pointer here. README distribution
  boundary gains one sentence: ADRs live on the git tree, clone to read.
- D5 Traceability. ADR-0038 gains an `Amended by: ADR-0039` header pointer,
  same pattern as ADR-0033/ADR-0035. CONTEXT.md Decision Log gains the
  ADR-0039 bullet; README ADR index and count 38 -> 39.

## Rejected

- R1 Keep 256 KB cap (accept-the-slip): would fossilize a surface that
  contradicts our own CONTEXT.md vocabulary; no industry or ADR-literature
  support. npm immutability makes pre-first-publish the zero-cost window.
- R2 Full archive-channel infrastructure (GitHub Releases / sparse-checkout
  / docs website): this repo has no remote; git clone already delivers
  every ADR. Building a channel for a nonexistent problem violates the
  ponytail ladder and ADR-0034's anti-second-fact-source discipline.
- R3 defer-0008 watch item (grill Q1 explicitly excluded): its unfreeze_if
  (`npm consumers demand in-tarball ADRs`) has no script-verifiable check,
  so ADR-0035 D6 would force pending-evaluation — a decorative assertion
  of exactly the kind ADR-0033 was written to kill (exception immortality).
- R4 Tight budget (< 160,000 bytes): ~10% headroom sits inside the estimate
  uncertainty band and produces a false-alarm gate (Johnson 2013; size-limit
  FAQ: trains the team to bump the limit reflexively).
- R5 Relative budget (baseline + N%): no remote means no PR baseline
  (compressed-size-action class unusable); each pass becomes the new
  baseline — silent ratchet, forbidden by ADR-0027.
- R6 External budget wheels (size-limit, bundlewatch, pkg-size.dev):
  zero-dependency discipline (ADR-0027 R1: the zero-dependency script IS
  our conftest); the jest assertion already exists.

## Consequences

- The tarball becomes the wheel-equivalent it claimed to be: runtime +
  machine fact-sources + the vocabulary asset, ~145 kB expected.
- Gate scripts that read docs/adr (check-bench-thresholds.js,
  check-coverage.js) remain maintainer/CI-only by the same boundary as the
  corpus gates (ADR-0038 D2/D3); they run against the git tree, never the
  tarball. Verified in grill: no consumer-runtime code path reads docs/adr.
- Implementation (next round): package.json files edit, README boundary
  sentence, wiring test cap 256,000 -> 200,000 with dated comment, jest
  green, npm pack --dry-run measured M recorded back into this ADR.

## Implementation note (2026-08-31, impl round)

- Measured tarball after the D1 narrowing: 140,778 bytes compressed / 75 files
  (uncompressed ~172 KB). docs/adr, docs/agents, and the other developer docs
  are out; the only remaining docs/ entries are the three machine fact-sources
  (gates.json 6,025 B, deferred-registry.json 7,774 B, coverage-map.json
  2,727 B) plus the unconditionally included README.md.
- 140,778 < 160,000, so no cap recomputation: the 200,000-byte budget stands
  (D3). The adr-0038-wiring test asserts out.size < 200,000 and anchors
  200,000 verbatim against this ADR (content anchor, ADR-0027 D2(a) pattern).
