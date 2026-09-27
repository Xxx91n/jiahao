# ADR-0054: Anchor Freshness Verification and Re-Anchoring Activation

Status: Accepted

Date: 2026-09-09

References: ADR-0036 (Soft-Hard Freshness Ladder), ADR-0041 (free-script exit
domain), ADR-0042 (checked config-load failures), ADR-0045
(stochastic-deterministic boundary), ADR-0047 (Calibration Interval),
ADR-0051 (persistence capability class), ADR-0052 (witness-unavailable
recovery), ADR-0053 (periodic re-anchoring).

## Context

The audit round for `codex/audit-adr0051-0053-fix` closed the anchor
implementation, but exposed that ADR-0053's periodic re-anchoring is still
opt-in: production install calls `sealForwardIfNeeded()` with no cadence, so
an installed chain stays one-time sealed. Six serial atomcode researches
(Q1-Q6) cross-checked the industry models for witness freshness, controlled
rotation, and read-only verification. This document records the resulting
decisions and glossary terms; it changes no source, gate, schema, or
executable wiring surface.

## Decision

### D-A - The verification CLI exposes degraded fallback, not a plain pass

When `verifyTail()` / `verifyFull()` fall back to the last good seal, the
result carries `fallback: 'last_good_seal'` and a machine-readable
`recovery_window`. `scripts/verify-evidence.js` must include those fields
(plus the already-registered `consumer`), and `recovery_window` gains
`sealed_head_hash` as the seal identity. The exit contract stays `0/1`: a
last-good-seal fallback is still a self-consistent chain, not a new failure
code.

### D-B - Rebuild disposition records the boundary identity

The `witness_recovery` audit record records `last_good_seal` with
`{sealed_seq, sealed_total_count, sealed_head_hash, post_seal_count}` or
`null`, plus `prev_generation`. `null` means a hard-stop rebuild had no seal
basis, which is itself audit information. No new `KNOWN_ANCHOR_STATUS` value
is added.

### D-C - Re-anchor cadence is a declared config contract with a 72h floor

Periodic re-anchoring is enabled by a new per-concern `.jiahao-anchor.json`
under the existing config directory. The anchored default is
`reanchorMs: 72h`; `reanchorCommits` is an operator-optional knob with no
default. Resolution is `injected > operator declaration > anchored default`.
A missing or malformed config resolves to the anchored default, never to
"never re-anchor"; malformed values fail closed via ADR-0042
`ConfigLoadError`.

### D-D - Freshness is a separate verification axis from integrity

Verification keeps `valid` as the integrity-only boolean and adds a
`freshness` axis `fresh | stale | hard_stale`, plus a top-level
`pass | warn | fail` synthesized verdict. The Soft-Hard Freshness Ladder
(ADR-0036) applies: `warn` at tier expiry, `fail` at `1.5x` tier. The gate
fails closed on `hard_stale`; staleness is never folded into `valid:false`.

### D-E - Verification stays read-only; re-anchoring writes are a maintenance surface

The verifier may write its own audit trail (warning and evidence entry) but
must never write the verified anchor surface (seal, anchor, or chain
record). Periodic re-anchoring writes belong to an independent maintenance
command, not the verify path. Cold verification may run only a read-only
seal-check that reports staleness; it never re-anchors.

## Rejected Alternatives

- Seal-on-verification: makes the verifier a committer, breaks ADR-0045
  proposer-verifier-commit separation, and can self-refresh a stale witness
  to mask staleness.
- Folding staleness into `valid:false`: conflates a merely old witness with
  corruption, the same merge anti-pattern ADR-0052 rejects.
- Extending `.jiahao-persistence.json` or building a unified config schema:
  mixes operator policy into an observed-capability file, or adds a
  speculative seam for one knob.

## Consequences

- The next implementation round wires D-A through D-E: CLI fallback
  exposure, rebuild boundary identity, `.jiahao-anchor.json` cadence
  resolution, freshness axis plus verdict, and the read-only verifier /
  maintenance-surface split.
- `reanchorMs: 72h` is an initial floor aligned with the ADR-0052 soft
  deadline; data-driven cadence calibration remains out of scope.
- `CONTEXT.md` gains Recovery Window / Last-Good-Seal Fallback,
  Last-Good-Seal Identity, Rebuild Disposition Contract, Re-Anchor Contract,
  Anchor Freshness Severity, and Verifier Write Surface.
- The README ADR index rebuilds to 54 records.

## Acceptance

This document round changes no source, gate, schema, or executable wiring
surface. `docs/deferred-registry.json` still parses and the README ADR index
stays in sync with `docs/adr/`.

## Sources

Serial atomcode research: `atomcode-q1-recovery-window-cli`,
`atomcode-q2-rebuild-seal-identity`,
`atomcode-q3-reanchor-cadence-activation`,
`atomcode-q4-stale-seal-result-carrier`,
`atomcode-q5-seal-on-verification-write-boundary`,
`atomcode-q6-cadence-config-location-defaults`.
