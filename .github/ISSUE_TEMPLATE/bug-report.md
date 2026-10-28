---
name: Bug report
about: The installer, hooks, gate, or adapters behave wrongly
title: "[bug] "
labels: bug
---

<!-- Added under the grill-t23 governance carve-out; disclosed in the round ledger. -->

## What happened

<!-- one or two sentences; a location (file:line, hook event, exit code)
     is worth more than a paragraph -->

## Evidence

```sh
# the command or hook event that shows it, and its actual output/exit code
```

## Expected

## Environment

- Host (rules version / codebuddy / claude-code / other):
- Profile (generator / verifier) and install channel (`npx skills add` / host plugin command / source clone):
- Node.js version:

## Known-limitation check

- [ ] I read the install section in the README — this is not a documented
      limitation (rules version has no hooks; the Claude Code plugin bundle is
      not in this tree yet).
