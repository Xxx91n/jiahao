---
name: Bug report
about: The installer, hooks, gate, or adapters behave wrongly
title: "[bug] "
labels: bug
---

<!-- Added under the grill-t23 governance carve-out (ADR-0076); disclosed in the round ledger. -->

## What happened

<!-- one or two sentences; a location (file:line, hook event, exit code)
     is worth more than a paragraph -->

## Evidence

```sh
# the command or hook event that shows it, and its actual output/exit code
```

## Expected

## Environment

- Host (claude-code / codex / copilot / qoder / cursor / windsurf / cline /
  opencode / aider / instruction-tier):
- Profile (generator / verifier) and install channel (`npx github:` / Tier 0 / source clone):
- Node.js version:

## Known-degradation check

- [ ] I read the host-tier table in the README — this is not one of the
      documented degradations (copilot `sessionStart`, opencode hooks, aider
      opt-in `read:`).
