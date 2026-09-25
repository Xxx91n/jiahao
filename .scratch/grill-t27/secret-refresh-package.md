# grill-t27 T-3 - JIAHAO_BENCH_CORPUS_B64 secret-refresh package (owner action)

Status: prepared by agent, **write is owner-side** (authority boundary - the
agent never runs `gh secret set`). The stale secret is the measured root
cause of the four corpus red legs on run 36030223375.

## Artifact

- Payload (NOT committed - corpus content never enters git, ADR-0036):
  `D:\Aworker\jiahao\.scratch\.tmp-t27-secret-refresh\JIAHAO_BENCH_CORPUS_B64.txt`
- Source tarball: `.scratch/.tmp-t27-secret-refresh/bench-corpus.tgz`
  - bytes: 7732
  - sha256: `7169fc727122c49b81bf40b18e3e57758313be65a663a0a8e9b19dc802f66de0`
  - layout: `bench-corpus/` top dir holding all 5 files
- Base64 payload: 10312 chars, UTF-8 round-trip verified 2026-09-25.
- Manifest conformance verified locally: `node scripts/restore-bench-corpus.js
  bench-corpus.tgz <dest>` validated all 4 `private_corpus` manifest entries
  (id + sha256) before placement.

## Owner command (verbatim)

    gh secret set JIAHAO_BENCH_CORPUS_B64 < D:\Aworker\jiahao\.scratch\.tmp-t27-secret-refresh\JIAHAO_BENCH_CORPUS_B64.txt

(or: `gh secret set JIAHAO_BENCH_CORPUS_B64 --body "$(cat ...txt)"` - the file
pipe form is preferred, no shell expansion of the payload).

## Verification steps after setting

1. `gh run list --branch main --limit 1` on the next push (or re-run
   `gh run rerun 36030223375`): the `restore bench corpus` step must print
   `[restore-bench-corpus] validated 4 manifest file(s), placed ...`.
2. The four corpus gates (corpus-leak / corpus-freshness / corpus-classes /
   mr-probes) leave the UNVERIFIABLE column and run for real.
3. defer-0070 closes on the first `conclusion=success` origin/main run -
   the seven-field closure row procedure is registered in this round's
   bookkeeping (D-007); defer-0072 is the successor tracking row.

## If the restore still degrades after refresh

The step prints `::error title=corpus-restore::<detail>` naming which manifest
entry is missing or sha256-mismatched - regenerate the tarball from a clean
`private/bench-corpus/` and re-set. Do NOT relax the manifest to match a stale
tarball.
