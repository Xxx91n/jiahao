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
  tools only — never through escape-interpreting shell layers (heredoc,
  `echo`, inline `node -e` strings), which eat backslashes, `$names`, and
  octal sequences (grill-t18 D-006). Post-write: re-read the file and
  byte-check the critical fragments before committing.
- A captured-evidence `$` line names the verbatim argv or is explicitly
  marked display-form (grill-t20, audit B-2 convention).
- Evidence counts in committed prose write split form ("17 captures + 1
  fixture"); a bare total is forbidden where a capture/fixture split
  exists (grill-t21, audit C-7 convention). Checklist tick in the
  closeout/audit loop; a two-round effectiveness lookback is registered
  in the round ledger.
- Intermediate commits inside a round may be red (t12 audit O-B); only the
  round-final state must be green. A red mid-round commit is not a defect —
  it is disclosed in the round report rather than silently amended.
