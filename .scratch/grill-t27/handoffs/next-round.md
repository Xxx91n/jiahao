# next-round taskbook - grill-t28 (stub)

grill-t27 closed at terminal wave green (5cb2a9fe). Outstanding:

- owner: secret refresh + merges (see `handoffs/2026-09-25-handoff.md`).
- event-driven: defer-0070 seven-field closure on first green origin/main
  run; defer-0072 watches the UNVERIFIABLE degrade until then.
- next round opens with `gh run list --branch main --limit 3` +
  `node scripts/check-deferred.js`.

defer-0070 closure template (corrected copy - carries the verbatim ADR-0040/0061
D-F anchor wording the spec requires; replaces the paraphrase in the pinned
2026-09-25-handoff template; ERRATA E-12):

- degradation_semantics (verbatim): 'an existing-but-empty dir is a
  deterministic negative -> exit 2 UNVERIFIABLE, so a stale/partial corpus
  restore degrades honestly instead of running its gates and failing red on
  a capability that was never there'
- remaining fields per the pinned template: run_id / conclusion /
  verifiable_composition / degradation_cause / successor_defer_id=defer-0072
  / closure_rule_verbatim=quote unfreeze_if.check verbatim

Re-work disposition of the t27 audit findings (F-1..F-9) landed post-seal on
this lane; ledger D-011 records the rework window.
