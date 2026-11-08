---
name: Reproduction does not match
about: You ran something and got a different number or result than the one we published
title: "[repro] "
labels: needs-triage
---

Use this when a published value does not reproduce — a blocking level label in the README install table, a test count, a number in a release note, or a value in a file under `docs/evidence/`.

Fill in both sides: what we published, and what your run reported. If the install or a hook simply misbehaves, use the bug report template instead.

## What we published, and where

Name the file and the place, for example "the Codex CLI row of the install table in `README.md`, blocking level A", and quote the value.

## What you ran

The command, pasted as you ran it:

```sh

```

## What it reported

Paste the output lines and the exit code. Do not paraphrase.

## What you checked out

- npm package version, git tag, or commit sha:
- How you got it — npm, `npx skills add Xxx91n/jiahao`, or a clone:
- Host and version, when the value you are checking is a host row (for example `codex-cli 0.163.0`):
- OS and Node.js version:

## If a check skipped or refused instead of running

The benchmark corpus is not in the npm package or a public clone; a run from a clone uses the committed fixture under `test/fixtures/corpus/`. A check that needs more says so instead of passing: a test skips with the reason in its name, a capability-gated script exits 2 with an `UNVERIFIABLE` line naming the missing capability, or another script exits 1 printing a line containing `[corpus] missing`. If you legitimately hold the corpus, point `JIAHAO_CORPUS_DIR` at it.

A check that printed none of those and still reported a pass is the report this template exists for.
