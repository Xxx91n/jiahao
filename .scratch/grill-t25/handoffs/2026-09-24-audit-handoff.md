# grill-t25 audit handoff — 2026-09-24

Role: second-party audit window. Two passes: initial audit (report
`reports/2026-09-24-audit.md`, commit `3ddbdbf` on lane `grill-t25-audit`)
returned F-A..F-D; rework re-audited at tip `3c53175` — **PASS**.

## Verdict

PASS. All four findings remediated and independently re-verified; the
rework's self-found defect (ephemeral workspace-sha citations) is real,
fixed, and disclosed. One residual wording nit carried below — reported,
not retro-approved.

## Acceptance re-run at tip `3c53175` (independent, this window)

| Leg | Result |
| --- | --- |
| jest (workspace) | 79/79 suites, 1345/1345 |
| `run-gates.js` | exit 0, 36 entries, 4 UNVERIFIABLE (ci-mode, honest) |
| `build-rewrite-map.js --check` | exit 0, in sync (2645 citations) |
| `build-rewrite-map.js --published-only` | exit 0 |
| `build-round-facts.js --check --report` | exit 1 canon-stale only; region==canon |
| ordering invariant (adr-0084-wiring) | green on workspace HEAD |
| fresh clone (`--no-local`, HEAD `f805e46`, 0 gb-local refs) | jest 79/79 (1338+7skip), gates exit 0 (10 UNVERIFIABLE), `--check`→2 UNVERIFIABLE, `--published-only`→0, pack-smoke 0 (345,326B) |
| evidence headers | 49/49 committed `captured-at-head` resolve to durable ancestors of tip; 0 ephemeral |

## Finding dispositions

- F-A `zero_product_diff`: `false`→`true` in `docs/governance/trend-inventory.json`; wiring pin now asserts the honest value. VERIFIED.
- F-B clobbered test titles (`ADR-0059`, `ADR-0039 D3`): restored. VERIFIED.
- F-C red terminal evidence: `run-test-gate`, `adr-0084-wiring`, `gate-all`, `clone-acceptance`, `clean-tree` all re-captured green at tip; `6c52b16` subject overclaim disclosed in report, not rewritten (correct choice). VERIFIED.
- F-D facts region: re-spliced, byte-identical to canon; only the disclosed canon-as_of drift remains. VERIFIED.

## Residuals (reported, not blocking)

- `evidence/round-facts.txt` at tip still records **EXIT 2 verifier-broken**
  (jest cannot spawn inside the capture harness on this host), while the
  report calls it "canon-as_of drift shape". The live check is EXIT 1
  canon-stale; the committed bytes record a different failure mode. Red is
  disclosed; the failure-mode label is imprecise.
- Handoff line "workspace commit absent from any clone's object store" is
  overbroad: the *current* HEAD workspace commit does travel into a fresh
  clone via HEAD resolution; historical ones don't. Substance correct.

## Traps learned this round (carry forward)

1. `git rev-parse HEAD` under GitButler lanes returns the ephemeral
   Workspace Commit — never cite it in `captured-at-head`; use
   `git log -1 --invert-grep --grep='^GitButler Workspace Commit'`.
2. Never place a clone under `.scratch/`: `testPathIgnorePatterns:
   \.scratch` is matched against absolute paths, so every test file is
   ignored and jest exits 1 "0 matches" — a false clone failure.
3. `cmd | tail; echo $?` reports tail's exit, not the command's — capture
   status before piping.

## Human actions still pending (unchanged)

- Push annotated tag `adjudicated/grill-t25` naming landed tip SHA.
- Adjudicate `human-authority-package.md` (renew/expire/exemption+expiry).
- Entity-level countersign or downgrade for the 10 queue ADRs
  (`return-by: 2026-12-15`).
- First green CI closes `defer-0070`; `defer-0071` review 2026-12-15.
- `check-ci-jobs` stays red until `defer-0004` lands (carried residual).

## Next grill direction

The generalized ordering invariant now re-captures **every** round's
evidence directory after **every** anchoring commit — this round needed
20+ non-anchoring re-capture waves and still landed one anchoring commit
(this audit report) that re-poisoned the anchor. The treadmill cost grows
with round count and the freshness-vs-anchoring semantics deserve a hard
look: candidate grill = whether `captured-at-head` should bind to the
capture's own anchoring commit instead of chasing the latest one, or
whether the invariant needs a per-round anchor namespace.
