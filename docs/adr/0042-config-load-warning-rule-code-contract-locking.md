# ADR-0042: Checked Config-Load Failures, Warning Rule Codes, and Contract Locking

Status: Accepted
Date: 2026-09-03

Amends: ADR-0041 (D3 warning identity and regression-lock detail)

References: ADR-0027 (alarm-fatigue and warning aggregation), ADR-0031 (wiring
assertion discipline), ADR-0034 (gates.json registry and decision/evidence separation),
ADR-0040 (capability probing and three-state exit), ADR-0041 (exit semantics and stderr
prefix closed enum).

## Context

The ADR-0041 grill round left three decisions as Q1=A, Q2=A, and Q4=A. They are
consequences of the exit-semantics contract rather than independent features:

1. `gates.json` is a required integrity fact source. `run-gates.js` still let
   `JSON.parse(fs.readFileSync(...))` escape as a bare stack trace, so a missing or
   corrupt registry could not be distinguished from an unlabelled crash.
2. Warn-only paths still used the ad hoc `[jiahao]` identity token on stderr. The
   closed-enum decision in ADR-0041 covers displaced fail-path stderr lines, not
   advisory warning identities; warnings need their own controlled rule code.
3. The ADR-0041 wiring test relied on scanning single-quoted source literals for the
   prefix vocabulary. That lock did not verify the executable contract and would falsely
   accept a refactor that moved the prefix into a variable, nor should it lock warning
   body text.

The industry patterns selected from the atomcode research for these points are:
checked error objects with a stable machine surface (Rust miette/rustc, ESLint SARIF
rule IDs), warning/lint codes with lifecycle and documentation anchors (Ruff, BuildKit,
SARIF reporting descriptors), and reference-integrity tests that verify the referenced
artifact rather than scanning a literal representation (Sphinx `-n`, rustdoc
`broken_intra_doc_links`).

## Decision

- D1 Checked `ConfigLoadError` for `gates.json`. `scripts/run-gates.js`
  `loadRegistry()` catches read/parse failures and throws a checked
  `ConfigLoadError` carrying the failing path and original cause. `main()` catches it,
  writes `[config]: FAIL: <message>` as the first stderr line, and exits 1. Missing or
  corrupt registry is fail-closed and never produces a bare stack.
- D2 Warning Rule Code. Advisory warning identity is a controlled code, not a free
  identity token. The machine surface is a GitHub workflow-command annotation with
  `title=<code>` on stdout; the message body remains free text. The initial codes are
  `corpus-freshness` and `judge-stale`. Warn-only paths continue to exit 0 and do not use
  the ADR-0041 `[usage]:/[config]:/[internal]:` stderr enum.
- D3 Contract Locking. The ADR-0041 regression lock verifies the executable contract:
  the closed prefix vocabulary, a spawned missing-registry failure, reference integrity
  of registry commands and ADR source paths, and controlled warning rule codes. It no
  longer scans single-quoted literals as the lock mechanism and does not assert warning
  body text.
- D4 Lane Atomic Dependency. A wiring hunk is committed as its own bottom commit on the
  lane that depends on `codex/adr0036-impl`; it does not ride along with unrelated hook,
  result, or artifact residue. This preserves merge attribution without touching another
  agent's lane.

## Consequences

- A damaged or missing registry is machine-matchable as `[config]:` and fail-closed.
- Warning identities have stable codes on the same machine surface GitHub already
  renders.
- The regression lock fails red when a registry reference or spawned category contract
  breaks, without over-fitting to source formatting.
- The implementation lane stays atomic and reviewable.

## Rejected alternatives

- R1 let `loadRegistry()` throw the raw `SyntaxError` or `ENOENT` and print the stack.
  Rejected because ADR-0041 requires displaced config failures to be labelled `[config]:`.
- R2 normalize `[jiahao]` into the ADR-0041 stderr enum. Rejected by Q2: warnings are
  not displaced fail-path notifications and must not pollute the closed error prefix enum.
- R3 retain single-quote source scanning as the contract lock. Rejected because it does
  not test the executable behavior and is sensitive to formatting refactors.
