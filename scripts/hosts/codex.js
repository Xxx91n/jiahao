'use strict';
// scripts/hosts/codex.js - the one file where Codex CLI's config dialect lives.
//
// Codex reads a plugin manifest at `.codex-plugin/plugin.json`, expands
// `${PLUGIN_ROOT}` in hook commands, and requires manifest component paths to
// be './'-prefixed (openai/plugins, read 2026-10-30). Its Stop/SubagentStop hook
// accepts a block as stdout JSON at exit 0 or a continuation prompt on stderr
// at exit 2 (openai/codex hooks/src/events/stop.rs), which is why the shared
// gate writes both and this template only says where the files go and how a
// command is spelled.
//
// The platform name rides the command: the template is host-owned data, so it
// says which host it is and hooks/jiahao-runtime.js reads that instead of
// inferring it from the environment. Nothing about the verdict lives here.

const MANIFEST_PATH = '.codex-plugin/plugin.json';
// Codex requires component paths in the manifest to be './'-prefixed.
const MANIFEST_PATH_PREFIX = './';
const HOOK_MAP_PATH = 'hooks/hooks.json';
const PLATFORM = 'codex';

// The pattern is the contract the release gate and the structure test both
// read, so the spelling cannot drift apart per reader (the first capture is the
// path inside the bundle).
const COMMAND_PATTERNS = {
  command: /^node "\$\{PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)" codex$/,
};

// Claude-shaped nesting (hooks[].hooks[]) with the host's own variable and the
// platform name after the script.
function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${PLUGIN_ROOT}/hooks/' + hook.script + '.js" ' + PLATFORM,
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// Codex's manifest names the hook map (the host does not auto-discover it) and
// wants component paths './'-prefixed. `defaultEnabled` is not a Codex field,
// so it is deliberately absent; the version, license, and repository come from
// the package like every other bundle.
function emitManifest(ctx) {
  return JSON.stringify({
    name: 'jiahao',
    version: ctx.pkg.version,
    description: ctx.description,
    author: { name: 'Xxx91n' },
    hooks: MANIFEST_PATH_PREFIX + HOOK_MAP_PATH,
    license: ctx.pkg.license,
    repository: ctx.repository,
  }, null, 2) + '\n';
}

module.exports = {
  manifestPath: MANIFEST_PATH,
  hookMapPath: HOOK_MAP_PATH,
  manifestPathPrefix: MANIFEST_PATH_PREFIX,
  sessionEndEvent: 'SessionEnd',
  timeoutField: 'timeout',
  defaultEnabledFlag: false,
  commandFields: ['command'],
  commandPatterns: COMMAND_PATTERNS,
  // Consumers: the generator rejects a platform name the hook layer does not
  // implement, and the structure test re-checks the shipped rows.
  platform: PLATFORM,
  // Tells the generator which repo-level marketplace shelf this row owns.
  marketplace: 'codex',
  emitManifest: emitManifest,
  emitHookMap: emitHookMap,
};
