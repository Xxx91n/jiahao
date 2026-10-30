'use strict';
// scripts/hosts/copilot.js - the one file where GitHub Copilot CLI's config
// dialect lives.
//
// Two config-side differences from the Claude-shaped hosts live here:
//   1. event names are camelCase (sessionStart, agentStop), not PascalCase;
//   2. a command entry carries two shell branches, `bash` and `powershell`,
//      because the host picks one by operating system.
// The third difference - an agentStop block is the `decision: "block"` field on
// stdout - is the host's own contract, not a translation: the shared
// hooks/jiahao-verdict-gate.js prints that field and exits 0 for this host.
// The 1.0.105 live probe (#80) showed exit 2 is non-blocking: the host logged
// the hook as failed and ended the turn without a continuation, even with the
// decision field on stdout. Payload field
// names are the fourth: the
// camelCase events send `sessionId` / `agentName`, and folding those into the
// shared names is the job of hooks/jiahao-runtime.js, the hook-side adapter
// file that already owns detectHost() and the per-host envelopes (spec #74 D3).
// Nothing about the verdict is duplicated here; this module only says which
// event name runs which script and how the command is spelled on the two
// shells, so a second dialect host edits this shape once instead of editing the
// gate and the tests again.
//
// Plugin layout (legacy Copilot format, documented): plugin.json at the plugin
// root, hooks.json at the root or in hooks/. The rules body ships as the
// vendored src/SKILL.md the sessionStart hook injects; this bundle contributes
// no host-discovered skill directory. Plugin hooks receive PLUGIN_ROOT,
// COPILOT_PLUGIN_ROOT and CLAUDE_PLUGIN_ROOT with the installation directory
// (copilot-cli changelog, 1.0.105); PLUGIN_ROOT is the name used here so
// nothing depends on Claude compatibility.

const HOOK_MAP_PATH = 'hooks/hooks.json';

function scriptPath(script) {
  return 'hooks/' + script + '.js';
}

// Bash and PowerShell expand different variables for the same directory. Both
// stay inside the plugin root - the path is relative to $PLUGIN_ROOT, never to
// the repository or the working directory. The patterns are the contract the
// release gate and the structure test both read, so the two spellings cannot
// drift apart per reader (the first capture is the path inside the bundle).
const COMMAND_PATTERNS = {
  bash: /^node "\$PLUGIN_ROOT\/(hooks\/[a-z0-9-]+\.js)"$/,
  powershell: /^node "\$env:PLUGIN_ROOT\/(hooks\/[a-z0-9-]+\.js)"$/,
};

function bashCommand(script) {
  return 'node "$PLUGIN_ROOT/' + scriptPath(script) + '"';
}

function powershellCommand(script) {
  return 'node "$env:PLUGIN_ROOT/' + scriptPath(script) + '"';
}

// Flat schema: {version: 1, hooks: {event: [{type, bash, powershell, timeoutSec}]}}.
// No nested `hooks` array and no `command` key - those are the Claude-shaped
// hosts' dialect, and a copy of them would be a config the host silently skips.
function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      type: 'command',
      bash: bashCommand(hook.script),
      powershell: powershellCommand(hook.script),
      timeoutSec: hook.timeout,
    }];
  }
  return JSON.stringify({ version: 1, hooks: hooks }, null, 2) + '\n';
}

// The manifest names the hook map instead of relying on discovery, and carries
// the package version and repository the same way the other bundles do.
// `defaultEnabled` is deliberately absent: Copilot CLI has no such field, and a
// made-up key is a claim no host reads.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    version: ctx.pkg.version,
    description: ctx.description,
    author: { name: 'Xxx91n' },
    license: ctx.pkg.license,
    repository: ctx.repository,
    hooks: HOOK_MAP_PATH,
  }, null, 2) + '\n';
}

module.exports = {
  manifestPath: 'plugin.json',
  hookMapPath: HOOK_MAP_PATH,
  sessionEndEvent: 'sessionEnd',
  timeoutField: 'timeoutSec',
  defaultEnabledFlag: false,
  commandFields: ['bash', 'powershell'],
  commandPatterns: COMMAND_PATTERNS,
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
