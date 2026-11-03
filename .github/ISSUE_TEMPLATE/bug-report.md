---
name: Bug report
about: The installer, a hook, the turn-end gate, or an adapter bundle does not do what the README says
title: "[bug] "
labels: bug
---

## What goes wrong

One or two sentences. A location is worth more than a paragraph — name the file and line, the hook event, or the exit code you saw.

## How to see it

Paste the command exactly as you ran it and paste what it printed, exit code included. Do not summarize the output. If you have not run it, say so here instead of writing a guess.

```sh

```

## What you expected instead

## Your setup

- Host and version (for example `codex-cli 0.163.0`, Copilot CLI 1.0.105, Qoder Desktop 0.4.11):
- Install path — rules version (`npx skills add`, instructions only) or plugin version (one bundle under `adapters/`, with hooks):
- Profile — `generator` or `verifier`. The plugin version reads a `.jiahao-profile` file; if you never wrote one the default is `verifier`. `node scripts/install.js init -y` prints the value it would write:
- Node.js version and OS:

## Before you file

- [ ] I searched the open issues for the same report.
- [ ] I read "Boundaries and limitations" in the README (<https://github.com/Xxx91n/jiahao#boundaries-and-limitations>) and this is not one of the limits listed there. If it is listed, file it anyway and say what you expected instead.
