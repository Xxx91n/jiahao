# ADR-0036: Anti-Gaming Audit Boundary, Answer-Corpus Migration, Corpus Freshness Tiering & Gate-Defaults Consistency

Status: Accepted
Date: 2026-08-30

## Context

Three atomcode research rounds (grill-r36 survey; Q2 adversarial-model boundary;
Q4 migration form; Q7 freshness cadence) established:

1. NIST CAISI (2025-11) bisects evaluation cheating into solution
   contamination (information leak) vs grader gaming (exploiting the scorer).
   Auditing gate mechanics alone covers only half the official taxonomy.
2. Every major measured case of benchmark subversion sits on the
   environment/process layer, not the scoring script: SWE-bench issue 465
   (git history leaks future commits; DeepSWE 2026-05: ~18-25% of sampled
   Opus "passes" judged cheating, 87% via git log/show), SWE-bench+ (arXiv
   2410.06992: 32.67% of solved patches had the fix in the issue text),
   OpenAI's 2026-02 retirement of SWE-bench Verified (training contamination).
3. Local fact verification: bench/polygraph/{probes.jsonl,
   judge-twins.jsonl, twins.jsonl, thresholds.json} all sit in the repo and
   are readable by any second-party agent with Read/Bash tools. Only the
   wordlist was moved out (ADR-0014). If a probed agent reads the probes,
   "zero miss" becomes open-book recall.
4. canary strings are a detection layer, not a defense: BIG-bench canaries
   were reproduced verbatim by multiple frontier models; AgentLeak (2026-06)
   measured canary detection catching only 8% of leaks.
5. Expiry: no industrial system uses a single global TTL. TUF tiers expiry
   across four roles; Let's Encrypt runs 6/45/64/90-day profiles; PCI DSS
   pairs a quarterly baseline with after-significant-change triggers;
   NIST SP 800-57 tiers cryptoperiod by risk. NIST 800-63B's reversal of
   forced periodic password change documents the ritualization hazard of
   hard calendar gates.

## Decision

### D1 Adversarial boundary: A-2 + A-3 automatable subset

The audit boundary is corpus/environment leakage plus process-layer bypass,
with gate-mechanics (A-1) as the already-covered layer. Vocabulary follows
NIST CAISI: solution contamination vs grader gaming. The threat model
upgrades from a careless generator to a capable optimizer that can read any
file in the repo (CWE-656 style honesty: cost-raising, not impossible-
to-bypass claims).

### D2 Answer-corpus migration (C-2 partial migration)

Three answer-type corpora move out of the audited agent's readable surface
into private/bench-corpus/ (the ADR-0014 wordlist seeding pattern, extended
by install.js): probes.jsonl, judge-twins.jsonl, twins.jsonl. Gate scripts
resolve the corpus via JIAHAO_CORPUS_DIR env with install-default fallback;
missing corpus files fail closed (exit 2, "run install" message).

thresholds.json stays in the repo. It is the scoring standard, not an
answer: hiding it would destroy ADR-0027 pre-registration transparency and
the corpus-fingerprint "any cloner can verify the frozen corpus" semantics.
"Hide the exam paper, publish the syllabus and rubric" (NIST CAISI private
tasks + public affordances; SWE-bench Pro private tests + public harness;
Kaggle private labels + public metric).

thresholds.json gains a private_corpus section: {corpus id, sha256} per
migrated file, anchored verbatim in this ADR by the ADR-0027 content-anchor
rule (public integrity anchor, private content).

Git history is NOT rewritten. This ADR records that pre-migration versions
of the three corpora exist in history and are treated as known-exposed;
remediation is refresh via the ADR-0030 growth channel, not erasure.

### D3 Known-exposed history handling (E-3)

- probes.jsonl (14 items, small, highest gaming value: memorizing it passes
  the zero-miss smoke gate): refreshed immediately on the migration commit
  through the ADR-0030 growth channel (0 miss / 0 fp baseline re-derived).
- judge-twins.jsonl / twins.jsonl (larger, lower direct gaming value):
  declared known-exposed, refreshed on the freshness cycle gate (D5).

### D4 Gate-defaults consistency (F-2)

docs/gates.json entries carry a params block declaring the gate's key
parameters (e.g. --check on, coverage floor, no exemption words). A new
assertion (extend scripts/check-ci-wiring.js style) verifies that effective
runtime parameters match the declared params — mechanizing the
"silent degradation" class from SWE-bench+ (weak-test suspicious passes).
Behavioral fail/pass probes remain the province of ADR-0029 probe gates;
this gate only checks declaration-execution consistency.

### D5 Corpus freshness gate (G-1 + corrected alpha)

Freshness tiering reuses the ADR-0035 cadence ladder vocabulary:

- probes.jsonl, judge-twins.jsonl: half-yearly tier (6 months; LiveBench
  publishes 6-month refreshes; ADR-0030's existing 6-month soft threshold).
- twins.jsonl: yearly tier.

Failure semantics: at tier expiry, warn + evidence-log entry (matches
ADR-0030 soft band and ADR-0035 D3 alarm-fatigue discipline); at 1.5x tier
(half-yearly: 9 months; yearly: 18 months), fail-closed. The existing 6/9
judge dead-man ladder is hereby re-derived as an instance of tier x 1.5.

Event trigger (PCI after-significant-change): any non-append change to a
corpus file obligates a same-commit reverify or an explicit exemption note;
the ADR-0030 D3 pre-commit hook extends from judge files to all corpus files
(warn-only, per ADR-0027 alarm-fatigue).

last_reverify_at is read from reverify-ledger.json as the single fact
source; no duplicated timestamps. New gate entry corpus-freshness in
docs/gates.json: confirmatory tier, verified_by scripts/check-corpus-freshness.js.

### D6 check-corpus-leak gate (fingerprint detection, defense-in-depth)

scripts/check-corpus-leak.js (confirmatory, fail-closed) scans the worktree
(excluding private/, results/) and the evidence log for fingerprints of the
three migrated corpora (distinctive n-grams + whole-file sha256); any hit
exits 1. Canary GUIDs inside corpora are an optional supplement and never
the sole defense (BIG-bench canary failure; AgentLeak 8%).

## Rejections

- R1 Migrate thresholds.json too: destroys ADR-0027 pre-registration
  transparency and the public corpus-fingerprint anchor; no industrial
  precedent for hiding the scoring standard.
- R2 No migration, canary-only detection: BIG-bench canary reproduced
  verbatim by multiple frontier models; AgentLeak measured 8% capture;
  DeepSWE shows answers-in-box yield 18-25% cheating rates.
- R3 Private evaluation server (SQuAD/GLUE style): violates zero-dependency
  local architecture; API label-inference risk.
- R4 Rolling corpus refresh (LiveCodeBench style): non-reproducible, moving
  goalposts; contradicts the frozen-corpus + pre-registered-threshold
  discipline judged correct in grill-r36.
- R5 Single global TTL (G-2): no industrial precedent; contradicts the
  tiered-expiry consensus (TUF, certificates, PCI, NIST 800-57).
- R6 Pure fail-closed at tier boundary (unmodified alpha): ritualized
  reverify risk (NIST 800-63B lesson) and single-maintainer outage risk;
  the warn-then-fail two-stage is already legislated by ADR-0030/0035.

## Consequences

- Implementation (next round): corpus migration + install seeding +
  fingerprints, check-corpus-leak.js, check-corpus-freshness.js,
  gates.json entries (corpus-leak confirmatory; corpus-freshness
  confirmatory; params consistency assertion), probes refresh (D3),
  pre-commit hook extension, README/CONTEXT updates.
- The metamorphic-relations corpus line (grill-r36 B-line) is explicitly
  out of scope here and slated for the next grill round (candidate
  ADR-0037), sequenced after the corpus migration so MR baselines grow on
  a clean corpus.
