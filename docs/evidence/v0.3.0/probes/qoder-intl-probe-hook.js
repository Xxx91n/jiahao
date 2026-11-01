// Log-path shim for the #113 international-Desktop probe. Evidence artifact,
// not shipped.
//
// The shared #109 probe (qoder-stop-probe.js) keeps its marker, per-session cap
// and mode gate; the only thing this wrapper changes is where the call log
// lands, so the international run's lines do not append to the CN artifact
// (../qoder-hook-calls.jsonl). A settings-scope hook has no env field, so the
// log path cannot be handed over from the host config.
//
// It sits beside the probe it wraps and is registered with an origin label as
// argv[1] (`intl-origin-dot-qoder` / `intl-origin-dot-qoder-cn`), which the
// probe records verbatim in its `argv` field, so the log shows which
// project-scope file fired.

const path = require('path');

if (!process.env.JIAHAO_QODER_PROBE_LOG) {
  process.env.JIAHAO_QODER_PROBE_LOG = path.join(__dirname, '..', 'qoder-intl-hook-calls.jsonl');
}

require('./qoder-stop-probe.js');
