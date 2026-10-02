# Jiahao (嘉豪)

A dual-profile prompt-as-mental-model distribution:
a **generator profile** (3 surface-signal rules, advisory) installed in the
primary agent, and a **verifier profile** (7 iron laws + 6-rung ladder,
blocking) installed in a second-party audit agent. Profile is selected at
install time via `.jiahao-profile` (default: verifier).

## Agent skills

### Issue tracker

Local markdown issues under .scratch/. See docs/agents/issue-tracker.md.

### Domain docs

Single-context: CONTEXT.md at root, ADRs in docs/adr/. See
docs/agents/domain.md.

## Working agreement

- After every documentation round, commit that round's doc artifacts (the new
  ADR, `CONTEXT.md` glossary sync, `docs/deferred-registry.json` sync, README
  ADR index rebuild, and wiring-test seed update) before the next
  implementation round starts.
- Round edit surfaces follow ADR-0076 (`docs/adr/0076-round-edit-surface-taxonomy-and-governance-carve-out.md`): documentation rounds touch the documentation surface only; governance machinery moves through the registered carve-out; the runtime require-chain is implementation-round territory.
- When reporting artifacts in chat (specs, plans, ledgers, handoffs, diffs),
  cite every file by its full absolute path; never report only a bare
  filename or repo-relative path.
- Committed documentation artifacts (specs, plans, ledgers, handoffs, ADRs,
  registry/JSON syncs) are authored via `fs.writeFileSync` or file-edit
  tools only — never through escape-interpreting shell layers, which eat
  backslashes, `$names`, and octal sequences (grill-t18 D-006). Post-write:
  re-read the file and byte-check the critical fragments before committing.
- A captured-evidence `$` line names the verbatim argv or is explicitly
  marked display-form (grill-t20, audit B-2 convention).
- Evidence counts in committed prose write split form ("17 captures + 1
  fixture"); bare totals forbidden where a capture/fixture split exists
  (grill-t21 C-7; checklist tick in closeout; two-round lookback in the
  round ledger).
- Intermediate commits inside a round may be red (t12 audit O-B); only the
  round-final state must be green. A red mid-round commit is not a defect —
  it is disclosed in the round report rather than silently amended.
- `but commit` runs with an explicit path/hunk-id allowlist — every id is
  named in the command; a bare `but commit` (staged-pool sweep) is forbidden
  for round work (ADR-0083 D-C).
- After every `but commit`, run `git show --name-only <sha>` and verify the
  landed file list equals the intended set; any tool sweep past the filter
  is disclosed in the round report, not silently repaired (ADR-0083 D-C).

- Audit reports are claim artifacts: they live in the registered claim
  surfaces (`<round>/reports/` or `<round>/handoffs/`), never under
  `audit-evidence/` (examiner work product, never-commit nc-001). A
  report may only claim committed-surface-reachable evidence; untracked
  captures are referenced by path/count pointers, never copied into the
  committed surface (grill-t28 D-003). Artifact residence is not
  adjudication - verdict issuance stays owner-side. The nc-001 convention
  semantics is ignored-by-design: never committed, NOT required to be
  visible in `git status` (grill-t36 D-008 - the `.gitignore` collection of
  `.scratch/*/audit*-evidence/` and `.scratch/*/audit-backup/` mechanizes
  the convention at the channel level, so absence from status is the
  convention working, not a gap; the tracked LEGACY instances named in
  `test/adr-0083-wiring.test.js` stay readable because an ignore rule is
  constructively inert on a tracked path).
- Wave-closeout order (E-17, grill-t30 D-004): re-capture evidence pins
  -> regenerate derived artifacts (rewrite-map LAST) -> `node
  scripts/build-rewrite-map.js --check` + `--published-only` clean ->
  declare. Tide-eve disposition re-verification (grill-t34 D-003(vii), ADR-0090): before declaring, re-verify each queued member's registered disposition is current - a stale disposition is an errata, never silently executed; Final leg (E-19, grill-t30 loop-2 re-audit): after the LAST
  `but` mutation (commit/uncommit/move/restack) settles and before
  declaring, re-run `--check` against the settled tree — the interval
  between a workspace rewrite and evaluation is the F-6 exposure
  window; never declare inside it. The `map-freshness` gate leg (order
  224) asserts it per claim-surface commit;
  `.githooks/pre-commit-user` blocks a staged
  claim-surface commit while the map is stale. `but commit` bypasses the
  hook by construction — the leg is the authority; repair = regen +
  follow-up wave, never a bot auto-commit (ADR-0083 D-C).
- Post-restack ritual (grill-t28 D-005): after any `but move`,
  restack, or undo on a lane containing claim commits, re-run the full
  `evaluateRound` for the affected round(s) before new claims or
  seals; route any orphaned pinned sha through a registered erratum and
  resume claims/seal only afterward. The `orphan-ancestry` gate leg
  enforces the standing contract mechanically - a red leg means no new
  claims and no seal (red-light response - rebuild, re-seal, or declared
  drift - is a human call). The residual exposure window is the interval
  between the mutating act and the next gate evaluation - this ritual is
  the contract covering it (grill-t29 F-6). Human-only adjudication
  points (grill-t29 F-7): errata adjudication, re-seal authorization,
  trigger interpretation, and waiver issuance are owner acts - the agent
  reports state, never issues verdicts.
- Hermetic test repos (grill-t29 D-004, F-14 candidate): every git WRITE
  op in `test/**.js` (`commit`, `commit-tree`, `tag`, `merge`, `init`,
  `add`, `rm`, `update-ref`, `branch`, `config`, ...) routes through
  `test/helpers/git-hermetic.js`, which injects inline `-c` identity and
  `GIT_CONFIG_NOSYSTEM`/`GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` isolation
  so ambient machine config can neither supply identity nor leak into
  fixture repos. Read-verb calls may stay raw; write ops bypassing the
  helper fail the `test-git-hermetic` gate leg.
- `[ANCHORING]` footer (grill-t29 D-006): every non-merge, non-"GitButler
  Workspace Commit" commit created on a round lane after this
  convention's registration carries a footer line
  `[ANCHORING] <space-separated file list>` whose file set equals the
  commit's landed set (`git show --name-only`). The list is DERIVED, never
  hand-typed: `node scripts/derive-anchoring-footer.js --ids <id> ...`
  resolves the `but commit` allowlist ids to paths and prints the exact
  footer line to paste into `-m`; `--commit <sha>` reproduces it from the
  landed set for replay (grill-t29 A-4c - the derivation is now a tool,
  not a convention claim).
  The footer is a replayable self-description: forensic, not preventive
  (committer and writer share a trust domain; it cannot stop forgery);
  live verification is always `git show --name-only`, which the
  `anchoring-footer` leg rechecks. Forward-only scope: history is never
  rewritten; merge commits and workspace commits are exempt.
- Bare-SHA citations in NEW committed prose should carry subject/date
  context (editorial soft-constraint, grill-t32 D-001(c) / spec-t32 §7):
  when new committed documentation cites a hex object, prefer a form that
  names what the object is — `<sha-prefix> (<subject or date>)` — over a
  bare SHA. Not mechanized, no gate; the classifier classifies the cite
  identically either way, so this is a readability/debuggability clause —
  it binds NEW prose only and never retro-edits historical claims.
- Countersign-queue authority (grill-t33 D-002(vii)): queue membership is
  authoritative on each ADR's own declaration surface — the three
  registered awaiting forms (old-form `ID-level-only, awaiting
  entity-level` labels, ERRATA E-13 pointer-annotation lines, new-form
  `awaiting entity-level countersign` status) define the queue as a
  derived set; `test/countersign-queue.test.js` reconciles membership
  member-by-member. Count narratives ("N -> N+1" bump lines, "N entries"
  enumerations) are display text: they stay byte-stable as history, and
  NEW ADRs must not write count lines.
- Baseline-CI clause (grill-t33 D-003(iv)): every round's T-0 baseline
  recon MUST include a public-CI status check — the origin/main tip's
  latest run conclusion and the failing step named. Two consecutive
  rounds with the same undisclosed-red blind spot is a registered
  finding class, not a coincidence.
- Audit coverage contract (grill-t34 D-004): second-party audit reports carry
  a machine-readable `<!-- audit-coverage v1 -->` coverage block (ADR-0091);
  the `audit-surface` leg asserts the latest in-scope report's block covers
  the derived CI checklist; `node scripts/build-audit-checklist.js emit`
  prints the current checklist for the auditor to attest. The interim manual
  clause (grill-t33 D-004(i)) retired with the mechanism - no coexistence
  window.
- Class-vs-sample discipline (grill-t36 D-007): a claim about a class
  requires verifying the class - name the enumeration surface or register the
  residual; a passing sample is evidence about the sample, not the class
  (ISA 530 / PCAOB AS 2315 prototype: a conclusion extrapolates only to the
  population it names). The two sentence-forms never merge: a finite
  enumeration hole is closed by declaration, an open byte class is repaired,
  never closed. Worked instance, bounded to what was actually measured: the
  "What I got wrong three times, in the same shape" section of
  `.scratch/grill-t35/reports/2026-10-01-report.md` - three instances of one
  shape, NOT a claim that four rounds share the root. Not mechanized here:
  any gate or leg enforcing this must arrive through the Δ2/Declaration
  channel, never as a quiet tooling change. Cross-ref CONTEXT.md
  `Evidence-Tiered Readiness`.
