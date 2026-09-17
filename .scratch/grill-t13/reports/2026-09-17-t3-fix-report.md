# grill-t13 T-3 fix-window report — 2026-09-17

Verdict: all T-3 audit findings (F-1 blocking, F-2..F-9) remediated;
bounce-list re-run requirements satisfied. Independence grade (verbatim,
ADR-0074 D-F): same-session same-toolchain — NOT independent; this is the
fix window, not the re-audit. Re-audit remains open for the audit lane.

## Bounce-list items

1. F-1 (BLOCKING): fixtures assembled at runtime
   (test/rewrite-map.test.js:106/108 — committed source carries no scannable
   literal); enumeration = union(git ls-files, git ls-tree -r HEAD) —
   scripts/check-secret-scan.js:67-77; oversized files reported loudly
   (enum index/tree/union printed + skipped list).
   Evidence: `node scripts/check-secret-scan.js` -> OK, enum 851/858/858,
   0 hits; `test('enumeration covers the committed tree...')` asserts
   test/rewrite-map.test.js + docs/rewrite-map.json are enumerated.
2. F-2: evidence JSON assertions.A4_range_diff corrected to the re-measured
   distribution (1 !/12 =/2 left-only/4 right-only) + corrections[] entry
   appended; R2 report corrections section registers the mischaracterization.
3. F-3: numstat-level leg recorded in evidence JSON
   (1+1-/1+57-/21+0- matches the frozen plan's registered shapes).
4. F-4: defer-0051 reopened (pending-evaluation; check-in note registers the
   revert + that its re-measurement/countersign legs stay on the entry).
   Live registry 48, terminal 4.
5. F-5/F-6/F-7: defer-0054 unfreeze_if -> external-event post-action trigger
   (rules >3 or miss incident -> gitleaks revisit) + detection_limit field;
   defer-0053 cost_note; entropy deviation registered in defer-0054, scanner
   header, ADR-0074 fix bullet (substitution rationale: generic entropy rules
   false-positive on sha256 digests across .scratch reports).
6. F-8: test/adr-0073-wiring.test.js pins the registered note block
   BYTE-EXACT (POINTER_HEAD literal + toBe equality), 24/24 green.
7. F-9: 'use strict' both new scripts; ADR-ref comments re-anchored to the
   R2-dispositions bullet + ledger; gitbutler filter fixed
   (map.sides.old_refs = t11-docs + t12-docs only); map emits same[] (278)
   and removed new:null; MAX_BYTES skip loud; GOAL count synced.

## Re-run battery (auditor's verbatim list)

- node scripts/check-secret-scan.js -> OK 3 rules 0 hits, union enum 858
- node scripts/run-test-gate.js --expected-suites 71 -> (see Verification)
- node scripts/run-gates.js -> (see Verification)
- instrument seq 24 recorded (pending_signoff)
- map --check/--verify -> OK, citations: see docs/rewrite-map.json counts

## Deviations

- Auditor counted "13 ="; my row-level re-measurement (git range-diff
  1ca81f5..2c93a30 1ca81f5..051744a) shows 12 = pairs + 1 ! + 2 < + 4 >
  (left rows = 15 = 12+1+2, internally consistent; right commits = 17 =
  12+1+4). Evidence JSON records the measured 12.
