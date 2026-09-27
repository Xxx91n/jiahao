# CodeBuddy Adapter (first Claude-Code-compatible path host, ADR-0087)

This directory is a **self-contained plugin bundle**: CodeBuddy recognizes
`.claude-plugin/` and `${CLAUDE_PLUGIN_ROOT}` verbatim (official
Claude-Code compatibility chapter; `${CODEBUDDY_PLUGIN_ROOT}` takes
precedence when set). Copy the whole directory as the plugin root - the hook
scripts, their require() closure, `src/SKILL.md`, and the `jiahao-mcp`
server are vendored inside, so nothing resolves outside the bundle.

## Install (plugin path)

1. Copy this directory to the CodeBuddy plugin location, e.g.
   `codebuddy plugin install <path-to-this-dir>` (CLI) or the IDE plugin
   manager.
2. Enable the plugin explicitly - `defaultEnabled: false` is deliberate:
   plugin hooks bypass the `allowUntrustedFrontmatterHooks` gate and
   execute the moment the plugin is enabled.
3. Activate the jiahao profile flag, same as every host:
   `echo full > "$CLAUDE_CONFIG_DIR/.jiahao-active"` (or `$HOME/` when the
   env var is unset) and `echo verifier > .jiahao-profile` for the
   blocking profile (`generator` for advisory-only).
4. MCP server: run `npm install --omit=dev` inside the bundle's
   `jiahao-mcp/` once (the server source is vendored; dependencies are
   not). The bundle's `.mcp.json` registers it via
   `${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js`.

Settings-tier alternative (CLI): merge the hook map into
`.codebuddy/settings.json` and copy the rules into `.codebuddy/rules/`.
The settings path is the one live-verified end to end (see tiering below).

## Hook behavior disclosure (read before enabling)

Plugin `hooks/hooks.json` entries are **exempt from the
`allowUntrustedFrontmatterHooks` gate** - unlike skill/agent frontmatter
(which is silently skipped unless trusted), plugin hooks execute as soon as
the plugin is enabled. Nothing load-bearing lives in frontmatter here by
design. Enabling this bundle installs seven hook points:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 + {decision:"block"} |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| InstructionsLoaded | hooks/jiahao-instructions-assert.js | integrity assertion: records both rules files' presence + sha256 to the telemetry log |
| PreToolUse | hooks/jiahao-pretool-guard.js | enforcement-surface guard: emits permissionDecision:"deny" (verifier profile) when a tool call targets injected rules / hook map / manifest / jiahao state-evidence files; every hit is a bypass-attempt record |

Timeouts stay within the 60s host budget (5/5/5/10/3/5/5s). Commands are
Git-Bash-compatible `node` invocations (cmd/PowerShell unsupported by the
host). Event matchers are case-sensitive - none are narrowed here.

## Injection-surface ruling - Verified vs Declared-unverified

### Verified (CodeBuddy Code CLI 2.151.0, live-probed)

| Point | Evidence |
| --- | --- |
| `.codebuddy/settings.json` hooks: SessionStart / PreToolUse / PostToolUse | hook_event_name + hookSpecificOutput envelope live-verified |
| PreToolUse `permissionDecision: "deny"` envelope | verified deny shape on CLI |
| MCP server registration via `.mcp.json` | stdio connect + tool list verified |

### Declared-unverified (documented, not live-probed - pending-confirmation)

| Point | Status |
| --- | --- |
| IDE-side hook parity, incl. `InstructionsLoaded` firing | pending-confirmation |
| `rules/` non-`alwaysApply` load priority (both forms) | pending-confirmation |
| `npx`-bundled install vs `codebuddy plugin install` coexistence | pending-confirmation |
| Plugin-bundle path parity on CLI (documented compat, unprobed live) | pending-confirmation |

Unverified means **registered, not assumed**: each row has a
pending-confirmation entry in the taxonomy exception channel (ADR-0086
schema) with an expiry and an owner ratify/revoke point. Windows note: the
upstream `${CLAUDE_PLUGIN_ROOT}` hook expansion bug
(anthropics/claude-code issues) may carry over - the settings-tier path is
the verified fallback.

## Trial boundary

The adapter is admitted; the external effectiveness trial (install +
Phase 0/1/2 in a real CodeBuddy environment) is an **owner action**, never
agent-executed. Protocol: `.scratch/grill-t30/protocol.md`; judgment lines:
`bench/codebuddy-trial/judgment-lines.json` (preregistered, immutable -
deviations ride errata records).
