---
name: Measurement discrepancy
about: A reproduction attempt disagrees with a published number or anchor
title: "[measurement] "
labels: measurement
---

<!-- Added under the grill-t23 governance carve-out (ADR-0076); disclosed in the round ledger. -->

This is the channel the README invites: discrepancies feed the CAPA record
categorically — name the mismatching field, do not open a discussion about
whether the project works.

## Which artifact are you reproducing?

<!-- e.g. devin-corpus@v2 replay, governance anchors, pairer regression -->

## The command you ran

```sh
# paste the verbatim command
```

## What it reported

<!-- paste the output line(s) verbatim — e.g. the replayed recall@FP0,
     the anchor digest mismatch, the failing check name -->

## The published value it disagrees with

<!-- e.g. claim-template.md field name, anchors.json entry, README line -->

## Environment

- OS / Node.js version:
- Commit or tag you checked out:
- `JIAHAO_CORPUS_DIR` set? <!-- corpus gates are maintainer/CI-only; a missing
     corpus must degrade to exit 2, never pretend to pass — say which you saw -->
