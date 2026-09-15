# Handoff — jiahao T-6 confirmatory implementation round (COMPLETE)

## State

- Repo: `D:\Aworker\jiahao` — dual-profile prompt-as-mental-model distribution.
- Branch: `grill-t7-impl-round` stacked on `grill-t7-doc-round` (GitButler).
- Commits: `krs` (devin-corpus plan.json registered before items), `kso`
  (full T-6 round), `kmu` (2026-09-15 audit remediation F-1/F-3..F-7).
  NOT pushed — no PR opened (per policy).
- Evidence report: `.scratch/grill-t7/reports/2026-09-14-report.md`.
- Task book: `.scratch/grill-t7/handoffs/next-round.md` — T-1..T-5 all
  DONE; ledger D-001..D-006 covered.

## What was delivered (all verified green)

- `src/port/score.js` + `src/port/g6-manifest.json` — pure product scorer
  `score(text) -> {logits, verdict}`; old `bench/research` copies deleted.
- `bench/research/confirmatory.js` — confirmatory runner; verdict **PASS**
  (recall@FP0 1.0 vs floor 0.563863135740939, fp 0.0 vs margin 0.045) on the
  frozen corpus @994bdeb3; real fallback leg via
  `bench/research/g6-manifest-word1.json` (bench-side only, never shipped).
- `scripts/check-g6-publish.js` — prepublishOnly gate; sha256 fixture
  `g6-publish-fixture.json`; tarball-extracted replay; corrupted-port
  positive control. Gates `[151 confirmatory-bench]`, `[153 g6-publish]`
  registered confirmatory in `docs/gates.json`.
- `bench/research/devin-corpus/` — frozen `devin-corpus@v1`: 52 items
  (40 honest / 12 lie), 3 consumed drops, mechanical labels, 100%
  dual-adjudication, never-cited-by-conformity disclaimer.
- `bench/research/out/claim-template.md` — 6 fixed facts repeated verbatim
  (whitespace-normalized) in README.md + confirmatory-report.md.
- `docs/adr/0066-*.md` — tarball cap amendment 230,000 -> 300,000
  (M=270,813, `ceil_to_10_000(M x 1.10)`); ADR-0039 anchor amended;
  `docs/deferred-registry.json`: defer-0042 (review slot), defer-0043
  (net-addition tally), defer-0044 (terminal event PASS).
- Wiring suite `test/adr-0065-impl-wiring.test.js` (34 tests) — purity,
  corrupted-port, floor tamper, real fallback firing, fixture anchoring,
  corpus taxonomy, claim verbatim repetition, D-006 registry rows.
- Fixes folded in after two-axis code review: phantom usage flags removed;
  `relL2` deduplicated to the `check-g6-equivalence` export; `checkG6`
  warnings-drop bug fixed (advisory channel restored); devin-collect
  provenance concat bug fixed; D-006 registry rows added.

## Verification snapshot (rerunnable)

- `npx jest` → 58 suites / 823 tests, all pass.
- `npm run gate:all` → exit 0, 29 entries; 4 UNVERIFIABLE are ci-mode-only
  gates (bench-gate/ci-wiring/probes/mr-probes) — expected off-CI.
- `npm pack --dry-run --json` → 270,813 B / 101 files < 300,000 cap.
- `node scripts/install.js --help` and `init --dry-run -y` → both exit 0
  (process liveness for the one-shot CLI surface).

## Post-audit state (2026-09-15 rework, commit kmu)

- Audit report: `.scratch/grill-t7/reports/2026-09-15-audit.md`; rework
  response: `.scratch/grill-t7/reports/2026-09-15-rework.md`.
- F-1 (README counts 827/58, skip recount 10) / F-3 (rescore subcommand +
  out/devin-rescore.json) / F-4 (out/g6-publish-replay.json persisted) /
  F-5 (count-band advisory) / F-6 (doc rot + frozen-flag gate) / F-7
  (pyJsonNum >=1e21 expansion) all fixed and re-verified.
- **F-2 OPEN — needs the user**: ADR-0066 second_reviewer countersign is a
  human attestation (instrument criteria_change, scripts/instrument.js;
  criteria_version ADR-0066-300000, previous ADR-0062-230000). defer-0042
  tracks it. The agent must never fabricate a second reviewer.

## Known constraints for the next round

- The corpus clone lives at `%TEMP%\jiahao-polygraph-994bdeb3.../data`;
  corpus-dependent tests skip honestly when absent (public tier).
- `devin-corpus@v1` is ground-truth only — never cite it as conformity
  evidence (manifest + plan both state it).
- The confirmatory replay is in-sample by construction; out-of-fold claims
  remain the rung-1 research number (all claim homes carry the caveat).
- `.scratch/` is gitignored — `devin-collect.js` + reports live there, not
  in the repo.
- Next-round candidates: review slots defer-0042/0043/0044 at 2026-12-14;
  rung-1 settlement would unblind the devin corpus labels.

## Suggested skills for the next agent

- `$implement` — for the next implementation round (read its SKILL.md first).
- `$handoff` — at session end.
- `$but` (gitbutler) — all VCS writes; dedicated branch, no push/PR.
- `$code-review` — two-axis review before committing (already the norm here).
- Repo conventions: read `AGENTS.md`, `CONTEXT.md`, `docs/adr/0065`,
  `docs/adr/0066`, and this report first.
