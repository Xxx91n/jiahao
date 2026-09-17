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
- When reporting artifacts in chat (specs, plans, ledgers, handoffs, diffs),
  cite every file by its full absolute path; never report only a bare
  filename or repo-relative path.
- Intermediate commits inside a round may be red (t12 audit O-B); only the
  round-final state must be green. A red mid-round commit is not a defect —
  it is disclosed in the round report rather than silently amended.
