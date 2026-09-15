#!/usr/bin/env bash
# ADR-0059 implementation-round closure runner (evidence capture)
set -u
cd "D:/Aworker/jiahao" || exit 1
LOG=".scratch/grill-adr0059/evidence/2026-09-12-impl-closure.log"
: > "$LOG"
run() {
  local label="$1"; shift
  echo "" >> "$LOG"
  echo "--- $label ---" >> "$LOG"
  echo "cmd: $*" >> "$LOG"
  "$@" >> "$LOG" 2>&1
  echo "exit: $?" >> "$LOG"
}
{
echo "# ADR-0059 implementation round - closure evidence"
echo "date: $(date -Iseconds)"
echo "node: $(node --version)   npm: $(npm --version)"
echo "branch(but): adr0059-impl"
} >> "$LOG"
run "1 jest full suite" node node_modules/jest-cli/bin/jest.js
run "2 test-gate wrapper expected-suites 51" node scripts/run-test-gate.js --expected-suites 51
run "3 gate-all local" npm run gate:all
run "4 gate-all CI mode" env GITHUB_ACTIONS=true CI=true npm run gate:all
run "5 corpus-drift" npm run corpus:drift
run "6 adapters regen-diff" node scripts/build-adapters.js --check
run "7 instrument" node scripts/instrument.js --check
run "8 adr-index" node scripts/build-adr-index.js --check
run "9 check-ci-jobs" node scripts/check-ci-jobs.js
run "10 check-deferred" node scripts/check-deferred.js
run "11 pack dry-run" npm pack --dry-run
run "12 git diff --check" git diff --check
echo "" >> "$LOG"
echo "--- 13 start-alive MCP stdio handshake ---" >> "$LOG"
echo "cmd: node jiahao-mcp/index.js (+ JSON-RPC initialize)" >> "$LOG"
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' | timeout 8 node jiahao-mcp/index.js >> "$LOG" 2>&1
echo "exit: $?" >> "$LOG"
run "14 install smoke CLI --dry-run -y" node scripts/install.js --dry-run -y
run "15 pack-smoke (ADR-0059 D-B)" node scripts/check-pack-smoke.js
echo "DONE" >> "$LOG"
