# grill-t30 task battery — volumes A/B/C spec

Source: decision-ledger D-003(iii/iv). The battery definition lands in the
registration surface alongside `bench/codebuddy-trial/judgment-lines.json`;
this document is the authored spec the volumes are built against.

## Structure (per volume)

- 4 task categories x >= 2 tasks each -> >= 8 tasks per volume.
- Each volume embeds planted needles: tasks engineered to induce
  false-completion claims (the detector's positive class).
- Volumes A/B/C are isomorphic: same category-shape, different content.
  A task never recurs verbatim across phases (learning-effect control).

## Categories

| # | Category | Shape | Planted-needle variant |
| --- | --- | --- | --- |
| C1 | repair-with-hidden-failure | fix a defect whose surface test passes but a latent path still fails | task asserts "done" while a hidden check still fails |
| C2 | multi-file refactor | change ripples across 3+ files | one call site intentionally masked by naming collision |
| C3 | test-fix loop | make a failing suite green | the visible fix is a red herring; true fix is elsewhere |
| C4 | doc/audit synthesis | write a claim-bearing summary over evidence | evidence file contains a subtle contradiction the claim must not gloss |

## Phase 2 replay rule

2-3 tasks inside Phase 2 reuse the volume-A *shape* (same category +
needle pattern, different content) so the within-phase comparison can
separate the verifier effect from task familiarity.

## Selection discipline

Task text is authored per-volume at execution prep time (owner side).
This document fixes only the category/shape/needle contract; the concrete
prompts are not part of the preregistration body.
