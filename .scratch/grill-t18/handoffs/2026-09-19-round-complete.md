# grill-t18 round-complete handoff - 2026-09-19

For the next agent. Read the committed artifacts; this file is the map,
not the content. Facts Canon applies: verified-state lines cite evidence
paths, never carry regenerable counts.

## What landed (branch grill-t18-docs)

- `vrp` - setup: decision ledger + disposition spec + task book + CONTEXT
  terms (D-001..D-008 settled); wiring seed advanced for the t15/16/17
  landing; absorbs the t17 audit report + audit handoff (untracked at the
  t17 round-final, disclosed on the commit line per D-008).
- `yts` - R1 coupled bundle: ADR-0078 fix-round disclosure taxonomy
  (kind documentation|fix, fix rows MUST disclose R2 machinery hand-edits
  via the reused governance_tooling_diff channel; carve_out_used not
  counted; D-F deferred-entry assert exempt; streak unchanged) +
  trend-inventory t17-row corrective rewrite + checker kind-enum/fix-row
  enforcement (ADR-0035 coupling) + wiring negative pins.
- `vuy` - R1 docs: ADR-0077 D-A.1 guard/emit-exit structure contract +
  cause-summary clause (unfreezes defer-0063), D-E bare-value floor
  registered as pattern-ambiguity function + key-assign backstop +
  permanent declared gap, D-E regen-boundary sentence; AGENTS.md
  authoring-path clause; t17 handoff repaired (four paths + four
  dollar-skill names, CR + octal-eaten strays); t6 audit-t1 second
  same-class repair disclosed; t17 ledger disclosure note (defer-0055 =
  isolated lapse); critique-v4 verdict registered; doc-hygiene pin.
- `rvn` fix - emit-exit helper: both violation sites converge (defer-0063
  discharged first, anti-rot quota taken).
- `puq` refactor - SCHEMA_KEYS single-source: the eleven schema keys
  declared once; renderRegion iterates it; PROSE_KEYS derived subset.
- `qzv` fix - proseScan key-assign leg covers all eleven schema keys
  (skipped, not_run, battery_as_of_commit, report_commit added).
- `nrx` refactor - reportPath single-read.
- `noq` test - wiring fixtures: single-digit canon, all-eleven-key
  key-assign, PROSE_KEYS single-source, emit-exit boundary.
- `ruy` - closeout: round-facts + report + committed battery evidence;
  defer-0063 closed; t18 trend row first compliant kind:fix +
  governance_tooling_diff + mechanism_output_diff; consent-sweep named
  lines; governance ledger copy + anchors admission; stale pins re-pinned.
- `wrx` - disclosed re-sync: the closeout's added row pin moved the jest
  count and post-commit edits re-staled the digests; README, anchors,
  map, facts, and affected evidence re-captured on the final tree.

## Verified state (see .scratch/grill-t18/evidence/*.txt)

- run-test-gate: green (evidence/run-test-gate.txt).
- gate:all: green, host-absent ci-mode channels UNVERIFIABLE - honest
  (evidence/gate-all.txt).
- check-ci-jobs: consuming-row keyed exit; missing-file verifier-broken
  exit (evidence/check-ci-jobs.txt, check-ci-jobs-missing.txt).
- check-governance-inventory: green + standing advisory
  (evidence/governance-inventory.txt).
- check-deferred: green (evidence/check-deferred.txt).
- build-governance-anchors --check: in sync (evidence/anchors.txt).
- build-rewrite-map --check: in sync (evidence/rewrite-map.txt).
- build-round-facts --check --report: facts + region + prose in sync
  (evidence/round-facts.txt).
- instrument --check: authoritative (evidence/instrument.txt).
- pack:smoke: under the ADR-0039 D3 cap (evidence/pack-smoke.txt).
- quoted-stale fixture: must-fail exit one (evidence/quoted-stale.txt).
- prose fixtures (single-digit + key-assign): green
  (evidence/prose-fixtures.txt).
- inventory-shape pin (kind:fix): green (evidence/inventory-shape.txt).
- H-1 reread of the repaired handoff: clean (evidence/h1-reread.txt).
- liveness: tarball extract + install probes + MCP initialize handshake
  (evidence/liveness.txt).

## Conventions now in force (new or amended this round)

- ADR-0078: trend rows carry kind documentation|fix; a fix row MUST
  disclose R2 machinery hand-edits via governance_tooling_diff (reused
  field, not paralleled); carve_out_used is a doc-round field not counted
  for fix rows; fix rows are exempt from the D-F deferred-entry assert;
  corrective rewrites disclose on the corrected line (audit-log
  convention).
- ADR-0077 D-A.1: violations accumulate within a phase and cross exactly
  one emit-exit boundary per phase; immediate exit is reserved for the
  verifier-broken exit>1 class; a nonzero exit states its cause at the
  end of output.
- ADR-0077 D-E grill-t18: the bare-value floor is a pattern-ambiguity
  function (single-digit canon values backstopped by the now-complete
  eleven-key key-assign leg); a bare single-digit canon value in prose is
  a permanent declared gap, registered in the ADR not the registry.
  Verbatim evidence snapshots may disagree on counts across the regen
  boundary - expected ordering artifact, not a discrepancy.
- AGENTS.md: committed docs are authored via fs.writeFileSync or
  file-edit tools only - never through escape-interpreting shell layers;
  post-write byte-check.
- Doc-hygiene pin (test/adr-0076-wiring.test.js): committed .scratch/*.md
  is scanned for banned control bytes, lone CR, C1 octal-eaten chars,
  stripped-path signatures, and stripped-dollar-name bullets; the two
  real corruption samples are negative fixtures; the signature set is
  extensible via the deferred registry.
- Consent Sweep (CONTEXT): every touched standing registry row gets a
  named-id line; substance may fold into a shared theme but the id is
  never stripped.
- Amend-Riding Discipline (CONTEXT): map regen never rides an amend; sha
  references pin immutable history; see Facts Canon.
- Facts Canon tail clause (CONTEXT): handoff verified-state lines cite
  evidence paths, never carry regenerable counts - this file follows it.

## Regen order (when artifacts drift)

1. `node scripts/build-rewrite-map.js` - .scratch docs (reports,
   handoffs, ledgers) feed doc_refs; any doc edit can restale it.
2. `node scripts/build-governance-anchors.js` - if governance files
   (trend-inventory, ledger copies, ERRATA, sunset) changed.
3. `node scripts/check-g6-publish.js` - if the packaged surface
   (scripts/, src/, CONTEXT.md, README.md, AGENTS.md, docs whitelists)
   changed; writes the replay artifact + new tarball byte record.
4. `node scripts/build-round-facts.js --round <slug>` - collect needs a
   green suite; --report without --check splices only (does NOT collect).
5. `node scripts/build-round-facts.js --round <slug> --report <report>`
   (splice), then `--check --report` to verify.

## Residuals / next-round obligations

- Anti-rot quota passes forward: the NEXT fix bundle takes one smell
  ticket first (defer-0063 discharged this round; the quota is the
  convention, not the row).
- D-004 effectiveness is a next-audit review item: this round proves the
  kind:fix + gtd mechanism checks out, not that the convention deters.
- t18 dispositions enter the next audit's standing review surface (per
  the light-close triad in the round report).
- The never-commit set stays untracked forever: tq/nl/xu/my round-diff
  patches plus the t17 audit-evidence rerun/*, round-commits.txt,
  round-diff.patch. Do not commit them.
- Stack landing (grill-t15/16/17-docs unlanded + this branch) is
  owner-domain; informational only, zero owner asks this round.

## Suggested skills for the next session

- `$grill` - the next audit round (standing review surface now includes
  the t18 dispositions + the D-004 effectiveness question).
- `$implement` - the next fix bundle (takes one smell ticket first per
  the anti-rot quota).
- `$tdd` - wiring fixtures before each machinery change.
- `$code-review` - before each commit.
- `$handoff` - next checkpoint.
