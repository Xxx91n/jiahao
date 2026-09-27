# grill-t20 — GOAL (closed 2026-09-20)

Round opened 2026-09-20, on the verified t19 baseline (PASS WITH FINDINGS, B-1..B-7).

Closeout: Track A done — B-1..B-7 all dispositioned (B-1 discriminating
wiring pin; B-2 convention + battery labels; B-3 slop removed; B-4/B-5
defer-registered defer-0064/0065; B-6 Disclosed Repair; B-7 committed
clean-tree leg). Track B done — README front-face IA redesign +
structural mirror landed; filename amended to `README-zh-CN.md` (the
dotted form is force-included by npm's `readme.*` glob — deviation
disclosed in ADR-0079); ADR-0079 + trend row landed per charter.

## Track A — t19 audit-finding disposition

Adjudicate B-1..B-7 from D:/Aworker/jiahao/.scratch/grill-t19/reports/2026-09-19-audit.md
(handoff: D:/Aworker/jiahao/.scratch/grill-t19/handoffs/2026-09-19-audit-handoff.md).
Decide each finding's venue: fix-in-round / defer-register / noted-no-action.

## Track B — GitHub README front-face (chartered by t19 ledger D-007..D-010)

EN-primary IA redesign per spec-t19-disposition section-8 skeleton;
README.zh-CN.md bilingual mirror (git-tree only); pure-text face;
ADR-0079 bilingual-mirror convention; trend row kind:documentation +
adr_added:["0079"] + net_additions:1. Skills: beautify-github-readme +
readme-crafter-skill-main. Owner requirements: clean/tidy, bilingual
CN+EN, user-facing, stop the current mess.

## Hard rules

- No source/runtime edits during the grill phase; no alternate goals.
- One question at a time; every confirmed substantive decision appended
  to decision-ledger.md on the spot.
- Files via fs.writeFileSync/file-edit only; byte-verify after write.
- but for all VCS writes; stack on grill-t19-docs. Never-commit set
  preserved (incl. grill-t19 audit-evidence; pz/kv absorbable by t20
  setup commit per precedent).
