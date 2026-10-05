# grill-t38 Taskbook — Unified Closeout of grill-t37 + Next Grill Charter

Authored by the audit lane at the t37 landing wave, 2026-10-05. This document
is the single consolidated narrative ("统一口径") replacing the scattered
routing tables in `grill-t37`'s three reports and four handoffs. Read this
first; the per-artifact detail stays in the sources named inline.

## 1. Where t37 actually ended (settled, verified)

- Lane work landed: `grill-t37-impl` + `grill-t37-fixes` (stack), t37 docs,
  and the carried t36 lanes — all landed to `origin/main` this wave.
- Mechanism verdict: **the status-inventory surface works and is green**
  against the committed rework report — `check-status-inventory.js` exit 0,
  member-level reconciliation confirmed across three audit loops.
- Test surface on the settled landed tree: `1740/1` deterministic
  (only `adr-0038` pack-cap red — owner-scope).
- The round's six returned defects (F-1 coverage row, F-2 declared_reason
  hoist, F-3 per-surface streak, F-4 complete-only derivation, F-7
  adjacent-fence sentinel binding, orphan-cites fixture clock) are all fixed
  with pinning tests — verified by the audit lane, not by the fixes lane's
  prose.

## 2. The t38 grill charter — the NEW problems (priority order)

### P-1. The self-referential report problem (F-6's third strike)

Three strikes this round: impl report stale at its landing; audit caught it;
rework report stale at its own closeout commit. Root shape: **a committed
report that claims a pre-commit snapshot is stale the moment it lands** —
the carrier commit moves the world. The loop-3 closure (quiescent re-run →
derivation returns to `{adr-0038}` → committed block reconciles with zero new
commits) worked only because the drifting row was itself transient.

Grill question: should reports bind a **declared snapshot window** (assert
leg treats "members as-of run X" as the claim, not "members now"), or should
closeout be **two-phase** (land code → measure → land report, accepting the
report commit shifts tree)? The audit lane's loop-2 prescription
(regenerate + recommit) was shown to re-open the window — record that.

### P-2. Live-state tests bound to moving environmentals (N-2 adjudication)

`test/adr-0085-wiring.test.js` "live leg state" evaluates pin ancestry
against `HEAD` — on GitButler, HEAD is a workspace merge commit rebuilt on
every apply-branch op. A pin living only in applied-lane lineage
(`68c8ec2f`, grill-t29 evidence) transiently falls out of ancestry during
churn: observed 2 red / 3+ green on an **identical tree**.

Same defect shape as the orphan-cites clock pin (bound to wall clock —
fixed this round). Now bound to workspace topology. Owner adjudication
options (from the audit report): (a) evaluate against a stable ref (lane tip
or merge-base), (b) registered transient-topology errata class, (c) accept
as true signal — which on GitButler means the post-restack ritual fires on
routine parallel ops.

**Post-landing note**: once all lanes merge into main, the t29 pins become
ancestral to main permanently — the flake class shrinks to
churn-during-apply only. Decide whether the residual window justifies the
fix or an errata.

### P-3. Outstanding adjudications carried from t37 (all owner/docs scope)

- **Pack cap**: committed cap 470,000; actual 530,570 B — already over the
  draft ADR-0094 ceiling (530,000) by 570 B. Owner must either revise the
  amendment number upward before sign-off or slim the package.
- **ADR-0095 + gates.json registration**: `status-inventory`,
  `expected-red`, `comment-refs` legs — the assert leg must land as the
  final registry leg; all `source_adr` must resolve to landed ADR-0095.
  Bootstrap warning until then is expected-state.
- **F-5**: `run_id` lacks the CI matrix dimension (spec says same-job matrix
  runs must not collide).
- **F-6 (spec)**: s2 export-domain breadth — member-access tails + string
  literals accepted as "same-file membership"; adjudicate vs the stated
  declared-symbols domain.
- **F-8**: member identity excludes `command`/`exit` — spec only named
  volatile fields; adjudicate whether the wider exclusion is correct.
- **F-9**: T-0 tier-fill paragraph not legislated same-commit.
- **F-10**: contract-vocab enumeration base widened from "44 same-family"
  to all docs JSON + enums — adjudicate or document.
- **F-11**: mismatch precomputation not implemented — adjudicate.
- **post-land-sentinel**: `pre_land` refresh ritual — regenerate the
  post_land segment after this landing wave settles (owner-refresh, but the
  mechanical regen belongs to the landing wave per convention).

## 3. Standing state at handoff

- `main` after landing: t35 closeout base `0f58ba60` + all t36/t37 lane
  commits linearly landed; origin/main pushed.
- Registry: `claim-surface-roles.json` 234+3 rows (audit loop-2 artifacts +
  this taskbook registered same-commit).
- Derived artifacts resynced on the landed tree (rewrite-map LAST per E-17).
- Uncommitted residue intentionally left: other rounds' audit artifacts
  (t27/t28/t36), t23 ref-assets, `docs/adr/0094` draft amendment,
  `test/post-land-sentinel.test.js` — not this lane's work.

## 4. Source artifacts (absolute paths)

- Loop-2/3 audit report (full evidence tables + §8 closure addendum):
  `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-audit-loop2.md`
- Loop-2/3 audit handoff: `D:\Aworker\jiahao\.scratch\grill-t37\handoffs\2026-10-05-audit-loop2-handoff.md`
- Loop-1 audit report: `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-audit-report.md`
- Rework report: `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-rework-report.md`
- Rework handoff: `D:\Aworker\jiahao\.scratch\grill-t37\handoffs\2026-10-05-rework-handoff.md`
- t37 spec/ledger/taskbook: `D:\Aworker\jiahao\.scratch\grill-t37\` root
