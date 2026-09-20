# grill-t20 round-complete handoff - 2026-09-20

For the next agent. Read the committed artifacts; this file is the map,
not the content. Facts Canon applies: verified-state lines cite evidence
paths, never carry regenerable counts.

## What landed (branch grill-t20-docs, stacked on grill-t19-docs)

- `zsq` - setup: absorbs the t19 audit report (pz) + audit handoff (kv),
  untracked at the t19 audit-final; absorption disclosed.
- `szm` - T-1 documentation surface: ADR-0079 bilingual-mirror
  convention (D1-D6 + anti-quota-theater sentence); defer-0064 (B-4)
  + defer-0065 (B-5) registered pending-evaluation; B-2 verbatim-argv
  convention bullet in `AGENTS.md`; B-6 Disclosed Repair on the t19
  round-complete '18 evidence files' wording; `.scratch/grill-t20/
  capture-battery.cjs` R3 fixes (verbatim-argv labels, duplicate leg +
  dead variable removed, committed clean-tree leg; C1 regex
  copy-corruption caught and restored byte-identical).
- `zpr` - T-2: `README.md` front-face redesign (11-## skeleton per spec
  section-3; switch line; three non-numeric badges; honesty banner +
  pinned blocks byte-verbatim; ADR index folded into <details>; Mermaid
  flow) + `README-zh-CN.md` structural mirror (ADR-0079 D1-D4; filename
  amended from the chartered dotted form - npm `readme.*` glob
  force-includes `README.zh-CN.md`, hyphenated preserves the D5 tarball
  exemption, disclosed in ADR-0079) + `test/adr-0079-wiring.test.js`
  (8 pins) + B-1 discriminating pin in `test/adr-0076-wiring.test.js` +
  seed inventory +2 + count pins resynced + `ci.yml` expected-suites
  bump + rewrite-map regen + disclosed pack-cap compression (README
  prose tightening + `_doc` header trims on the three packed docs
  JSONs).
- `yoo` - disclosed mirror baseline re-pin (ADR-0079 D6 second step;
  drift pin red on `zpr` by design, green here).
- `poo` - T-3 closeout: battery verbatim re-run `--round grill-t20`
  (18 evidence files committed incl. round-facts canon + sentinel
  splice, report_commit null); ledger T-1/T-2/T-3 dispositions +
  consent-sweep named lines; trend row (kind:documentation,
  adr_added ["0079"], net_additions 1, zero_product_diff true,
  deferred_entry defer-0064); mechanism_output_diff on the g6-publish
  replay disclosed.
- `ulr` - B-7 recapture harness (verbatim replica of the clean-tree leg
  for committed-tree re-capture).
- `uzt` - clean-tree evidence sync (pre-final capture committed so the
  recapture observes an unmodified committed file at status time).
- `mlo` - clean-tree.txt final capture: CLEAN verdict on the committed
  tree (0 tracked diffs; untracked all never-commit class).

## Verified state (see .scratch/grill-t20/evidence/*.txt)

- run-test-gate: green at the declared counts
  (evidence/run-test-gate.txt).
- gate:all: green (evidence/gate-all.txt); pack inside the ADR-0039 D3
  cap (evidence/pack-smoke.txt, thin headroom - see carry-forwards).
- check-ci-jobs: consuming-row keyed exit (defer0004 unmet stands,
  deferral remains valid); missing-file verifier-broken
  (evidence/check-ci-jobs.txt, check-ci-jobs-missing.txt).
- check-deferred: green (evidence/check-deferred.txt).
- governance-inventory: green (evidence/governance-inventory.txt).
- anchors --check / rewrite-map --check / instrument --check /
  round-facts --check --report: all green (evidence/anchors.txt,
  rewrite-map.txt, instrument.txt, round-facts.txt).
- quoted-stale fixture: must-fail (evidence/quoted-stale.txt).
- h1-reread: clean (evidence/h1-reread.txt).
- liveness: pack/extract/install/init/MCP all ok
  (evidence/liveness.txt).
- clean-tree: CLEAN on the committed tree (evidence/clean-tree.txt).

## Disclosed events this round

- adr-0079 wiring test ran red before the mirror existed (write-first
  sequencing, expected).
- Drift pin red on `zpr` by design (D6 two-commit rhythm), green on
  `yoo`.
- `AGENTS.md` suffered a shell-interpolation corruption (backtick-$ in
  a `node -e` string); caught on re-read, restored byte-clean via the
  file-edit channel before commit - the exact failure class B-2's
  convention prevents.
- One ledger append used a quoted heredoc (B-2 channel deviation);
  byte-verified clean post-hoc, disclosed in the commit message and
  the report.
- One GitButler worktree normalization reverted uncommitted README
  edits once; mitigated by prompt commits.
- The npm dotted-filename conflict (`README.zh-CN.md` force-packed) was
  resolved by the hyphenated filename; ADR-0079 records the deviation.

## Carry-forwards

- Pack-cap headroom is thin after this round's surface growth; the
  trend-derived cap amendment (ADR-0062 D-B policy) needs a
  pre-registered ADR slot - the next surface-growing round should plan
  for it.
- defer-0064 (B-4): unfreeze when the exit contract next opens - the
  red-suite vs machinery-breakage precision clause belongs there.
- defer-0065 (B-5): unfreeze when an arg-validation convention next
  forms.
- defer-0060: standing (external-event CI 403 carrier, quarterly).
- Never-commit set unchanged: `.scratch/grill-t*/audit-evidence/`
  trees, `*.patch`, `round-commits.txt`.
- Mirror maintenance: any commit touching `README.md` must update
  `README-zh-CN.md` in the same commit + re-pin the baseline in a
  follow-up (ADR-0079 D6; the wiring test enforces the drift pin).
- Branch is NOT pushed/landed - `grill-t20-docs` stacks on
  `grill-t19-docs`, owner controls landing.

## Suggested skills for the next agent

- `$implement` / `handoff` for the next round's book; `gitbutler`
  (`but`) for all VCS writes; `code-vulnscan` /
  `security-review-orchestrator` if the next round is an audit;
  `atomcode-research` only for disputed external matters.
