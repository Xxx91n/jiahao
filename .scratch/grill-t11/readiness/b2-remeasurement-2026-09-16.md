# b2 re-measurement - grill-t11 R2 (2026-09-16)

Pre-registered under ADR-0072 D-B (ledger D-002): the "usable + testable"
declaration stands only on this measured run of the CURRENT artifact; on
breakage the self-description downgrades to "install path has a known issue
(see the measured record)" and wording repair is forbidden. Same method as
.scratch/grill-t8/readiness/b2-install-measurement.md plus the lane exercise
(the t10 surface under measurement).

## Environment

- Clean dirs: HOME=C:\Users\Administrator\AppData\Local\Temp\jiahao-r2\home,
  work=...\jiahao-r2\work (both empty at start); npm cache forced cold via
  npm_config_cache=...\jiahao-r2\npm-cache (the package tarball is fetched,
  not cache-replayed).
- Channel under test: `npx -y github:Xxx91n/jiahao` (the declared Tier-1 channel).
- Origin main at measurement: c861084 (public state; t11 work is not pushed).
- Host: Windows 11 + Git Bash + Node v24.11.0. Note: paths below are the
  Windows forms; the b2 record used /tmp on a POSIX shell.

## Measurements (first-party, rerunnable)

1. Install:
   `cd $work && HOME=$home npm_config_cache=$cache npx -y github:Xxx91n/jiahao init --profile verifier -y`
   - exit 0; stdout: `Wrote "verifier" to ...\home\.jiahao-profile`;
     `Persistence capability: probed=dir-sync-unsupported`; verifier
     deployment-discipline reminder printed. Private wordlist/corpus plant
     skipped silently (neither ships in the tarball; ADR-0036/0038 boundary).
   - Post-state: .jiahao-profile = "verifier"; .jiahao-persistence.json written.
   - Package resolved in the cold cache at
     npm-cache/_npx/0211bba71d2f58ba/node_modules/jiahao/ - the same _npx slot
     hash b2 observed.

2. Gate chain (mock task, CLAUDE_CONFIG_DIR=$home, .jiahao-active set):
   a. Stop stdin `{"session_id":"r2-mock","stop_hook_active":false}` ->
      `{"decision":"block","reason":"Verification has no evidence: ..."}`
      exit 2. Blocking verifier semantics end-to-end on the installed artifact.
   b. One evidence record appended through the installed src/evidence-log.js
      (createRecord 'det-r2'/'test-run'/'passed') -> re-fire -> exit 0 (allow).

3. Lane chain (the t10 surface): transcript.jsonl carrying an exit-report
   contradiction (closing claims exit code 2; tool_result stream shows exit 0).
   a. Stop with transcript_path on the evidence-bearing home -> exit 0 with
      `systemMessage: "JIAHAO: Conviction lane (shadow): pairer flagged
      exit-report - claim 2 vs evidence 0 (telemetry; resolve via jiahao
      resolve if wrong)."` The chain gains exactly one
      source:pairer-instrument record: status=suspect, shadow=true,
      suspicious=true, severity=high, pairer{family:exit-report,
      state:flagged, claim:2, evidence:0, latency_ms:4}.
   b. Shadow-only home (no evidence record): the same Stop -> exit 2 block on
      no-evidence AND the shadow record still lands (chain_len=1,
      lane_records=1, shadow=true flagged). Shadow telemetry never satisfies
      the no-evidence check - the registered semantics hold on the artifact.

## Verdict

- install channel: WORKS (real GitHub tarball install, cold cache, exit 0).
- gate chain: WORKS (block-on-no-evidence and allow-with-evidence both observed).
- lane chain: WORKS (stdin transcript_path -> transcript-adapter -> pairItem
  -> source:pairer-instrument shadow record; shadow excluded from the matrix).
- fail branch: NOT ENGAGED. The pre-registered downgrade stays registered,
  unused this round.
- The README declaration block (ADR-0072 D-G) now lands: the measured record
  exists, so the dormant block goes live per measure-then-declare.
