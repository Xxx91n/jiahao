# grill-t21 — decision ledger

Round opened 2026-09-22. Status enum: current | revised | stale | deferred.
Records append-only; revisions create new IDs, never edit in place.

## D-001 — t21 topology: single documentation round WITH a declared carve-out

- Original question: C-1 disposition topology — a. retroactive-repair doc round (audit-preferred) / b. kind:fix structural round / c. single doc round + declared carve-out carrying both the retro repairs AND the machinery edits / d. shelve C-1
- User answer (verbatim): c
- Normalized requirement: t21 is one kind:documentation round that takes BOTH paths at once under an honestly declared carve-out: (i) retroactive repair of the t20 governance record — trend-row backfill (carve_out_used + governance_tooling_diff) plus Disclosed Repair on the zero-R2 claims across ledger D-001 / spec sections 0/1/8 / next-round.md / report; (ii) the structural machinery edits the audit owed to a future R2-capable round — surface-taxonomy amendment admitting the hyphenated mirror (README-zh-CN.md, or a README-* rule) to R3, and the owed t20-ledger anchors admission in build-governance-anchors.js; (iii) the cheap doc repairs C-2 (dangling host-contracts.txt citation), C-3 (canonical anti-quota sentence into the t20 report or a repair noting its absence), C-4 (CONTEXT filename to hyphenated form). The round's own trend row carries carve_out_used:1 + non-empty governance_tooling_diff.files listing the machinery files honestly — the carve-out channel used as designed, not bypassed.
- Constraints / negatives: the t20-row backfill records the taxonomy AS IT STOOD at t20 (both files were R2 then) — the forward amendment does not rewrite history; the exact gtd.files shape for a non-governance-tooling file (README-zh-CN.md) is a downstream question, not assumed; C-5/C-6/C-7 disposition still open; no re-litigating disclosed mid-round events; setup commit absorbs sk + nv (t20 audit report + audit handoff); never-commit set preserved; report_commit null.
- Status: current

## D-002 — t20 trend-row backfill shape: reuse gtd.files + first-line-named retroactive correction

- Original question: backfill carrier — a. carve_out_used:1 + gtd.files=[ci.yml, README-zh-CN.md] + reason names the residual anomaly / b. gtd.files=[ci.yml] + new unvalidated field / c. prose-only note
- User answer (verbatim): 采纳 (a′)
- Normalized requirement: the t20 row is corrected in place as a disclosed retroactive repair: carve_out_used:1; governance_tooling_diff.files lists both R2-touched files ['.github/workflows/ci.yml','README-zh-CN.md']; the reason's FIRST line names this a retroactive correction under t21 audit C-1 plus the field-name/content mismatch (README-zh-CN.md is a taxonomy-residual misclassification, not governance tooling) and points to the four Disclosed Repairs + the t21 taxonomy amendment. Atomcode evidence basis (kept for the record): append-only correction convention (Fowler RetroactiveEvent, Azure ES compensating event, 21 CFR Part 11, jsonic resource:correct) requires the correction disclosed + attributable; PROV models the corrective instruction as first-class; OTel stability rules reject orphan fields bypassing machine-checkable channels (kills b); prose-only is a below-standard record form in every audit framework surveyed (kills c).
- Constraints / negatives: zero schema change; the row records t20-time taxonomy truth (files were R2 then — the t21 amendment is forward-looking); the four zero-R2 prose claims still get the Disclosed Repair triple (that part was never in question); mechanism_output_diff (g6 replay) was already properly disclosed and needs no repair.
- Status: current

## D-003 — taxonomy amendment: README-* predicate into R3 + ADR-0080 as its policy home; ci.yml gets NO standing exemption

- Original question: taxonomy amendment form + ADR home — a. predicate rule README-* + ADR-0080 / b. exact-match README-zh-CN.md + 0076 amendment note / c. predicate without ADR / d. drop the amendment, defer-register only
- User answer (verbatim): 采纳 (a′)
- Normalized requirement: (1) surface-taxonomy.js gains a predicate rule admitting the README-* root-file class to R3 (wide form anchored on the structural README-prefix naming convention; future locale mirrors or README-* docs become R3-by-rule, not residual). (2) The amendment lands as NEW policy in ADR-0080 (supersede-not-rewrite semantics; the ADR states the residual-rule gap the audit exposed and the benign false-inclusion argument for the wide form). (3) The owed t20-ledger anchors admission lands in build-governance-anchors.js in the same carve-out. (4) ci.yml gets NO standing suite-parity exemption — high-risk files conventionally get explicit per-name treatment and the per-round gtd disclosure cost is low. (5) t21's own trend row: adr_added:["0080"], net_additions:1, D-F deferred_entry required (satisfied by a new defer row, e.g. a C-6/C-7-class registration).
- Atomcode evidence basis (recorded): CODEOWNERS glob/REUSE.toml glob/Buf category models all default to pattern rules for convention-named file classes; exact-name registration is for high-risk singletons and rots with refactoring; rule refinement is new policy (supersede semantics), not errata; false-inclusion is the pattern's cost but benign for README-* (the prefix is documentation by definition); high-risk files (CODEOWNERS itself, workflows) conventionally keep exact-name scrutiny — supporting no ci.yml exemption.
- Constraints / negatives: predicate exact width (README-* vs BCP47-shaped) is an implementation detail settled at write time, recommended wide + rationale in the ADR; t20 row stays historical-truth (files were R2 then); ADR-0076 itself untouched (immutability); wiring pins triggered by 0080 (adr-index 79->80, seed inventories) ride t21's own carve-out gtd.files.
- Status: current

## D-004 — minors disposition + closeout shape: full disposition with ratchet-defer, enforced convention, per-finding closure table

- Original question: minors + closeout — a. full disposition light-closeout / b. minimal (C-5/6/7 all deferred) / c. fix C-6 harness refactors in-round
- User answer (verbatim): 采纳 (a′)
- Normalized requirement: (1) C-5 fixed in-round (R3 test-surface: stale '76/77/78 records' titles -> '79', mislabeled 'D6 semantics' pin renamed). (2) C-6 -> ONE ratchet-style merged defer row (harness-hardening class) whose body itemizes the four instances — recapture clone shared-leg-ification, capNode() single-derivation of label+argv, robust NPMCLI resolution, C1 regex to the copy-safe \u0080-\u009f escaped form — each individually closable; the row carries the four elements (owner, deadline, acceptance criterion, escalation trigger 'same class recurs -> split into standalone entry') and ratchet semantics (the set only shrinks, never grows); it serves as the t21 trend row's deferred_entry. (3) C-7 -> convention sentence WITH positive+negative examples + applicability boundary into AGENTS.md ('evidence counts write split form like "17 captures + 1 fixture"; bare totals forbidden where a capture/fixture split exists') + mechanical position = a checklist tick in the closeout/audit review loop + a registered effectiveness lookback for the next two rounds; the t20 report's ambiguous '18 evidence files' line gets a Disclosed Repair. (4) C-2/C-3/C-4 per D-001 (dangling citation repaired; canonical anti-quota sentence into the t20 report via Disclosed Repair; CONTEXT filename to hyphenated form). (5) Closeout: setup absorbs sk+nv; section-6 battery verbatim re-run (the audit's capture.cjs reusable); consent-sweep named lines (defer-0060, defer-0064/0065, new C-6 row, sunset counter, never-commit set); per-finding closure table in the t21 report (each C item -> fixed/deferred/converted/rejected-with-rationale); t21 trend row kind:documentation + adr_added:["0080"] + net_additions:1 + carve_out_used:1 + non-empty gtd.files + zero_product_diff:true + deferred_entry; facts-canon report, report_commit null.
- Atomcode evidence basis (recorded): FDA 820.90 three-way triage (correction / register-track / CAPA-escalate on recurrence; the decision not to escalate must be documented); merged defer entries are the mature form with ratchet+itemization+trigger (Psalm baseline structure; mulmoclaude never-add/drain-then-delete; Metabase 'the set only shrinks'); written conventions alone have near-zero recurrence prevention — effective form needs examples + a mechanical position + an effectiveness lookback (codingcraftsman; MDIC effectiveness check); minimum closeout set per ISO APG/2 CFR 200.511 (battery re-run, per-finding closure incl. rejected-with-rationale, defer-row four elements, trend row, convention-landing check).
- Constraints / negatives: no C-6 harness refactor in-round (scope creep for a disposition round); t21 zero_product_diff stays true (carve-out touches R2 not R1); anchors admission cascade (17->18) regenerates ride as mechanism output; per-finding closure table is mandatory even for nits.
- Status: current


## Closeout (2026-09-22) - disposition round complete

- T-1 done (commit vvy / 845999a): the four zero-R2 claim sites rewritten to the canonical "R1 zero-touch + two R2 files retro-acknowledged via the declared carve-out" form with reason+when+who triples (t20 ledger D-001, spec-t20 sections 0/1/8, next-round.md, t20 report), superseding the 2026-09-20 `carve_out_used:0`-annotation markers; AGENTS.md gained the C-7 split-form evidence-count convention (+ checklist position + two-round lookback). One AGENTS.md write corrupted by `String.replace` `` $` `` substitution was caught by the byte-check and restored pre-commit.
- T-2 done (commit orv / 6e83350): surface-taxonomy.js `R3_README_ROOT` predicate; surface-taxonomy.json rule text + `reclassifications` log; check-governance-inventory.js reclass grace (t20-time truth preserved, post-effective listings still hard-fail); build-governance-anchors.js admits `decision-ledger-t20.md` (content-equal copy); ADR-0080 authored; deferred-registry gains `defer-0066` (merged ratchet row, four instances, four elements); wiring pins resynced (index 80, published_tip -> dc6d21b, seed inventory 60, ci.yml suite parity 75); pack-cap surface compression (_doc trims + terse row).
- T-3 done: battery re-run verbatim `--round grill-t21`; facts canon collected + spliced; clean-tree via Disclosed Re-Capture; this report with `report_commit` null.

### Consent sweep (named lines)

- defer-0060: standing - external-event (CI 403 carrier), quarterly cadence; no check-in due.
- defer-0064 / defer-0065 (t20 B-4/B-5): pending-evaluation, quarterly.
- defer-0066 (new, C-6): pending-evaluation, review_at 2026-12-15 - merged ratchet row; the set only shrinks, never grows.
- Sunset counter (ADR-0076 D-E durable home): unchanged - no instrument-identity change.
- Never-commit set: unchanged - `.scratch/grill-t*/audit-evidence/` trees, `*.patch`, `round-commits.txt` stay untracked (the clean-tree leg classifies them, never flags them).
- Advisories that fired this round (advisory-only, never blocking): the carve-out burn-rate advisory (t20 corrected + t21 declared - two consecutive `carve_out_used:1`) and the documentation-streak advisory; both disclosed in evidence/governance-inventory.txt output.

### Per-finding closure (t20 audit C-1..C-7)

- C-1 -> repaired (row corrected to `carve_out_used:1` canonical form; four claim-site markers rewritten; residual gap closed by ADR-0080 D-A + the D-B grace).
- C-2 -> verified (dangling citation absent).
- C-3 -> verified (canonical sentence present).
- C-4 -> verified (CONTEXT filename correct).
- C-5 -> repaired (index-record pins resynced; published_tip re-pinned; seed inventory extended).
- C-6 -> deferred-registered (`defer-0066` merged ratchet row).
- C-7 -> landed (AGENTS.md convention + checklist position + this lookback).

### Lookback

- C-7 effectiveness lookback registered for the next two rounds (grill-t22, grill-t23): check that committed prose holds the split-form evidence-count convention.
