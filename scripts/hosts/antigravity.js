'use strict';
// scripts/hosts/antigravity.js - the one file where Google Antigravity's config
// dialect lives.
//
// Antigravity reads a plugin manifest at `plugin.json` (at plugin root) and
// `hooks.json` directly at the plugin root.
//
// The Stop hook output contract is { decision: 'block', reason: ... } on exit 0.
// Exit 2 is treated as a failed hook and does not continue the turn. The shared
// gate exits 0 and prints the JSON decision.
//
// The platform name rides the command: the template says which host it is and
// hooks/jiahao-runtime.js reads that instead of inferring it from the environment.

const MANIFEST_PATH = 'plugin.json';
const HOOK_MAP_PATH = 'hooks.json';
const PLATFORM = 'antigravity';

const COMMAND_PATTERNS = {
  command: /^node (hooks\/[a-z0-9-]+\.js) antigravity$/,
};

function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      type: 'command',
      command: 'node hooks/' + hook.script + '.js ' + PLATFORM,
      timeout: hook.timeout,
    }];
  }
  return JSON.stringify({
    hooks: hooks,
  }, null, 2) + '\n';
}

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
  manifestPath: MANIFEST_PATH,
  hookMapPath: HOOK_MAP_PATH,
  sessionEndEvent: 'SessionEnd',
  timeoutField: 'timeout',
  defaultEnabledFlag: false,
  commandFields: ['command'],
  commandPatterns: COMMAND_PATTERNS,
  platform: PLATFORM,
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
