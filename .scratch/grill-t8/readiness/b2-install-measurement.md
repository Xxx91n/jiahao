# b2 — measured install-chain run (grill-t8, 2026-09-16)

Pre-registered under ledger D-005/D-006(b): the "installable" claim stands
only on this measured run; on breakage the self-description downgrades to
"install path has a known issue (see this record)" and wording repair is
forbidden.

## Environment

- Clean dirs: HOME=/tmp/jiahao-b2/home, work=/tmp/jiahao-b2/work (both empty at start)
- Channel under test: `npx -y github:Xxx91n/jiahao` (the declared Tier-1 channel)
- Repo visibility measured: `gh repo view Xxx91n/jiahao --json visibility` -> PUBLIC
- Origin main at measurement: c1afe09 (public state; t8 work is not pushed)

## Measurements (first-party, rerunnable)

1. `cd /tmp/jiahao-b2/work && HOME=/tmp/jiahao-b2/home npx -y github:Xxx91n/jiahao init --profile verifier -y`
   - exit 0; stdout: `Wrote "verifier" to .../home/.jiahao-profile`;
     `Persistence capability: probed=dir-sync-unsupported`; verifier
     deployment-discipline reminder printed. Private wordlist/corpus plant
     skipped silently - neither ships in the tarball (ADR-0036/0038 boundary).
   - Post-state: `.jiahao-profile` = "verifier"; `.jiahao-persistence.json`
     written with the probed class.

2. Mock task through the installed hook chain (package resolved at npm's
   _npx cache: `_npx/0211bba71d2f58ba/node_modules/jiahao/`):
   a. `touch $HOME/.jiahao-active`; `echo '{"session_id":"mock-b2","stop_hook_active":false}' | node <pkg>/hooks/jiahao-verdict-gate.js`
      -> `{"decision":"block","reason":"Verification has no evidence: ..."}`
      exit 2. Blocking verifier semantics confirmed end-to-end.
   b. Write one evidence record via installed `src/evidence-log.js`
      (`createRecord('det-b2','test-run','passed',...)` into
      `.jiahao-evidence` legacy form), re-fire the same Stop event
      -> exit 0 (allow). The evidence chain un-blocks as designed.

## Verdict

- install channel: WORKS (real GitHub tarball install, non-interactive).
- hook/adapter chain: WORKS (block-on-no-evidence and allow-with-evidence
  both observed on the installed artifact).
- fail branch: NOT ENGAGED. The pre-registered downgrade stays registered
  but unused this round.
- Stale claim repaired: README previously said "the project is currently
  private"; the repo is public and the channel is measured. Fixed in-place.
