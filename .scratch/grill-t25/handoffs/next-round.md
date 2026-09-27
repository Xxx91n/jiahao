# next-round handoff — grill-t25 task book (V6 critique response)

Standing reference: `.scratch/grill-t25/spec-t25-disposition.md` (execution spec) and `.scratch/grill-t25/decision-ledger.md` (D-001/D-002 revised-preserved, D-003..D-005 current). Every task names the D-ids it covers. External side effects (push/merge/tag) are USER actions — the agent drafts, the user executes (D-004).

## T-0 — Pre-flight [D-003]

- Re-verify public state: `git ls-remote origin` tip sha + `git ls-remote --tags origin`; confirm `origin/main` still at the criticized tip or record its advance.
- Re-run `npx jest test/adr-0083-wiring.test.js` to confirm the merge-base red leg reproduces before touching anything.
- Open a dedicated GitButler branch for t25 work; keep parallel agents’ branches untouched.
- Suggested skills: gitbutler.

## T-1 — Round 1: public-clone coordinate [D-003, D-004]

Landing order (commit-isolated, intermediate reds disclosed):
1. Stop-bleed commits -> DIRECT PUSH to main (user executes; message carries round id): evidence-only re-capture wave at the landed tip + the clone-red-required verifier degrade code. Constraint: mechanism commit BEFORE capture commit.
2. Normative commits -> PR (user merges): rewrite-map degrade contract completion if not in (1), `docs/adr/0084-*.md` with the six clauses of spec sec 2.2, the ADR-0083 pointer line, t25-scoped wiring re-roll (new BASE/EVD), generalization defer entry.
3. Tag: user pushes `adjudicated/<round>` annotated tag + SHA co-registered, within the same round.
4. Acceptance: clean `git clone` to a fresh dir -> jest + gate:all -> archive the reproducible trio (command/output/environment) as round evidence.
- Suggested skills: gitbutler, domain-modeling, atomcode-research (only if a new contested fork appears).

## T-2 — Round 2: merged sweep, order a->c->d->b [D-005.1]

1. (a) Register CI-red history: deferred-registry entry + discharged note + owner + review date; no snapshot edits.
2. (c) Register `bbf5259` as the first directional event under Re-Execution Prior (separate entry; n=19 untouched); the first-disclosure-channel boundary rule is already in ADR-0084 from T-1.
3. (d) Label all 10 countersign-queue entries "ID-level-only, awaiting entity-level" WITH a return condition/date.
4. (b) Extend secret-scan enumeration with the commit-message surface; note the GitHub-official enumeration lacks it.
5. kind:fix bookkeeping — `governance_tooling_diff` lists every R2 file hand-edited this round.
- Suggested skills: gitbutler; sqlite-utils-skill only if registry JSON gets awkward to edit.

## T-3 — Round 3: human-authority package [D-002.3/5, D-005.2]

- Draft the minimal approval package, present to user, STOP — agent does not decide:
  1. renew-or-expire template: renew-with-expiry / expire / registered-exemption-with-expiry (three options, no silent extension).
  2. countersign queue: entity-level signing OR formal downgrade — forced binary per entry.
  3. ratchet-brake four criteria -> charter layer (CONTEXT.md/AGENTS.md meta-rule area) + review-agenda reference; never the metrics layer.
- Suggested skills: handoff (the package IS a decision handoff to the human).

## T-4 — Closeout [D-004.4/5, D-005.3]

- Facts-canon round report disclosing: direct-push exception uses, tag-timing window, intermediate red states, engine-absence caveats from research provenance.
- Trend row(s): kind:fix, governance_tooling_diff per ADR-0078, deferred entries named.
- Ledger status sync: consumed D-ids stay current; anything superseded marked revised, never edited.
- Suggested skills: gitbutler, neat-freak.

## Hard negatives (union)

No agent merge/tag/renew/sign; no normative edit to ADR-0083 beyond the pointer line; no generalized monitoring this round; no snapshot rewrites; no label-without-return-condition; no meta-rules in metrics; no mechanism+capture single commit; no new devices from bookkeeping.
