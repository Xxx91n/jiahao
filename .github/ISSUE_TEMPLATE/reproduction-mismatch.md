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

## If a check skipped or refused instead of running

The benchmark corpus is a maintainer and CI asset: not in the npm package, not in a public clone. A run from a clone uses the committed fixture under `test/fixtures/corpus/` instead. A check that needs more than that says so rather than pretending to pass: a test skips with the reason in its name, or a script exits 1 printing a line containing `[corpus] missing`. If you legitimately hold the corpus, point `JIAHAO_CORPUS_DIR` at it.

A corpus-dependent check that reported a pass while neither of those happened is the report this template exists for.
