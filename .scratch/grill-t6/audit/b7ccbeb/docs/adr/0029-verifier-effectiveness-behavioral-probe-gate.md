# ADR-0029: Verifier Effectiveness via Paired Behavioral Probes — Zero-Miss Smoke Gate + Pre-Registered Upgrade Channels

- Status: Accepted
- Date: 2026-08-29

## Context

The verifier profile (7 iron laws + 6-rung ladder, blocking) is enforced by
the detector, but the **detector's own effectiveness** is only measured
indirectly: ADR-0015's frozen 396-item polygraph corpus measures aggregate
recall/false-positive under the Threshold Registry (ADR-0027), and ADR-0025's
judge-twins verify judge-seam overrides. What is missing is a **per-law
targeted regression surface**: when src/detector.js changes, does each of
law 1..7 still fire on a planted violation, and does each planted benign
near-miss still pass? This is the CheckList (Ribeiro et al., ACL 2020)
MFT + contrastive testing pattern and the XSTest (Röttger et al., NAACL
2024) benign-contrast pattern, both established.

Industry research (atomcode, 4 serial rounds, all decision-critical claims
double-sourced) established: (a) declarative corpora (promptfoo JSONL,
OpenAI evals) are the industrial default; programmatic probe frameworks
(garak/PyRIT) reject normalized cross-probe scores by design (garak FAQ),
which conflicts with threshold gating; (b) data/code separation with
ADR-witnessed corpus changes is consensus (qaskills, garak paper, NIST AI
RMF MEASURE 2.1) and is already jiahao's structure (ADR-0025 corpus gate +
ADR-0027 threshold governance); (c) statistical CI reporting requires
n >= 30 per side (garak bootstrap_min_sample_size default 30;
statsforevals tiers); a 14-item corpus is a **structural all-pass smoke
gate** (95% Wilson lower bound 78.5% when all pass) and must never be
marketed as a statistical measurement — the statistical load is carried by
the frozen 396-item corpus; (d) advisory rules (generator profile, 3
surface-signal rules) must not be put behind hard probe gates (MISRA C
Advisory class, K8s warn/audit/enforce, SEI CERT Recommendations, Rust
warn/deny, RFC 2119 SHOULD semantics), and hard-quantifying soft norms has
documented Goodhart/coverage-gaming risk (Inozemtseva & Holmes ICSE 2014);
(e) evaluation artifacts are per-run CI evidence, categorically separate
from runtime audit logs (PCI Req 10 / NIST SP 800-92 semantics; CWE-779
registers over-logging as a weakness); benchmark-as-git-milestone has six
mainstream precedents (github-action-benchmark, Criterion, Robot Framework,
Newman, GitLab DORA, Lighthouse CI).

## Decision

### D1 Scope and positioning: effectiveness regression surface for the verifier

Add a **behavioral probe gate** measuring verifier detection effectiveness
on planted, pre-registered cases. It is a **regression door**, not a
universal-validity claim: it asserts "these pre-registered per-law cases
still behave as pinned", never "the verifier is safe in general" (garak's
documented tension with data-defined benchmarks is respected by this
framing). Statistical recall/FP measurement stays with ADR-0015's frozen
corpus and ADR-0027's threshold gates; this ADR adds the orthogonal axis
"per-iron-law planted behavior".

### D2 Corpus organization: `bench/polygraph/probes.jsonl` + dedicated gate

Independent JSONL corpus (schema family of judge-twins: schema_version,
id, kind, provenance, collected_at, rationale, events, expected verdict
fields). A dedicated `check`-style schema gate script validates shape and
local self-consistency (ADR-0025 check-judge-corpus.js pattern, including
the 6-month staleness convention). probe-recall and probe-fp register as
two new gates in `bench/polygraph/thresholds.json` with
`source_adr: "0029"`; the ADR-0027 content-anchor and same-commit coupling
guard apply unchanged. The gate wording records the structural semantics
(see D3); band semantics from ADR-0018/0027 (single aggregated ::warning,
never blocking inside band) do not apply to zero-miss floors.

### D3 Corpus scale: 7 iron laws x (1 violation + 1 benign near-miss) = 14

Initial corpus: one planted violation per iron law plus one benign
near-miss per law (14 items). Benign items are sourced from real
false-positive history (polygraph Run2/Run3 FP records, e.g. paginated
all-n and same-sentence-negation boundaries). The gates are structural
all-pass: **probe-recall: 0 misses, probe-fp: 0 false positives**.
The ADR text carries the honesty annotation: 14/14 passing only supports
a 95% Wilson lower bound of 78.5% detection; statistical claims remain
the 396-item corpus's job. Pre-registered growth rule: any ADR-0017
human-confirmed real miss or false positive appends a corresponding probe;
when either side reaches >= 30 items, that side graduates to a statistical
gate reporting Wilson CI (or garak-style bootstrap), at which point
CI-band thresholds replace the zero-floor for that side.

### D4 Gate entry: thin CLI + testable core, CI-side job

`scripts/check-probes.js` is a thin zero-dependency CLI (read corpus, load
probe gates from thresholds.json, run detector over each case, print
per-case results, exit 0/1; `--ci` writes gate-metrics.json +
gate-junit.xml). The judgment core is a pure module so jest can test it;
**jest never runs the gate itself** (suite-level semantics such as
obsolete-snapshot exit codes must not govern a gate — industry contract:
an authoritative gate is a standalone process with an exit code, Bazel
test-encyclopedia). npm script `probes:gate` runs as an independent CI
job/step, not merged into `bench:gate` (presubmit/postsubmit and
test-sizes seams: each gate keeps its own entry and timeout; smoke =
fast first checkpoint). Pre-commit stays unchanged (ADR-0011: one fast
script only). The gate reads the probe thresholds through
`check-bench-thresholds.js`, extended (not forked) for the new entries.

### D5 Advisory rules are out of probe scope, with a pre-registered channel

The generator profile's 3 advisory surface-signal rules are NOT covered by
probes. Rationale (recorded for future reviewers): (i) they are
advisory/SHOULD per ADR-0001/0010; MISRA Compliance:2020 defines Advisory
violations as identified-but-not-requiring-deviation, and RFC 2119 SHOULD
exists precisely because valid reasons to deviate remain; (ii) probe gates
require violation+benign asset pairs (D3) and there is no benign corpus
for these prose rules; (iii) hard-quantifying soft norms has documented
distortion risk (Goodhart; Inozemtseva & Holmes 2014). **Pre-registered
upgrade channel** (MISRA GRP reclassification / K8s audit->warn->deny
ladder): an advisory rule may be promoted into probe scope only when (1)
real usage has accumulated genuine violation samples, (2) benign
near-miss assets exist for FP calibration, and (3) the promotion is
ADR-witnessed through the ADR-0027 coupling guard.

### D6 Run artifacts: ADR-0027 D4 pattern; runtime evidence chain stays clean

Local `probes:gate` runs write
`bench/polygraph/results/probe-metrics-<date>.json` (corpus fingerprint,
thresholds version, per-case verdicts), committed by a human reviewer as a
byte-stable milestone; CI `probes:gate` produces JSON + JUnit artifacts
(`if: always()`), never commits. ADR-0018 flywheel review points aggregate
`results/probe-metrics-*.json`. The runtime evidence chain
(src/evidence-log.js) receives nothing from the probe gate (CWE-779:
excessive logging damages forensics and non-repudiation; CI runners have
no chain at all). **Future option (not implemented)**: when a probe gate
runs inside a hook lifecycle locally, it may append one `probe_gate`
record (verdict + artifact sha256 + thresholds version) using the
existing `evidence_ref` digest pattern — the SLSA VSA / Rekor / in-toto
hash-pointer shape.

### D7 Supply-chain signing: registered rejection with unfreeze conditions

Release-time artifact signing (sigstore keyless / SLSA provenance / npm
provenance / GitHub artifact attestations) was independently recommended by
the same research (NVIDIA demonstrated AGENTS.md-class rule files are a
supply-chain vector, 2026-04). It is **not implemented** because all
template prerequisites are absent: no git remote, no registry publish, no
CI pipeline capable of OIDC signing. Re-activation conditions (new ADR
required): (1) the project gains a publish pipeline; (2) a remote +
GitHub Actions (or equivalent OIDC issuer) exists; (3) artifact inventory
(tarball, adapters manifest) is formalized.

## Rejections

- R1: garak/PyRIT-style programmatic probe framework — garak's own FAQ
  states probe scores are not comparable on a normalized scale, which
  contradicts threshold gating; also violates zero-dependency.
- R2: folding probes into judge-twins.jsonl via a `kind` field — semantic
  dilution; forbidden by ADR-0025 D5's corpus discipline.
- R3: expressing the gate purely as jest assertions — suite-level exit
  semantics (obsolete snapshots, --ci flag interactions) must not govern a
  gate; gate-as-jest also breaks independent CI failure attribution.
- R4: hard or warn-gating the 3 advisory rules — see D5; warning-only
  without a consuming audience is alert-fatigue noise (Drew et al. 2014).
- R5: writing probe results into the runtime evidence chain — see D6
  (CWE-779, semantic pollution, segment churn).
- R6: sizing the starter corpus to 50+ items "to be statistical" — 50
  still cannot resolve the target->floor gap (~123 items/side required);
  starter corpus is structurally a smoke surface, statistics stay with the
  frozen 396-item corpus.

## Consequences

- The detector gains a per-law regression surface whose failures pin the
  exact iron law and planted case.
- thresholds.json gains two structural gates guarded by ADR-0027
  governance (no silent probe-threshold edits).
- The 396-item frozen corpus keeps its role as the statistical gate; the
  two layers are explicitly complementary (smoke vs statistical).
- Advisory semantics (ADR-0001/0010) remain SHOULD; promotions are
  mechanical and pre-registered, not ad hoc.
- A future supply-chain signing ADR is pre-decided about its
  prerequisites, ending repeated re-litigation.
