// Instrumented entry point for the #113 international-Desktop probe. Evidence
// artifact, not shipped.
//
// Same job as qoder-intl-probe-hook.js (route the shared probe's call log to the
// international artifact), plus the stream capture evidence-review item 7 asks
// for: it runs the shared probe through codex-hook-wrapper.js - a generic
// "spawn the real hook, log its stdin/stdout/stderr/exit, replay the output"
// wrapper whose name is historical - so one JSON line per invocation records the
// hook's own streams and exit code.
//
// Config it expects (project scope, `.qoder/settings.json`):
//   { "hooks": { "Stop": [ { "hooks": [ { "type": "command",
//       "command": "node",
//       "args": ["<abs path to this file>", "intl-io-origin-dot-qoder"] } ] } ] } }
//
// The wrapper takes (logFile, script, ...args); the probe is script and the
// origin label survives as ops.argv, which the probe records.

const path = require('path');

const dir = __dirname;
if (!process.env.JIAHAO_QODER_PROBE_LOG) {
  process.env.JIAHAO_QODER_PROBE_LOG = path.join(dir, '..', 'qoder-intl-hook-calls.jsonl');
}
process.env.JIAHAO_QODER_PROBE_IO_LOG = path.join(dir, '..', 'qoder-intl-probe-io.jsonl');

const wrapper = path.join(dir, 'codex-hook-wrapper.js');
const probe = path.join(dir, 'qoder-stop-probe.js');
process.argv = [
  process.argv[0], wrapper, process.env.JIAHAO_QODER_PROBE_IO_LOG, probe,
  ...process.argv.slice(2),
];
require(wrapper);
