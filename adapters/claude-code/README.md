# Claude Code Adapter (self-contained plugin)

This directory is a **self-contained Claude Code plugin**: the manifest
(`.claude-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the `jiahao-mcp`
server are vendored inside. Every hook command resolves through
`${CLAUDE_PLUGIN_ROOT}`, so nothing reads from the repository root.

## Install

The repository root is the marketplace (`.claude-plugin/marketplace.json`,
whose single entry `source` points at `./adapters/claude-code`).

1. `claude plugin marketplace add Xxx91n/jiahao`
2. `claude plugin install jiahao@jiahao`
3. Enable the plugin. `defaultEnabled: false` is deliberate: plugin hooks
   execute as soon as the plugin is enabled, without a trust prompt.
4. Activate the profile, same as every host:
   `echo full > "$CLAUDE_CONFIG_DIR/.jiahao-active"` (or `$HOME/` when the
   env var is unset), and `echo verifier > .jiahao-profile` for the blocking
   profile (`generator` for advisory-only).
5. Optional MCP server: `npm install --omit=dev` inside this bundle's
   `jiahao-mcp/` once. `.mcp.json` registers it via
   `${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js`.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Hook behavior disclosure (read before enabling)

Plugin `hooks/hooks.json` is auto-discovered at the plugin root, so these
hooks execute as soon as the plugin is enabled:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 + {decision:"block"} |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (D5 parity) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map / manifest / evidence chain; each hit is a bypass-attempt record |

Timeouts stay within the host's 60s per-hook budget (5/5/5/10/10/5/5s).
Commands are `node` invocations in shell form, the form the other hosts'
adapters already use.

There is no `InstructionsLoaded` hook here: that assertion hashes
`rules/jiahao-*.md`, and a Claude Code plugin has no plugin-level `rules/`
directory for the host to load.

## Write scope and network

- Hooks write only under the Claude config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`): `.jiahao-active`, `.jiahao-evidence/` (plus the
  `.jiahao-evidence.keys` sidecar and `pairer-instrument` shadow records the
  Stop lane may append), `.jiahao-pretool.jsonl`, and `.jiahao-sentinel-*`.
  Nothing inside the repo or this plugin directory is written by a hook.
- No network calls: no hook fetches anything; install is the two host
  commands above plus, optionally, `npm install` for the MCP server's
  dependencies.

## Verification status (honest tiering)

Pinned offline by `test/claude-code-plugin.test.js`: both manifests parse,
the plugin version equals `package.json`, the marketplace `source` resolves
to this directory, every referenced file exists, every hook command stays
inside `${CLAUDE_PLUGIN_ROOT}`, and no vendored relative `require()` escapes
the bundle. The bundled Stop gate is spawned by that suite and blocks
(exit 2) when the evidence chain is empty.

**Not yet live-probed**: install through `claude plugin`, SessionStart
injection, and a real blocked false-completion are owner actions in #64. This
adapter is admitted on the documented host contract; it does not claim a live
run.
