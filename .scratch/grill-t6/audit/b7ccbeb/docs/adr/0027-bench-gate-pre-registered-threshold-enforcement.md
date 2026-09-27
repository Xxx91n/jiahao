# ADR-0027: Bench Gate — Executable Pre-Registered Threshold Enforcement in CI

## Status

Accepted (2026-08-29)

## Context

ADR-0015 pre-registered the polygraph-bench acceptance thresholds
(recall > 46% at FP <= 4.5%, score corrected to > 0.385 by ADR-0019 D5);
ADR-0018 D2 defined the floor/target threshold band. Both exist today only
as documentation: CI runs jest + check-drift, and nothing compares a fresh
benchmark run against the pre-registered thresholds. A detector change that
drops recall below 46% would merge green — the pre-registration would be a
promise without a witness.

Three atomcode research runs (2026-08-29; promptfoo / DeepEval / BrainTrust /
inspect_ai / OpenAI Evals tooling survey; FutureAGI / Vibe Engines / BuildPulse
eval-gating practice; COS Registered Reports / PREP-Eval / arXiv 2606.11217
pre-registration literature; GitHub Actions platform semantics; Drew 2014
alarm-fatigue data; Goodhart's law; criterion.rs / github-action-benchmark /
martincostello benchmark-trend persistence patterns; 30+ sources, multi-engine
cross-verified) established:

- The industrial-standard gate shape is: single entrypoint + versioned
  threshold config + floor/target bands + JSON/JUnit artifact (five-source
  consensus: promptfoo assert-with-threshold, DeepEval assert_test, BrainTrust
  --threshold, FutureAGI exit-3 banding, Kinde GH Actions tutorial).
- Pre-registration discipline maps precisely onto: registry (ADR, immutable)
  + derived config (thresholds.json, machine-consumed) + deviation documented
  via ADR-locked change (PREP-Eval 6-phase protocol).
- GitHub Actions has no native warning conclusion: exit-code→neutral was
  removed (community #9875), runner overwrites conclusions (community #15452),
  continue-on-error renders hidden failures as green (Ken Muse 2024,
  mainmatter continue-on-error-comment). The only native, zero-dependency
  warning surface is the `::warning::` annotation.
- Alarm fatigue is empirical, not rhetorical: 88.8% of ICU alarms were false
  positives and desensitization followed (Drew et al. 2014, PLOS ONE;
  Sendelbach 2013; AHRQ). Warnings must stay rare and non-blocking; making
  the band blocking is the same move ADR-0018 D2 exists to prevent.
- GitHub public-repo artifact retention is hard-capped at 90 days and
  artifacts die with their run; artifacts are per-run evidence, never trend
  storage. No mature template auto-commits benchmark data to the main branch
  (criterion.rs keeps baselines local; benchmark-action uses a gh-pages
  branch; martincostello uses a separate data repo); CI-runner noise and
  fork-PR/token/loop hazards are documented costs of any auto-commit bot.

Locating mental model (unchanged since ADR-0001): jiahao's product promise is
that agents must not self-certify. A project that ships "pre-registered
thresholds" without a machine that enforces them is committing the exact
failure mode it exists to detect.

## Decision

### D1 — Gate shape: real re-run, not stale reads

A single zero-dependency entrypoint `scripts/bench-gate.js` (exposed as
`npm run bench:gate`) runs the detector over the frozen polygraph corpus,
produces metrics in that same invocation, and compares them against the
pre-registered thresholds. The corpus run is deterministic (judge seam is a
null stub per ADR-0025; no LLM sampling exists in the metric path), so a
re-run has no flakiness and no cost pressure; comparing against stale
metrics files is rejected because it decouples CI green from the current
code (stale-read = structural self-deception).

### D2 — Threshold governance: derived config + guard rail

Threshold values live in `bench/polygraph/thresholds.json` (machine-readable,
single numeric source), each gate entry carrying `source_adr`. A guard
script `scripts/check-bench-thresholds.js` enforces, in CI:
  (a) content anchor — every gate value must appear in its `source_adr`
      file's text (catches editing the config without touching the registry);
  (b) same-commit coupling — when run with a base ref, a change to
      thresholds.json without a `docs/adr/*.md` change in the same commit
      range fails.
Non-negotiable: the guard requires that changes be accompanied by an ADR; it
never judges direction. Raising a threshold is a legitimate ADR-led change
(benchmark saturation, arXiv 2602.16763) — only silent change is forbidden.
Parsing threshold numbers out of ADR prose is rejected: the same number
carries different roles across ADRs (0.80 = aspirational floor in ADR-0015,
rejected criterion in ADR-0019), and prose parsing breaks silently on
rewording (this project's own history is the falsifying evidence).

### D3 — CI semantics: two exit codes, one aggregated warning annotation

bench-gate exits 0/1. Below floor = exit 1 (hard gate). Inside the
floor/target band = exit 0 plus exactly one aggregated `::warning::`
workflow annotation (GitHub truncates step annotations at 10; aggregation is
mandatory, and the file/line-anchored form keeps the warning visible on the
Files page). At/above target = clean pass. Band-hit outcomes are surfaced in
the gate output and feed the band-hit telemetry budget (D4). Three-exit-code
(0/1/3) and continue-on-error designs are rejected: the platform removed
exit-code→neutral, and continue-on-error displays hidden failures as green.

### D4 — Persistence: milestone archive + per-run artifact

Local runs of `npm run bench:gate` write `bench/polygraph/results/
metrics-<date>.json` (existing run4/run5/run6 byte-frozen convention
extended; files carry run metadata) and are committed by the human reviewer.
CI runs emit JSON + JUnit artifacts only, never commit. Band-hit rates are
aggregated at ADR-0018 flywheel review points by a small script reading
results/*.json. No auto-commit bot; no isolated-branch or SaaS trend storage.

### D5 — Explicit rejections (do not re-suggest)

R1 No external evaluation/policy engines (promptfoo, DeepEval, OPA/Conftest,
   Spectral): patterns adopted, engines rejected (zero-dependency stance).
R2 No cloud benchmark services (bencher/CodSpeed): external-service
   extinction risk (Papers with Code shutdown precedent).
R3 No main-branch auto-commit bot for trend data (token surface, unsigned
   bot commits, fork-PR write denial, append conflicts).
R4 No fabricated third CI state (exit 3 / neutral / continue-on-error hacks).
R5 The band never blocks (ADR-0018 D2 lock; Goodhart target-distortion and
   alarm-fatigue evidence apply).
R6 No N-sampling anti-flakiness machinery while the metric path is fully
   deterministic (revisit in the judge implementation round).

## Consequences

- Closing the promise-vs-witness gap: CI green now means "current code meets
  pre-registered thresholds on the frozen corpus," verifiable by any cloner.
- Acceptance tests (implementation round): forged failing metrics force
  exit 1; band metrics force exit 0 plus a single aggregated warning;
  thresholds.json without ADR in the same range fails the guard; values
  absent from their source ADR fail the guard.
- Scope boundary: change detection for thresholds.json in CI requires a base
  ref (PR base SHA); local invocation without a base runs the content anchor
  only.
