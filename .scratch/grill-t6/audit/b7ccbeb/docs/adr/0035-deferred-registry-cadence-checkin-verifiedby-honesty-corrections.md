# ADR-0035: Deferred Registry Cadence Ladder, Check-In Discipline, Verified-By Enforcement & Honesty Corrections

Status: Accepted
Date: 2026-08-30

Amends: ADR-0033 (adds cadence ladder, residency SLA, check-in discipline,
verified-by enforcement; corrects two entry classifications)

## Context

ADR-0033 established docs/deferred-registry.json as the fact-source for
chosen-to-defer items with fail-closed review_at expiry. Since creation:

1. All four entries carry review_at 2027-02-28 — a batch-assigned date,
   the "everything due at term end" worst case (Ariely & Wertenbroch
   2002: externally imposed, evenly spaced deadlines outperform
   self-set clustered ones). The registry has never undergone a single
   lifecycle transition.
2. defer-0002 packs two heterogeneous conditions into one check string:
   an external event (upstream copilot-cli issues) and an internal work
   item (verifying 8 long-tail host protocols against official docs).
   Verified against upstream: #2415/#2142 closed, #1730/#2201 open —
   partial fulfillment the prose form cannot express.
3. defer-0004 is classified presence-condition (claimed
   machine-evaluable) but its check is prose and nothing evaluates it —
   a false-evaluable classification violating the honesty principle.
   The schema comment reserves verified_by but check-deferred.js never
   validates it, so the misclassification is mechanically possible.

Research grounding (three atomcode rounds): real-options theory
(deferral = call option, review_at = option expiry; no auto-renewal),
FedRAMP POA&M (VD monthly check-in applies only to findings with a
30-day mitigation duty; OR items are periodically reassessed; M-24-15
moves low-risk items to quarterly), Azure Policy exemption expiresOn
(expiry stops honoring, record retained), security-exception practice
(UC Berkeley: max 1 year, renewal = re-assessment, never auto-extend),
alarm-fatigue evidence (high-frequency low-value signals are
systematically desensitized: warn/fail tiering is mandatory), CA/B
Forum SC-081v3 (publish future schedule changes up front).

## Decision

### D1 Review cadence ladder

Three tiers keyed by unfreeze_if.type x trigger likelihood x residual
exposure. The ladder is normative: every new entry MUST be assigned a
tier at creation; off-ladder review_at is invalid.

- quarterly: external-event with an actively changing upstream and
  moderate residual exposure -> defer-0002 -> 2026-11-30
- half-yearly: presence-condition, low-to-mid trigger probability,
  zero current holding cost, high impact when triggered
  -> defer-0001 stays 2027-02-28
- yearly: rare external event (waiting option, maximum value of wait)
  or low-drift internal presence-condition
  -> defer-0003 and defer-0004 -> 2027-08-31

Ladder adjustments go through this ADR's amendment channel (a new ADR),
pre-announced like CA/B Forum staged schedules.

### D2 Pending-evaluation residency SLA

An entry in status pending-evaluation may remain for at most
min(2 review cycles, 12 months), measured from registration. On breach
check-deferred escalates to STALE fail (existing mechanism): activate,
re-defer with refreshed review_at + rationale, or remove.

### D3 Check-in discipline (warn-level)

Every external-event entry carries last_check_in: {date, note}, mirroring
FedRAMP POA&M Column R. Invariant: at least one check-in per review
cycle (i.e. last_check_in.date must not be older than the tier
interval). Violation is a WARNING, not a failure (pre-commit parity:
alarm-fatigue evidence forbids blocking on high-frequency low-value
signals). review_at expiry remains the sole fail level. Distinguish:
a recorded check-in is not a claim of fulfillment — "checked, nothing
changed" is a valid note.

### D4 defer-0002 split

- defer-0002 narrows to a pure external-event: copilot-cli issues
  1730/2201/2415/2142 resolved upstream. Rationale notes partial
  fulfillment (2415/2142 closed as of 2026-08-30).
- New defer-0005 (free-text, review_at 2026-11-30): the 8 long-tail
  host protocols verified against official documentation. It stays in
  THIS registry (not coverage-map.json — that matrix is
  iron-law x gsr coverage; a host-protocol verification item belongs to
  the ADR-0028 golden-gate namespace, a different slot). free-text is
  permitted only with a review_at backstop (ADR-0033 D2), which 0005
  carries.

Composite conditions are forbidden going forward: one entry, one
condition type (FedRAMP one-row-one-type; GCC meta-bug dependency
graphs; DPDK atomic Depends-on; todo_or_die by:+if: parameter
composition).

### D5 defer-0004 honest reclassification via a real assertion

defer-0004 keeps presence-condition ONLY if paired with a real
zero-dependency assertion script scripts/check-ci-jobs.js (asserts
.github ci.yml declares >1 top-level job) referenced by verified_by.
Internal state changes are NOT external-event (no external party), and
no decorative grep is allowed. If the script cannot be written the
honest fallback is free-text + pending-evaluation.

### D6 Verified-by enforcement (fail-closed)

check-deferred.js gains a structural rule: an entry typed
presence-condition or count-threshold MUST carry verified_by pointing
to an existing script; otherwise it is treated as non-evaluable and
forced to status pending-evaluation (FedRAMP Validated-vs-Pending: a
classification claim without a verification channel defaults to
Pending). A satisfied assertion only SUGGESTS activation in gate
output; it never auto-activates or auto-removes an entry (Azure
exemption expiry semantics; stale-bot auto-close is a rejected
anti-pattern).

## Rejected alternatives

- R1 Auto-activation / auto-removal by gates. Records persist for
  audit; disposition is human. (GitHub stale-bot auto-close is widely
  rejected.)
- R2 Decorative assertions for non-evaluable conditions (grep-the-
  keyword theatre). Requirements-smell and SATD evidence: a false
  verifiability label is worse than an honest unverifiable one.
- R3 OPA/Sentinel/Rego or any external policy engine (ADR-0033 R6
  stands; zero-dependency discipline).
- R4 Monthly check-in cadence. FedRAMP monthly applies only to VD
  findings with 30-day mitigation duties; our items are OR-class.
  Alarm-fatigue data (overload -> desensitization) rejects monthly for
  a solo maintainer.
- R5 Migrating defer-0005 to coverage-map.json. Different namespace and
  granularity (iron-law x gsr matrix vs host-protocol verification);
  migration would create a second false classification.
- R6 Changing review_at values without the tier ladder in ADR text.
  Off-ledger date changes recreate the batch-assigned same-day failure
  (77% intend-to-clean / 75% survive pattern from ADR-0033 context).

## Consequences

- docs/deferred-registry.json changes ship in the same commit as this
  ADR (coupling guard ADR-0027/0034).
- check-deferred.js gains D2/D3/D6 checks with jest coverage in the
  impl round; warn-level output must not shift gate:all exit codes.
- CONTEXT.md gains three terms and a decision-log line.
