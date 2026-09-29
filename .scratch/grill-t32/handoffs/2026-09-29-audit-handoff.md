# grill-t32 audit handoff — 2026-09-29 (second-party audit window)

Audit object: lane `grill-t32-docs` (14 commits, merge-base `b06f4a97`, not
pushed). Full evidence table and findings:
`D:\Aworker\jiahao\.scratch\grill-t32\reports\2026-09-29-audit-report.md`
(claim→evidence→conclusion for T-0..T-10, D-001..D-006, spec §8 gates).

## State

- **Hard acceptance independently re-run — all green**: jest 89/89 &
  1566/1566, pack:smoke 435426<470000B, install.js --help exit 0,
  `--check`/`--published-only` OK at 3611 citations, orphan-registration leg
  OK, run-gates exit 0 (43 entries, 4 ci-mode UNVERIFIABLE capability
  negatives), anchoring-footer 14/14 derived-match.
- **Round substantially lands the contract**: four-fact classifier purity,
  registry append-only + tamper detection, atomic cutover, 16-case real-git
  battery, --check non-mutating.
- **Findings routed back for repair** (verdict owner-side):
  - R1 AGENTS.md editorial soft-constraint never landed — undisclosed spec §7
    / T-9 / D-001(c) bundle component ("no partial landing").
  - R2 ERRATA back-pointer absent on all 187 degraded registry entries +
    no t32 erratum authored (D-004 iv; `--errata` flag unused at cutover).
  - R3 stale non-goal in `docs/rewrite-map-generator-spec.md`
    ("No refs/replace written or read (D-003 rejection)" — false twice).
  - R4 report/ADR migration-diff figures non-reproducible ("unresolved
    618→0", endpoints mix round-baseline vs cutover-parent) — correction
    routes through an erratum (claim artifacts immutable).
  - R5 owner adjudication items: unagable→stage-3 direct red (F-9),
    committed-map qualifiers unchecked by --check (F-10), successor verify
    subject-only (F-8).
  - R6 hygiene: dead `forRoot` import, `scanDocTokensAt` ambient-env seam
    bypass, `covers` ambiguity swallow, facade ambient env on --replace-ref,
    cross-module helper duplication.
- Process notes (not violations): closeout's commit-id list is stale
  (`nww`→`kxx` squash, `mzm`→`mzmz`, `sor`+`tts` unlisted); `tts` wiring
  resync landed post-closeout — settled tree re-verified green by audit.

## Next window (repair round candidate: grill-t33)

Execute R1–R4 as a repair wave with the standing rules (`but` allowlist +
derived ANCHORING footer + `git show --name-only` parity; wave-closeout
E-17/E-19 order). Owner adjudicates R5 before implementation. After repair:
re-run the full audit acceptance list (report §6) — identical suite, no
substitutions.

Deferred observations already registered for later ruling (spec §7):
errata_exemptions bare-sha drift (tide-bound); t27/t28 untracked vs t29/t30
committed audit-handoff asymmetry; claim-duplicated stays judged-no-fix.

## Remaining / owner-side

- ADR-0089 sits in the countersign queue (`ID-level-only`); entity-level
  adjudication returns at the **2026-12-15 tide**. Not push performed.
- Audit artifacts: report + this handoff are written uncommitted under
  `.scratch/grill-t32/` (claim surfaces, uncommitted — owner may commit them
  in the repair window if they belong on a lane); examiner captures under
  `audit-evidence/` stay never-commit (nc-001).

## Suggested skills for the next session

- `$implement` — repair wave R1–R4/R6 execution.
- `$grill-me` / `$grill-with-docs` — if a fresh grill round follows repair;
  candidate objects: settle-window leg + advisory-leftovers batch (already
  queued in the t32 ledger D-001 exclusions), or errata_exemptions
  bare-sha-binding drift (field-governance pass).
- `[$but]` (gitbutler) — all version control.
- `code-review` skill — dual-axis recheck of the repair diff.
- `atomcode-research` — external lookups only.

## Non-authority notice

This audit reports evidence; it adjudicates nothing. Repair disposition,
erratum issuance, and seal remain owner acts.
