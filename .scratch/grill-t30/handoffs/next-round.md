# grill-t30 next-round task book — CodeBuddy adapter + first external trial

Sole decision source: `D:\Aworker\jiahao\.scratch\grill-t30\decision-ledger.md`
(D-001..D-005, all current). Execution spec:
`D:\Aworker\jiahao\.scratch\grill-t30\spec-t30-codebuddy.md`. Context
restore: `D:\Aworker\jiahao\.scratch\grill-t29\handoffs\2026-09-27-audit-handoff.md`
(t29 PASS, merged to main at `8704ce24`, SEAL re-issued `68c8ec2f`, E-17
registered). Three atomcode research reports for this round live in the ctx
index — `ctx_search` for CodeBuddy surface details, SCED protocol, and
freshness-gate layering before touching §2/§3/§4 of the spec.

Authority boundary (unchanged): pushes, merges, tag pushes, countersigns,
pending-confirmation ratify/revoke, and the CodeBuddy trial execution
itself are USER/owner actions. The agent drafts, commits locally on its
own lane, and runs local verification only.

## T-0 — Pre-flight [D-001]

- `git log origin/main --oneline -3` + `but status` — confirm the t29 stack
  is merged (`8704ce24`) and pick the base for a dedicated t30 lane.
- Confirm the ledger is the only source: re-read `decision-ledger.md`;
  if any spec line lacks a D-record, stop and report, do not write.
- Research recall: `ctx_search` the three t30 atomcode reports before
  drafting the ruling/protocol — do not re-derive from memory.

Suggested skills: gitbutler.

## T-1 — Injection-surface ruling + exception registrations [D-001, D-002, D-005]

- Write the injection-surface ruling (enumerate CodeBuddy IDE + CLI
  injection points; verified vs declared-unverified per point).
- Register every declared-unverified item as a pending-confirmation
  exception per ADR-0086 (`status/requested_by/reason/expires_at/scope`,
  narrow scope). Known set: IDE-side hooks parity incl.
  `InstructionsLoaded`; rules non-`alwaysApply` load priority; npx vs
  `codebuddy plugin install` coexistence.
- Deliverable lives where §5 of the spec places the tiering table
  (adapter README) with the exception entries in the taxonomy.

Suggested skills: domain-modeling; research (ctx recall only — no new
atomcode runs unless a question reopens).

## T-2 — Adapter bundle + conformance entries [D-002, D-005]

- Build `adapters/codebuddy/` per spec §2.2: `.claude-plugin/` manifest,
  `hooks/hooks.json` full event map + `InstructionsLoaded` integrity
  assertion + `PreToolUse` deny wiring, `rules/` dual profile with
  `alwaysApply: true`, `.mcp.json` for jiahao-mcp.
- Test-first: extend `test/fixtures/host-contracts.json` with codebuddy
  contract rows; add the structure test (plugin.json manifest-dir-only,
  components at root); wire the entries into `scripts/build-adapters.js`
  so `--check` covers them.
- Respect script constraints: Git Bash syntax, case-sensitive matchers,
  60s timeout budget; nothing load-bearing in frontmatter.

Suggested skills: tdd; gitbutler.

## T-3 — Trial protocol + battery + preregistered judgment lines [D-003, D-005]

- Author the SCED protocol doc: Phase 0 (volume A + telemetry
  self-verification as item 0), Phase 1 (volume B), Phase 2 (volume C +
  2-3 volume-A-shaped replays).
- Battery spec: four categories × ≥2, planted needles, isomorphic
  parallel volumes (same shape, different content).
- Write the judgment-line preregistration file on a persistent
  registered surface (thresholds.json-like), every line
  `source_adr: "0087"`, event-defined cross-phase conditionals; freeze
  the `detect()` version reference inside it.
- polygraph corpus enters only as an appendix probe for the deny path.

Suggested skills: domain-modeling (protocol terms); neat-freak
(preregistration file vs ADR congruence).

## T-4 — Wave-closeout leg (E-17 mechanization) [D-004]

- New gate leg: per-commit tree-internal assertion on round lanes —
  every hex citation in the commit's tracked docs has a row in the
  map inside the same tree + map internal consistency
  (`--published-only` subset semantics ported per-commit). Inputs
  strictly tree-internal.
- Wave/closeout flow lock: map regen last, `--check` clean required
  before commit proceeds; failure = block + manual regen. No bot
  auto-commit.
- Keep the E-17 prose as provenance; the leg is the mechanism.

Suggested skills: tdd; diagnosing-bugs (the 208/209 leg history as
fixture cases).

## T-5 — ADR-0087 + registrations [D-005]

- Author `docs/adr/0087-*.md` per spec §5: admission decision + reasons
  + rejected options; explicit `extends ADR-0028 D6`; self-audit line
  enumerating new semantics (new host path family + pending-confirmation
  tiering precedent). No criterion values copied into the ADR.
- CONTEXT.md glossary additions inline per domain-modeling (candidate
  terms: Claude-Code-compatible path; declared-unverified tier;
  preregistered judgment line / SCED).
- `trend-inventory.json` row: `kind:fix` (E-17 leg) + adapter addition;
  name every machinery hand-edit.
- ADR-0087 joins the countersign queue (fence semantics apply to
  itself).

Suggested skills: domain-modeling; neat-freak.

## T-6 — Install manual + hook disclosure [D-001, D-002]

- `adapters/codebuddy/` install manual: step list for both plugin
  install and npx flag path; the pending-adjudication section listing
  the three known-unverified items as *unverified*; the hook-behavior
  disclosure (plugin hooks bypass the untrusted-frontmatter gate and
  execute on enable — full behavior list).
- Honest notes section in README style matching existing adapters
  (qoder/copilot README precedent: known degradations named, not
  smoothed).

Suggested skills: writing-for-agents.

## T-7 — Acceptance battery + closeout [D-001]

- Run spec §8: test gate, gates incl. new legs, adapter `--check`,
  host-contracts matrix, deferred check, structure test,
  preregistration back-pointer check, pending-confirmation presence
  check.
- `evaluateRound(grill-t30)`; SEAL per current convention; anchoring
  footers derived via `scripts/derive-anchoring-footer.js` on every
  non-merge commit; `git show --name-only` verification after every
  `but commit`.
- Round report discloses: any red intermediates, research-engine gaps,
  the pending-confirmation entries opened.

Suggested skills: gitbutler; neat-freak.

## T-8 — Hand off [D-001]

- Trial hand-off to the user: the manual + protocol + judgment file are
  the owner's execution package; the agent's round ends at committed,
  verified artifacts — Phase 0-2 execution happens in the user's
  CodeBuddy environment.
- t31 stub candidates: tide adjudication (2026-12-15, t29 packet), the
  lapse-triggered pending-confirmation adversarial probe, trial-results
  disposition when the user reports back.

Suggested skills: handoff.
