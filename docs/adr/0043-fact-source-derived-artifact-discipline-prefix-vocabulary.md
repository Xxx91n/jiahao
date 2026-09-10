# ADR-0043: Fact-Source Spine Deepening — Derived-Artifact Discipline and Prefix Vocabulary Single Source

Status: Accepted
Date: 2026-09-04

References: ADR-0027 (advisory aggregation), ADR-0028 D2 (regen-and-diff golden
convention), ADR-0029 D5 (re-evaluation triggers on durable rejections),
ADR-0033 (fact-source spine), ADR-0034 (gate registry, three-face alignment),
ADR-0039 (docs/adr on the git-tree development surface), ADR-0040/0041/0042
(capability probing, exit semantics, closed stderr prefix enum, contract locking).

## Context

Two drift incidents of the same class were live in the repository when this
round opened:

1. README's Architecture section carried TWO parallel hand-maintained ADR index
   lines (the 182-183 lines), claiming "41 architecture decision records" and
   "42 architecture decision records" at once, while `docs/adr/` actually held
   42 files. The hand-written truth had already drifted — duplicated, stale, and
   machine-unchecked. The same class of failure was independently observed in
   the CI layer earlier (ci.yml silently omitting gates, ADR-0034 Context).
2. The ADR-0041 D3 closed stderr prefix enum (`[usage]:` / `[config]:` /
   `[internal]:`) existed only as ~36 scattered string literals across 7 source
   files plus tests. ADR-0042 already rejected locking these by scanning source
   literals; what remained missing was the positive half of that decision: a
   single importable fact source that consumers reference by symbol.

Both are instances of "one fact, many hand-copied views": prose or literals
that pretend to be truth without a machine link to it. The remedy follows the
existing spine (ADR-0033/0034): make the repository artifact the fact source,
derive every view from it, and fail closed when a view drifts.

Industry anchors (atomcode round, 4 serial researches, indexed under
`atomcode-q*`): adr-tools `adr generate toc` / adr-log sentinels, whychose ADR
index action, EmbedMD `--verify` (exit-1 compile-source-driven docs), Sphinx
`-n` and rustdoc `broken_intra_doc_links` for reference integrity over literal
scanning, Go `errors`/Rust miette + Ruff/BuildKit rule-code vocabularies for
controlled error identity. docs-as-code criticism (silent prose drift, worse
under AI co-editing) is accepted and is exactly why prose views sit OUTSIDE the
sentinel region while the index INSIDE is machine-owned.

## Decision

### Cluster 1 — README ADR index as derived artifact

- **D-A (index fact-source flip)**: the fact source of the ADR inventory is
  `docs/adr/*.md` itself — filename number (`^\d{4}-`) plus the file's H1
title. No prose anywhere in the repo (README included) may restate the ADR
count or per-ADR summaries by hand.
- **D-B (generator + sentinel region)**: `scripts/build-adr-index.js` (zero
  dependencies) renders one list line per ADR as
  `- [ADR-NNNN](docs/adr/NNNN-slug.md) — <H1 minus the "ADR-NNNN: " prefix>`
  and rebuilds the README region between `<!-- adr-index:start -->` and
  `<!-- adr-index:end -->` wholesale. Two stable fields only (number + H1);
  Status/Date are optional extension points for a later round (Q5=C). The two
  legacy duplicated hand-written index lines are deleted; prose explaining the
  directory stays outside the sentinel region.
- **D-C (fail-closed --check + registration)**: `--check` regenerates in memory
  and byte-compares the region (regen-and-diff, ADR-0028 D2 pattern); any
  mismatch exits 1 with an actionable message. The gate registers in
  `docs/gates.json` as functional entry `adr-index`, `order: 115` (between
  drift 110 and adapters-golden 120), `tier: confirmatory`,
  `command: node scripts/build-adr-index.js --check`, `requires: ["docs-adr"]`
  (ADR-0040: on the tarball surface it degrades honestly to UNVERIFIABLE).
  `ci.yml` is untouched — `gate:all` picks the new entry up through the single
  entrypoint; the meta band 0-99 is a structurally closed triple and stays
  untouched.
- **D-D (derivation boundary)**: the generator owns only mechanical metadata
  (number, slug, H1, count). Judgement-laden annotations (why an ADR matters,
  supersession notes) live in the ADR files themselves and in CONTEXT.md, never
  in the generated region.

### Cluster 2 — stderr prefix vocabulary single source

- **D-E (vocabulary fact source)**: `src/shared/prefix-vocab.js` exports
  `PREFIXES = { usage, config, internal }` (frozen). It is the ONLY module
  allowed to contain those three string literals. No new JSON document, no
  fold into capability.js or gates.json (Q7=A).
- **D-F (spawn contract over literal scanning)**: contract locking (ADR-0042
  D3) asserts behavior: spawn the real script, assert exit code and that the
  stderr line begins with the prefix **referenced from the vocab module** —
  never a re-typed literal. A refactor that reroutes the strings through the
  module passes or fails on executable evidence, not on source text.
- **D-G (run-gates choke check)**: `run-gates.js` is the single choke point
  through which every gate's output flows. Any child output line shaped
  `[<word>]:` whose prefix is not in the closed enum is a contract breach and
  fails that gate (confirmatory tier gates then fail the run). This is the
  second line of defense; it does not replace per-gate spawn tests.
- **D-H (three-way reference integrity)**: a wiring test asserts the triangle
  usage ↔ fact source ↔ registry: every node script registered in gates.json
  that references `PREFIXES` imports `prefix-vocab`, every registry command and
  `source_adr` path exists, and the vocab values appear verbatim in the
  ADR-0041 text (their normative definition).

### Rejected alternatives (durable; re-evaluation triggers per ADR-0029 D5)

- **R1** dependency-cruiser / eslint-plugin seams for prefix enforcement — a
  new tool dependency for what a spawn contract plus one choke check already
  cover. Re-open only if a second vocabulary family beyond stderr prefixes
  appears, making a generic lint seam pay for itself.
- **R2** centralized emitter helper (`failConfig(...)`) wrapping console+exit —
  adds indirection without changing the contract; the vocab import is the
  minimal lock. Re-open if prefix emission sites exceed ~20 and formatting
  rules themselves need to vary.
- **R3** continuing literal scanning as the lock — rejected by ADR-0042 D3 for
  regression tests and extended here to the whole enforcement strategy: locks
  bind executable contracts and cross-references, not source text.
- **R4** keeping the hand-written README index — empirically falsified by the
  41/42 duplication in the same file.
- **R5** wiring `--check` straight into ci.yml, bypassing the registry —
  violates ADR-0034's single-entrypoint discipline and re-creates the
  three-face drift this ADR's cluster 1 is fixing.

## Consequences

- README's ADR index can only lie if the generator is wrong, and the generator
  is locked by pure-function unit tests plus a fail-closed CI gate.
- Adding ADR N+1 is: write the file, run `node scripts/build-adr-index.js`,
  commit. Forgetting the middle step fails CI (order-115 gate).
- Any new stderr prefix (e.g. `[advisory]:` if ever needed) is a one-line
  vocab extension that ripples to every consumer and to every contract test;
  the choke check still rejects ad-hoc prefixes invented in a single script.
- CONTEXT.md gains two terms: Derived Artifact and Sentinel Region.
