# grill-t29 → next round task book

Sole source: `D:\Aworker\jiahao\.scratch\grill-t29\decision-ledger.md`
(D-001..D-006, all current). Execution spec:
`D:\Aworker\jiahao\.scratch\grill-t29\spec-t29-disposition.md`.
Round type: implementation round (audit-disposition). Open a dedicated
GitButler lane; do not touch other lanes.

Suggested skills for the executor: `tdd` (new legs + fixtures red-first),
`domain-modeling` (ADR-0086 + CONTEXT.md term sync), `neat-freak`
(closeout congruence), `code-review` (pre-seal), `gitbutler` (all VC),
`handoff` (round closeout).

## T-0 — Pre-flight [D-001]

- `git log --oneline -5`; `gh run list --branch main --limit 3`;
  `node scripts/check-deferred.js`.
- Confirm baseline: main tip `c7ae4f81`-or-later green; defer-0070
  closed (yellow); defer-0072/0074 pending-evaluation.
- Open the implementation lane; record workspace tip.

## T-1 — ADR-0086 + classification block [D-002, D-003]

- Author `docs/adr/0086-registry-field-governance-*.md`: fenced /
  editorial / exception-channel taxonomy; pending-confirmation
  lifecycle (effective-on-registration, mandatory `expires_at`,
  auto-lapse, owner-only ratify/revoke/delete/narrow); two enforcement
  legs; reversal path; mandatory self-audit line enumerating the new
  semantics.
- Migrate t28 D-003(v) claim_surfaces fence into this ADR (standing
  surface repair).
- ADR-0085 gains one append-only pointer line to 0086.
- `surface-taxonomy.json`: add the machine-checkable classification
  block covering every registered-enum sub-field; the block itself is
  `fenced`.
- Trend-inventory `kind:fix` row + `governance_tooling_diff`; wiring
  test pins the classification block shape. ADR-0086 joins the
  countersign queue.

## T-2 — Exception-channel machinery [D-002]

- Convert exception-channel fields to object entries with
  `status/requested_by/reason/expires_at/scope` (no wildcards).
- Re-register `reports/audit-report.md` as pending-confirmation with
  `expires_at: 2026-12-15`; write the errata entry recording the
  procedural defect (process improvement, not freeze violation).
- New leg 1: exception-field completeness (missing fields → fail).
- New leg 2: consumption-vs-classification consistency (every registry
  path consumed by gate code must be classified).
- Verifiers must accept `pending-confirmation` status as effective.

## T-3 — Orphan-leg hardening [D-001]

- F-1/F-2: `evidence-freshness.js` consumes registered `pin_patterns`
  and `non_anchoring_classes.seal_file`; delete private copies
  (`ORPHAN_PIN_RES`, `/\/SEAL$/`); wiring test asserts the leg runs the
  registered table.
- F-3: `recorded_at` guard before latest-compare (missing → round-order
  or commit-date fallback; `'null'` never outranks a date).
- F-4: loose enumerator `^(captured-at-head|seal):`, strict parse after;
  add the trailing-whitespace pin fixture.
- F-5: natural-sort round dirs; delete-or-wire `ORPHAN_SCOPE_RE`;
  normalize exemption sha compare.
- Add the undated-seal ordering fixture.

## T-4 — Standing-surface registration [D-001, D-002]

- F-6/F-7: register the residual exposure window and the human-only
  adjudication points on standing surfaces (taxonomy `_doc` /
  `AGENTS.md` — editorial class).

## T-5 — Hermetic fixture helper [D-004]

- `test/helpers/` shared hermetic git helper: `-c user.email` +
  `-c user.name` + `GIT_CONFIG_NOSYSTEM`/`GIT_CONFIG_GLOBAL` isolation.
- Migrate all temp-repo write-op call sites to it.
- New lint leg: git write-op argv in `test/**.js` not routed through the
  helper → red. Convention text into `AGENTS.md`.
- Register the item as "F-14 candidate" (owner decides numbering).

## T-6 — ANCHORING footer [D-006]

- `AGENTS.md`: mandatory `[ANCHORING] <file list>` footer on non-
  merge/workspace round-lane commits; footer derived from the
  `but commit` allowlist resolved to paths — never hand-typed; honesty
  boundary sentence (replayable claim, shared trust domain, forensic
  not preventive).
- New wiring leg: footer set == landed set for post-registration
  commits; no retro-edit of history.

## T-7 — Tide adjudication packet + registry row [D-005]

- `human-authority-package`-form packet: per item a self-contained
  context paragraph, option table (nothing pre-selected), agent
  recommendation + reasons, both-directions consequence, signature
  line. Front-load the five substantive adjudications (F-8, seq-13,
  ratchet, F-12, tag); 19 countersign items in the routine-bulk section
  recorded-as-bulk; burn-rate advisory as owner context item.
- `deferred-registry.json`: tide-capacity observation row.
- ADR-streak disposition: `mitigated, closed`.

## T-8 — Prose corrections + nits + closeout [D-001]

- F-9: `180+` → `161` in committed report prose (fix-round correction,
  not history rewrite). F-10: disclose the ADR-0084 second appended
  line. F-13 nits at discretion.
- Run the §11 acceptance battery (orphan leg, full jest, gate:all incl.
  all new legs, deferred check, evaluateRound clean).
- Round report naming every finding's disposition; SEAL; human-
  authority package attached.

## Human-only (drafted, never executed) [D-001(vii), D-005]

adjudicated/grill-t27 tag decision; seq-13 three-way; countersign queue
ratification at the 2026-12-15 tide; ratchet-brake adoption; ADR-0086
countersign; F-8 retro-ratification; F-12 errata-vs-reseal; t28
alpha-classification countersign; `JIAHAO_BENCH_CORPUS_B64` refresh
(defer-0072); OIDC migration (defer-0073).
