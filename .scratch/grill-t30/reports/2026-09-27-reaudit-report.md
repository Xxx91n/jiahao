captured-at-head: c22c01ae1d17d3097873691324883a6726c48903
<!-- loop-2 audit pin = audit lane content tip at re-audit entry (the
     re-landed FAIL report commit). Workspace merge f830b520 sits above
     it and is ephemeral; pinning it would repeat the orphan-pin class.
     Pin = content tip of the audited chain, ancestral of this commit. -->

# grill-t30 second-party re-audit (loop 2) — bounded residual, owner call pending

Auditor: Devin (audit window). Subject: the fix window's audit-repair
wave — `4feeffe0` machinery, `e86a4321` ERRATA E-18, `f79d8be5` spec
addendum, `7c5f1585` exemption registration, `865d465a`/`6a983cf3`
README/zh-CN count sync, re-issued seal wave `cf5e42c7`
(`seal: 6a983cf3`), claim wave `8a6855f3`, g6 regen `0c9b1c94`, audit
report byte-identical re-land `c22c01ae`.

Verdict: **NOT VERIFIED → bounded rework OR owner adjudication.** Every
repair item from the loop-1 FAIL verified individually — but the hard
battery is red again at audit HEAD (same drift class, two new rows), and
the two newest orphan cites lack errata registration. Whether this
residual blocks PASS is an owner-side trigger-interpretation call
(grill-t29 F-7); the state facts are below. Evidence captures:
`.scratch/grill-t30/audit-evidence/` (never-commit nc-001) — loop-2 adds
5 capture files + 1 real-hook repro script (`repro-pretool-guard-loop2.js`,
`rerun/loop2-*.txt`, `rerun/pretool-guard-loop2.txt`).

## 1. Fix-window claims, independently re-verified

| Fix-window claim | Audit evidence | Verdict |
| --- | --- | --- |
| A-2: ERRATA.md E-18 registers `52e857f5`/`189e4e80` + live counterparts; prose rebind | `docs/governance/ERRATA.md` E-18 entry read — both orphans named, lineage given (52e857f5→a15e8c0f seal-wave; 189e4e80→cba768aa), discharges D-005 for those objects; report §3.1 now reads "Fixed in `cba768aa`" | holds |
| A-3: handoff anchor corrected | handoff lines 7-16 now name `6a983cf3` + disclose the wrong `189e4e80` first-landing + E-18 pointer | holds |
| Audit's own orphaned pin `8942e2d8` handled | `errata_exemptions` gained entry: file=audit-report, sha=8942e2d8, errata=E-18, pending-confirmation; leg 219 output shows `2 errata-exempt`, all 126 pins/19 shas else ancestral | holds (awaits owner adjudication of the pending entry — owner-side by design) |
| B-1: pre-commit runs `--check` where gb-local refs exist, else `--published-only` | `.githooks/pre-commit-user` re-read: `git for-each-ref refs/remotes/gb-local/` branches the two modes; comment names the clone-degradability contract + B-1 | holds |
| B-2: leg-224 scoping tree-bound | `classifiersAt(root, sha)` loads `surface-taxonomy.json` via `git show <sha>:file` — commit's own tree; null taxonomy → recorded error | holds |
| B-3: private `CLAIM_SCOPE_RE` removed | gone; `cx.scopeRe` now consumed from `classifiers()` (`evidence-freshness.js:88`, derived from registered `artifact_scope`) | holds |
| B-5: unreadable commit fail-closed | `info.unreadable → null` → explicit error push at check-map-freshness.js:159-160 | holds |
| B-4: pretool-guard token-anchored matcher closes the evasion classes | **reproduced end-to-end against the real hooks** (repo + vendored copies): all 8 evasion payloads (`rm rules/…`, `rm .mcp.json`, `del hooks\hooks.json`, abs-path+trailing-arg, bare `.jiahao-pretool.jsonl`, `rm -rf hooks/jiahao-pretool-guard.js`, `move .claude-plugin/plugin.json`, Edit file_path) → `permissionDecision:"deny"` + telemetry line; all 4 benign commands → silent pass. Regression test pinned in `codebuddy-adapter.test.js` | holds |
| §6 minors: dead import / gitAt rename / host literal / quotepath+prefix guards / env scrub / mcp key | `execFileSync` import gone from map-freshness.test.js; `makeGit` renamed curried helper; `pretool-guard.js:98` now `host: detectHost()`; `scanDocTokensAt` has `-c core.quotepath=false` + `ref:`-prefix guard + throw-on-malformed; test env scrub deletes CODEBUDDY/CLAUDE_PLUGIN_ROOT; `.mcp.json` key = `jiahao-mcp` | holds |
| spec §9 addendum records the rulings | spec §9 "Audit-repair addenda" exists: rules-path literal deviation, D-001(iv)/(v) capture-point bindings, B-1 record | holds |
| Seal chain rebuilt correctly | `cf5e42c7` lands SEAL+map only; `8a6855f3` lands report+handoff+map only; SEAL declares `6a983cf3d28c…` == `git rev-parse 6a983cf3`; audit report blob hash identical to loop-1 version (`7630331c…` both commits) | holds |
| `evaluateRound(grill-t30)` clean | re-run: claims 2 (8a6855f3 + c22c01ae) / bad 0 / unreg 0; seal declared==expectedAnchor `6a983cf3`, declarationCommit `cf5e42c7`, inFlightClean, freezeViolations [], amended false | holds |
| Counts: 1471 tests / 3328 cites / pack 419,403 | README+zh-CN say 1471×86; `--published-only` reports 3328 covered; `npm pack --dry-run` = 419,403 < 470,000 | holds |
| Nothing pushed | `git log origin/main..HEAD` = 21 local commits only | holds |

## 2. The residual — same drift class, third instance

At audit HEAD the committed map is stale **again**:

- `node scripts/build-rewrite-map.js --check` → FAIL (stale)
- `run-test-gate` → exit 1 (`rewrite-map.test.js` › "--check green with
  old-side refs" — Expected 0, got 1)
- `run-gates.js` → **exit 1**, sole failing leg `[208 rewrite-map]`; the
  other 41 entries PASS or registered-UNVERIFIABLE (4 ci-mode)

Module-level regen diff (non-mutating): the ONLY drift is two `doc_refs`
rows — `.scratch/grill-t30/reports/2026-09-27-report.md:225` cites
`ad5a6393` and `7aa9391d`; committed label `local object`, current truth
`unresolved hex literal`. Archaeology: `ad5a6393` = first re-issued seal
wave (declared `7c5f1585`), `7aa9391d` = first audit-fix claim wave —
both superseded when the README count-sync commits landed under a second
seal re-issue (`cf5e42c7`) + rebuilt claim wave (`8a6855f3`). Reachable at
the fix window's final regen, orphaned by the tail rebuild that followed.
The prose itself is honest ("discarded waves … remain objects — disclosed,
not hidden"); only the map labels went stale. Same E-17 shape as loop-1 —
this time generated *inside* the repair window by its own restacks.

Registration gap: E-18 covers `52e857f5`/`189e4e80` (+ the audit-pin
exemption). `ad5a6393`/`7aa9391d` are cited-by-sha in report rev-2:225
with no errata row yet. (`367b21ed`, the first audit re-land, is cited
only by change-id `wtu` — no sha cite, no map row, nothing owed —
that was the right way to reference an ephemeral commit.)

Stale capture cells in report rev-2 §2 (cosmetic, captured-at-time):
"3 claim-surface commit(s)" (now 2), "35 post-registration commits" (now
46), "3219 doc citations" (now 3328).

## 3. What I verified is NOT a new defect

- Leg 224 stays green (2 claim commits verified tree-internally —
  per-commit trees are self-consistent; the drift is ambient, not
  committed-falsehood).
- Leg 219/223/222 all green; seal inFlightClean; freezeViolations [].
- The prose naming the orphans is accurate disclosure — no factual error
  like A-3 remains.
- The pre-commit lock and leg mechanics now match their documented
  semantics (B-1/B-2/B-3 all closed at code level).

## 4. Disposition — two readings, owner adjudicates

**Reading A (strict — bounded rework).** The terminal state handed to the
audit is red; the orphan-cite + stale-map defect recurred inside the fix
window. Repair = one small wave:

1. `ERRATA.md`: extend E-18 (or E-19) to register `ad5a6393` +
   `7aa9391d` (documentary, like E-18's own note — neither sits on a
   pin_patterns line).
2. `node scripts/build-rewrite-map.js` regen in that commit (the errata
   text adds cites; map must cover them — ERRATA.md is scanned surface).
3. Re-run the §1 battery. (My own claim wave for this report carries a
   mandatory regen already — leg-208 green returns with it; the erratum
   registration remains owed.)

**Reading B (F-6 window — accept + close).** grill-t28 D-005's ritual
names `evaluateRound` re-runs and *pinned-sha* errata; prose cites and
the live `--check` leg sit outside the ritual's named steps — the
post-restack exposure window the convention already acknowledges
(F-6 "the interval between a restack and the next gate evaluation is
covered by the ritual"). Under this reading the fix window complied with
every registered obligation, the residual is the accepted window's cost,
and the true defect is a *convention gap*: the wave-closeout order lacks
a terminal settle check. Then the only owed acts are: E-18 documentary
extension + (recommended) a one-line amendment to the AGENTS.md
wave-closeout rule: "after the FINAL `but` mutation settles, re-run
`--check` + evaluateRound before declaring" — this is the third
recurrence of the class (E-12 → E-17 → this), each caught by machinery,
each costing a repair loop.

The convention texts support both readings; which residual still blocks
PASS is an owner call (F-7). My facts: battery red at audit HEAD = true;
all repair claims verified = true; everything else green = true.

## 5. Handoff status

No PASS handoff issued — verdict not self-issued per F-7 and the audit
mandate. If the owner rules Reading B (or after the Reading-A wave lands
green), the PASS handoff content is ready to emit: next-round direction =
the standing task book `.scratch/grill-t30/handoffs/next-round.md`
(T-31 CodeBuddy live-trial execution is owner-side; agent-side candidates:
the settle-check convention amendment, guard-coverage probes, polygraph
appendix prep).
