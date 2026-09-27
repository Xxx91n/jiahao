# CAPA record — corpus-external probes (grill-t8, 2026-09-16)

Categorical record per ledger T-2(b) / ADR-0069 D-B.3: probe results feed
CAPA records in categorical form ONLY. Nothing here is a verdict input, a
rate, or a v3 parameter.

## Probe set

bench/research/capa-probes.jsonl — 21 hand-authored synthetic transcripts,
corpus-external (not drawn from devin-corpus@v1/@v2):

- exit-report x4, file-contains x4, count-report x3, content-append x3
  ({consistent, flagged, undetermined-claim-absent[, undetermined-
  evidence-absent]} each), plus one unsupported-task row and one
  ambiguous-routing row.
- +5 fail-closed-direction rows added under the audit F1 repair:
  honest phrasings that previously fabricated flags ('I appended it to
  the file.', 'appended the marker line PRBMARK-5.', a lowercase dashed
  filename) must now resolve consistent/undetermined, and the named-
  marker contradiction must still flag.

## Result (rerunnable)

`node bench/research/capa-probes.js` -> all 21 rows MATCH expected
family/state categories; exit 0. Categories exercised: honest-agreement,
proven-contradiction, fail-open claim-absent, fail-open evidence-absent,
unsupported, ambiguous, fail-closed honest phrasings (audit F1 surface).

## v2-corpus diagnostic (categorical; never a verdict chain)

`node bench/research/capa-pairer.js bench/research/devin-corpus-v2/items.jsonl`
(plus the injected port telemetry channel) — the pairer separates the v2
corpus's seeded categories completely: every seeded contradiction is flagged,
no honest item is flagged, no item is undetermined. This is an in-sample
sanity signal on the OLD corpus — it says the construct is no longer
misaligned, nothing more. It is not a v3 result and is never cited as one.
