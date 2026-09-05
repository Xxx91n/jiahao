# Jiahao (嘉豪)

Prompt-as-mental-model skill distribution with **dual profiles** for LLM agents.

Jiahao ships two install-time rule sets. Pick once at install:

| Profile | Installed in | Behavior |
|---------|--------------|----------|
| **generator** | The primary Agent doing the work | 3 surface-signal rules (no evidence → no claim, list verified state changes, verification = calling a tool). **Advisory only** — never blocks. |
| **verifier** (default) | The audit Agent reviewing the work | 7 iron laws + 6-rung verification ladder + hash chain + confidence calibration + bias guards. **Blocking** on missing evidence. |

## What it does

LLM agents suffer from False Completion Syndrome: falsely claiming success,
self-deceiving about completion, hallucinating self-evaluation. Jiahao makes
this structurally impossible. The **generator profile** attacks the surface
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

```sh
npx jiahao init                      # interactive profile prompt
npx jiahao init --profile verifier   # non-interactive (CI-safe)
npx jiahao init -y                   # accept default (verifier)
npx jiahao init --dry-run            # print, do not write
npx jiahao resolve                   # phase 1: preview evidence (no machine verdict shown)
npx jiahao resolve --verdict pass --reason "tests re-run green" --reviewer alice
```

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
| MCP | jiahao-mcp | Profile parameter; relies on client policy |

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

## Usage

- `/jiahao lite` — rungs 1-2 only, skip LLM critic
- `/jiahao full` — full ladder (default)
- `/jiahao ultra` — full ladder + re-verify with different model at rung 5
- `/jiahao off` — disable

## Develop

```bash
npm test                              # 518 tests across 35 suites
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
- 48 architecture decision records:
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
<!-- adr-index:end -->
- `test/` — 36 test suites, 527 tests
- `bench/polygraph/` — ADR-0015 benchmark adapter + frozen dev-split corpus (ADR-0019 run FAILed honestly, ADR-0020 run PASSED beat-b2; see its README)
- `private/bench-corpus/` — answer corpora (probes/judge-twins/twins + fingerprints; gitignored, ADR-0036 D2). Gate scripts resolve via JIAHAO_CORPUS_DIR, else the install-planted dir (`jiahao init` plants it from the package), else this repo-private dir in a maintainer tree; missing everywhere fails closed (exit 1: config; the capability probe degrades an absent corpus dir to exit 2 UNVERIFIABLE first, ADR-0041 D2). npm consumers and public git clones carry no corpus at all — corpus gates are a maintainer/CI-only contract, fail-closed by design (ADR-0038 D2).

## License

MIT
