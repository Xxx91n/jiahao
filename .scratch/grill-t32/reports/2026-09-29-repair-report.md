# grill-t32 audit-repair report — 2026-09-29

Trigger: second-party audit (`D:\Aworker\jiahao\.scratch\grill-t32\reports\2026-09-29-audit-report.md`)
returned the round for a repair window — 4 must-route findings (F-1..F-4),
5 code-review items (F-6..F-10), judgment-level F-11..F-13. Owner adjudicated
the three semantic items (R5) by adopting atomcode-research-backed drafts
D-007 / D-008 / D-009 (all flipped to `current` in the decision ledger).

## Repair disposition

| Finding | Disposition | Evidence |
|---|---|---|
| F-1 AGENTS.md soft-constraint never landed | Landed — Working-agreement clause: new prose cites SHOULD carry subject/date context; editorial, not mechanized, never retro-edits | `git show b83c39cf` |
| F-2 errata_ref absent on degraded population | ERRATA **E-22** authored; new verb `orphan-cites.js annotate --errata` appends adjudicating copies (append-only); 188 entries annotated + 1 backfill catch (deviation below); registry now 466 entries | `node scripts/orphan-cites.js check` OK |
| F-3 stale non-goal in generator spec | Corrected to the conditional form: replace refs opt-in via `--replace-ref` only; all classifier reads NO_REPLACE-isolated | spec lines ~130 |
| F-4 migration-diff figures non-reproducible | ERRATA **E-23** standing correction: committed v1 parent = local-only 1042 (1034 dead-label + 1 pre-purge + 7 live), rewritten 105, unresolved-as-class 0; "618" appears in no committed artifact; claim artifacts immutable | `git show b83c39cf^:docs/rewrite-map.json` |
| F-5 stale commit list + tts post-closeout | Folded into E-23 (same standing correction); settled tree re-verified | `git log grill-t32-docs` |
| F-6 dead import + facade overclaim | `forRoot` import removed; facade header now describes the real two-seam boundary (facade = registry/leg path; generator keeps its `_execOverride` seam) | `node --check` clean |
| F-7 scanDocTokensAt ambient-env | Routed through `gitAt` — NO_REPLACE env + honors `_execOverride` | rewrite-map suite green |
| F-8 successor subject-only | **D-009 adopted**: author+subject fail-closed (author compared on name<email>, timestamp stripped); committer_ts/parents observational-only; spec §3.3 + ADR-0089 synced; D-003(iv) marked revised-by-D-009 | battery: author-mismatch refuse case |
| F-9 unageable -> stage-3 | **D-007 adopted**: unageable = past stage 1 -> stage-2 warning at first sight (`unageable: true` flag); stage-3 clock on stable `exists_at` first-observation stamp (carry-forward via `stabilizeExistsAt`); missing exists_at itself is fail-closed red | battery: unageable first-seen clock case |
| F-10 committed qualifiers unchecked | **D-008 adopted**: `checkMapConsistency` runs `consistencyErrors` on BOTH committed and regenerated maps — exemption from equality is never exemption from consistency | battery: committed-map tamper case |
| F-11 cross-module helper duplication | Deferred observation (770-line generator refactor belongs to a dedicated round; registered below) | report only |
| F-12 covers() swallows AmbiguousToken | Distinct red signals: ambiguous registry match and lookup failure each reported explicitly, still fail-closed | leg code |
| F-13 fixture ambient env on --replace-ref | facade `forRoot(root, {env})` option; `o.env` threads through register/backfill/leg | facade code |

## Disclosed deviations during repair

- **E-19 instance (self-caught)**: wave-1 commit initially landed while the
  audit report inside it cited `fc14edf19070cb72` — a %TEMP% path segment the
  scanner counts as a hex cite. The newly-added D-008 committed-map
  consistency check and the map-freshness leg both flagged it post-commit;
  repair = degraded backfill registration (`errata_ref: E-22`) plus
  `but amend` folding registry+map back into wave-1 (landed as `b83c39cf`,
  reworded to disclose). Exactly the settled-tree exposure window the repair
  was designed to surface; disclosed, not silently rewritten.
- `bench/research/out/g6-publish-replay.json` remains a mechanism-output
  drift artifact (gate-run side effect), left uncommitted as in prior rounds.

## Acceptance re-run (settled tree, post last but mutation)

- `npx jest`: **89/89 suites, 1570/1570 tests green** (battery now 20 cases)
- `node scripts/build-rewrite-map.js --check`: OK, 3618 citations in sync
- `node scripts/build-rewrite-map.js --published-only`: OK
- `node scripts/check-orphan-registration.js`: OK (466-entry registry consistent)
- `node scripts/check-map-freshness.js`: OK, 12 claim-surface commits tree-internal
- `node scripts/check-anchoring-footer.js`: OK, 89 post-registration commits
- `npm run pack:smoke` / `node scripts/install.js --help`: green
- `node scripts/run-gates.js`: exit 0 (4 ci-mode capability-negative legs
  UNVERIFIABLE outside CI — registered degrade, unchanged)

## Owner-side leftovers

- ADR-0089 countersign at the 2026-12-15 tide (ID-level-only stands).
- F-11 generator refactor + facade/helper dedupe: deferred observation.
- t27/t28 untracked audit-handoffs asymmetry: still deferred (spec §7 list).

Verification transcript: re-run commands are verbatim above; examiner
captures stay under `audit-evidence/` (never-commit, nc-001).
