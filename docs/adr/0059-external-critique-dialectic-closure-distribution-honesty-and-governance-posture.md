# ADR-0059: External Critique Closure — Name-Independent Distribution, Source-Only MCP, Triage-Layer Detector Semantics, Coherence-Tier Assurance, and Signal-Driven Polish

- Status: Accepted
- Date: 2026-09-12
- Supersedes / amends: amends ADR-0038 D1 (jiahao-mcp/ leaves the tarball whitelist); relates to ADR-0001, ADR-0004, ADR-0009, ADR-0011, ADR-0027, ADR-0029, ADR-0031, ADR-0033, ADR-0035, ADR-0039 D3, ADR-0049, ADR-0056, ADR-0057, ADR-0058
- New deferred entries: defer-0028, defer-0029, defer-0030, defer-0031
- Ledger: .scratch/grill-adr0059/decision-ledger.md (D-001..D-005, all current)

## Context

On 2026-09-12 an external review of this repository (`.codex-tmp/锐评.md`, 5,500 words, evidence-backed) charged the project on six axes: (1) README's Tier 1 `npx jiahao init` resolves to a third party's 2019 npm test package (the unscoped name `jiahao` was registered 2019-07-31 by someone else); (2) the MCP distribution tier ships in the tarball but fails at first require (nested package.json dependencies are not installed — npm by design); (3) detection recall is 34.7% overall with L5/L7 at 0/40, while governance mass dwarfs the product core; (4) 55+ ADRs and a measurement-governance apparatus approach "governance theater"; (5) 22 of 45 test files are wiring (document alignment) tests — "self-authored verification"; (6) same-boundary verification: one agent writes code, ADRs, and the assertions that check them.

The critique was cross-checked against the live repository. Facts verified: the npm squat is real (registry metadata, 2019-07-31); the MCP tier defect is real (`npm pack --dry-run` shows jiahao-mcp/index.js requiring `@modelcontextprotocol/sdk` and `zod`, absent from root dependencies — installed tarballs die at line 1 with Cannot find module); report-v2-run6 indeed reads overall recall=34.7% FP=0.0% F1=0.515. Charges already fixed by prior rounds: README test-count contradiction and mid-suite `process.exit(1)` on clean clones (resolved by ADR-0056/0057; closing-round cross-check 2026-09-12 verified README ↔ actual at 671 tests / 49 suites). Reviewer prescription scores: rename rejected (cannot acquire a usable unprefixed name; total-rebrand cost across 58 ADRs / adapters / glossary disproportionate); "cut 70%" rejected (the metrology/anchor family implements SKILL.md's own promises — hash-chained evidence, bias guards; industry shrink cases cut feature surfaces, never verification surfaces; SQLite keeps 7x verification mass over core).

## Decision

### D-A — Name-independent channel (from ledger D-001)

README Tier 1 stops naming the npm registry entirely. The recommended channel becomes a name-independent path: `npx --yes github:<org>/jiahao init` (documented as requiring a public repository; current private state disclosed honestly). A **naming declaration** is inserted: the unprefixed `jiahao` npm name belongs to a third party's 2019 test package; this project has never published to npm and does not claim it. Future publication, if it ever unfreezes (defer-0001 conditions), will use the scoped name `@<org>/jiahao` — registered now under defer-0028. Renaming the project is rejected.

### D-B — Source-only MCP tier (from ledger D-002)

`jiahao-mcp/` is removed from the tarball `files` whitelist (amending ADR-0038 D1). It remains in the git tree, marked "source-only / experimental": run it via clone + `npm install` inside `jiahao-mcp/`. This restores ADR-0009's original opt-in intent, which ADR-0038 D1 had silently broken. Rejected: hoisting @modelcontextprotocol/sdk + zod to root dependencies (16 runtime deps / 4.3MB unpacked for a 2.5KB file breaches ADR-0027 R1 zero-extra-dependency discipline); downgrade-by-annotation alone (isomorphic to the skip-only degradation ADR-0056 rejected). A pack→install→smoke integrity check is specified; its gates.json registration defers to the implementation round (ADR-0027 same-commit rule). v0.0.1 unpublished requires no deprecation ceremony (semver.org 0.y.z). defer-0029 registers MCP channel revival.

### D-C — Strategy: sustain-and-converge with lightweight-feature direction (from ledger D-003)

The critique's "cannon vs mosquito" framing is answered on evidence: (a) 34.7% recall at FP=0 is a **normal industrial deployment shape** for SAST/IDS/fraud triage layers (Axelsson 1999 base-rate fallacy); the wordlist is a triage signal under ladder rungs 1–4, not the product's total recall. (b) 2026 SOTA (arXiv:2606.09863, ICML) directly studies false success: LLM judges peak at AUROC ≤ 0.65 and fail exactly on confident wrap-up language — the very signal we detect; lightweight TF-IDF-style discriminative features hit 0.83/0.95. **The recall-improvement direction is locked to lightweight discriminative features, not LLM-judge calibration.** (c) Governance convergence runs through the deferred registry's own review_at tide (2026-11-30, 2026-12-06 waves under ADR-0033 fail-closed) rather than a one-shot 70% cut. Two value judgments ratified: the research round carries no metric commitment (a waiver note is recorded in bench README to protect pre-registration discipline); registry-tide convergence is accepted as the convergence mechanism.

### D-D — Coherence-tier limited assurance (from ledger D-004)

Wiring tests are explicitly repositioned as the **characterization / change-detector layer** delivering *coherence-tier limited assurance* (ISAE 3000 vocabulary): they guarantee document↔code agreement, not behavioral correctness. SKILL.md's same-boundary rule is sharpened, not replaced: "self-validation provides coherence evidence only, not independence evidence" (the "agreement is not accuracy" slogan is added to README). An independent-review channel is registered as defer-0030 with honest bounds: cross-model review claims only partial IEEE 1012 *technical* independence — managerial/financial independence is out of reach and must be labeled as such (2026 evidence: cross-family ρ≈0.47 vs within-model 0.68; confident errors partially shared even across vendors). **Downgrading claims must never downgrade checks**: wiring counts (45 files / 671 tests) and the suite-count assertion (ADR-0057 D-C) are locked, not loosened.

### D-E — Signal-driven polish (from ledger D-005)

A full "polish pass" over SKILL.md is NOT performed. Prompt assets change via eval-carrying diffs, never whole-document sweeps (no industrial precedent; RFC editor errata / camera-ready freeze patterns). defer-0031 registers full-polish with an unfreeze trigger: the product round (D-C) or the hetero audit (D-004) must produce ≥N falsifiable SKILL.md defects anchored to bench/GSR/audit evidence, AND the tarball-budget round (ADR-0058 R4) must have landed first. Exit criteria pre-registered: trigger-annotated commit messages, green GSR coverage + wiring, pre/post bench verdict-distribution invariance, pack < 200,000 B, glossary sync; stop-loss on "would anyone but the author notice".

## Rejected alternatives

1. **Rename the project** (critique prescription 1): no acquirable unprefixed name exists; npm similarity guard makes new-name publishability (403) unpredictable; total-rebrand cost extreme; defer-0001 makes current publication illegitimate anyway.
2. **Hoist MCP deps / bundleDependencies** (Q2-A): 4.3MB SDK into a 200KB budget = 30x overflow; violates zero-extra-dependency discipline; npm docs confirm nested-package deps are not installed — "by design".
3. **70% cut of metrology/anchor/dead-man family** (critique prescription 2): that family implements SKILL.md's own promises (hash-chained evidence, bias guards, calibration schedule); cutting it would *create* the verification theater the critique accuses. SQLite precedent: verification mass 7x core is a viable long-term shape.
4. **"LLM-judge calibration to rescue recall"** (candidate within Q3-A): falsified by 2026 SOTA (AUROC ≤ 0.65, judges fooled by confident wrap-up language); requires human-labeled anchor sets that do not exist (defer-0015 unresolved).
5. **Rejecting the same-boundary charge outright** (Q4-D): deterministic ≠ independent; IEEE 1012 independence is about personnel separation, not mechanical checkability; IEEE USA 2022 treats self-certification as a stated conflict of interest.

## Consequences

- README Tier 1 wording, naming declaration, coherence-tier slogan; SKILL.md two-point precision edit — all **implementation-round items**, not doc-round artifacts.
- package.json files whitelist drop of jiahao-mcp/ + ADR-0038 D1 amendment package (ADR-0027 same-commit): implementation round.
- Recovers ~2.9KB uncompressed tarball budget headroom (against the 57-byte margin declared in ADR-0058 R4).
- Four deferred entries (0028–0031) expand the registry to 25.
- The independent-review channel's MVP writes reports inside the repository (defer-0024 external-event NOT triggered; escalation path documented).
- Registry review tide continues as the convergence mechanism; next waves 2026-11-30 / 2026-12-06.

## Acceptance

Doc-round artifacts (this file, CONTEXT.md glossary terms, deferred-registry sync, README ADR index, wiring-test seed) committed before implementation begins (project working agreement). Implementation round verification: `npm test`, `npm run gate:all`, `npm run corpus:drift`, `npm pack --dry-run` < 200,000 bytes, README contains no string that instructs installing the unprefixed registry package, tarball contents exclude jiahao-mcp/, SKILL.md diff limited to the two licensed edits, bench README carries the research-round waiver note.

## References

- critique: `.codex-tmp/锐评.md` (arc-review, 2026-09-12)
- atomcode dispatches Q1–Q5 (sessions recorded in .scratch/grill-adr0059/): npm disputes policy + scoped docs + left-pad postmortem; npm by-design nested-package evidence (SO 38853004/72921321, npm/cli#4130, #7630); arXiv:2606.09863 false-success study (ICML 2026); Axelsson 1999; IEEE 1012 §3.1.9/Annex C; ISAE 3000; NIST GCR 23-043; arXiv:2607.08065 "agreement is not accuracy"; RFC errata / camera-ready; Deason diminishing-returns.
