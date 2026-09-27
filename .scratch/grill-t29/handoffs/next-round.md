# grill-t29 next-round task book — t28-audit disposition round

EXECUTED. This file was the standing task book for grill-t29 (T-0..T-8,
all executed 2026-09-27 on lane `grill-t29-impl`). The round's report:
`.scratch/grill-t29/reports/2026-09-27-report.md`; closeout handoff:
`.scratch/grill-t29/handoffs/2026-09-27-handoff.md`; human-authority
packet: `.scratch/grill-t29/tide-adjudication-packet.md`.

The next round inherits:

1. **grill-t30 = the 2026-12-15 tide** (or the next round that reaches it):
   adjudicate the packet's five substantive items + the 20-entry
   countersign bulk. Owner-side actions only — the agent drafts, never
   executes: F-8 retro-ratification, seq-13 three-way, ratchet-brake
   adoption, F-12 errata-vs-reseal, `adjudicated/grill-t27` tag,
   countersign verdicts, ADR-0086 countersign, alpha-classification
   countersign.
2. **defer-0072** (corpus secret refresh — owner `gh secret set`),
   **defer-0073** (OIDC migration, review 2026-12-25), **defer-0074**
   (approval-surface boundary, tide), **defer-0075** (tide capacity
   observation — check-in per cycle).
3. **F-13 residual nits** — carryover discretion (none applied this round).
4. New gate legs (220-223) are standing; the anchoring-footer convention
   applies to every commit from its registration forward.
5. Hermetic-git convention applies to any new test that needs git writes
   in temp repos — route through `test/helpers/git-hermetic.js`.
