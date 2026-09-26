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
  adjudication - verdict issuance stays owner-side.
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
  commit's landed set (`git show --name-only`). The list is DERIVED from
  the `but commit` allowlist ids resolved to paths - never hand-typed.
  The footer is a replayable self-description: forensic, not preventive
  (committer and writer share a trust domain; it cannot stop forgery);
  live verification is always `git show --name-only`, which the
  `anchoring-footer` leg rechecks. Forward-only scope: history is never
  rewritten; merge commits and workspace commits are exempt.
