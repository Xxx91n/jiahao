---
name: Reproduction does not match
about: You ran something and got a different number or result than the one we published
title: "[repro] "
labels: needs-triage
---

Use this when a published value does not reproduce — a tier label in the README install table, a test count, a number in a release note, or a value in a file under `docs/evidence/`.

Fill in both sides: what we published, and what your run reported. If the install or a hook simply misbehaves, use the bug report template instead.

## What we published, and where

Name the file and the place, for example "the Codex CLI row of the install table in `README.md`, tier A", and quote the value.

## What you ran

```sh

```

## What it reported

Paste the output lines. Do not paraphrase.

## What you checked out

- npm package version, git tag, or commit sha:
- How you got it — npm, `npx skills add Xxx91n/jiahao`, or a clone:
- OS and Node.js version:

## If a check skipped instead of running

Some suites read a benchmark corpus. The private corpus under `private/bench-corpus/` is a maintainer and CI asset: it is not in the npm package and not tracked here, so a check that needs it skips with a reason instead of passing. The committed fixture under `test/fixtures/corpus/` is what a run from this repository gets.

A skip is not a pass. If a corpus-dependent check reported a pass on a machine that has no corpus, that is exactly the report this template exists for.
