'use strict';
// scripts/hosts/copilot.js - the one file where GitHub Copilot CLI's dialect lives.
//
// Copilot CLI differs from the Claude-shaped hosts in three places, and all
// three stay here instead of leaking into hooks/*.js or the generator's shared
// emitters:
//   1. event names are camelCase (sessionStart, agentStop), not PascalCase;
//   2. a command entry carries two shell branches, `bash` and `powershell`,
//      because the host picks one by operating system;
//   3. an agentStop block is the `decision: "block"` field on stdout, not an
//      exit code - exit 2 is only a warning outside preToolUse/permissionRequest
//      (docs.github.com/en/copilot/reference/hooks-reference, read 2026-10-30).
//
// The judgment logic stays in hooks/jiahao-verdict-gate.js, shared with every
// other host; this module only says which event name runs which script and how
// that command is spelled on the two shells.
//
// Plugin layout (legacy Copilot format, documented): plugin.json at the plugin
// root, hooks.json at the root or in hooks/, skills/<name>/SKILL.md. Plugin
// hooks receive PLUGIN_ROOT, COPILOT_PLUGIN_ROOT and CLAUDE_PLUGIN_ROOT with the
// installation directory (copilot-cli changelog 1.0.105 line for plugin hooks);
// PLUGIN_ROOT is the name used here so nothing depends on Claude compatibility.

function scriptPath(script) {
  return 'hooks/' + script + '.js';
}

// Bash and PowerShell expand different variables for the same directory. Both
// stay inside the plugin root - the path is relative to $PLUGIN_ROOT, never to
// the repository or the working directory.
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

// The manifest names the hook map and the skill directory instead of relying on
// discovery, and carries the package version and repository the same way the
// other bundles do. `defaultEnabled` is deliberately absent: Copilot CLI has no
// such field, and a made-up key is a claim no host reads.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    version: ctx.pkg.version,
    description: ctx.description,
    author: { name: 'Xxx91n' },
    license: ctx.pkg.license,
    repository: ctx.repository,
    hooks: 'hooks/hooks.json',
    skills: 'skills/',
  }, null, 2) + '\n';
}

module.exports = {
  kind: 'copilot',
  manifestPath: 'plugin.json',
  hookMapPath: 'hooks/hooks.json',
  timeoutField: 'timeoutSec',
  commandFields: ['bash', 'powershell'],
  shipShippedSkill: true,
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
