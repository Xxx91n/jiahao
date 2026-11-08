'use strict';
// scripts/hosts/qoder.js - the one file where Qoder Desktop's host config shape
// lives.
//
// The shape below is copied from the host's own bundled plugin: both Desktop
// builds ship `qoder-context` as `.qoder-plugin/plugin.json` plus an
// auto-discovered `hooks/hooks.json`, and that plugin's hooks were watched
// firing in a live session. The manifest therefore does NOT name the hook map;
// naming an auto-discovered file is the row's `autoDiscovered` list, not a
// manifest key. One half stays unwatched and is listed as declared-unverified
// in the adapter README: whether a `Stop` hook arriving through the *plugin*
// path blocks a turn - every observed block, on both builds, came through the
// settings path.
//
// Event vocabulary and the block channel are the host's own contract, observed
// on both builds separately: Qoder CN Desktop 0.4.11 (#109, 2026-10-31) and
// international Desktop 0.4.11 (#113, 2026-11-01). Each has its own record, and
// each showed the same thing - the payload is snake_case Claude-shaped
// (`session_id`, `hook_event_name`, `stop_hook_active`,
// `last_assistant_message`), a `Stop` hook registered from the project's
// `.qoder/settings.json` continued the turn on BOTH exit 0 + a flat
// `{"decision":"block"}` stdout AND exit 2 + stderr, and a
// `.qoder-cn/settings.json` armed beside it never fired. Because exit 2 blocks
// here, the shared gate keeps the Claude exit code (hooks/jiahao-runtime.js) and
// this file says nothing about the verdict.
//
// The platform name rides the command: Qoder hands a hook subprocess
// QODER_PROJECT_DIR and QODER_CONFIG_DIR but NOT QODER_SESSION_ID, so the
// environment probe in detectHost() cannot identify this host. Passing `qoder`
// as argv is what makes the envelope choice deterministic.

const HOOK_MAP_PATH = 'hooks/hooks.json';
const PLATFORM = 'qoder';

// The host's own bundled plugin spells its command root as this placeholder -
// its `hooks/hooks.json` writes `command=${QODER_PLUGIN_ROOT}/bin/...`, quoted
// in docs/evidence/v0.3.0/qoder-runtime-hook-schema.txt §7-8. That proves the
// name the host uses, not that a shell-form `node "..."` command resolves it:
// the probe ran exec form. The platform name after the script is part of the
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
        command: 'node "${QODER_PLUGIN_ROOT}/hooks/' + hook.script + '.js" ' + PLATFORM,
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// Qoder's own manifest shape comes from the host's bundled plugin: name,
// displayName, description, version. `displayName` is a key this host reads and
// Claude's does not; `defaultEnabled` is not a Qoder field, so it stays absent
// (the `defaultEnabledFlag: false` in this module is what keeps it out).
// `license` and `repository` are package metadata every bundle carries, and a
// key the host ignores is not a claim about the host.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    displayName: 'Jiahao',
    description: ctx.description,
    version: ctx.pkg.version,
    license: ctx.pkg.license,
    repository: ctx.repository,
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
