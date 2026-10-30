// Probe hook: logs selected environment variables and a short input prefix.
// Used for the Copilot plugin-env probe and for project-hook markers.
// Set JIAHAO_PROBE_LOG to choose the output file (default: ./probe.log).
const fs = require('fs');
const path = require('path');

const log = process.env.JIAHAO_PROBE_LOG || path.join(__dirname, 'probe.log');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  const env = {};
  for (const key of ['PLUGIN_ROOT', 'COPILOT_PLUGIN_ROOT', 'CLAUDE_PLUGIN_ROOT', 'PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'CLAUDE_CONFIG_DIR', 'COPILOT_HOME']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  fs.appendFileSync(log, JSON.stringify({
    tag: process.argv[2] || 'probe',
    ts: new Date().toISOString(),
    env,
    input_prefix: input.slice(0, 160),
  }) + '\n');
  process.exit(0);
});
