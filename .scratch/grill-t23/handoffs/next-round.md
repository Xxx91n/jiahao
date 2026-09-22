# next-round.md — grill-t23 execution task book (documentation-round artifact)

Round: **grill-t23** — cap-amendment channel + GitHub front-face round. Decision authority: `D:/Aworker/jiahao/.scratch/grill-t23/decision-ledger.md` (D-001..D-007). Binding spec: `D:/Aworker/jiahao/.scratch/grill-t23/spec-t23-disposition.md`. GOAL: `D:/Aworker/jiahao/.scratch/grill-t23/GOAL.md`.

## Authoritative inputs

- t22 second-party audit: `D:/Aworker/jiahao/.scratch/grill-t22/reports/2026-09-22-audit.md` + `D:/Aworker/jiahao/.scratch/grill-t22/handoffs/2026-09-22-audit-handoff.md` (absorb at setup; audit-evidence stays never-commit)
- Logo draft (user-side GPT Image 2.5): `D:/NDM/generated-image.png`; style refs: `D:/Aworker/jiahao/.scratch/grill-t23/ref-assets/` (never-commit)
- Baseline: pack 339,408/340,000 (defer-0067 armed); 81 ADRs; 16 trend rows; 61 deferred entries; latest row grill-t22-doc-round

## T-0 — Setup & absorb [D-001]

1. Open execution branch via `but`; commit absorbing the t22 audit report + handoff (a8974cd precedent).
2. Dispose **T3-C-1**: ADR-0081 D-E prose fix — enumerate the THREE gtd.files (incl. thresholds.json) and scope the R3 sentence (in-round prose fix).
3. Dispose **T3-C-2**: dated amend-in-place backfill naming the omitted sweep lines (defer-0060/0064/0065 + sunset counter + never-commit set), or rejected-with-rationale.
4. Dispose **T3-C-3**: restore 'use strict' in `.scratch/grill-t22/recapture-clean-tree.cjs` (R3 path; candidate defer-0066 instance).

## T-1 — Cap-amendment channel [D-001, D-003]

1. Pinned re-measure: `npm pack --dry-run --json` size field; record M.
2. Draft **ADR-0082**: policy-before-value; derivation `cap = ceil_to_10_000(M x 1.10)`; not-a-retro-application declaration; second_reviewer slot deferred -> **defer-0068** (review_at in tide).
3. Amend **ADR-0039 D3** cap text in place (live anchor consumed by pack-smoke + adr-0038 wiring).
4. Registry: add defer-0068; discharge **defer-0067** via amendment branch (status + last_check_in).
5. Verify: `node scripts/check-pack-smoke.js` + adr-0038 wiring green under amended cap.
6. Commit BEFORE any surface-growing commit (defer-0067 ordering).

## T-2 — Front face [D-002, D-004, D-005, D-007]

1. **Logo pipeline** [D-005/D-007]: cutout white bg -> verify Phase-6 checklist (16px, both bgs, edges, collision, semantic mapping) -> 1024 RGBA master -> dark variant via white sticker-halo -> derived matrix (favicons, apple-touch-icon, social-preview 1280x640) -> land `docs/assets/brand/`.
2. **Visual system** [D-002/D-005]: pure-SVG hero + section diagrams + badge set; motif = dual-profile split / 6-rung evidence ladder; static only, no GIF.
3. **README.md** [D-004]: preserve-refresh — failed verdict stays first-screen; measurement record -> scannable table (zero fact loss); architecture -> diagram + summary with depth to docs/; visual layer embedded referencing docs/assets/.
4. **README-zh-CN.md** [D-002/D-004]: structural mirror, same commit (ADR-0079).
5. **docs/ deep-content targets** [D-004]: any moved detail lands docs/ (R3).
6. **.github/ templates** [D-002/D-007]: ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE — R2, declared carve-out (necessity names this charter).

## T-3 — Metadata, closeout & verify [D-001, D-006]

1. `gh repo edit` topics + description (authorized); social-preview: produce 1280x640 + written upload steps for the user (no API). **No push.**
2. Final battery verbatim; per-finding disposition table (T3-C-1/2/3 + any new).
3. Consent sweep naming the full chartered set (defer-0060/0064/0065/0066/0067/0068 + sunset counter + never-commit set).
4. Trend row: kind:documentation, adr_added:[0082], net_additions:1, deferred_entry:defer-0068, zero_product_diff:true, carve_out_used:1, gtd.files=[each .github touch].
5. Facts canon regen; report_commit:null; C-7 split-form tick 2/2 registered.
6. Close into the second-party audit window (precedent).

## Hard rules

- Ledger D-001..D-007 is the sole decision source; surprises -> new ledger record, never silent edits.
- No R1/runtime edits; no push; cap formula immutable; no fabricated proof; committed docs via fs.writeFileSync + byte-check; `$` evidence lines name verbatim argv or marked display-form; split-form counts where a split exists.
- GitButler for all VCS writes; intermediate red allowed if disclosed, final state green.

## Fact-surface status (neat-freak)

- verified-current: taxonomy classifications (R2/R3 map), cap anchor location (ADR-0039 D3), pinned formula, defer-0067 armed state, registry count 61
- pending: actual re-measured M; logo draft iteration loop (user-side regeneration); social-preview manual upload
- out-of-scope: npm publish; GIF; raster generation in-repo; push

## Suggested skills

- `beautify-github-readme` (README mode + pure-SVG assets), `readme-crafter` (evidence discipline + quality checklist), `repo-logo` (Phase 6-9 pipeline on the returned draft)
- `domain-modeling` + `neat-freak` at closeout; `handoff` for the audit-window handoff
- `tdd` if wiring pins are added; `code-review` before each commit; `gitbutler` (but) for all VCS writes
