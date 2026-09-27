# spec-t23-disposition — grill-t23 execution spec (documentation-round artifact)

Round: **grill-t23**. Sole decision source: `.scratch/grill-t23/decision-ledger.md` (D-001..D-007, all current; D-002 constraint clause partially revised by D-005).

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

Authoritative inputs to absorb at setup (D-001): `.scratch/grill-t22/reports/2026-09-22-audit.md`, `.scratch/grill-t22/handoffs/2026-09-22-audit-handoff.md`; `.scratch/grill-t22/audit-evidence/` stays never-commit.

## 1. Round topology (D-001)

Two workstreams in one round, ordering forced by armed defer-0067 (headroom 592B < 2048B trigger):

1. **Cap-amendment channel first** — the full ADR-0062 D-A pre-registered channel executes; the amendment ADR lands before any surface-growing commit.
2. **Front-face workstream second** — proceeds under restored headroom.

Setup obligations: t22 audit artifacts absorbed by the t23 setup commit (a8974cd precedent); T3-C-1/2/3 disposed by class; C-7 split-form lookback tick 2/2 registered in the t23 report.

## 2. Cap-amendment channel spec (D-001, D-003)

- **ADR-0082** authored policy-before-value (text order = time order): policy statement -> pinned-protocol re-measure -> derived value.
- M = `npm pack --dry-run --json` size field at amendment time (expected ~339,408; re-measure is authoritative).
- Derivation: `cap = ceil_to_10_000(M x 1.10)` -> **380,000** under expected M. Formula is pinned convention (ADR-0066/0071); no self-chosen margin.
- Carries the explicit not-a-retro-application declaration (channel clause c).
- Live cap anchor = ADR-0039 D3 text (`out.size < N bytes` regex, consumed by `scripts/check-pack-smoke.js packCapBytes()` and `test/adr-0038-wiring.test.js`) — amend the text in place per 0066/0071 precedent.
- `second_reviewer` slot deferred to the next audit round (0066/0071 accept-now-countersign-later precedent): registered as **defer-0068** with review_at in the tide (D-007).
- **defer-0067 discharged** via its amendment acceptance branch (status + dated last_check_in).
- Amendment touches are all R3 (docs/adr/, ADR-0039 text, docs/deferred-registry.json, docs/governance/) — zero pack bytes.
- Verify before front-face commits: pack-smoke green + adr-0038 wiring green under the amended cap.

## 3. Front-face scope (D-002)

Five items: (1) README.md visual refresh — hero/diagrams/badges; (2) README-zh-CN.md mirror in the same commit (ADR-0079); (3) brand assets (§5); (4) repo metadata (§6); (5) .github/ templates (ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE) — R2 surface, declared carve-out (§7).

## 4. README restructure rules (D-004)

- Preserve the information architecture; the public failed verdict stays first-screen prominent — the honesty record is the identity, never buried.
- measurement record -> scannable table (verdict/date/corpus/link); all adjudication facts kept on-page or one link away.
- architecture -> one diagram + summary; depth routes to docs/ (R3, unpacked).
- zh mirror structural parity in the same commit.
- readme-crafter bar: shorter-or-clearer, zero fabricated evidence; split-form evidence counts where a capture/fixture split exists (C-7 convention); captured `$` lines name verbatim argv or are marked display-form.

## 5. Brand asset pipeline (D-005, D-007)

- Logo = 嘉豪 meme figure (black hoodie up + black face mask, jianbihua rough-ink style), style reference ponytail repo assets (copies at `.scratch/grill-t23/ref-assets/`, never-commit).
- Channel: user-side GPT Image 2.5; delivered structured prompts (Prompt A bust / Prompt B gesture figure) live in this session's record; initial draft at `D:\NDM\generated-image.png`.
- Phase-6 verdict on the draft: style on-target; three defects registered as execution input — white background needs programmatic cutout, favicon needs a bust crop (gesture hands muddy at 16px), dark variant needs white sticker-halo derivation.
- Pipeline: cutout -> 1024 master (RGBA) -> light-theme/dark variants -> derived matrix (favicons, apple-touch-icon, social-preview 1280x640 <1MB) -> land under `docs/assets/brand/` (R3, cap-free).
- Gate before commit: 16px readability, dark+light background contrast, clean alpha edges, no lookalike collision, figure-to-module semantic mapping recorded.
- All other visuals (hero, section diagrams, badges) = pure deterministic SVG; static is default; no GIF (not opted in).

## 6. External authorization (D-006)

- Authorized: `gh repo edit` writes to public repo metadata (topics, description).
- Social preview: agent produces the 1280x640 image + step instructions; user uploads via web UI (no API — do not fake one).
- **Push is NOT authorized** — front face goes live only when the user pushes the merged work.

## 7. Surface topology & disclosure obligations (D-007)

Verified classification (`scripts/surface-taxonomy.js classifyPath`): README*.md, docs/**, .scratch/** = R3 free; .github/**, assets/**, brand-assets/** = R2 (residual rule). Consequences:

- Brand/front-face assets land under `docs/assets/**` (R3) — never under an R2 root dir to dodge disclosure semantics.
- .github/ template touches are a **declared carve-out** (ADR-0076 D-B three gates: necessity / disclosure / burn-rate): `carve_out_used:1`, `governance_tooling_diff.files` lists each .github file, necessity reason names the round charter.
- `zero_product_diff` stays true (no R1 touched).
- Consecutive carve-out rows raise the burn-rate advisory — disclosed, never blocking.

## 8. Closeout (D-001 + standing conventions)

- Final battery verbatim re-run; per-finding disposition table for T3-C-1/2/3 (fixed/deferred/converted/rejected-with-rationale).
- Consent sweep names the full chartered set incl. defer-0060/0064/0065/0066/0067/0068, the sunset counter, and the never-commit set (T3-C-2 lesson).
- Trend row: kind:documentation, adr_added:[0082], net_additions:1, deferred_entry:defer-0068, zero_product_diff:true, carve_out_used:1, gtd.files=[each .github touch].
- Facts canon regen; report_commit:null; C-7 tick 2/2 in the round report; round closes into the second-party audit window (precedent).

## 9. Negative union

No R1/runtime-source edits; no push; no deviation from the pinned cap formula; no surface-growing commit before the amendment lands; no fabricated proof or invented social proof; no silent ledger changes; no GIF without opt-in; no fake social-preview API; no retro-blessing of the failed measurement.
