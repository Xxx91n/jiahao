'use strict';
// scripts/hosts/workbuddy.js - the one file where WorkBuddy's config dialect lives.
//
// WorkBuddy is not a CodeBuddy alias (#110). It is its own product - two builds
// with their own names, endpoints, and config roots - that ships the same agent
// CLI, so the plugin schema is shared while the identity is not:
//
//   WorkBuddy AI 5.9.4 (international, isOversea)  product.json: productName
//     "WorkBuddy AI", dataFolderName ".workbuddy-ai", endpoint
//     https://www.workbuddy.ai; installed at D:\Workbuddy.ai\WorkBuddyAI.
//   WorkBuddy 5.9.3 (domestic)  productName "WorkBuddy", dataFolderName
//     ".workbuddy", endpoint https://www.workbuddy.cn; installed at D:\WorkBuddy.
//
// Both bundle @genie/agent-cli 2.165.0. What was read out of that bundle and the
// 5.9.4 install (2026-10-31, #110):
//
//   - The plugin loader scans `.codebuddy-plugin`, `.workbuddy-plugin`, and
//     `.claude-plugin`; this dialect takes the product-native one.
//   - Hook commands expand both `${CLAUDE_PLUGIN_ROOT}` and
//     `${CODEBUDDY_PLUGIN_ROOT}`; plugin hooks receive both variables.
//   - Settings-tier hooks live under the `hooks` key of
//     `<configDir>/settings.json`; the desktop spawns the CLI with
//     `CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1`, which only rejects non-command
//     hook types (`prompt`/`agent`/`http`) - `command` hooks still load.
//   - The platform name rides the command. A WorkBuddy settings-tier hook gets no
//     plugin root and both `CODEBUDDY_*` and `WORKBUDDY_*` variables, so the
//     environment alone cannot tell the two products apart; the template can.
//
// Nothing about the verdict lives here.

const MANIFEST_PATH = '.workbuddy-plugin/plugin.json';
const HOOK_MAP_PATH = 'hooks/hooks.json';
const PLATFORM = 'workbuddy';

// The pattern is the contract the release gate and the structure test both
// read, so the spelling cannot drift apart per reader (the first capture is the
// path inside the bundle).
const COMMAND_PATTERNS = {
  command: /^node "\$\{CODEBUDDY_PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)" workbuddy$/,
};

// Claude-shaped nesting (hooks[].hooks[]) with the product's own variable and
// the platform name after the script.
function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${CODEBUDDY_PLUGIN_ROOT}/hooks/' + hook.script + '.js" ' + PLATFORM,
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// The manifest names its hook map (the same key CodeBuddy reads on this shared
// runtime), and keeps `defaultEnabled: false`: enabling a bundle that installs
// five hook points should be a deliberate act. Version, license, and repository
// come from the package like every other bundle.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    version: ctx.pkg.version,
    description: ctx.description,
    author: { name: 'Xxx91n' },
    hooks: HOOK_MAP_PATH,
    license: ctx.pkg.license,
    repository: ctx.repository,
    defaultEnabled: false,
  }, null, 2) + '\n';
}

module.exports = {
  manifestPath: MANIFEST_PATH,
  hookMapPath: HOOK_MAP_PATH,
  sessionEndEvent: 'SessionEnd',
  timeoutField: 'timeout',
  defaultEnabledFlag: true,
  commandFields: ['command'],
  commandPatterns: COMMAND_PATTERNS,
  // Consumers: the generator rejects a platform name the hook layer does not
  // implement, and the structure test re-checks the shipped rows.
  platform: PLATFORM,
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
