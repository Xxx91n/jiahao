# ADR-0084: The Public-Clone Verifiability Contract - Clone-Degradable Old-Side Verification, the Fourth Mandatory Audit Line, the Landing-Tail Wave Convention, Stop-Bleed Exception Narrowness, Tag Timing, and the First-Disclosure-Channel Rule (grill-t25 fix round)

- Status: Accepted
- Date: 2026-09-24
- Ledger: `.scratch/grill-t25/decision-ledger.md` - grill-t25 D-001..D-005 (D-001/D-002 revised-preserved, D-003..D-005 current)
- Spec: `.scratch/grill-t25/spec-t25-disposition.md` (V6 critique response)

## Context

The grill-t25 V6 critique showed the public tip red under three independent lenses, all sharing one root: verification was authored against the maintainer object store, never against what a public consumer can actually clone. (a) Committed evidence headers lagged the landed tip - the ADR-0083 D-A ordering invariant correctly fired. (b) `build-rewrite-map.js --check` exited 1 in a fresh clone because the `gb-local/*` old-side refs that carry pre-purge objects exist only on the maintainer side and never publish - a capability absence was being reported as a verifier failure. (c) Zero tags existed on origin while ADR-0069 clone-red legs assert an annotated adjudication tag - the push was an unfinished human-authority step, silently pending. One ADR carries the six clauses because they are one contract: what a public clone may rely on, who may bypass the PR lane and when, and how corrections are classified. (Ledger D-001: the over-codification bound again forbids splitting.)

## Decision

### D-A - Clone-degradability contract (capability probe)

1. The capability `old-side-refs` is registered in the closed enum (ADR-0040 D1): existence-only probing - a `gb-local/*` ref outside `gitbutler` internals exists under `refs/remotes/` on the maintainer object store. Which commits those refs carry stays with the gate (ADR-0040 D2).
2. `rewrite-map` declares `requires: ["repo-tree", "old-side-refs"]`. When the probe returns a deterministic negative - a fresh public clone - the gate exits 2 UNVERIFIABLE via the registered two-line channel, never exit 1: absence is a capability negative, not a red map.
3. The same exit-2 channel serves the post-discovery edge (refs exist but none qualify as old-side lines) through the shared `exitUnverifiable` helper in `src/shared/capability.js` - gate scripts carry zero `process.exit(2)` sites (ADR-0041 wiring pin preserved).
4. `--published-only` asserts the published-side subset with no old-side objects: citation coverage (every hex citation in tracked docs appears in `doc_refs`), the class enum, count self-consistency, and published-side ancestry. It runs identically on a fresh clone and is registered as the `rewrite-map-published` gate (order 209, `requires: ["repo-tree"]`).
5. Public consumers therefore keep a real check: internal consistency is verified everywhere; only the old-side join is maintainer-scoped.

### D-B - Fourth mandatory audit line: public-clone green

Every audit window MUST additionally verify from a clean public clone, not the maintainer object store: `git clone` to a fresh dir, then jest + `gate:all` at the tip. Maintainer-side green is not evidence a public consumer sees green - the clone is the consumer's object store. The ADR-0083 D-E audit lines stand at three; this line is the fourth, registered here (ADR-0083 carries only a pointer).

### D-C - Landing-tail convention

The branch tip commit at round close MUST be a re-capture wave (the non-anchoring class of ADR-0083 D-A.2): evidence headers then name the last anchoring commit and the landed tip is self-consistent. Merge commits are naturally non-anchoring - `git diff-tree` on a merge is empty against the first parent - so a merged tip stays green under the ordering invariant.

### D-D - Exception narrowness (stop-bleed direct-push class)

Direct push to `main` applies ONLY to stop-bleed-class commits: evidence re-capture waves plus the degrade code required for clone-red repair, each disclosed per round in the report (break-glass audit-log equivalent). The exception channel never generalizes into the norm - normative content always rides the PR lane (NIST exception-channel precedent: exceptions without narrow scoping calcify).

### D-E - Tag timing

The `adjudicated/<round>` annotated tag push lands within the same round and is always executed by the human - the annotation is the minimal review act and the tag is an independent authority tier, never reused, never delegated. Its dependency on human availability is declared here, not hidden: between landing and tag push the ADR-0069 clone-red legs stay red and that state is disclosed, not silently pending.

### D-F - First-disclosure-channel rule (ledger D-005.1c)

Corrections classify by the channel that disclosed them FIRST; later independent re-verification does not reclassify. A mechanical-fault claim bears the burden of proving the commit contains no negation of a prior claim. First application: `bbf5259` registers as the first Re-Execution Prior directional event (internal disclosure channel), separately registered in CONTEXT.md - the prior n=19 snapshot stays untouched.

### D-G - Registrations and round bookkeeping

- `defer-0070` - CI-red history registration: the public branch ran a failure streak (40/40 workflow runs failing at registration time, 2026-09-11 through 2026-09-23); registered with owner + review date per the anti-registry-rot rule.
- `defer-0071` - generalized continuous monitoring: explicitly deferred this round; the wiring suite pins the minimal automatable invariant instead (fitness-function convention).
- Countersign queue (10 entries, ADR-0064..ADR-0074 subset): labeled "ID-level-only, awaiting entity-level" each with a return condition and date - labels without return conditions degrade into permanent exemption.
- Secret-scan fourth surface: commit messages join the enumeration (the GitHub-official enumeration does not include commit-message bodies - the increment rationale is registered honestly).
- `grill-t25` trend row: `kind:fix`, `adr_added:["0084"]`, `deferred_entry` names the round's defer ids, `governance_tooling_diff` lists every R2 machinery hand-edit (ADR-0078 obligation).

## Consequences

- A public clone stops reporting maintainer-only assets as failures, and stops pretending they are verified: capability absence is honest UNVERIFIABLE, internal consistency is checkable everywhere.
- Audit windows now prove what the consumer sees, closing the maintainer-vs-public asymmetry that let the criticized tip stay red unnoticed.
- The landing-tail convention makes the ordering invariant convergent instead of open-ended: every round terminates on a re-capture wave.
- Exception, tag, and disclosure rules are written where the next round reads them - the human authority steps are declared dependencies, not silent pendings.
- Wiring pins: `test/adr-0084-wiring.test.js` pins the clause set, the capability registration + probe shape, the `rewrite-map-published` gate entry, the published-only exit-2 degrade on a git-init clone-sim, the trend row, the defer registrations, the countersign labels with return conditions, and the fourth secret-scan surface.
