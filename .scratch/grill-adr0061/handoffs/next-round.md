# Jiahao ADR-0061 Implementation Round — Standing Task Book

Date: 2026-09-13. Repo: D:/Aworker/jiahao. Source of truth: .scratch/grill-adr0061/decision-ledger.md (D-001..D-006, all current). Doc-round artifacts were committed this session (ADR-0061, CONTEXT.md terms, deferred-registry defer-0035/0036, wiring seeds, README index, ci.yml 52) — do NOT re-derive them from conversation.

## Routing rule
This round is registered under ADR-0061 D-D as a governance-repair round (exemption class, explicitly recorded). Every commit message must cite its D-xxx coverage. No output-metric movement is claimed this round.

## Standing rules (negative constraints from the ledger)
- No cap-lifting outside the D-001 / ADR-0061 D-A closure procedure; no post-hoc value manufacturing (5567bd8 precedent).
- No semantic-digest anchor for judge identity (D-002; JudgeSense falsifies semantic equivalence as identity).
- Temp files only in .codex-tmp/; UTF-8 no BOM, LF; verify bytes after every write.
- Never touch .githooks/*, .gitignore, bench/polygraph/results/*, mr-artifacts/*; no push without authorization.
- Honest state: test/adr-0038-wiring.test.js stays RED until T-2 lands. Tarball is now 207,768 B / 92 files (grew from 206,501 via the CONTEXT.md glossary additions — measured, not estimated).
- Commit each task via but commit on the round branch.

## Tasks (in order)

### T-1 Measurement unblocking — D-006 (ADR-0061 D-F step 1). Defects, not debt.
- Fix main red CI: the JIAHAO_CORPUS_DIR capability probe must return exit 2 UNVERIFIABLE when the corpus dir is absent/empty (restore ADR-0040 three-state semantics).
- Add the pack-size cap assertion to gate:all (currently only test/adr-0038-wiring.test.js guards it).
- Acceptance: gate:all runs the cap check; main CI stops mis-reporting corpus capability; red handled per ADR-0027 D3.

### T-2 Gate-amendment ADR — D-001 (ADR-0061 D-A)
- First pin the measurement protocol (command, size vs unpackedSize, npm version) and re-measure (207,768 is the current reading).
- One ADR: policy section before value section; value derived from the trend 205,741 -> 206,288 -> 206,501 -> 207,768 plus composition analysis; explicit "not a D3 retro-application" declaration citing 5567bd8; second_reviewer sign-off via the ADR-0047 criteria-change path; review_at registered.
- Amend ADR-0039 D3: the one-shot M=140,778 anchor becomes a periodic trend anchor.
- Acceptance: test/adr-0038-wiring.test.js goes green via the amended cap, never by weakening the assertion; related gates updated in the same commit.

### T-3 Identity surface narrowing — D-002 (ADR-0061 D-B). Blocks the product round.
- Narrow the judge identity hash surface to the judge-behavioral (verifier rules) text of src/SKILL.md; prove via fixtures that product-surface edits no longer re-pin while judge-rule edits still do.
- criteria-change path: same-ADR closure, second_reviewer, review_at.

### T-4 Instrument tagging + dispositions + look-back — D-003 (ADR-0061 D-C)
- Tag model_checkpoint / model_identity sub-declarations out-of-service with a re-verification path and deadline (defer-0035, review_at 2026-12-11).
- Append a seq-3 disposition record signed by second_reviewer != Euiop1 (append-only; never rewrite).
- Record the look-back review for the conditional window open since 2026-09-12 (written even if no impact).
- Acceptance: hash-chain tests green; no new state machine states (indeterminate already covers sample_size=0).

### T-5 Governance-artifact anchoring — D-005 (ADR-0061 D-E)
- Authoritative copies (audit report, ERRATA, decision ledger) into git-tracked storage outside the tarball whitelist.
- Machine-generated digest links with a regen-and-diff check; amend the ADR-0059 ledger pointer line (C-1).
- Minimal unlock of defer-0024 external witness (C-2).

### T-6 Product round — D-006 step 3. Registration first, code second.
- Register the research round (ADR-0059 waiver + D-004 exemption registration), then implement TF-IDF-family features against bench recall 34.7%.
- Governance tails (BL-1, BL-2, defer-0028..0031 tide check-in) run on a separate branch/agent; human WIP = 1.

## Next grill direction
- Review D-004 in practice: exemption counting (defer-0036, review_at 2026-12-06) and whether the defer-0024 minimal unlock met the "anchoring is inherently external" bar.

## Verification loop (after every task)
npm test (README pinned: 52 suites / 704 tests — update in the same commit when they move) ; node scripts/run-gates.js --all ; npm pack --dry-run (expect > 200,000 until T-2 lands; state the number, never smooth it) ; git diff --check.
