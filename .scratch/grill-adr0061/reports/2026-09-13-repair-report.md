# ADR-0061 Implementation Round - Repair Report (2026-09-13)

Repair window (修复子 Agent). Authority: `.scratch/grill-adr0061/reports/2026-09-13-repair-order.md`
and `.scratch/grill-adr0061/reports/2026-09-13-audit-report.md` (Section 5 verdict, Section 6).
Standing task book: `.scratch/grill-adr0061/handoffs/next-round.md`.
Branch: `adr0061-impl` (R-1) + `adr0061-repair-docs` (R-2..R-5, stacked). Fixed point: `adr0061-doc`.

Every claim below carries a re-runnable command and an output summary. Nothing is asserted
without evidence.

---

## Verdict: ALL SIX BLOCKING FINDINGS CLOSED - awaiting re-audit

STD-1, P-1, STD-2, SPEC-2, SPEC-1, SPEC-3 are repaired. The non-blocking P-2 is also fixed
(P-3 needs no action). No assertion was deleted or weakened (C-21 preserved; the only test
edits are additions and re-points). Hard acceptance A1-A9 all green. Not merged, not pushed,
no PR opened.

---

## R-1 (closes STD-1 / P-1 / P-2) - persist what the ADRs claim

### What changed

| file | change |
| --- | --- |
| `src/instrument-identity.js` | `stateEvent()` allowlist gains `expires_at` + `capa_ref` branches (STD-1 root cause: the `conditional_signoff` transition already passed both at `:322-323`; the allowlist dropped them). `criteria_change` / `record_only_change` / `record_signoff` transitions now persist `authorization` (+ `principal_id` where a reviewer attests) - P-1. |
| `scripts/instrument.js` | `criteriaChange` and `record` pass the validated `--authorization` through; `record` now requires it; `record()` reports the tail it just appended, not the first `record_only_change` in history - P-2. |
| `src/instrument-state.json` | chain re-emitted through the sanctioned path: appended seq 11 `quarantine` + seq 12 `conditional_signoff`. |
| `test/adr-0060-wiring.test.js` | +7 regression tests (STD-1 + P-1). |

### Append-only proof (the chain was NOT hand-edited)

Baseline captured before any edit: `.scratch/grill-adr0061/reports/baseline-hashes.json`.

```
$ node -e "
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('.scratch/grill-adr0061/reports/baseline-hashes.json','utf8')).events;
const s=JSON.parse(fs.readFileSync('src/instrument-state.json','utf8'));
let ok=true; for(let i=0;i<10;i++) if(base[i].event_hash!==s.history[i].event_hash){ok=false;console.log('DRIFT seq'+base[i].seq);}
console.log('seq1-10 preserved:',ok,'| len:',s.history.length,'| new:',s.history.slice(10).map(e=>e.seq+':'+e.kind).join(', '));
"
seq1-10 preserved: true | len: 12 | new: 11:quarantine, 12:conditional_signoff
```

All ten historical event hashes are byte-identical. The two appended events went through the
public transition API (quarantine then conditional_signoff) - no field was written by hand.

### Sanctioned path + the two defects it closes

```
$ node -e "const s=require('./src/instrument-state.json');
console.log('seq11:',s.history[10].kind,s.history[10].event_hash);
console.log('seq12:',s.history[11].kind,s.history[11].event_hash);
console.log('seq12 expires_at:',s.history[11].expires_at,'capa_ref:',s.history[11].capa_ref);"
seq11: quarantine ad93855d6557ab350b9d7ad8ddde6395399e591c33e27c65a60ef8b6297383e0
seq12: conditional_signoff fc6adead6605291ab5df21627fbbfd7168a3acc2866cef19dcec050918583861
seq12 expires_at: 2026-12-11 capa_ref: CAPA-0060-judge-flip-rate
```

- **STD-1 closed:** the self-evidencing conditional sign-off is now seq 12, whose own hashed
  field set carries `expires_at` 2026-12-11 and `capa_ref` CAPA-0060-judge-flip-rate.
- **P-1 closed:** new `criteria_change` / `record_only_change` / `record_signoff` events carry
  the verbatim `authorization` (and `principal_id` where a reviewer attests).

The re-emission used the **same real anchors** as the original seq 10 (`reverify_ledger_hash`,
`bias_probe_hash` `99a20aae..9904`, reviewer `Euiop1`, second_reviewer `Xxx91n`,
instrument_id `Euiop1`, verbatim authorisation) - nothing was fabricated.

### Honest limit (recorded, not hidden)

Frozen history is not rewritten. seq 6 (the ADR-0061 D-001 criteria change) and the original
seq 10 keep their defective field sets; the obligation binds events appended from the repair
boundary. This is recorded as ERRATA E-5 (and E-4 upgraded) with the ADR-0063 D-D erratum.
The alternative - rewriting seq 10 in place - would destroy the append-only guarantee the
instrument exists to provide, so it was rejected.

### Regression tests added (all pass)

```
$ npx jest test/adr-0060-wiring.test.js --runInBand 2>&1 | tail -12
  √ STD-1: the live conditional_signoff tail carries expires_at and capa_ref
  √ STD-1: every conditional_signoff at/after the repair carries the fields
  √ STD-1: the transition carries the expiry/CAPA onto the event, not only top-level
  √ P-1: a criteria_change event carries the authorisation it exercises
  √ P-1: a record_signoff event carries the authorisation it exercises
  √ P-1: the live criteria_change record now persists its authorisation
Tests:       27 passed, 27 total
```

---

## R-2 (closes STD-2) - sync the glossary

`CONTEXT.md:1170` was the only stale live-cap literal in the tree.

```
$ grep -n "230,000\|200,000" CONTEXT.md
1170:files-whitelisted, measured-anchor budget 230,000 bytes per ADR-0039 as amended
1171:by ADR-0062); the git tree is the development surface (tests,
```

Zero live `200,000` references remain in `CONTEXT.md`. All other `200,000` occurrences in the
tree are legitimate historical records: the superseded-value note in ADR-0039 D3, the anti-pattern
record (5567bd8), the content-anchor test that asserts the literal *stays recorded*, and the
frozen ledger/audit archives.

---

## R-3 (closes SPEC-2) - wire the anchoring check into the gate lane

```
$ node -e "const g=require('./docs/gates.json');const e=g.entries.find(x=>x.name==='governance-anchors');console.log(JSON.stringify(e,null,2))"
{
  "name": "governance-anchors",
  "command": "node scripts/build-governance-anchors.js --check",
  "tier": "confirmatory",
  "source_adr": "docs/adr/0061-...convergence.md",
  "order": 197,
  "params": { "check": true },
  "requires": [ "repo-tree", "docs-adr" ]
}
```

Registry 22 -> 23 entries. Evidence the gate actually fires:

```
$ node scripts/run-gates.js 2>&1 | tail -3
[197 governance-anchors] PASS
[governance-anchors] OK - 4 artifacts, digests in sync
gate:all exit 0 (23 entries, 4 unverifiable, fail-fast off)
```

Drift-fails-the-gate proof (the gate caught my own ERRATA edit mid-round):

```
$ node scripts/build-governance-anchors.js --check    # before regenerating anchors
FAIL: docs\governance\anchors.json is stale - regenerate with node scripts/build-governance-anchors.js
```

The same-commit ADR requirement (ADR-0027 D2 coupling guard) is satisfied:

```
$ CI_BASE_REF=adr0061-doc node scripts/run-gates.js --check-coupling
gates coupling OK (base: adr0061-doc)
```

`scripts/build-governance-anchors.js` also declares its capability now, so ADR-0040 D7d
(every gate script calls `requireCapabilities('<name>')`) holds:

```
$ npx jest test/adr-0040-wiring.test.js --runInBand 2>&1 | tail -4
  √ gate governance-anchors source calls requireCapabilities by name
Tests:       38 passed, 38 total
```

---

## R-4 (closes SPEC-1) - reconcile the trend table

- ADR-0039 gains a **row 4-5 back-fill note**: row 4 = 207,768 B (ADR-0061 doc-round glossary
  additions), row 5 = 208,655 B / 93 files (ADR-0061 D-F T-1), back-filled under ADR-0039's own
  "re-measure after ANY packed-file edit" rule; current repair-round re-measure = 212,387 B / 93 files.
- ADR-0062 D-C now states the **trend width explicitly** vs the ledger: D-001 pinned a
  3-point trend; the ADR table has 5 rows; the extra rows do not drive the outcome
  (`ceil_to_10_000(207,768 x 1.10) = 230,000` equals the value from 208,655).

---

## R-5 (closes SPEC-3) - state the defer-0024 bar honestly

defer-0024's `last_check_in.note` now records that the git-commit witness does **NOT** satisfy
ADR-0050/ADR-0061 D-E's "git alone is not tamper-proof" negative (a same-repo git copy shares
the producing host/repository/trust-domain of the record it would corroborate), keeps the
external/cross-domain witness **open**, and sets the next mandatory check-in deadline at
2027-09-01.

```
$ node scripts/check-deferred.js 2>&1 | tail -1
[deferred] OK - 32 deferred entries (no base ref: coupling skipped)
```

---

## Mandatory re-run (Section-1 suite, auditor-reproducible)

| # | command | result |
| --- | --- | --- |
| A1 | `npx jest --runInBand` | 54 suites / **727** tests, exit 0 (33s) |
| A2 | `node scripts/run-test-gate.js --expected-suites 54` | `OK: 54 suites, 727 tests, 0 skipped` |
| A3 | `node scripts/run-gates.js` | exit 0, **23** entries, 4 unverifiable (ci-mode absence) |
| A4 | `npm pack --dry-run --json` | **212,699 B / 93 files** < 230,000 B |
| A5 | `node scripts/instrument.js --check` | OK; chain valid through seq 12; conditional / 2026-12-11 / CAPA-0060-judge-flip-rate |
| A6 | `node scripts/check-deferred.js` | OK, 32 entries |
| A7 | `node scripts/build-adr-index.js --check` | `README ADR index in sync with docs/adr` |
| A8 | `node scripts/build-governance-anchors.js --check` | exit 0, `OK - 4 artifacts, digests in sync` |
| A9 | `git status --short` | only `?? bench/polygraph/results/reverify-20260913.json` |

Note: A1 is 727, not 720 - the delta is the +7 R-1 regression tests. README test counts were
updated in the same change (720 -> 727), so `run-test-gate` is green.

---

## Commits (GitButler, never merged / pushed)

| branch | sha | scope |
| --- | --- | --- |
| `adr0061-impl` | `9bed002` | R-1: allowlist + authorisation persistence + P-2 + state re-emission + 7 tests |
| `adr0061-repair-docs` (stacked) | `2e633f9` | R-2..R-5: glossary cap, gates.json entry, ADR-0039/0062/0063 text, defer-0024, anchors regen, README counts |

Both commits cite their D-xxx coverage (ADR-0061 D-E, ADR-0060 D-C/D-D/D-E, ADR-0039 D3,
ADR-0062 D-C). The gates.json change rides a same-commit ADR (ADR-0061 D-E repair amendment).

---

## Remaining risks / open items

1. **Frozen seq 6 / seq 10 remain field-deficient.** Append-only forbids rewriting them; the
   defect is documented (ERRATA E-4/E-5, ADR-0063 D-D erratum). If a future round wants the
   `criteria_change` authorisation re-anchored, it must append a new verified event, not edit seq 6.
2. **P-3 (open tension, unchanged).** seq 10/seq 12 anchor a `bias_probe_hash` whose artifact
   lives under gitignored `.scratch/`; already a deferred tension, no new action this round.
3. **Re-audit required.** Per separation of duties, this repair must be re-audited against the
   audit report's Section 1 before the round can close. This window does not self-certify.

---

## Evidence appendix (files read / written this round)

- Read: `src/instrument-identity.js`, `scripts/instrument.js`, `src/instrument-state.json`,
  `docs/gates.json`, `package.json`, `scripts/check-ci-wiring.js`, `scripts/run-gates.js`,
  `scripts/build-governance-anchors.js`, `docs/adr/0039`, `docs/adr/0061`, `docs/adr/0062`,
  `docs/adr/0063`, `docs/governance/ERRATA.md`, `docs/deferred-registry.json`, `CONTEXT.md`,
  `README.md`, `test/adr-0060-wiring.test.js`, `test/adr-0040-wiring.test.js`.
- Written: the 16 files listed in the two commits above, plus
  `.scratch/grill-adr0061/reports/baseline-hashes.json` (pre-repair hash baseline).
