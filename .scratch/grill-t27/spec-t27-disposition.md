# spec-t27-disposition — grill-t27 execution spec (fix round)

Round: **grill-t27** — public-clone CI-red triage + first convergence-cost measurement of the ADR-0085 two-layer anchor semantics. Sole decision source: `.scratch/grill-t27/decision-ledger.md` (D-001..D-008, all current). Five atomcode research runs informed the records; refinements are folded into the cited D-IDs — nothing outside the ledger.

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 1. Round topology (D-001, D-005)

- **t27 = fix round** (ADR-0078 disclosure obligation applies): dispose the six residual public-clone red legs, open the defer-0070 closure path, and run the first convergence-cost measurement under the sealed/claim-point regime.
- The judgement-call cleanup component of the chosen scope is recorded `satisfied-by-bccdef06/9455aa18` (t26 findings pack) — the original scope wording is retained; the component is discharged, not silently redefined (D-005).
- Expected zero new ADR — recorded as anti-ratchet evidence (V6 item 5 counterpoint); if a real semantic change emerges mid-round it gets an ADR honestly, not a hard-pressed silence (D-003 negative).
- Out of scope (registered, not dropped): renew-or-expire template event, countersign queue x10, ratchet-brake charter, t25 seal/tag drift adjudication — all human-only, bound to the 2026-12-15 tide. defer-0071 stays un-activated (same-kind-recurrence policy).

## 2. Corpus legs — restore-step integrity (D-002)

- Root cause (measured, run 36030223375): the `JIAHAO_BENCH_CORPUS_B64` secret IS configured and unpacks, but the tarball is stale — the dir lands non-empty (fingerprints/judge-twins/probes/twins) yet lacks `mr-probes.jsonl`. The capability probe's exists-and-nonempty contract returns present; the four consumers fail closed (ADR-0038 D3).
- Agent-side fix — workflow restore step becomes validate-or-absent:
  (i) extract to a temp dir; (ii) validate the required-file set against the git-versioned corpus manifest (expected-state already lives at `bench/polygraph/thresholds.json` `private_corpus` — filename+sha256+source_adr; consume it, do not hardcode a file list); (iii) on mismatch delete the extracted dir → probe judges absent → all four gates report UNVERIFIABLE (exit 2, non-blocking) plus a `::error`-level annotation (visible, never silent); (iv) atomic placement — temp dir → validate → `mv` into position.
- Human action (authority boundary): rebuild the full `private/bench-corpus/` tarball including `mr-probes.jsonl`, base64 it, `gh secret set JIAHAO_BENCH_CORPUS_B64` — the agent prepares the artifacts + exact command; the write stays owner-side.
- Deferred rows: base64-tarball→OIDC channel to deferred-registry (not this round's work); O3 per-family degrade frozen as a future ADR-revision topic — the probe division of labour (ADR-0040 D2) is NOT touched.
- Rejected (recorded): b-only refresh (same root recurs at next staleness); c permanent-UNVERIFIABLE (throws the staleness signal itself out of the public universe); file-set hardcoding in the restore step (re-hardcodes the same failure).

## 3. Normative carrier — zero new ADR (D-003)

- Classification: FAIL→UNVERIFIABLE restores already-registered semantics — verbatim anchor: ADR-0040/0061 D-F `deterministic negative→exit 2 UNVERIFIABLE, so a stale/partial corpus restore degrades honestly instead of running its gates and failing red`. Patch-level repair, not a semantic change.
- Three disclosure channels: (i) trend-inventory `kind:fix` row + `governance_tooling_diff` quoting the anchor clause in its reason line; (ii) the deferred-registry tracking row carries the review trigger AND the pre-registered upgrade hook — first real trigger → mint an ADR-0061-style revision ADR (decision deferred to decision time); (iii) the OIDC deferred row above.
- Retroactive ADR forbidden: re-filing an existing contract yields a shell ADR (no excluded alternatives, no hard-to-reverse commitment).

## 4. Test-leg fixes (D-004)

- `sentinel-ownership` D2b: write a temp-named file then `fs.rename` over the target path — the temp file already holds a coexisting new inode, so the new-inode precondition is deterministic (POSIX rename(2) atomic replace; MoveFileEx(REPLACE_EXISTING) on Windows). More faithful to the parallel-implant scenario than unlink+create, which leaves a nonexistent-path window. Assertion body (`sameFile(s0,s1)===false`) and `src/sentinel.js` untouched.
- `adr-0079-wiring` D5: `spawnSync(process.execPath, [npmCli,'pack','--dry-run'])` — npmCli resolved by dual-layout probe (Windows `dirname(execPath)/node_modules/npm/bin/npm-cli.js`; Unix `dirname(execPath)/../lib/node_modules/npm/bin/npm-cli.js`) plus PATH spawn fallback. Assertion body (files allowlist + no zh-CN lines in tarball) untouched.
- Rejected: degrade-to-skip (the primitive works on Linux — cowork-harness line: LOUD skip only when the primitive itself fails on the target fs); relaxed assertions; bare `spawnSync('npm.cmd')` (EINVAL under CVE-2024-27980 hardening); `spawn` with `shell:true`+args array (DEP0190).

## 5. Residual-scope bookkeeping (D-005)

- The two ACCEPTED-AS-IS dispositions stay terminal; each gains an appended reopen-trigger line — written as t27-side errata entries (append-only; the t26 pinned claim artifacts are NOT edited):
  - cx/evd/rr naming churn — reopen iff the sealed machinery is unsealed for another reason, or evidence shows the naming difference causes a real defect.
  - report evidence-index→wave-1 — reopen iff the index makes the claim unverifiable; the correction is then an appended erratum pointing at the terminal wave, not an edit of the pinned report.
- Reopen is a first-class transition but requires new information / changed conditions; all corrections follow the append-only erratum model.

## 6. Convergence-cost measurement (D-006)

- Primary metric — capture waves. Formal definition: `all non-anchoring capture commits triggered by the same capture response to one semantic anchor state` — anchored to the external semantic event; tool-run boundary primary, commit adjacency is the degraded fallback only.
- Baseline comparability: count under the t25 legacy grouping (20+ waves baseline) AND a shadow count under the refined definition; both recorded.
- Diagnostic track: per-claim-commit freshness outcomes (first-pass / recapture-required / stale-retained) + total commits — the Goodhart tension pair; wave count alone is never a goal.
- Validity limits (Runeson & Hoest, n=1 transition round): claims mechanism feasibility, directional cost signal, qualitative cost-structure characterization, instrument calibration — never causality, generalization, or steady-state cost. Report wording = analytic generalization + explicit threat list.
- Recording layers: raw data → round-facts.json (non-claim surface, stale allowed); metric definitions + verdict → the round ledger (claim channel); validity/threats/shadow/baseline table → the round report.

## 7. Green-state semantics (D-007, D-008)

- defer-0070 closes on the first origin/main run with `conclusion=success` — the registered condition is executed literally (red-history account ends); no retroactive rewrite to full-green.
- The closure row carries seven fields: `run_id` / `conclusion` / `verifiable_composition` (true-green leg count + verbatim UNVERIFIABLE leg id list) / `degradation_semantics` (exit-2 non-blocking, ADR-0040 quote) / `degradation_cause` (stale private-corpus secret = human action) / `successor_defer_id` / `closure_rule_verbatim` (the original condition + literal-execution statement).
- Successor deferred-registry row: corpus-gate UNVERIFIABLE degrade pending secret refresh — owner Xxx91n; trigger = 10 consecutive UNVERIFIABLE runs OR review_at 2026-10-15, whichever first → forced adjudication (owner picks: refresh secret / formally accept permanent degrade / approve flip-to-fail); first real trigger fires the D-003 ADR hook.
- Register grade: degraded green = yellow (closed but degradation-marked), never unqualified green. UNVERIFIABLE legs keep running and uploading results — registered state, never Skip-shaped.

## 8. Mechanics & closeout

- kind: fix; `governance_tooling_diff` lists every hand-edit (ci.yml restore step, any scripts).
- Landing tail per ADR-0084 D-C as amended by 0085: last anchoring commit → terminal wave → `.scratch/grill-t27/SEAL` declaration (seal + recorded_at, registered non-anchoring) → regen commits only. This round is the semantics' first live firing — claim-point conformance is checked at the report commit.
- Human actions this round: `gh secret set JIAHAO_BENCH_CORPUS_B64`; `adjudicated/grill-t27` tag push co-naming the seal sha; forced adjudication on trigger fire.
- defer-0070's closure is event-driven (first success run) — it may land mid-round; the successor row must exist BEFORE the closure row references it.

## 9. Negative union

No source edits during the grill phase (this spec gates implementation); no touching the capability-probe contract (ADR-0040 D2 division preserved); no editing pinned t26 claim artifacts or sealed machinery; no retroactive closure-condition rewrite; no silent UNVERIFIABLE (always alarmed + successor-tracked); no hardcoded corpus file-set in the restore step; no corpus content into git; no third walk-algorithm copy; no auto-flip of UNVERIFIABLE→fail (protected semantic change, owner-adjudicated); no bare npm.cmd spawn / shell:true+args; no degrade-to-skip or relaxed assertions on the two test legs; no causality or steady-state claims in the report; no activating defer-0071; no agent-side secret write.
