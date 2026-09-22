# grill-t22 round-complete handoff - disposition round SETTLED (audit-r2 PASS WITH FINDINGS -> all disposed; battery green)

For the grill-t23 session. Authoritative round record: `D:/Aworker/jiahao/.scratch/grill-t22/reports/2026-09-22-report.md` (facts canon `.scratch/grill-t22/round-facts.json`, `report_commit` null by design); verbatim battery evidence (committed): `D:/Aworker/jiahao/.scratch/grill-t22/evidence/` (22 captures + 1 fixture); ledger closeout: `D:/Aworker/jiahao/.scratch/grill-t22/decision-ledger.md` "Round closeout" section. The second-party audit this round disposed: `D:/Aworker/jiahao/.scratch/grill-t21/reports/2026-09-22-audit-r2.md` (+ handoff + untracked `audit2-evidence/` never-commit tree). This file is the map, not the content.

## What landed (grill-t22-docs stack, stacked on grill-t21-docs via `but move`)

- `wzw`/d135064 charter -> `puk`/9984e8e audit absorb -> `qlr`/ef6c5e9 T-1.2 dispositions (keyed unresolvable-ref FAIL - R2-C-3 machinery fix; CONTEXT term tighten; Disclosed Repair markers) -> `rqx`/7c0e560 T-2 codification (ADR-0081 + defer-0067 + trend row carve_out_used:1 + registry/thresholds prose compression - R2-C-1 physical repair) -> `xou`/10c45a6 README count lines -> `svt`/fd75a0b zh-CN baseline re-pin -> `xys`/30b8c76 T-3 battery + closeout -> `wzn` post-battery facts fixpoint -> `sqs` recapture script -> final clean-tree CLEAN.
- ADR-0081 (`docs/adr/0081-repair-window-amend-in-place-coverage-pairing-headroom-watch.md`): D-A amend-in-place is canonical (window owns no trend row; repaired row accumulates; **coverage base pairs with the latest row's own round**; annotate-not-supersede) + the own-row flip branch recorded unfired + three adjudicated boundary properties; D-B rc.from adjudication (conformance to ADR-0080 D-B, no separate policy home, drift trigger registered); D-E registrations.
- defer-0067 ARMED: pack-cap headroom watch - trigger band (headroom below two kilobytes, or any over-cap commit) was already entered at registration. Exit: the pre-registered cap-amendment ADR channel (ADR-0062 D-A policy-before-value + ADR-0071 precedent) or headroom restored above the band, before any further surface-growing commit.
- defer-0042: audit-r2 weak-independent countersign recorded via last_check_in; row stays pending-evaluation to the 2026-12-14 review_at tide. defer-0051 + ADR-0071 stale second_reviewer-open prose reconciled (R2-C-4).

## Carry-forwards / constraints for the next round

- Headroom is thin (the measured value lives in the facts canon / pack-smoke.txt - prose here carries no canon number): defer-0067 is the standing watch; ANY packed-surface growth next round must either land the cap-amendment ADR first or compress first - do not repeat the charter-commit class of defect (undisclosed same-commit crossing).
- `--coverage-base` must always pair with the LATEST row's round base (ADR-0081 D-A) - for t23 the base is the t22 round's first-commit parent. Reusing a prior round's base conflates diffs against the wrong declared set.
- The battery harness + recapture script are committed (`.scratch/grill-t22/capture-battery.cjs`, `recapture-clean-tree.cjs`) - re-runnable verbatim; the clean-tree leg is the final post-commit re-capture, and the recapture script must be committed BEFORE it runs (self-flag otherwise).
- C-7 lookback tick two of two is owed at t23: committed prose must hold split-form evidence counts.
- Never push; GitButler-only writes; evidence `$` lines name verbatim argv; never-commit class = audit-evidence + audit2-evidence + *.patch + round-commits.txt.

## Suggested skills for the next session

- `$implement` (grill/engineering) for the t23 round setup; `$handoff` (grill/productivity) for its closeout handoff.
- `codegraph` CLI for exploration; `$atomcode-research` for any external research; `but` (GitButler) for all VCS writes.
- If a cap-amendment round opens: follow ADR-0062 D-A + ADR-0071 procedure exactly (policy before value; pinned-protocol re-measure; second_reviewer countersign) and close defer-0067 by trigger.
