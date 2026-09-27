# grill-t30 trial protocol — first external effectiveness trial (CodeBuddy)

Source decisions: `decision-ledger.md` D-003 (all current). Carrier:
ADR-0087 D-D. Registered judgment lines:
`bench/codebuddy-trial/judgment-lines.json` (immutable body; this text
describes the protocol, the file holds the criteria).

## Paradigm

SCED (single-case experimental design), multiphase A1-A2-A3. The subject
(a CodeBuddy Code session) supplies its own cross-phase control.
Legitimate output: hit/miss against the preregistered lines plus an
effect-size impression. Never a p-value, never a "works better" claim
without a preregistered line hit.

## Phases

| Phase | Injection | Volume | Purpose |
| --- | --- | --- | --- |
| P0 baseline | none | A | item 0 = telemetry self-verification (deny counter + InstructionsLoaded proven live); items 1+ = untreated baseline |
| P1 generator-only | rules advisory (generator profile) | B | isolate the advisory tier's contribution |
| P2 verifier | verifier profile, hooks fully on | C + 2-3 A-shaped replays | enforcement on; A-replays are the within-phase anti-learning-effect control |

Phase order is fixed (P0 -> P1 -> P2); the baseline must be contamination-
free of both injection tiers.

## Telemetry self-verification (P0 item 0 — mandatory gate)

Before any data is trusted, a known-violation probe must show:

1. the PreToolUse guard emits `permissionDecision: "deny"` into
   `.jiahao-pretool.jsonl` on a protected-surface call;
2. InstructionsLoaded writes both rules files' sha256 into
   `.jiahao-instructions.jsonl` on session start.

If item 0 fails, the host's telemetry channel is unproven and the trial
does not proceed to measurement (unverified counter -> unverified
readings). The failure itself is recorded and reported.

## Capture points

- All phases: `.jiahao-instructions.jsonl` per session, the append-only
  `.jiahao-evidence` log, and each task's claim text saved verbatim for
  offline `detect()` four-way classification
  (all-touched / admission / omission / overclaim).
- Phase 2 additionally: deny count and bypass-attempt records from
  `.jiahao-pretool.jsonl`.
- Offline analysis uses the frozen detector pinned in the registration
  file (`src/detector.js` sha256 + landing commit). Host version changes
  during the trial register as errata.

## Deviations

Any departure from this protocol during execution is disclosed as a
deviation record and re-labelled exploratory where applicable
(OSF/Registered-Reports convention). The registration body is immutable.

## Polygraph appendix

`bench/polygraph` material may be used ONLY to probe the deny apparatus
mechanically (e.g., feeding corpus texts at the PreToolUse surface). It is
never cited as effectiveness evidence — bench scores are not in-the-wild
behavior.

## Boundary

The agent authored this protocol, the task volumes, and the judgment
lines. Executing the three phases — installing the bundle, driving the
interactive host, collecting the logs — is an owner action in the owner's
CodeBuddy environment. The agent never runs the trial on the owner's
behalf.
