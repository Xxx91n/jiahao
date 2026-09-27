# grill-t20 — spec: t19 audit-finding disposition + README front-face documentation round

Settled 2026-09-20. Authoritative source: .scratch/grill-t20/decision-ledger.md (D-001..D-005, all current). Inherited charter (settled upstream, authoritative): .scratch/grill-t19/decision-ledger.md D-007..D-010 + .scratch/grill-t19/spec-t19-disposition.md sections 7-10.

## 0. Headline

Single kind:documentation round on the verified t19 baseline (PASS WITH FINDINGS): the README front-face lands (EN-primary IA redesign + zh-CN mirror + ADR-0079) AND all seven t19 audit findings are dispositioned inside the same round — every B item's touched surface is R3 (documentation-surface, free in a doc round) or deferred, the round kept R1 zero-touch; the two R2 files touched (`.github/workflows/ci.yml`, `README-zh-CN.md`) are retro-acknowledged via the declared carve-out channel (t20 trend row `carve_out_used:1` + `governance_tooling_diff.files`) [Disclosed Repair, 2026-09-22, grill-t21 fix/dev sub-agent — t20 audit C-1 / t21 ledger D-002: the original zero-R2 claim was mechanically false under the surface taxonomy; supersedes the 2026-09-20 carve_out_used:0-annotation marker]

## 1. Round boundary (D-001)

In scope: B-1..B-7 dispositions (R3 in-round / defer-register / Disclosed Repair per section-2); the inherited README charter (EN-primary redesign, zh-CN mirror, ADR-0079, trend row); setup commit absorbing pz + kv (t19 audit report + audit handoff, untracked at t19 audit-final); closeout per section-7. Out of scope: any R2 machinery edit beyond the retro-acknowledged pair (build-round-facts.js stays untouched — B-4/B-5 go to the registry, not the code) [Disclosed Repair, 2026-09-22, grill-t21 fix/dev sub-agent — t20 audit C-1 / t21 ledger D-002: "any R2 machinery edit" read as a total restraint but `.github/workflows/ci.yml` and `README-zh-CN.md` classify R2 and were touched; both are retro-acknowledged via the carve-out channel on the t20 trend row]; any README-side change to the install.js pointer contract ('Verifier deployment discipline' name stands); stack landing; never-commit set (audit-evidence trees incl. grill-t19, round patches, round-commits).

## 2. B-1..B-7 disposition detail (D-001/D-005)

- B-1 (vacuous feed-leg pin): strengthen to the discriminating scenario [fix(+1), doc(+1)] in test/adr-0076-wiring.test.js — old semantics feed+push fires the advisory, new semantics transparent = silent; covers feed-leg and adjacency.
- B-2 (label-vs-exec in committed evidence): convention sentence in AGENTS.md working agreement beside the authoring-path clause — a captured-evidence '$' line names the verbatim argv or is explicitly marked display-form; capture-battery.cjs $ labels made faithful.
- B-3 (harness slop): remove the duplicate round-facts leg + the unused WIN var from capture-battery.cjs.
- B-4 (collect() red-suite -> exit-2 conflation): deferred-registry row — pending-evaluation, trigger 'when the exit contract next opens, add the precision clause'.
- B-5 (--report bare-arg exit asymmetry): deferred-registry row — pending-evaluation, trigger 'when an arg-validation convention next forms'.
- B-6 ('18 evidence files' wording): Disclosed Repair on the t19 round-complete handoff with the declaration triple.
- B-7 (clean-tree without committed artifact): the battery gains a committed git-status leg (clean-tree.txt) — enforced at this round's own closeout.

## 3. README information architecture (inherited t19 D-008, unchanged)

Language-switch line; title + one-line value; static badges; honesty banner (pinned failed-verdict block verbatim, before '## What it does'); What it does; Readiness status (ADR-0072) at ## level; Install (pinned commands + naming declaration + verified-at note; 'Verifier deployment discipline' name untouched; threat-model subsection); Verification Ladder; hosts/protection tiers condensed to table; Usage; Distribution boundary; '## Measurement record' parent demoting confirmatory/v1/v2/v3/lane/reproduce one level (verbatim); Develop + Architecture (ADR index folded into <details>); License last. Blank line after every <summary>; no GitHub Alerts inside folds; wiring verdict is the ordering arbiter.

## 4. Prose depth policy (D-002)

Deep rewrite of the ~12.9K unpinned prose: per-host paragraphs condense into the protection-tier table rows; threat model compresses to a short mandatory note; Develop/Usage keep only the shortest path; repeated promises and internal-implementation detail removed; nothing migrates to docs/ (README stays self-complete). Boundary = wiring tests: every pinned block byte-identical; pinned phrases keep their wording.

## 5. First-screen signals + Architecture diagram (D-003)

Three static non-numeric badges: 'license: MIT' + 'profiles: generator | verifier' + 'channel: npx github:'. One Mermaid flowchart in Architecture: generator (advisory 3-rules) -> claim -> independent verifier -> 6-rung ladder -> four verdict states; the zh-CN mirror may translate diagram labels (fenced-code text unpinned); render-verification fallback to prose is non-blocking.

## 6. Mirror sync discipline + drift enforcement (D-004)

ADR-0079 D6: any commit touching README.md MUST update README.zh-CN.md in the same commit and advance the baseline comment to that commit's sha; the baseline sha advances only on real sync. test/adr-0079-wiring.test.js (R3 surface) pins: mirror exists; switch-line pair on both files; baseline comment carries a 40-hex sha present in git history; shared ## heading skeleton across both files; mirror absent from package files; drift pin — 'git log -1 README.md' sha equals the recorded baseline sha.

## 7. Closeout (D-005)

Setup commit absorbs pz + kv with disclosed absorption; section-6 battery verbatim re-run '--round grill-t20' + the new committed git-status clean-tree leg (clean-tree.txt); consent-sweep named lines (defer-0060 standing; new B-4/B-5 rows; sunset counter; never-commit set); trend row kind:documentation + adr_added:["0079"] + net_additions:1 + zero_product_diff:true + deferred_entry (one of the new B-4/B-5 rows satisfies ADR-0076 D-F clause-3); round report facts-canon with zero canon numbers in prose; report_commit null.

## 8. Negative union

No R2 machinery edits outside the disclosed carve-out pair — the two R2 touches (`.github/workflows/ci.yml`, `README-zh-CN.md`) are retro-acknowledged on the t20 trend row [Disclosed Repair, 2026-09-22, grill-t21 fix/dev sub-agent — t20 audit C-1 / t21 ledger D-002: the original zero-R2 claim was mechanically false under the surface taxonomy; supersedes the 2026-09-20 carve_out_used:0-annotation marker]; no kind overloading; no byte-patching verbatim evidence; no silent rewrite; no docs/ migration of README content; no numeric/dynamic badges; no GitHub Alerts inside folds; no hero/GIF/ImageGen; no breaking the install.js 'Verifier deployment discipline' pointer; no baseline-sha advance without real mirror sync; no battery-skip closeout; no in-place revision of ADR-0038; never-commit set preserved; report_commit null.
