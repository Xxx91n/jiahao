# Handoff - ADR-0061 round CLOSED (audit passed), merged and pushed (2026-09-13)

Date: 2026-09-13. Repo: `D:\Aworker\jiahao`.
Status: **round closed** - both audit cycles passed after one repair round + one single-line D-1 fix.

## Where things stand

The ADR-0061 implementation round is complete and verified. Scope delivered: T-1 measurement
unblocking (D-006), T-2 gate-amendment ADR-0062 (D-001), T-3 judge-identity surface narrowing
(D-002), T-4 instrument tagging + dispositions + look-back (D-003), T-5 governance-artifact
anchoring (D-005). T-6 (the product round) was deliberately NOT started - it is the next round.

Verification at closure: 54 suites / 727 tests green; `gate:all` exit 0 (23 entries, 4
unverifiable for local ci-mode absence); tarball 212,699 B < 230,000 B cap; instrument hash
chain valid through seq 12 with append-only integrity proven against the pre-repair baseline.

## Do NOT re-derive these - read them

1. `.scratch/grill-adr0061/reports/2026-09-13-closure-verification.md` - the closure record
   (D-1 fix, write integrity, 4 confirmation checks, final disposition of every finding).
2. `.scratch/grill-adr0061/reports/2026-09-13-reaudit-report.md` - the second audit (sections 1-6).
3. `.scratch/grill-adr0061/reports/2026-09-13-audit-report.md` - the first audit (Standards + Spec axes).
4. `.scratch/grill-adr0061/decision-ledger.md` - D-001..D-006, all still current.
5. `.scratch/grill-adr0061/handoffs/next-round.md` - the standing task book.

## Open items carried forward (none blocking)

1. **Frozen seq 6 / seq 10 are field-deficient** by append-only design - documented as ERRATA
   E-4/E-5 plus an ADR-0063 D-D erratum. A future re-anchor must APPEND a new event, never edit them.
2. **P-3**: the bias-probe artifact lives under gitignored `.scratch/` while seq 10/12 anchor its
   hash. Already a deferred tension (no new action this round).
3. **RSD-1 (Low)**: `scripts/instrument.js` P-2 lookup has a redundant fallback branch; behaviour
   is correct today. Cosmetic.
4. **`bench/polygraph/results/reverify-20260913.json`** stays untracked by design (regenerable;
   the round constraint reserved it for human review).
5. **defer-0024** external/cross-domain witness remains open, next mandatory check-in 2027-09-01.
6. **`--signoff` full certify is unreachable** while the corpus sample stays below `min_n=100`
   (n=26). Every identity re-pin therefore lands as a conditional certification and re-arms
   CAPA-0060-judge-flip-rate. Reaching a full certify needs corpus growth (defer-0032), not a
   process change.

## Next grill direction (the next round)

The standing task book's own pointer is the authority. Two candidate directions, in priority order:

1. **T-6 the product round (D-006 step 3)** - the round that was deliberately deferred until the
   measurement surface was unblocked and the identity surface narrowed. This is now unblocked:
   ADR-0061 D-D registers it as a research round under the ADR-0059 waiver, and D-004's exemption
   counting applies (a research/exemption round does NOT count toward "consecutive N rounds of
   zero movement", but must be explicitly registered as an exemption class; three consecutive
   exemption rounds trigger the same alarm as non-exempt zero movement). TF-IDF-family research
   is the named subject.

2. **Review D-004 in practice** (the task book's stated next grill direction) - audit the
   exemption-counting semantics themselves: whether the defer-0024 minimal unlock met the
   "anchoring is inherently external" bar, and whether defer-0036's zero-movement-N definition
   is being applied honestly. This is a governance-review round, not a product round.

**Recommendation:** open the next round as direction 1 (T-6 product round), registering it
under ADR-0061 D-D as an exemption-class research round, because the two blockers named in
D-006 accepted by D-006 (measurement unblocking + identity narrowing) are now both closed and
further governance rounds would begin to look like governance theater (D-006's explicit
negative). Fold direction 2 in as a subordinate audit item within that round if capacity allows.

## Suggested skills for the next session

- `$ask-matt` - if the T-6 vs D-004-review choice needs routing.
- `grill-with-docs` / `grilling` - to open the T-6 product round adversarially (the round's own
  pattern: grill the plan, then `$to-spec`, `$to-tickets`, `$implement`).
- `implement` (drives `tdd` at pre-agreed seams, closes with `code-review` before committing).
- `$handoff` - to produce the next round's handoff.
- `but` (GitButler) for all writes; `research` for the deferred external-witness (defer-0024) question.

## Working agreement reminders (from AGENTS.md)

- After every documentation round, commit that round's doc artifacts (new ADR, `CONTEXT.md`
  glossary sync, `docs/deferred-registry.json` sync, README ADR index rebuild, wiring-test seed
  update) as one coherent commit before the next implementation round.
- `CONTEXT.md` is the source of truth for domain language; ADRs for design decisions;
  `docs/agents/*.md` for issue-tracker/triage configuration.
