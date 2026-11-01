'use strict';
// scripts/hosts/zcode.js - the one file where ZCode's config dialect lives.
//
// ZCode reads a plugin manifest at `.zcode-plugin/plugin.json` (the
// compatibility names `.claude-plugin/` and `.codex-plugin/` are also
// recognized) and discovers `hooks/hooks.json` at the plugin root without a
// manifest pointer. Its hook map is Claude-shaped nesting, its event names are
// PascalCase, and its event set is exactly seven: SubagentStart, SubagentStop,
// and SessionEnd do not exist, so this row wires no sweep and
// sessionEndEvent is null (ZCode 3.16.2, product hooks doc + live probe,
// 2026-10-31, #108).
//
// The block channel is the stdout decision field on exit 0: a live desktop
// session's turn end was blocked only after Stop answered {decision:"block"}
// (probe #108, 2026-10-31). The shared gate prints that field and exits 0 for
// this host; hooks/jiahao-runtime.js owns that branch. The platform name rides
// the command like Codex's, and `${ZCODE_PLUGIN_ROOT}` is the plugin-root
// variable the host expands for plugin hooks.
//
// Nothing about the verdict lives here.

const MANIFEST_PATH = '.zcode-plugin/plugin.json';
const HOOK_MAP_PATH = 'hooks/hooks.json';
const PLATFORM = 'zcode';

// The pattern is the contract the release gate and the structure test both
// read, so the spelling cannot drift apart per reader (the first capture is
// the path inside the bundle).
const COMMAND_PATTERNS = {
  command: /^node "\$\{ZCODE_PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)" zcode$/,
};

// Claude-shaped nesting with this host's variable and the platform name after
// the script.
function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${ZCODE_PLUGIN_ROOT}/hooks/' + hook.script + '.js" ' + PLATFORM,
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// ZCode's manifest reference requires only `name`; `defaultEnabled` is not a
// documented field, so it is deliberately absent - a made-up key is a claim no
// host reads. The version, license, and repository come from the package like
// every other bundle.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    version: ctx.pkg.version,
    description: ctx.description,
    author: { name: 'Xxx91n' },
    license: ctx.pkg.license,
    repository: ctx.repository,
  }, null, 2) + '\n';
}

// The bundle carries its own marketplace shelf: ZCode's install command only
// resolves plugin@marketplace names - a direct directory install is refused
// ("Plugin not found in any marketplace", CLI 0.17.0, probed 2026-10-31) - and
// a marketplace is whatever directory the user points at. `source: "."` is the
// bundle directory itself, so `marketplace add <this dir>` plus
// `plugins install jiahao@jiahao-zcode` installs exactly these bytes. Adding
// the repository root instead resolves `.claude-plugin/marketplace.json` and
// installs the Claude-Code bundle (probed 2026-10-31); the README warns
// against it.
function emitMarketplaceShelf(description) {
  return JSON.stringify({
    name: 'jiahao-zcode',
    owner: { name: 'Xxx91n' },
    plugins: [
      {
        name: 'jiahao',
        source: '.',
        description: description,
      },
    ],
  }, null, 2) + '\n';
}

module.exports = {
  manifestPath: MANIFEST_PATH,
  hookMapPath: HOOK_MAP_PATH,
  // ZCode has no session-end event: the sweep cannot be wired, and a null here
  // is the test-visible statement of that (test/sentinel-ownership.test.js).
  sessionEndEvent: null,
  timeoutField: 'timeout',
  defaultEnabledFlag: false,
  commandFields: ['command'],
  commandPatterns: COMMAND_PATTERNS,
  // Consumers: the generator rejects a platform name the hook layer does not
  // implement, and the structure test re-checks the shipped rows.
  platform: PLATFORM,
  // The bundle-local marketplace shelf the generator emits beside the manifest.
  marketplaceShelfPath: 'marketplace.json',
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
  emitMarketplaceShelf: emitMarketplaceShelf,
};
