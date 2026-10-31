'use strict';
// scripts/hosts/qoder.js - the one file where Qoder Desktop's config dialect
// lives.
//
// Qoder Desktop (the 0.x workbench, CN and international) reads a plugin
// manifest at `.qoder-plugin/plugin.json` and auto-discovers `hooks/hooks.json`
// beside it - the host's own bundled `qoder-context` plugin is shaped exactly
// that way and its hooks were watched firing in a live session. The manifest
// therefore does NOT name the hook map; naming an auto-discovered file is the
// row's `autoDiscovered` list, not a manifest key.
//
// Event vocabulary and the block channel are the host's own contract, observed
// on Qoder CN Desktop 0.4.11 (#109, 2026-10-31): the payload is snake_case
// Claude-shaped (`session_id`, `hook_event_name`, `stop_hook_active`,
// `last_assistant_message`), and a Stop hook continued the turn on BOTH
// exit 0 + a flat `{"decision":"block"}` stdout AND exit 2 + stderr. Because
// exit 2 blocks here, the shared gate keeps the Claude exit code
// (hooks/jiahao-runtime.js) and this file says nothing about the verdict.
//
// The platform name rides the command: Qoder hands a hook subprocess
// QODER_PROJECT_DIR and QODER_CONFIG_DIR but NOT QODER_SESSION_ID, so the
// environment probe in detectHost() cannot identify this host. Passing `qoder`
// as argv is what makes the envelope choice deterministic.

const HOOK_MAP_PATH = 'hooks/hooks.json';

// The host expands ${QODER_PLUGIN_ROOT} in a hook command (its own bundled
// plugin uses that spelling). The platform name after the script is part of the
// contract the structure test and the release gate both read.
const COMMAND_PATTERNS = {
  command: /^node "\$\{QODER_PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)" qoder$/,
};

function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${QODER_PLUGIN_ROOT}/hooks/' + hook.script + '.js" qoder',
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// Qoder's own manifest shape, from the host's bundled plugin: name,
// displayName, description, version. `author`, `license`, `repository` and
// `defaultEnabled` are keys this host does not read, so they are absent rather
// than decorative.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    displayName: 'Jiahao',
    description: ctx.description,
    version: ctx.pkg.version,
  }, null, 2) + '\n';
}

module.exports = {
  manifestPath: '.qoder-plugin/plugin.json',
  hookMapPath: HOOK_MAP_PATH,
  sessionEndEvent: 'SessionEnd',
  timeoutField: 'timeout',
  defaultEnabledFlag: false,
  commandFields: ['command'],
  commandPatterns: COMMAND_PATTERNS,
  platform: 'qoder',
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
