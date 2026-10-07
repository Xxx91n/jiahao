captured-at-head: 8942e2d88c71ca7b2102156a9dd61e0c7276adb6
<!-- audit pin = grill-t30 lane content tip at audit entry. The
     gitbutler/workspace merge commit 03ef2957 sat above it but is
     ephemeral (re-created by every but operation); pinning it would
     self-inflict the orphan-pin defect this report documents. -->

# grill-t30 second-party audit — FAIL (fix-window rework required)

Auditor: Devin (audit window, read-only for repo content; claim artifacts
only). Subject: the grill-t30 round as committed on lane `grill-t30-impl`
(+ `grill-t30-docs`), seal `cba768aa`, claim waves `d6ffb5b8`/`703b935d`,
report `.scratch/grill-t30/reports/2026-09-27-report.md`, handoff
`.scratch/grill-t30/handoffs/2026-09-27-handoff.md`, SEAL
`.scratch/grill-t30/SEAL`.

Verdict: **FAIL — return to fix window.** The substantive work
(bundle, SCED protocol, preregistered lines, leg 224 mechanism, ADR-0087,
registrations) verifies clean — but the acceptance battery the report
declares green is **red at audit HEAD**, two orphan-sha citations in
committed claim artifacts were never routed through errata, and the
handoff states a factually wrong seal anchor. Plus a set of spec/standards
deviations itemized in §5 that need repair or registered deviation.

Nothing was pushed (origin/main = `8704ce24`); audit only read state and
wrote its own claim artifact. Evidence captures live in
`.scratch/grill-t30/audit-evidence/` (examiner work product, never-commit
nc-001): 13 capture files + 1 repro script (`repro-pretool-guard.js`).

## 1. Acceptance battery — re-run at audit HEAD (not the report's word)

| Command | Report §2 claim | Audit re-run | Verdict |
| --- | --- | --- | --- |
| `node scripts/run-test-gate.js --expected-suites 86` | 86/86 suites, 1470/1470, exit 0 | **EXIT=1 — `FAIL test/rewrite-map.test.js`; 1 failed / 1469 passed / 1470** | stale at audit HEAD |
| `node scripts/run-gates.js` | exit 0, 42 entries, 4 UNVERIFIABLE | **EXIT=1 — `[208 rewrite-map] FAIL: docs\rewrite-map.json is stale`** + the same 4 ci-mode UNVERIFIABLE | stale |
| `node scripts/build-adapters.js --check` | 54 files regen-diff clean | exit 0, "All 54 adapter files match" | holds |
| `npx jest test/host-contracts.test.js` | PASS (21 contracts) | PASS — 21 contracts / 12 lifecycle keys confirmed | holds |
| `node scripts/check-deferred.js` | 69 entries (56 live, 13 closed) | exit 0, identical numbers | holds |
| `node scripts/check-anchoring-footer.js` | OK, 35 commits | exit 0, **40** post-registration commits (claim waves since grew the set) | holds |
| `node scripts/check-map-freshness.js` | OK, 1 claim-surface commit | exit 0, **2** claim-surface commits (d6ffb5b8 + 703b935d both verified tree-internally) | holds |
| `node scripts/build-governance-anchors.js --check` | OK, 18 artifacts | exit 0, 18 in sync | holds |
| `node scripts/build-rewrite-map.js --check` | OK | **exit 1 — stale** | stale |
| `node scripts/build-rewrite-map.js --published-only` | OK | exit 0, 3239 citations covered | holds (see §4 B-1 for what this does/doesn't catch) |
| `npx jest` focused 4 suites | 102 tests PASS | PASS, 102/102 | holds |

Additional legs run by the auditor: `check-orphan-ancestry.js` exit 0
(125 pins / 18 unique shas ancestral; 1 errata-exempt t29 pin);
`test-git-hermetic` PASS inside gate:all; `evaluateRound(grill-t30)`:
2 claim commits 0 bad, seal `declared == expectedAnchor cba768aa`,
inFlightClean, capturesAtSealOk, freezeViolations [], amended false —
matches report §3.2 except claim count (report says 1, now 2: the
wave-2 eval snapshot precedes its own commit — self-reference seam,
cosmetic).

## 2. Root cause of the red — one row, orphaned cite

Non-mutating diagnosis (`module.exports` of `scripts/build-rewrite-map.js`,
`build()` regenerated in-memory and diffed against the committed map —
evidence `audit-evidence/rerun/map-stale-diagnosis.txt`):

the **only** staleness is one `doc_refs` row —
`.scratch/grill-t30/reports/2026-09-27-report.md:114` cites `52e857f5`,
committed label `local object`, regenerated label `unresolved hex literal`.
`52e857f5` = the discarded first terminal-wave commit ("SEAL declares
78bbb3b8" generation, 17:07), orphaned when the seal was re-issued atop the
leg-224 fix (`cba768aa`) — `git for-each-ref --contains 52e857f5` is empty;
the object still exists (`cat-file -t` = commit) but is unreachable from
every ref the classifier scans. The committed map was internally
consistent at commit time (leg 224 passes on those trees); the label
drifted afterward when the refset moved — exactly the E-17 failure shape,
detected correctly by the machinery the round itself built. The omission
is procedural: the orphan cites were never erratum'd (§5 P-2), and nobody
re-ran `--check`/`gate:all` after the workspace settled.

## 3. Claim → evidence → conclusion (the claims that held)

| Report claim | Audit evidence | Verdict |
| --- | --- | --- |
| leg-224 machinery exists (scanDocTokensAt, check-map-freshness.js, hook lock, 7 hermetic fixtures) | `git show 44273c6b`/`cba768aa` file sets; scripts read; `map-freshness` PASS ×2 commits; `test/map-freshness.test.js` PASS, uses `hg.git`/`hg.mkRepo` for every git write | holds (with B-2/B-3 deviations, §5) |
| CodeBuddy bundle complete (manifest, 7-event hooks.json, dual rules alwaysApply, .mcp.json→vendored jiahao-mcp, vendored src/ closure, reverify.js, README tiering, defaultEnabled:false) | 31 files enumerated under `adapters/codebuddy/`; `build-adapters --check` clean; hooks.json parsed — 7 events, timeouts 5/5/5/10/3/5/5s, `node "${CLAUDE_PLUGIN_ROOT}/…"` commands, no matchers | holds |
| Two new hook scripts + InstructionsLoaded/PreToolUse semantics | `hooks/jiahao-instructions-assert.js`, `hooks/jiahao-pretool-guard.js` read; vendored copies byte-verbatim (adapter test asserts + passes); fail-soft contract intact | holds (with B-4 caveat) |
| `detectHost` recognizes CODEBUDDY_PLUGIN_ROOT; unified hookSpecificOutput envelope | verified at `hooks/jiahao-runtime.js:4-13,41-50` — **location mislabeled "src/" in report §1.2** (the module lives in `hooks/`) | holds, report imprecise |
| SCED protocol + volumes + JL-1..5 preregistered, source_adr 0087, detect() pinned | `protocol.md`/`task-volumes.md`/`judgment-lines.json` read; every JL carries `source_adr:"0087"` + `ONLY IF…THEN`; `frozen_detector.blob_sha256` = sha256(`src/detector.js`) = `a0ba70…` **verified live**; `landing_commit cc179109` exists and is ancestral of origin/main; `EXPECTED_PHRASES_SHA256` present in detector; polygraph appendix-only; zero effect numbers | holds |
| ADR-0087 extends ADR-0028 D6; rejected options recorded; no criterion values | `docs/adr/0087-*.md` read — extension declared explicitly, alternatives rejected, no numbers copied | holds |
| ADR-0039 D3 amended to `out.size < 470,000 bytes` via trend rule (M=418,319) | `0039-*.md:129-136` carries the amendment chain incl. the formula; live `npm pack --dry-run` measures **418,739** (< cap) matching regen'd g6 artifact (418319→418739 honestly tracked in `8942e2d8`) | holds |
| registrations: host_admission ×4 pending-confirmation (5 fields each), host-contracts 4 rows + lifecycle, gates.json order 224 source_adr 0087, trend row kind:fix, ci.yml expected-suites 86, README tier row + ADR index 87 + counts 86/1470 + zh-CN mirror, CONTEXT.md glossary, freshness.rounds t30 base 8704ce24 | each spot-checked live — all present and consistent (`surface-taxonomy.json` host_admission block; `host-contracts.json` 21 contracts/12 lifecycle; `gates.json:496-505`; `trend-inventory` row 24; `ci.yml:107`; README:174/365/452; README-zh-CN:145; CONTEXT.md:2525-2562) | holds |
| CodeBuddy CLI "live-probed 2.151.0" (README Verified table) | `codebuddy --version` → **2.151.0 installed on this machine**; `~/.codebuddy/` shows session-window activity (settings 15:59, plugins 16:01, diagnostics 17:39) — probing corroborated, not an invented claim | holds |
| evaluateRound final: seal declared == expectedAnchor cba768aa, inFlightClean, no freeze violations | reproduced: declared==expected, capturesAtSealOk, freezeViolations [], amended false, tag absent (owner-side) | holds |
| ANCHORING footers on non-merge commits | all 14 round commits carry `[ANCHORING]` listing the landed set; leg verifies 40 commits | holds |
| nothing pushed | origin/main == `8704ce24`; no t30 commit on origin | holds |
| mid-round red disclosures (pack-smoke, anchors/map regen, 6 wiring pins, fixture bugs) | consistent with commit sequence (fix waves d2fe3dd0/78bbb3b8 + leg-224 fix cba768aa) and AGENTS red-intermediate rule | holds |

## 4. Findings — blocking (fix window)

**A-1. Acceptance battery red at audit HEAD.** `rewrite-map.json` stale
(§2) → leg 208 FAIL, `test/rewrite-map.test.js` FAIL, run-test-gate
1469/1470, run-gates exit 1. Repair: `node scripts/build-rewrite-map.js`
regen landed as a fix wave (the row's `unresolved hex literal` label is
the honest state), then re-run the §1 battery.

**A-2. Orphan-sha citations in committed claim artifacts, unregistered.**
Report §2 line 114 pins `52e857f5` (discarded first terminal wave); report
§3.1 ("Fixed in `189e4e80`") and handoff lines 7-8 pin `189e4e80`, the
pre-restack sha of the commit that landed as `cba768aa` (`git merge-base
--is-ancestor 189e4e80 HEAD` = false; object exists orphaned). grill-t28
D-005 requires orphaned pinned shas routed through a registered erratum;
E-12 is the precedent for prose cites. `ERRATA.md` carries no t30 entry;
`errata_exemptions` holds only the t29 `b61d7951` pin. Repair: ERRATA.md
entry (E-18) naming both orphans + their live counterparts
(`52e857f5`→seal wave `a15e8c0f`, `189e4e80`→`cba768aa`); pinned artifacts
stay byte-stable per the append-only rule — corrections ride the erratum
and operational copies (next-round book / this handoff's successor).

**A-3. Handoff states a wrong seal anchor.** handoff lines 7-8: "SEAL
landed … declares the terminal substantive commit `189e4e80`". The
committed SEAL declares `cba768aa` — at handoff-commit time (`d6ffb5b8`,
child of seal wave `a15e8c0f`) the seal already named `cba768aa`. A
reader following the handoff finds an orphaned object and a SEAL naming
a different sha. Correction rides A-2's erratum.

## 5. Findings — deviations & defects (repair or registered deviation)

- **B-1.** `.githooks/pre-commit-user` runs `--published-only`, not
  `--check` — weaker than spec §4's literal ("pass `--check` clean") and
  than report §1.1's own description ("`--check` against the index/HEAD
  view"). `--published-only` asserts cite *coverage* + internal
  consistency; label drift (today's failure class) escapes it — the hook
  is green right now while `--check` is red. The choice is defensible
  (literal `--check` exits 2 UNVERIFIABLE without gb-local refs → would
  block every commit on a clone) but it is an unrecorded deviation AND the
  report misdescribes the mechanism. Fix or register.
- **B-2.** Leg 224's claim-commit *scoping* consumes live worktree state:
  `check-map-freshness.js:111` calls `loadFreshness(root)` =
  `fs.readFileSync(docs/governance/surface-taxonomy.json)` — the CURRENT
  taxonomy, not the commit-under-test's. The per-commit assertion core is
  tree-internal (`scanDocTokensAt` + `verifyPublishedOnly(commitBound)`);
  the set-of-checked-commits is not — a fenced taxonomy change could flip
  which historical commits get checked. Literal breach of spec §4 /
  D-004(i) "断言输入严格树内化". Bounded impact (taxonomy is fenced +
  exceptions bind at commit date) — needs registered deviation or a
  tree-bound scoping fix.
- **B-3.** `check-map-freshness.js:51` private `CLAIM_SCOPE_RE` copy of
  the fenced `orphan_ancestry.artifact_scope` literal — the documented
  convention (evidence-freshness.js:73-76, grill-t29 A-6) forbids exactly
  this private copy. Hard standard violation; the `under` check at :73-74
  is also dead (claim class already implies the closed-enum prefix).
- **B-4.** `jiahao-pretool-guard.js` matcher surface under-covers command
  payloads — reproduced (`audit-evidence/repro-pretool-guard.js`):
  `rm rules/jiahao-verifier.md`, `rm .mcp.json`, `del hooks\hooks.json`,
  `rm C:/x/plugin/rules/jiahao-verifier.md extra` (`$`-anchored fragments
  defeated by trailing args), bare `.jiahao-pretool.jsonl` target — all
  EVADE; only clean absolute paths BLOCK. Every recorded bypass attempt
  gets a deny (the hook works on what it sees), but JL-5's predicate
  ("every recorded bypass attempt carried deny") can't observe the
  unrecorded class — guard coverage is overstated for the trial's own
  bypass channel. Fix matching (tokenize command args, don't `$`-anchor on
  whole line, cover bare filenames) or register the limitation.
- **B-5.** `isClaimCommit` returns `false` when `commitInfo` yields
  `files:[]`/`unreadable:true` — a silently-skipped commit inside a
  fail-closed leg (check-map-freshness.js:66-67). Rare in practice,
  wrong in contract.

## 6. Findings — minor (ride the rework wave)

- `test/map-freshness.test.js:10` imports `execFileSync`, never calls it.
- `test/adr-0087-wiring.test.js:86` bare `hg.gitOk(cat-file -e)` statement
  discards its result (line 87 repeats it inside `expect()`).
- `gitAt` name reused with different shape: curried in
  check-map-freshness.js:53, positional in build-rewrite-map.js:113 —
  confusion hazard.
- `pretool-guard.js:87` hardcodes `host:'codebuddy-or-claude-compatible'`
  where instructions-assert calls `detectHost()`.
- `scanDocTokensAt` (build-rewrite-map.js:174): no `ref:`-prefix guard on
  `line.slice(ref.length+1)`; core.quotePath quoting makes non-ASCII paths
  silently miss — latent brittleness.
- build-rewrite-map.js:424 `k.slice(0,k.indexOf(':'))` breaks on
  POSIX-legal `:` in filenames.
- `codebuddy-adapter.test.js` env scrub omits `CODEBUDDY_PLUGIN_ROOT`/
  `CLAUDE_PLUGIN_ROOT` — ambient leakage into the new host detection.
- Spec §2.1: IDE-form injection points collapsed into one "IDE hook
  parity" pending row (rules/MCP/manifest not each tiered).
- Spec §2.2 literal says `.codebuddy/rules/*.md`; bundle ships `rules/`
  (settings-tier path is documented in README; covered by a
  pending-confirmation row — acceptable but note the literal deviation).
- Ledger D-001(iv): "generator 规则命中率" capture point absent (nearest:
  JL-3's detect() overclaim rate); D-001(v) "宿主侧 hook 自描述断言"
  ambiguous (InstructionsLoaded emits integrity text + telemetry — ruling
  needed whether that satisfies it).
- `.mcp.json` server key is `"jiahao"`, not `"jiahao-mcp"` (cosmetic).
- Report §1.2: "`src/` additions" — actually `hooks/jiahao-runtime.js`.
- Report §3.2: "1 claim commit" — now 2 (self-reference seam; wave-2's
  recorded eval predates its own commit).

## 7. Process-violation ledger (reported, not ratified)

| # | Violation | Evidence | Convention breached |
| --- | --- | --- | --- |
| P-1 | Round closed with a latent red: claim artifacts kept a cite to the discarded terminal wave `52e857f5`; post-restack reachability drift flipped its map row → `--check`/leg-208/jest red at audit HEAD | `map-stale-diagnosis.txt`, `test-battery.txt` | E-17 wave-closeout order ("re-capture → regen → verify → declare"): no post-settle `--check`/gate re-run after the seal re-issue rewrote the wave |
| P-2 | Orphaned pinned/cited shas not routed through errata (`52e857f5` report:114; `189e4e80` report §3.1 + handoff:7-8) | `orphan-shas.txt`, ERRATA.md has no t30 entry, `errata_exemptions` unchanged | grill-t28 D-005 post-restack ritual; E-12 precedent |
| P-3 | Handoff asserts SEAL declares `189e4e80`; SEAL declares `cba768aa` | handoff lines 7-8 vs `.scratch/grill-t30/SEAL` | claim-artifact accuracy (the artifact was committed after the seal wave that already declared cba768aa) |
| P-4 | Report misdescribes the hook mechanism ("`--check` against the index/HEAD view"; actual: `--published-only` coverage check) | `.githooks/pre-commit-user:19-20` vs report §1.1 | spec §4 literal + claim accuracy |

Not violations (checked): `but commit` allowlist discipline — ANCHORING
footers derived+landed-set-equal on all 14 commits (leg 223 green); seal
wave lands seal+map only; claim waves carry claim files+map only;
hermetic test-repo rule holds (all git writes via `test/helpers/
git-hermetic.js`, leg 222 green); no push; no bot auto-commit; report
discloses mid-round reds per the red-intermediate rule.

## 8. Repair list for the fix window + re-run checklist

Required (blocking):
1. `node scripts/build-rewrite-map.js` regen → land fix wave (the
   `unresolved hex literal` label is the honest current truth).
2. ERRATA.md E-18: register the two orphan cites with live counterparts
   (`52e857f5`→`a15e8c0f` seal-wave lineage; `189e4e80`→`cba768aa`) and
   correct the handoff's seal-anchor statement via operational copies.
3. B-1: either make the hook run `--check` semantics where refs exist
   (with exit-2 tolerated per clone-degradability) or register the
   `--published-only` choice as a spec deviation + fix report §1.1 via
   erratum.
4. B-4 ruling: widen pretool-guard command-payload matching OR register
   the coverage limitation in the bundle README + judgment-lines notes
   (JL-5's scope statement).
5. B-2/B-3/B-5 leg-hardening: consume `artifact_scope` from the registry,
   decide tree-bound scoping or register the live-taxonomy deviation,
   fail-closed on unreadable `commitInfo`.

Rider (non-blocking): §6 cleanups.

Disclosure: this audit's own claim commit necessarily carries a map regen
(E-17 order — a claim-surface commit must ship the map covering its own
cites), which relabels the orphan cites `unresolved hex literal` and thus
incidentally clears item 1's symptom. The red state at audit entry stands
as recorded above; errata (item 2) and deviations (items 3-5) remain owed.

Re-run checklist (same battery as §1): test-gate, run-gates, both
rewrite-map modes, map-freshness (my audit claim commit joins the checked
set — must stay green), anchoring-footer, orphan-ancestry, deferred,
anchors, adapters --check, focused jest 4-suite batch. Plus
`evaluateRound(grill-t30)` — claims must stay 0-bad; freezeViolations []
(SEAL untouched).

## 9. What the round got right

The substance verified: the CodeBuddy bundle is real and regen-clean; the
SCED protocol + preregistered judgment lines carry the frozen detector pin
(byte-verified); every registration (host_admission, contracts, gates,
trend, ci, README, CONTEXT) resolves; leg 224 is tree-internal where it
matters and caught its own subject honestly; the orphan leg and anchoring
leg are green; mid-round reds were disclosed, not hidden. The failure is
in the closeout tail — orphan cites + a stale-at-audit map — i.e., the
very failure class this round mechanized against. The repair is
mechanical and bounded; nothing here is a design defect.
