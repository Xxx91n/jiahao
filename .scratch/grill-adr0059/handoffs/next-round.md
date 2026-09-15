# Next Round: ADR-0059 Implementation Round (Standing Task Book)

Source of truth: `.scratch/grill-adr0059/decision-ledger.md` (D-001..D-005,
all current). Doc round committed on GitButler branch `adr0059-doc` (commit
klq). Do NOT re-derive decisions from memory; the ADR
`docs/adr/0059-external-critique-dialectic-closure-distribution-honesty-and-governance-posture.md`
is the frozen text.

## Tasks (order matters)

1. README Tier 1 rename + naming declaration (covers D-001 / D-A).
   Tier 1 install becomes `npx --yes github:<org>/jiahao init`; remove every
   `npx jiahao` / `npm i jiahao` instruction (they resolve to a third-party
   2019 test package). Add the naming declaration: unprefixed `jiahao` is
   third-party property, never claimed; future publish uses scoped
   `@<org>/jiahao` (defer-0028).
2. Source-only MCP tier (covers D-002 / D-B).
   Remove `jiahao-mcp/` from the package.json files whitelist; add the
   clone + local-install opt-in sentence; amend ADR-0038 D1; tidy .npmignore;
   add pack assertions that mcp is absent from the tarball. Do NOT hoist mcp
   deps into root (ADR-0027 R1). defer-0029 tracks revival.
3. Bench README waiver note (covers D-003 / D-C partial).
   Add the no-metric research-round waiver note to bench/polygraph/README.
   The lightweight-feature product round itself is a separate later round.
4. Assurance wording pass (covers D-004 / D-D).
   SKILL.md two-point edit: same-boundary rule sharpened to "self-validation
   provides coherence evidence only"; README gains the slogan "agreement is
   not accuracy". Lock wiring counts / suite-count assertions
   (FIX-DON'T-HIDE). No check reduction.
5. Registry integrity re-check (covers D-005 / D-E, registered only).
   defer-0031 already landed in the doc round; this round only verifies
   wiring and adds nothing.

## Standing rules

- File writes: UTF-8 no BOM, LF; verify bytes after write; `git diff --check`.
- Pack budget hard cap 200,000 bytes (current 199,653; margin 347B) — measure
  with `npm pack --dry-run` after ANY packed-file edit.
- gates.json changes must share a commit with their ADR (ADR-0027).
- Never touch other agents' uncommitted paths: `.githooks/*`, `.gitignore`,
  `bench/polygraph/results/*`, `mr-artifacts/*`.
- Version control via `but`; commit each completed task separately with the
  covering D-xxx ID in the message. Do not push (push happens after the
  final audit round).
- Anti-嘉豪 discipline: no "done" claim without a fresh verification command.

## Verification loop (run in order, all must pass)

1. `npm test` (expected 50 suites / 676 tests plus any new assertions)
2. `npm run gate:all`
3. corpus-drift check (the corpus gate script in gates.json)
4. `npm pack --dry-run` size < 200,000
5. `git diff --check`

## Suggested skills

- `$improve-codebase-architecture` for sequencing, `$code-review` for the
  post-implementation audit, atomcode research only if a task hits an
  external-facts gap, ponytail full throughout.

## Next grill direction (after this round lands)

- Decision-rule change-management policy (who may amend pre-registered gates).
- BL-1 gate secret hygiene; BL-2 required-check carrier on branch protection.
- defer backlog tide: review_at check-ins for 0028-0031.
