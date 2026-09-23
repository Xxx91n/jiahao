# ADR-0074: Sanitized-History Publish Record, Rewrite-Map Single Translation Point, Tip-Pinned Install Claim Invalidation, Published-Tip Re-Verification Preregistration, and Independence-Grade Audit Convention

Status: Accepted (user-ratified 2026-09-17 via grill-t13 decision ledger D-001..D-005; second_reviewer countersign deferred to the next audit round - the ADR-0065/0066/0067/0069/0070/0072/0073 ratification pattern; grill-t25 label: the deferred second_reviewer countersign is ID-level-only, awaiting entity-level - return condition: the 2026-12-15 audit-window review records the entity-level countersign verdict or a formal downgrade; return-by: 2026-12-15)
Date: 2026-09-17

References: decision-ledger-t13 (`.scratch/grill-t13/decision-ledger.md` - git-tracked, its own durability channel; the governance copy is `docs/governance/decision-ledger-t13.md`), ADR-0073 (head pointer note added here per D-B; its pre-rewrite SHA citations resolve through the map), ADR-0061 D-E (governance anchors; the t13 ledger joins under this ADR), ADR-0064 D-F (trend inventory; defer-0057 is this round's net-addition row), ADR-0038/0039 (distribution boundary; the README disclosure line lands in that section), ADR-0059 D-A/D-D (naming declaration; agreement-is-not-accuracy - the wiring seeds below are coherence-tier, never independent assurance), ADR-0070 D-B (G1 frozen - untouched this round), ADR-0014 D3 (threat model: an undisclosed rewrite matches the supply-chain threat profile - disclosure is the control), git-filter-repo `commit-map` semantics (industry reference for old->new alignment: same SHA both columns = unchanged, all-zero new = removed; atomcode research 2026-09-17 confirmed no public schema exists for disclosure maps - ours is a registered custom format).

## Context

On 2026-09-17 the owner ordered a sanitized-history rewrite executed before the first push: two tracked paths (the committed host-config backup `.scratch/grill-t11/host-config-backup/` and the derived tarball `jiahao-0.0.1.tgz`) were purged from every published tree, a host-topology literal was redacted at tip, the audit-evidence patch was regenerated without the purged-path hunks, and a closing-handoff addendum recorded the act. `origin/main` was then published at `051744a` (295 commits). The rewrite is a bounded break, not a silent one:

- **Rewrite region**: `05fa697..2c93a30` on the pre-purge side (kept local-only under `gb-local/grill-t12-docs`) aligns message-for-message with `2e9cdc9..3454d13` on the published side; both sides share the unchanged base `1ca81f5` and everything below it.
- **Empty-commit disposition**: two commits (`b73e558`, `e54c267`; change-IDs kxo/wko) survive in the published history as empty commits - their entire diff was removing the purged paths, which no published tree ever carried.
- **Tip-local sanitization**: commits `a6729a9` (literal redaction + patch regeneration) and `051744a` (addendum) exist only on the published side; the pre-purge tip `2c93a30` and its counterpart `3454d13` carry byte-identical trees (`git diff 2c93a30 3454d13` is empty).

Three tails follow from the event: the install channel's measured-live claim was taken against the pre-rewrite tip region and is now stale pending re-verification; tracked docs cite pre-rewrite SHAs that now name local-only objects; and the publish act itself owed a decision-level record. This round (R1) is documentation-only; execution lands in R2 (task book T-2).

## Decision

### D-A - The publish event is recorded as a bounded sanitization break (ledger D-001)

**Decision**: the rewrite is registered as an owner-ordered, pre-publish, path-scoped sanitization. Authorization: owner order issued during the grill-t12 close, recorded in the reaudit-closed handoff addendum (commit `051744a`). Scope of name change is bounded and disclosed: only commits whose ancestry contained the purged paths received new object names; the shared base `1ca81f5` and all history below it is untouched. Two commits became empty (retained, not dropped - the messages still document the untrack decisions). No `refs/replace/` was or will be installed: replace refs would push pre-rewrite names into the published ref space and GitHub does not consume them (ledger D-003).

**Consequences disclosed**: (a) any PR-diff or review view that referenced pre-rewrite commits is stale - the objects are local-only now; (b) clones/forks made before the publish hold local-only history and must re-clone or rebase onto `051744a`; merging a pre-rewrite branch back would re-contaminate the published tree (the industry-standard remediation, confirmed by atomcode research: coordinated re-clone, never merge); (c) the redacted literal persists in the commit-message metadata of the tip-region commits - a bounded residual disclosed here rather than re-rewritten (the value itself is not restated in this record; it lives in the published commit object); (d) pre-purge objects cited in earlier records (e.g. the `05fa697` exposure-window statement, `c861084` declared-channel references) describe local objects, valid as provenance but never resolvable against `origin/*`.

### D-B - Disclosure carriers and the pointer-note convention (ledger D-003)

The disclosure lands on exactly three carriers: (1) one line in README's `Distribution boundary` section naming the event and pointing at the map; (2) the sanitization runbook `docs/governance/sanitized-history-runbook-2026-09-17.md` carrying facts + verification evidence; (3) this ADR carrying decision/authorization/consequences. No `CHANGELOG.md` is created - there is no release cadence, and a one-off convention would itself become an inconsistency (ledger D-003).

Pre-rewrite records stay unedited (append-only discipline): `.scratch` files get zero changes, and each governance-surface file that predates the publish carries exactly one head pointer-note line naming the map as the single translation point (registered verbatim: `> Pointer note (ADR-0074, 2026-09-17): this record predates the sanitized-history publish; pre-rewrite SHA citations below name local-only objects - resolve them through docs/rewrite-map.json.`). This round applies it to ADR-0073 and `docs/governance/decision-ledger-t12.md`. A boy-scout rule rides along: any future edit that touches a `rewritten`-class SHA citation refreshes that citation to the new SHA in place.

Anchors consequence, registered: a noted governance copy is no longer byte-identical to its `.scratch` authority — `anchors.json` continues to pin the copy\u2019s bytes, and the registered note line is the only permitted divergence (the t12 wiring assertion now encodes exactly this; ADR-0061 D-E digest semantics are unchanged).

### D-C - docs/rewrite-map.json is the single translation point (ledger D-003)

`docs/rewrite-map.json` is an append-only, tool-generated artifact produced by `scripts/build-rewrite-map.js` per `docs/rewrite-map-generator-spec.md`. Semantics follow the git-filter-repo `commit-map` model: a commit that survived unchanged maps old->same; a rewritten commit maps old->new; a commit dropped by the purge maps old->null. On top of the commit alignment, every hex-SHA citation in tracked docs is classified three ways: `rewritten` (resolves to a new SHA via the map), `local-only` (exists only in the local object store/refs - listed as SHA+label only, no content metadata, minimal disclosure), `published-unchanged` (resolves in published history as-is). Completeness is the invariant: every cited SHA must receive a class; a partial map is a new inconsistency, not a partial success. Hand-built mappings are forbidden; the map regenerates and diffs.

### D-D - The tip-pinned install claim auto-invalidated at publish (ledger D-001 item 4, D-005d)

The README Install claim ("measured live on 2026-09-16") was measured against pre-rewrite objects; the publish event invalidated it. Forward rule, registered now: **any install-channel claim is bound to the tip it was measured against; a history rewrite of that tip suspends the claim until re-verified.** The Install section carries a pending slot this round; when R2 re-verification passes, the slot fills with a note of the form `verified-at-published-tip:<full-sha> + tool + date + evidence-class` - commit-bound wording describing that tip's facts, never a rolling refresh. A whitelist-diff failure suspends the claim outright and invokes the downgrade clause (D-E).

### D-E - Published-tip re-verification plan, pre-registered (ledger D-002)

Execution is R2; this clause freezes the plan before any run. Depth = install + liveness smoke + whitelist diff (set-difference, not byte-equivalence).

Assertion list, in order:

1. **A1 install**: clean environment (empty HOME/work, cold npm cache), `npx -y github:Xxx91n/jiahao init --profile verifier -y` exits 0; the npm-reported resolved SHA equals the published tip `051744a7a1b4027a42720814c819bf051e0831a8`, AND the materialized clone's own `git rev-parse HEAD` equals it (the npm/git#252 lesson: the resolved field alone can detach from materialized bytes).
2. **A2 liveness smoke on the installed artifact**: `.jiahao-profile` reads `verifier`; the `Stop` verdict-gate blocks on missing evidence (exit 2); `Stop` with a transcript writes a lane record; the real user chain is untouched (scratch `CLAUDE_CONFIG_DIR` discipline, the t11/t12 liveness form).
3. **A3 whitelist diff**: `git diff 2c93a30..051744a` output is a subset of the registered sanitization hunks - exactly three paths: `.scratch/grill-t11/reports/2026-09-17-audit.md` (literal redaction, 1+1-), `.scratch/grill-t12/audit-evidence/round-diff.patch` (regenerated excluding purged-path hunks), `.scratch/grill-t12/handoffs/2026-09-17-reaudit-closed.md` (+21 addendum). Runs in the maintenance clone holding both history sides; a fresh clone cannot resolve the pre-purge tip and that is expected.
4. **A4 commit-sequence alignment**: `git range-diff`-level comparison of the rewrite region (`gb-local/grill-t12-docs` side vs `origin/main` side) shows message-aligned pairs only - every old-side commit maps to a new-side commit or to the registered empty-commit/null dispositions.
5. **A5 no-collateral check**: the purge did not touch the run path - `git log origin/main -- .scratch/grill-t11/host-config-backup/ jiahao-0.0.1.tgz` is empty and the installed artifact's hook/runtime surface is unchanged relative to the declared channel (the t12 W-1 substrate argument carries over).

Evidence record, mandatory fields (all five, missing one = evidence invalid): npm-reported resolved SHA; clone-side `git rev-parse HEAD`; npm version; the authorization flags used (`--allow-scripts` / `--allow-git` or their npm-v12 equivalents); installed-artifact content fingerprint. Fixed environment parameter, recorded with the run: npm v12 semantics - install scripts do not run by default and git-hook-class payloads need explicit approval. Redacted literals and removed-file contents are never restated in the evidence.

**Downgrade trigger, verbatim**: if the A3 diff shows any change outside the registered hunk set, or A1/A2 fail, the install claim is suspended (`verified-at-published-tip` never lands) and the channel description downgrades to unverified until a registered repair re-runs the plan.

### D-F - Governance rules: second-party triggers and the independence-grade declaration (ledger D-005)

Two standing rules enter force with this ADR:

1. **Independent-verification triggers**: a second-party (different session AND different information boundary) narrow-scope audit is required when a round publishes or refreshes an external-facing claim, touches the sanitization zone, or crosses a registered risk threshold. Ordinary engineering rounds close light (the trigger rule is what keeps second-party review from decaying into a rubber stamp).
2. **Independence-grade declaration**: every audit report states its verifier's actual independence level. A second party sharing the same session and toolchain is weak-independent and must say so verbatim; the grade is a fact about the information boundary, not a verdict on diligence.

And the push split (ledger D-005e): disclosure/claim-class artifacts (the README line, the verified-at note, audit conclusions) are push-eligible only after re-verification and audit pass - a disclosure that sits local is a disclosure that has not happened. Engineering intermediates stay local by default and push at aggregate closeout. Push itself remains an owner-only explicit order; this round registers the dependency and presents it at closeout.

### D-G - Round surface and registrations

- `defer-0057` registers as this round's net-addition tally row (D-006(a)(i) convention: one summary row per doc round).
- The t13 decision ledger joins the governance anchors (`docs/governance/decision-ledger-t13.md` + anchors.json regen; the `.scratch` original is untouched).
- `test/adr-0074-wiring.test.js` seeds this round's doc surface (coherence-tier assertions: existence, registered wording, sync-surface agreement - ADR-0059 D-D applies).
- R1 doc commit is the stage gate: no map generation, no re-verification run, no registry disposition precedes it (R1->R2 boundary, same discipline as grill-t12).
- Reaffirmed: `.scratch` published records are append-only; no push this round; promotion gate frozen (G1=false organic leg, G3=false, G4=true).

## Consequences

- Forward rule (ledger D-001 item 4, binding from this ADR): install-channel claims bind to the tip they were measured against; a history rewrite of that tip suspends the claim until re-verified — claim homes may carry a `verified-at-published-tip:` note bound to that tip\u2019s commit semantics only.
- The publish is honest and auditable: bounded break disclosed, translation point registered, claim suspended pending evidence rather than silently stale.
- Consumers with pre-2026-09-17 clones must re-clone; that is the intended cost of a disclosed rewrite.
- The re-verification plan is now frozen - R2 executes it as written or the deviation itself gets registered.
- Future audits must declare an independence grade; this round's own doc work is same-session same-toolchain and any review of it is weak-independent by definition.
- **R2 dispositions (executed 2026-09-17, action round)**: `docs/rewrite-map.json` generated by `scripts/build-rewrite-map.js` (15 rewritten pairs, 2 published-only, every tracked-doc SHA citation classified); the pre-registered re-verification PASSED at `051744a7a1b4027a42720814c819bf051e0831a8` (evidence: `.scratch/grill-t13/audit-evidence/reverify-2026-09-17.json`) and the README slot carries the `verified-at-published-tip` note; defer-0054 actioned via `scripts/check-secret-scan.js` + the `secret-scan` gate; defer-0050/0051/0052/0056 closed by the same-commit ledger note; defer-0053 frozen-deferred, defer-0055 kept quarterly with a six-months-zero closure clause; defer-0058 registers the standing per-round net-increment review.
- **T-3 audit bounce + fix round (2026-09-17)**: the T-3 close-audit (weak-independent, `.scratch/grill-t13/reports/2026-09-17-t3-audit.md`) returned FAIL on F-1 (scanner self-trip + fail-open enumeration); fixes: union enumeration (ls-files ∪ ls-tree HEAD), runtime-assembled test fixtures, loud oversized reporting, same[]/removed new:null map forms, byte-exact note pinning restored, defer-0051 reopened (premature closure — its own unfreeze condition unmet), defer-0054 post-action trigger + detection-limit disclosure, defer-0053 cost_note, and the spec'd entropy-check deviation registered (substituted by purged-path classes — a generic entropy rule false-positives on sha256 digests in .scratch reports).
