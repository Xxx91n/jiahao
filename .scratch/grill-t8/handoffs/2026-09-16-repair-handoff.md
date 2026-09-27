# grill-t8 REPAIR handoff — 2026-09-16 (repair window → next round)

Audit findings F1/F2 closed (repair report:
.scratch/grill-t8/reports/2026-09-16-repair-report.md, commit uqo).

- F1 pairer over-capture: claim extraction now binds only to marker-shaped
  values; +7 regression tests, +5 fail-closed probes (21/21), v2 in-sample
  separation unchanged. Re-pinned: sha256 9ff2d0ad (10697 B) under a
  same-commit ADR-0069 amendment — prior pin 2383d75f superseded.
- F2 collection: collect-devin-corpus.js knows devin-corpus-v3 (closed
  enum + disjoint_prior v1+v2 + side-set check + v2-style manifest).
- F3-F9 nits fixed; F8's devin-oot v2/v3 duplication left (cosmetic).

State for the next round: v3 remains ready-to-run with ZERO data —
`collect-devin-corpus.js --snapshot-dir devin-corpus-v3` now actually
works; then manifest freeze -> derived tables commit -> label unlock ->
single-shot run -> report + v3 replay gate. A re-audit pass on commit uqo
is the natural gate before v3 collection starts.

Never do: move the anchor tag; touch frozen port artifacts; read
spec.check/labels in the pairer; cite v2/v3 by conformity; collect v3
without a fresh re-verification of the repaired artifact.

Suggested skills: $implement (v3 collection round), tdd, $code-review,
grilling on the collection protocol, $but for all VCS writes.
