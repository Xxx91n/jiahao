# Codex CLI Adapter (self-contained plugin, A 档候选)

This directory is a **self-contained Codex CLI plugin**: the manifest
(`.codex-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through `${PLUGIN_ROOT}`, so nothing
reads from the repository root.

**Capability tier: A 档候选 (candidate).** The host documents a `Stop` hook
that reports `stop_hook_active` and answers with JSON on stdout, and this
bundle wires `Stop` to the verdict gate. No live turn-end block has been
observed yet (#80), so this adapter does not claim "会拦" — it claims
"registered and runnable", and the tier table stays a release-period
conclusion.

## Install (host-native commands)

The repository root is also a Codex marketplace
(`.agents/plugins/marketplace.json`, whose single `source.path` points at
`./adapters/codex`).

1. `codex plugin marketplace add Xxx91n/jiahao`
2. `codex plugin add jiahao --marketplace jiahao`
3. Turn the hook feature on in `$CODEX_HOME/config.toml`
   (default `~/.codex/config.toml`):

   ```toml
   [features]
   hooks = true
   plugin_hooks = true
   ```

4. Review and trust the plugin's hook commands once — Codex skips an untrusted
   hook silently (`/hooks`).
5. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Configuration template

`hooks/hooks.json` is the whole template. Each entry names the script to run
and the platform name `codex` passed to it; there is no decision logic in the
file. The platform name is what the hook uses to pick Codex's output envelope
(the same branch `hooks/jiahao-runtime.js` already has), so the template does
not re-implement host detection.

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 2 + {decision:"block"} when the evidence chain is empty (verifier profile) |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (parity) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay inside the host budget (5/5/5/10/10/3s; Codex caps
`SessionEnd` at 3s). Event names are the host's own PascalCase set.

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`): `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus
  its sidecar and pairer shadow records), `.jiahao-pretool.jsonl`, and the
  sentinel state and lock files. Nothing inside the repo or this plugin
  directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by `test/plugin-bundles.test.js` (structure, run once per host
row) and `test/codex-adapter.test.js` (the Codex envelope and the bundled Stop
gate, spawned as a subprocess from a temp materialization of the generator
output): the manifest parses, its version and license come from
`package.json`, the marketplace `source.path` resolves to this directory,
every referenced file is emitted (`--check` pins the emitted set to disk),
every hook command stays inside `${PLUGIN_ROOT}`, and no vendored relative
`require()` escapes the bundle.

**Not yet live-probed**: install through `codex plugin`, the `/hooks` trust
step, and a real blocked false-completion are owner actions in #80. This
adapter is admitted on the documented host contract; it does not claim a live
run.
