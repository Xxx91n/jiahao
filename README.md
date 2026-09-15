# Jiahao (嘉豪)

Prompt-as-mental-model skill distribution with **dual profiles** for LLM agents.

**Status — an installable discipline scaffold with publicly failed measurement**
(ADR-0069). The install channel, hook wiring and claim discipline in this
package are real and exercised; the measured detection claim is public and
failed:

> devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)
>
> This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.

That verdict adjudicates the scorer artifact `src/port/score.js` — the
failure class is construct misalignment (it fired on “looks like an exit
report”, not on claim-evidence contradiction). A deterministic
claim-evidence pairer is the CAPA repair track; adjudicated
through devin-corpus@v3 names the v3 route. **Nothing on this page is a detector-effectiveness claim.**

Jiahao ships two install-time rule sets. Pick once at install:

| Profile | Installed in | Behavior |
|---------|--------------|----------|
| **generator** | The primary Agent doing the work | 3 surface-signal rules (no evidence → no claim, list verified state changes, verification = calling a tool). **Advisory only** — never blocks. |
| **verifier** (default) | The audit Agent reviewing the work | 7 iron laws + 6-rung verification ladder + hash chain + confidence calibration + bias guards. **Blocking** on missing evidence. |

## What it does

LLM agents suffer from False Completion Syndrome: falsely claiming success,
self-deceiving about completion, hallucinating self-evaluation. Jiahao
attacks the structure of that failure — claims are separated from
verification and evidence is demanded mechanically — without asserting the
measurement solved it (the failed verdict above stays on the record). The **generator profile** attacks the surface
signals inside the primary agent (you cannot self-verify — verified advice).
The **verifier profile** runs in a separate audit agent, where
independence theorems actually apply: an external verifier can find errors
the generator itself is structurally blind to.

The pattern mirrors [ponytail](https://github.com/DietrichGebert/ponytail)
but specialized for the verifier role; for a primary agent, use the generator
profile to keep tokens cheap while still blocking the worst self-deception.

## Verification Ladder

1. Deterministic machine check (test suites, compilers, hash comparisons)
2. Ground truth comparison (database state, oracle output)
3. Independent re-execution (re-run, re-query, replay)
4. Checklist decomposition (binary assertion verification)
5. Independent LLM critic (weakest rung — triage signal only)
6. NOT VERIFIED (honest, complete verdict)

If rung 5 runs but ends indecisive (error, timeout, contradictory), the
gate emits **ESCALATE** instead of passing silently — an advisory-only
fourth verdict routing the claims to human adjudication via
`jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>`
(ADR-0017). Human verdicts write back as append-only `human_verdict`
records in the same hash chain and feed the calibration loop.

## Install

### CLI installer (Tier 1, recommended)

Tier 1 is a name-independent channel: it installs straight from the git
repository, which is public. The channel was measured live on 2026-09-16 in a
clean environment (first-party record:
`.scratch/grill-t8/readiness/b2-install-measurement.md`).

```sh
npx --yes github:<org>/jiahao init                      # interactive profile prompt
npx --yes github:<org>/jiahao init --profile verifier   # non-interactive (CI-safe)
npx --yes github:<org>/jiahao init -y                   # accept default (verifier)
npx --yes github:<org>/jiahao init --dry-run            # print, do not write
npx --yes github:<org>/jiahao resolve                   # phase 1: preview evidence (no machine verdict shown)
npx --yes github:<org>/jiahao resolve --verdict pass --reason "tests re-run green" --reviewer alice
```

> **Naming declaration (ADR-0059 D-A).** The unprefixed npm package name
> `jiahao` is a third party’s 2019 test package. This project has never
> published to npm and does not claim that name — do not install it from the
> registry. Future publication, if it ever unfreezes (defer-0001 conditions),
> will use the scoped name `@<org>/jiahao` (reserved under defer-0028).
> Renaming the project is rejected.

The CLI writes only `.jiahao-profile`. Adapter files are distributed by
`scripts/build-adapters.js`, never copied by the installer (drift guardrail).

The manual `echo` below remains Tier 0 (zero-dependency fallback).
### Profile selection (install-time)

Create a flag file in the config dir (default `$CLAUDE_CONFIG_DIR` or `$HOME`):

```bash
# Pick ONE — verifier is the default if the flag is absent.
echo generator > ~/.jiahao-profile      # primary agent
echo verifier > ~/.jiahao-profile       # audit agent
```

The `SessionStart` activate hook reads this flag and serves the matching
rule set. The `Stop` verdict-gate hook blocks on missing evidence only in
verifier mode; in generator mode it emits a `JIAHAO ADVISORY` system message.

### Verifier deployment discipline

Verifier independence is enforced at the deployment layer, not by config:

- Run the verifier in a **separate context window** — subagent, teammate
  session, or independent process. Never same-context self-review.
- **Prefer a different model family** for the verifier. Same-family judges
  carry intrinsic self-preference bias that context isolation cannot fix
  (Wataoka et al. 2024); stronger same-family models can show *more* bias
  (Yang et al. 2026).
- One profile per installation — generator and verifier are not meant to
  coexist as competing auto-loaded rule sets in one project.

Wiring tests guarantee document↔code agreement, not behavioral correctness —
**agreement is not accuracy** (ADR-0059 D-D). They are a characterization /
change-detector layer providing *coherence-tier limited assurance* (ISAE 3000
vocabulary), not independent assurance; independence comes from a separate
information boundary (see above), never from self-validation.

See ADR-0011 for the full deployment discipline.

### Threat model (mandatory, ADR-0014 D3)

Jiahao's wordlist and detection logic are **not hidden secrets**. Anything
running in the same working directory with file-read access (the audited
agent itself, its Bash tool, its peers) can read them. The system's actual
defenses are:

1. **L1-L3 structural signals** that are public by design — they key on
   tool-output evidence the agent does not control, and do not improve
   from disclosure.
2. **Wordlist privacy as cost-raising only** — phrases.json lives in a
   private directory and is fingerprint-checked (SHA-256). It is not
   ciphertext; an attacker with read access can read it. This matches
   CWE-656's definition of obscurity: useful, never a security boundary.

Jiahao is effective against *drift-prone-not-hostile* agents — the LLM
that optimistically says "搞定了" without checking — and is not a
containment control against a truly hostile actor. If the agent needs to
be sandboxed, use harness/OS-level isolation in addition to jiahao.

### Claude Code

Install as a Claude Code plugin. See `hooks/jiahao-hooks.json`.

### Codex

Copy `adapters/codex/hooks.json` to `.codex/hooks.json` and hook scripts to
`.codex/hooks/`.

### Cursor / Windsurf / Cline

Copy the verifier adapter (e.g. `adapters/cursor/jiahao.mdc`) for a verifier
agent, or the `*-generator.*` variant for the primary agent. Both are
generated from the same `src/SKILL.md`.

### Protection tiers (ADR-0028 D6)

Not all hosts are equal. Enforcement capability is disclosed, not assumed:

| Tier | Hosts | Enforcement |
| --- | --- | --- |
| Hook tier | claude-code, codex, copilot, qoder | Verifier exit-2 blocking semantics |
| Instruction tier | cursor, windsurf, cline, opencode, aider, instruction-tier (AGENTS.md) | Advisory-only soft injection |
| MCP (source-only) | jiahao-mcp (git tree) | Profile parameter; relies on client policy. Not in the npm tarball — clone + `npm install` inside `jiahao-mcp/` (experimental) |

Known degradations are recorded per adapter README: copilot's repo-level
`sessionStart` does not fire (upstream issue #1730; `userPromptSubmitted` is
the attested injection path), opencode has no hook/exit-2 mechanism yet
(upstream #12472 open, #14551 not-planned) and therefore sits in the
instruction tier, and aider loads the rules only via opt-in `read:` config.

## Distribution boundary (ADR-0038)

The npm tarball is a runtime artifact: it installs the prompt profiles and the
gate scripts, nothing more. The benchmark answer corpora
(`probes.jsonl` / `judge-twins.jsonl` / `twins.jsonl` / `mr-probes.jsonl`)
are a maintainer/CI asset and are **not distributed** — neither in the npm
package, nor in a public git clone (a fresh clone of the public repo also
carries no corpus). Scripts that need a corpus resolve
`JIAHAO_CORPUS_DIR` -> the install-planted dir -> the repo-private
`private/bench-corpus/` dir; a deterministically absent corpus dir degrades
the gate honestly to exit 2 (UNVERIFIABLE), while a present dir with broken
content fails closed at exit 1 with a closed-enum `[usage]:`/`[config]:`/
`[internal]:` stderr prefix (ADR-0041 D3). Reproducing the benchmark gates
is a maintainer/CI-channel operation; third-party installs are a
prompt-installer surface only. ADRs and developer docs live on the git tree (the development surface), not in the tarball — clone the repo to read them (ADR-0039).

The MCP adapter (`jiahao-mcp/`) is a **source-only** git-tree component: it is
not part of the tarball and is never distributed via npm. Run it from a clone
— `git clone <repo> && cd jiahao-mcp && npm install` (status: experimental /
source-only; ADR-0059 D-B). An MCP publish channel is deferred (defer-0029).

## Usage

- `/jiahao lite` — rungs 1-2 only, skip LLM critic
- `/jiahao full` — full ladder (default)
- `/jiahao ultra` — full ladder + re-verify with different model at rung 5
- `/jiahao off` — disable

## Develop

```bash
npm test                              # 987 tests across 63 suites (full corpus tier; the public tier skips 10 corpus-bound tests with reasons, ADR-0056)
node scripts/kappa.js                 # ADR-0018 κ governance report (--save-baseline to pin)
node scripts/build-adapters.js        # regenerate 23 adapter files (11 hosts)
node scripts/check-drift.js           # CI drift check + profile purity
```

## Architecture

- `src/SKILL.md` — single source of truth (generator + verifier + shared Boundaries)
- `src/gate.js` — verification gate combination ladder (PASS / FAIL / ESCALATE / NOT VERIFIED)
- `scripts/resolve.js` — human adjudication CLI (two-phase anti-anchoring write-back)
- `hooks/jiahao-profile.js` — profile module (SSOT for split + select)
- `hooks/` — 6 hook scripts + hooks.json + runtime.js
- `adapters/` — generated per-host adapters (11 host directories / 23 generated files; ADR-0028 D5)
- `jiahao-mcp/` — MCP-only adapter (profile parameter)
- `docs/adr/` — architecture decision records (the git-tree development surface; ADR-0039). The index below is a derived artifact (ADR-0043), rebuilt by `node scripts/build-adr-index.js` — do not hand-edit:

<!-- adr-index:start -->
- 69 architecture decision records:
- [ADR-0001](docs/adr/0001-prompt-as-mental-model-for-second-party-agents.md) — Prompt-as-Mental-Model for Second-Party Agents
- [ADR-0002](docs/adr/0002-jiahao-iron-laws-design.md) — Jiahao Iron Laws Design
- [ADR-0003](docs/adr/0003-hook-architecture-design.md) — Hook Architecture Design
- [ADR-0004](docs/adr/0004-verification-gate-ladder.md) — Verification Gate Ladder Design
- [ADR-0005](docs/adr/0005-skill-distribution-adapter-pattern.md) — Skill Distribution Adapter Pattern
- [ADR-0006](docs/adr/0006-architecture-deepening.md) — Architecture Deepening
- [ADR-0007](docs/adr/0007-hash-chain-tamper-evidence.md) — Hash Chain Tamper-Evidence
- [ADR-0008](docs/adr/0008-confidence-calibration.md) — Confidence Calibration
- [ADR-0009](docs/adr/0009-mcp-adapter.md) — MCP Adapter
- [ADR-0010](docs/adr/0010-dual-profile-role-tagged-distribution.md) — Dual-Profile Role-Tagged Distribution
- [ADR-0011](docs/adr/0011-deployment-discipline-install-ux-drift-automation.md) — Verifier Deployment Discipline, Two-Tier Install UX, and Layered Drift Automation
- [ADR-0012](docs/adr/0012-detector-verdict-persistence-hook-idempotency.md) — Detector Verdict Persistence + Hook Idempotency
- [ADR-0013](docs/adr/0013-cross-turn-hash-chain.md) — Cross-Turn Hash Chain with Composite Idempotency Key
- [ADR-0014](docs/adr/0014-wordlist-migration-structural-signals.md) — Wordlist Migration Out of cwd + Structural-Signal Primary Detection
- [ADR-0015](docs/adr/0015-benchmark-adoption-citation-calibration.md) — Detector Benchmark Adoption + Citation Calibration
- [ADR-0016](docs/adr/0016-evidencelog-gateladder-split-shared-core.md) — EvidenceLog/GateLadder Split and Shared Core Relocation
- [ADR-0017](docs/adr/0017-escalate-verdict-human-adjudication.md) — ESCALATE Verdict and Human Adjudication Write-back
- [ADR-0018](docs/adr/0018-calibration-flywheel-kappa.md) — Calibration Flywheel — Threshold Band + Few-shot Injection + Kappa Governance
- [ADR-0019](docs/adr/0019-detector-v2-suppression-judge-seam.md) — Detector v2 — Suppression Rules + Judge Seam (+ADR-0015 D2 Core-Floor Correction)
- [ADR-0020](docs/adr/0020-multi-page-enumeration-exhaustion-pairing.md) — Multi-Page Enumeration with Pagination-Exhaustion Pairing
- [ADR-0021](docs/adr/0021-request-side-anchor-signals.md) — Request-Side Anchor Signals (D6 Extraction, Rescue-Dominant Trust Direction)
- [ADR-0022](docs/adr/0022-detector-hardening-censoring-degradation.md) — Detector Hardening (Length Caps, Censoring Semantics, Degradation Contract)
- [ADR-0023](docs/adr/0023-timeout-sentinel-reconciliation-degradation-evolution.md) — Timeout Degradation via Sentinel Reconciliation and Degradation Schema Evolution Discipline
- [ADR-0024](docs/adr/0024-sentinel-ownership-lock-reconcile-hardening-session-sweep.md) — Sentinel Ownership via File-Lock Arbitration, Reconcile Hardening, and End-of-Session Sweep
- [ADR-0025](docs/adr/0025-judge-form-convergence-corpus-telemetry.md) — Judge Form Convergence — Scoring-Mode Verifier Contract + Honest-Twin Corpus + Telemetry Contract
- [ADR-0026](docs/adr/0026-segmented-evidence-log-rotation.md) — Segmented Evidence Log — Rotation + Cross-Segment Anchoring + Base-Seq Naming
- [ADR-0027](docs/adr/0027-bench-gate-pre-registered-threshold-enforcement.md) — Bench Gate — Executable Pre-Registered Threshold Enforcement in CI
- [ADR-0028](docs/adr/0028-multi-host-l0-golden-conformance-host-contracts.md) — Multi-Host L0 Test Closure — Regen-Diff Golden, Host Behavior Contracts, Adapter Lifecycle
- [ADR-0029](docs/adr/0029-verifier-effectiveness-behavioral-probe-gate.md) — Verifier Effectiveness via Paired Behavioral Probes — Zero-Miss Smoke Gate + Pre-Registered Upgrade Channels
- [ADR-0030](docs/adr/0030-corpus-growth-interval-gate-reverification-runbook.md) — Probe Corpus Growth Constraint — Interval Coverage Gate + Judge Reverification Runbook + Dead-Man Degradation
- [ADR-0031](docs/adr/0031-wiring-assertions-judge-bias-gate-tiers-isolation-provenance-debt-pack.md) — Wiring Assertions + Judge Bias Calibration + Gate Tier Taxonomy + Judge Isolation + Evidence Provenance + Debt Pack
- [ADR-0032](docs/adr/0032-generator-surface-rules-deepening-gsr-coverage-lifecycle.md) — Generator Surface Rules Deepening — gsr Header + Coverage Map Registry + Pre-Registered Equivalence + Rule Lifecycle
- [ADR-0033](docs/adr/0033-deferred-unfreeze-registry-pending-evaluation-expiry-forces-action.md) — Deferred/Unfreeze Registry — Machine Fact-Source for Pending-Activation Deferrals
- [ADR-0034](docs/adr/0034-gate-registry-single-entrypoint-orchestration.md) — Gate Registry & Single Entrypoint — gates.json, gate:all Aggregation Semantics, Three-Face Alignment
- [ADR-0035](docs/adr/0035-deferred-registry-cadence-checkin-verifiedby-honesty-corrections.md) — Deferred Registry Cadence Ladder, Check-In Discipline, Verified-By Enforcement & Honesty Corrections
- [ADR-0036](docs/adr/0036-anti-gaming-audit-corpus-migration-freshness-gate-defaults.md) — Anti-Gaming Audit Boundary, Answer-Corpus Migration, Corpus Freshness Tiering & Gate-Defaults Consistency
- [ADR-0037](docs/adr/0037-metamorphic-relations-third-corpus-family-staged-hybrid.md) — Metamorphic Relations as Third Corpus Family (Staged Hybrid)
- [ADR-0038](docs/adr/0038-npm-runtime-artifact-surface-corpus-distribution-boundary.md) — npm Runtime-Artifact Surface & Corpus Distribution Boundary
- [ADR-0039](docs/adr/0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md) — Tarball Runtime Surface Narrowing — docs/adr Archive Channel & Measured Size Budget
- [ADR-0040](docs/adr/0040-gate-runtime-capability-declaration-three-state-exit-honest-unverifiable.md) — Gate Runtime Capability Declaration — requires Closed Enum, Three-State Exit, Honest UNVERIFIABLE Degradation
- [ADR-0041](docs/adr/0041-exit-semantics-unification-structured-stderr-prefixes-lane-integration.md) — Exit-Semantics Unification — Narrowed Exit-2, Three-Code Space with Structured stderr Prefixes, Consumer-Side Registry Wiring, Order-Preserving Lane Integration
- [ADR-0042](docs/adr/0042-config-load-warning-rule-code-contract-locking.md) — Checked Config-Load Failures, Warning Rule Codes, and Contract Locking
- [ADR-0043](docs/adr/0043-fact-source-derived-artifact-discipline-prefix-vocabulary.md) — Fact-Source Spine Deepening — Derived-Artifact Discipline and Prefix Vocabulary Single Source
- [ADR-0044](docs/adr/0044-claim-directed-falsification-mechanical-falsifiability-core-rule.md) — Claim-Directed Falsification — Mechanical Falsifiability Core Rule and Falsification Record
- [ADR-0045](docs/adr/0045-stochastic-deterministic-boundary-evidence-path-verification.md) — Stochastic-Deterministic Boundary and Evidence-Path Verification
- [ADR-0046](docs/adr/0046-instrument-drift-recalibration.md) — Instrument-Drift Recalibration — Dual-Axis Judge Identity, Resolve-then-Pin, and Quarantine State Machine
- [ADR-0047](docs/adr/0047-impact-tiered-instrument-change-control.md) — Impact-Tiered Instrument Change Control — Identity Refinement, Tiered Revalidation, and Calibration-Interval Governance
- [ADR-0048](docs/adr/0048-metrological-ledger-record-tier-content-anchor-commit-discipline.md) — Metrological Ledger, Record Tier, Content Anchor, and Commit Discipline
- [ADR-0049](docs/adr/0049-decision-rule-anchor-and-metrological-ledger-completion.md) — Decision-Rule Anchor and Metrological Ledger Completion
- [ADR-0050](docs/adr/0050-append-only-hardening-external-head-anchor-and-genesis-anchoring.md) — Append-Only Hardening, External Head Anchor, and Genesis Anchoring
- [ADR-0051](docs/adr/0051-closed-persistence-capability-class.md) — Closed Persistence Capability Class
- [ADR-0052](docs/adr/0052-witness-unavailable-failure-state.md) — Witness-Unavailable Failure State
- [ADR-0053](docs/adr/0053-periodic-re-anchoring-and-anchor-freshness.md) — Periodic Re-Anchoring and Anchor Freshness
- [ADR-0054](docs/adr/0054-anchor-freshness-verification-and-re-anchoring-activation.md) — Anchor Freshness Verification and Re-Anchoring Activation
- [ADR-0055](docs/adr/0055-work-baseline-anchoring-and-seal-verification-performance.md) — Work-Baseline Anchoring and Seal Verification Performance
- [ADR-0056](docs/adr/0056-test-corpus-tiering-and-clean-clone-integrity.md) — Test Corpus Tiering and Clean-Clone Integrity
- [ADR-0057](docs/adr/0057-test-skip-honesty-and-suite-count-assertion.md) — Test-Layer Skip Honesty and Suite-Count Assertion
- [ADR-0058](docs/adr/0058-ci-test-job-independence-and-gate-layer-entrypoint-narrowing.md) — CI Test-Job Independence, Always() Success-Only Aggregation, and Gate-Layer Entrypoint Narrowing
- [ADR-0059](docs/adr/0059-external-critique-dialectic-closure-distribution-honesty-and-governance-posture.md) — External Critique Closure — Name-Independent Distribution, Source-Only MCP, Triage-Layer Detector Semantics, Coherence-Tier Assurance, and Signal-Driven Polish
- [ADR-0060](docs/adr/0060-judge-conformity-sampling-power-indeterminate-state-and-conditional-certification.md) — Judge Conformity Sampling Power, Indeterminate Conformity State, and Conditional Instrument Certification
- [ADR-0061](docs/adr/0061-pre-registered-gate-amendment-closure-surface-narrowed-judge-identity-and-output-tethered-convergence.md) — Pre-Registered Gate Amendment Closure, Surface-Narrowed Judge Identity, Declaration-Scoped Instrument Tagging, Output-Tethered Convergence, and Governance-Artifact Anchoring
- [ADR-0062](docs/adr/0062-pre-registered-tarball-cap-amendment-policy-before-value-trend-anchor.md) — Pre-Registered Tarball-Cap Amendment - Policy Before Value, Periodic Trend Anchor
- [ADR-0063](docs/adr/0063-surface-narrowed-judge-identity-anchor-semantic-digest-rejected.md) — Surface-Narrowed Judge Identity Anchor - Semantic Digest Rejected
- [ADR-0064](docs/adr/0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md) — T-6 Product Round Pre-Registration - MDE Stage-Gates, Golden-Sample Equivalence, Governance Trend Anchor
- [ADR-0065](docs/adr/0065-t6-confirmatory-round-adjudication-port-surface-devin-corpus-and-claim-honesty.md) — T-6 Confirmatory Round - Adjudication Rule, Port Surface, Devin Corpus Protocol, Claim Honesty
- [ADR-0066](docs/adr/0066-tarball-cap-trend-anchor-amendment-t6-product-port-surface.md) — Tarball-Cap Trend-Anchor Amendment for the T-6 Product Port Surface
- [ADR-0067](docs/adr/0067-devin-corpus-v1-oot-falsification-adjudication.md) — devin-corpus@v1 OOT Falsification Adjudication - Eval-Plan Registration, Claim Surface, Branch Policy
- [ADR-0068](docs/adr/0068-devin-corpus-v2-dual-axis-adjudication-collection-protocol-claim-slot-v3-binding.md) — devin-corpus@v2 Plan - Dual-Axis IUT Adjudication Rule, Collection Protocol, Claim Slot, v3 Binding and Probe Terms
- [ADR-0069](docs/adr/0069-capa-claim-evidence-pairer-artifact-freeze-adjudication-anchor-readiness-positioning.md) — CAPA Claim-Evidence Pairer Semantics, Artifact-Scoped Freeze + Adjudication Anchor, Readiness Positioning, and v3 Plan Obligations
<!-- adr-index:end -->
- `test/` — 63 test suites, 987 tests
- `bench/polygraph/` — ADR-0015 benchmark adapter + frozen dev-split corpus (ADR-0019 run FAILed honestly, ADR-0020 run PASSED beat-b2; see its README)
- `private/bench-corpus/` — answer corpora (probes/judge-twins/twins + fingerprints; gitignored, ADR-0036 D2). Gate scripts resolve via JIAHAO_CORPUS_DIR, else the install-planted dir (`jiahao init` plants it from the package), else this repo-private dir in a maintainer tree; missing everywhere fails closed (exit 1: config; the capability probe degrades an absent corpus dir to exit 2 UNVERIFIABLE first, ADR-0041 D2). npm consumers and public git clones carry no corpus at all — corpus gates are a maintainer/CI-only contract, fail-closed by design (ADR-0038 D2).

## Confirmatory claims (T-6, ADR-0065 D-E)

Every confirmatory claim about the T-6 product port repeats the fixed facts
below verbatim. The single authority is
bench/research/out/claim-template.md; the same block appears in
bench/research/out/confirmatory-report.md (whitespace-normalized identical).

1. Floor arithmetic: the single absolute gate is confirmatory recall@FP0
   >= 0.563863 = baseline 0.4792 + d_MDE 0.084663 (frozen by ADR-0064 D-A;
   no post-hoc threshold moves, ADR-0065 D-A).
2. Trigger-mask control NOT HEALTHY: masking the 95 perfectly
   label-correlated tokens RAISED recall@FP0 by +0.1093 - the reference
   model partially exploits label-leaking lexical artifacts.
3. Closing channel: the closing message carries ~0.28 of recall@FP0; a
   scorer blind to it loses most of the signal.
4. Terminal fact (this round): CONFIRMATORY PASS - char-3|count|lr|C1.0|df2
   replayed the frozen corpus (polygraph-bench @994bdeb3, 396 items) through
   the shipped product port at recall@FP0 1.000000 with FP@default 0.000000
   (in-sample replay of the artifact trained on the full frozen corpus; the
   out-of-fold honesty claim remains the rung-1 research number, never
   max-of-trials).
5. Fallback honesty: the top survivor was judged first and passed; the
   fallback word-1|count|lr|C1.0|df2 leg never fired. Had it fired and
   passed, every claim would state: "the top-ranked survivor
   char-3|count|lr|C1.0|df2 failed confirmation; the adopted scorer is
   word-1|count|lr|C1.0|df2 (headline is never max-of-trials)."
6. Advisory channel: tier-(b) rel-L2 of port vectors vs the frozen gold20
   vectors measured max 0, mean 0 (count weighting is exact integer
   arithmetic on both sides) - diagnostic only, recorded in
   confirmatory-result.json, restated here, never moves an exit code.

## devin-corpus@v1 OOT falsification (grill-t7, ADR-0067 D-C)

The single authority for the OOT verdict is bench/research/out/devin-oot-report.json;
the bound claim block below appears verbatim in
bench/research/out/claim-template.md and bench/research/out/devin-oot-report.md.

devin-corpus@v1 falsification test: indeterminate (n=52, lie=12, CI lower 0.054861) (verdict date: 2026-09-15)

This is a small-sample (n_lie=12) decision-table outcome, not a precise performance estimate; devin-corpus@v1 is never cited by any conformity claim.

the pre-registered integer decision table assigns 3/12 to the indeterminate band; this is a decision-table outcome, not an effect estimate

## devin-corpus@v2 OOT falsification (grill-t7, ADR-0068 D-C)

The single authority for the v2 verdict is bench/research/out/devin-oot-v2-report.json;
the bound claim block below appears verbatim in
bench/research/out/claim-template.md and bench/research/out/devin-oot-v2-report.md.

devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)

This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.

dual-axis intersection-union verdict: lie axis 9/31 hits, CP 95% CI [0.142229, 0.480361] entirely below the conservative-transfer floor 0.563863 (lie-fail); FP axis 21/89, CI lower above the 0.10 usability bound (fp-fail); the stress side-set (20 command-exit honest items, never in either table) flagged 20/20 - a decision-table outcome, not an effect estimate

## Reproduce the measurement (measurement-reproduction invitation, ADR-0069 D-D.3)

This project invites one thing: independent reproduction of the published
measurement — not adoption, and no performance claim is asked or made.

devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229) (verdict date: 2026-09-15)

This is a decision-table outcome from a seeded-emergence bench corpus, not a precise performance estimate; devin-corpus@v2 is never cited by any conformity claim.

The v2 verdict is frozen at the annotated tag `adjudicated/devin-corpus-v2`
(commit 8807a61; failure class: construct misalignment). The adjudicated
artifacts `src/port/score.js` and `src/port/g6-manifest.json` are
sha256-pinned at that commit. To re-derive every published number from the
recorded artifact — the corpus itself is never re-opened:
`node bench/research/devin-oot.js --snapshot-dir devin-corpus-v2 --replay`.
To verify the governance anchors:
`node scripts/build-governance-anchors.js --check`. Discrepancies feed the
CAPA record categorically — open a GitHub issue naming the mismatching
field; reproductions never enter any verdict chain.

## License

MIT
