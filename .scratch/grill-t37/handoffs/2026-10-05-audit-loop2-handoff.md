# grill-t37 Audit Loop-2 Handoff — 2026-10-05

Companion to `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-audit-loop2.md`
(full evidence tables there). Loop-1 audit: `2026-10-05-audit-report.md`.

## Verdict

*(Loop-2 verdict below; **loop-3 update**: N-1 verified closed with zero new
commits — quiescent re-run returned the test derivation to `{adr-0038}`, the
assert leg reconciles the committed rework report at exit 0. See the report's
§8.)*

**Rework scope: VERIFIED COMPLETE.** All six returned items (F-1, F-2, F-3,
F-4, F-7, orphan-cites clock) are fixed with pinning tests; registry rows,
ANCHORING footers, derived resyncs all green; settled-tree battery
re-derived independently (test 1739/2 at loop-2 → 1740/1 on the quiescent
re-run, gates 44/3/4, pack 530,570 B, CLI dry-run 0, diff-check clean).

**Round residuals are all owner/docs scope** — routed below; nothing remains
in the fixes lane's charter.

## Routing

| Residual | Owner | Action |
| --- | --- | --- |
| N-2: `adr-0085` live-state flake — pin ancestry evaluated against transient GitButler workspace merge commit; red under apply-branch churn, green at rest | **Owner/spec** | Adjudicate: stable evaluation ref vs transient-topology errata class vs accept-as-signal. Latent: can re-red the surface without any code change (2 red / 3+ green observations on identical tree). |
| ~~N-1: rework report sentinel drift~~ | **CLOSED (loop-3)** | Zero-commit mechanical close: quiescent re-run restored the derivation to `{adr-0038}` = committed block; assert leg exit 0. Lesson recorded: member-level drift ≠ stale tree — regenerate-and-recommit would have re-opened F-6. |
| Pack cap: 530,570 B exceeds committed 470k AND draft ADR-0094's 530k (+570 B) | **Owner** | Revise the amendment number before sign-off, or slim the package. |
| F-5/F-6/F-8~F-11 adjudications; `gates.json` registration (ADR-0095) | **Owner / docs lane** | Unchanged from loop-1 routing. |
| Standing reds (map-freshness landing-gated, post-land-sentinel owner refresh) | **Owner** | Unchanged; correctly disclosed by rework. |

## Suggested next grill direction (t38)

**The self-referential report problem.** Three F-6-window strikes in one
round (impl report stale at landing; audit catch; rework report stale at
its own closeout commit). Grill whether reports must describe a
post-commit derivation (two-phase closeout) or the assert leg needs a
declared snapshot-window semantic. Second axis: live-state tests bound to
moving environmentals (wall clock → workspace topology) need a
stable-anchor convention — two instances in one round is a pattern.

## Housekeeping

- Loop-2 artifacts are uncommitted (audit-lane convention: registration rows
  land with the landing wave). Both files are claim-surface candidates and
  will need `claim-surface-roles.json` rows at commit time.
- The loop-2 report carries the machine-readable coverage block and two
  sentinel blocks minted verbatim from the newest derivations
  (byte-verified; test block re-minted at loop-3 to the quiescent
  derivation).
- No push; no commits by the audit lane.
