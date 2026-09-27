captured-at-head: 0c189a875aa7deeb704bb4925ca9fb0c040b1138
<!-- audit pin = settled-tree tip at loop-3 evaluation; see reaudit
     report header for the ephemeral-workspace-merge caveat. -->

# grill-t30 audit handoff — PASS after three audit loops

Lane `grill-t30` closes: second-party audit PASS issued in
`.scratch/grill-t30/reports/2026-09-27-reaudit-report-2.md`
(loop 3, 2026-09-27). Round artifacts: report/handoff rev-3
(`captured-at-head f8765408`), SEAL declares `e9c80749`
(last substantive = E-19/AGENTS registration tip).

## What happened in this audit (context restore for the next session)

- **Loop 1 (FAIL)** — `reports/2026-09-27-audit-report.md`, commit
  `9b47afdf` on `grill-t30-audit`: battery red at audit HEAD
  (`[208 rewrite-map]` stale via orphaned `52e857f5` cite),
  unregistered orphan pins `52e857f5`/`189e4e80`, handoff's wrong seal
  anchor, spec deviations B-1..B-5 + minor list.
- **Loop 2 (bounded residual)** — `reports/2026-09-27-reaudit-report.md`,
  commit `832a2a62` (re-landed `bf49cbc9` byte-identical): all B-fixes
  verified incl. a real-hook repro of the pretool-guard evasion classes;
  residual = two NEW orphan map rows (`ad5a6393`/`7aa9391d`) + missing
  errata rows → presented strict-rework vs F-6-window readings, owner to
  adjudicate.
- **Loop 3 (PASS)** — `reports/2026-09-27-reaudit-report-2.md`: fix
  window landed BOTH readings — ERRATA E-19 full orphan roster (with
  role-named successor lineage + prospective exemption registration)
  AND the AGENTS.md wave-closeout final leg (settled-tree `--check`
  before declaring — the F-6 window gap that burned three rounds:
  E-12 → E-17 → E-19, each caught by machinery, each costing a loop).

## State a fresh agent must know

- Workspace lanes: `grill-t30-impl` (round work + fix waves),
  `grill-t30-docs` (ledger/spec/taskbook), `grill-t30-audit` (my three
  audit reports; claim commits there are counted by leg 224 —
  currently 3 verified: `57acf678` + `310203ac` + `bf49cbc9`).
- Orphan-object convention now airtight: pin_patterns lines
  (`captured-at-head:`, `seal:`) → `errata_exemptions` rows; prose sha
  cites → documentary ERRATA.md entries; successor lineage is named by
  ROLE not sha. `367b21ed` was correctly cited by change-id `wtu` —
  the right way to reference ephemeral commits.
- Audit evidence captures: `.scratch/grill-t30/audit-evidence/`
  (nc-001, never commit): loop-1/2/3 batteries + leg captures +
  `repro-pretool-guard*.js` fixtures.
- Battery (reproduce block in round handoff):
  `run-test-gate --expected-suites 86` → 1471/1471; `run-gates` →
  exit 0 (4 ci-mode UNVERIFIABLE registered); map --check/--published-only
  → 3394 cites; evaluateRound → 3 claims / 0 bad / seal e9c80749
  inFlightClean.
- Owner-side open items: `errata_exemptions` E-17/18/19 entries are
  `pending-confirmation` (ratify/revoke = owner act); CodeBuddy SCED
  trial execution (Phase 0/1/2 + A-replays + JL-1..5 reads) not started —
  boundary held.

## Next grill direction (recommendation)

**Primary: T-31 — SCED trial harness.** The preregistered protocol
(`bench/codebuddy-trial/judgment-lines.json`, `.scratch/grill-t30/
protocol.md`, `task-volumes.md`) is frozen but has no runner: task
battery packaging (A/B/C volumes + planted needles), telemetry
collectors for `.jiahao-instructions.jsonl`/`.jiahao-pretool.jsonl`,
and a JL evaluator that reads the preregistered predicates and emits
ONLY IF…THEN verdicts against captures. Execution on a real CodeBuddy
host stays owner-side; the harness is agent-buildable and turns the
owner's run into a one-command operation. D-001(iv) capture-point
bindings are already ruled (spec §9 addendum).

Alternatives if the owner prefers governance depth first:
1. **Settle-window mechanization** — the new AGENTS.md final leg is
   convention-text only; a gate leg could compare last-`but`-mutation
   vs last-map-regen and red inside the F-6 window automatically.
2. **Adversarial pending-confirmation / tide prep** — deferred per the
   round handoff; pretool-guard residual bypass classes (encoded paths,
   `$(…)` indirection, `$var` assignment splits) would be its content.
3. **Polygraph appendix prep** — demoted-but-allowed per D-003.

## Suggested skills for the next session

- `gitbutler` — all VCS (allowlist commits + `git show --name-only`
  verify; ANCHORING footers via `derive-anchoring-footer.js`).
- `code-review` — if T-31 produces a new diff surface.
- `handoff` — at the next round's close.
- `to-spec` / `to-tickets` — if the owner picks T-31, the task book
  needs a ledger amendment first (D-001..D-005 is closed-scope; new
  scope needs a new D-record — do not write without one).
- `atomcode-research` — only if a fresh external question opens; the
  t30 research corpus is already in ctx index.

## Boundaries to keep

- No push / no merge / no tag without explicit owner order.
- Claim artifacts append-only; corrections ride errata + operational
  copies (E-12..E-19 precedent chain).
- `but commit` with explicit id allowlist + ANCHORING footer + post
  `git show --name-only` verification.
- Evidence counts in split form; `$` lines name verbatim argv.
- All reported paths absolute.
