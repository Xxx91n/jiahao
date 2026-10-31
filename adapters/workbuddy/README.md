# WorkBuddy Adapter (self-contained plugin, A tier on both builds)

This directory is a **self-contained plugin bundle for WorkBuddy**: the manifest
(`.workbuddy-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime dependency.
Every hook command resolves through `${CODEBUDDY_PLUGIN_ROOT}`, the variable the
shared loader sets for plugin hooks (read from the bundled CLI, not observed in
a run), so nothing reads from the repository root.

WorkBuddy is **not** a CodeBuddy alias, even though both bundle the same agent
CLI (`@genie/agent-cli 2.165.0`). Two builds ship under two product names, two
endpoints, and two config roots, and each was identified from its own
`product.json`, not from documentation:

| Variant | Product name | Build | Install dir | Config root | Endpoint |
| --- | --- | --- | --- | --- | --- |
| International | `WorkBuddy AI` (`isOversea: true`) | 5.9.4 | `D:\Workbuddy.ai\WorkBuddyAI` | `~/.workbuddy-ai` | `https://www.workbuddy.ai` |
| Domestic | `WorkBuddy` | 5.9.3 | `D:\WorkBuddy` | `~/.workbuddy` | `https://www.workbuddy.cn` |

## Capability tier

**A tier on both builds** - verified twice, once per variant, each on its own
run and its own date:

- **International** (2026-10-31, WorkBuddy AI 5.9.4): a real turn whose last
  assistant message claimed `任务完成，已验证。` continued only after a `Stop`
  hook printed `{decision:"block"}` and exited 0. The host injected the reason
  as `Stop hook feedback: ...` and re-ran the turn.
- **Domestic** (2026-11-01, WorkBuddy 5.9.3, `D:\WorkBuddy`, config root
  `~/.workbuddy`): the same shape on the other build - the false completion
  continued only after the `Stop` hook printed `{decision:"block"}` and exited
  0, the reason arrived as `Stop hook feedback: ...`, and the re-entry carried
  `stop_hook_active: true`.

These are two observations, not one inferred from the shared agent CLI
(`@genie/agent-cli 2.165.0` on both). The domestic row came from its own
session, its own settings file, and its own run; the international row was not
substituted for it, and this document does not extend either result to a third
build it has not run. Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install

Two surfaces were identified; only the settings tier was watched blocking a
turn.

### Settings tier (the probed surface)

WorkBuddy's desktop session reads `hooks` from `<configDir>/settings.json`
(`~/.workbuddy-ai/settings.json` international, `~/.workbuddy/settings.json`
domestic), and a **project-scope** `.codebuddy/settings.json` in the working
directory is read too - that is the file the 2026-10-31 probe used. Note the
project directory name: `.codebuddy`, not `.workbuddy`; a twin written to
`.workbuddy/settings.json` at the same time did not fire.

1. Copy the **whole bundle** to a stable path - `hooks/`, `src/`, and
   `src/SKILL.md` together. The hook scripts require `../src/*` (the gate loads
   the evidence log, calibration, sentinel, and pairer modules from there), so a
   copy of `hooks/` alone fails before it can inject or decide anything.
2. Merge the event map from `hooks/hooks.json` into the settings file,
   replacing `${CODEBUDDY_PLUGIN_ROOT}` with the path you copied to.
3. Append the platform name to every command, as the shipped map does
   (`... jiahao-verdict-gate.js workbuddy`). A settings-tier hook receives no
   plugin root, and the environment carries both `CODEBUDDY_*` and
   `WORKBUDDY_*` variables, so the argument is what identifies the host.
4. Activate the jiahao profile flag: `echo full > "$HOME/.jiahao-active"` and
   `echo verifier > "$HOME/.jiahao-profile"` (`generator` for advisory-only).
5. Start a new session after changing settings. On 5.9.4 the hook map was
   resolved per turn (an edit made during a turn applied at the next turn end),
   and one turn end in three produced no invocation at all; the 5.9.3 run's own
   timing is written down in its record rather than generalized here. Either
   way, a mid-session edit is not something to rely on.

### Plugin tier (declared-unverified)

1. `codebuddy plugin add <path-to-this-dir>` using the CLI bundled with
   WorkBuddy (`<install dir>/resources/app.asar.unpacked/cli/bin/codebuddy`),
   or the desktop's plugin manager. The loader accepts `.workbuddy-plugin`,
   `.codebuddy-plugin`, and `.claude-plugin`; this bundle uses the first.
2. Enable the plugin. `defaultEnabled: false` is deliberate: enabling installs
   five hook points at once.
3. Activate the profile flag as above.

The plugin path is read from the host's loader code, not from a watched run:
no plugin-bundle hook was observed firing on 5.9.4. The settings tier above is
the surface with evidence.

## Hook behavior disclosure (read before enabling)

| Event | Script | Behavior | Observed? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext | no |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder | fired; its output was not read back |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: prints `{decision:"block", reason}` and exits 0; the zero exit is the observed channel | **yes**, live block on both builds |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map, the plugin manifest, `jiahao-*` hook files, any `.mcp.json`, or the jiahao state/evidence files | fired; the deny path was not exercised |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep | no |

Timeouts are 5/5/10/5/3s; the host's own per-hook cap was not measured. Event
names are the host's own PascalCase set.

`SubagentStop` is deliberately **not** wired. It fires with the same payload
shape (it carries `agent_id`, `agent_type`, and `last_assistant_message`), but
the 2026-10-31 probe answered it with `{decision:"block"}` on exit 0 and the
subagent was **not** continued: one invocation, no `stop_hook_active` re-entry.
The 2026-11-01 domestic run repeated that result on 5.9.3. A gate there would
print a decision the host ignores, so the bundle stays on the event that was
watched working on both builds.

## Dialect: what differs from the Claude-shaped hosts

Everything below lives in `scripts/hosts/workbuddy.js`; the judgment logic is
the same `hooks/jiahao-verdict-gate.js` every host runs.

- **Manifest path is `.workbuddy-plugin/plugin.json`** - the product-native
  directory the shared loader scans.
- **Commands expand `${CODEBUDDY_PLUGIN_ROOT}`**, the variable the shared loader
  sets for plugin hooks (read from the bundled CLI; not observed in a run), and
  pass the platform name `workbuddy` as the first argument.
- **The block channel is the decision field on a zero exit.** `Stop` honours
  `{decision:"block", reason}` on stdout; the gate exits 0 for this host. Exit 2
  was not probed here.
- **`CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1` is set by both desktop builds.**
  It rejects `prompt` / `agent` / `http` hook types; `command` hooks - the
  only kind this bundle ships - still load.

## Live probe (2026-10-31, WorkBuddy AI 5.9.4, win32)

The probe used a project-scope `.codebuddy/settings.json` in the workspace and
the throwaway hook in `docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js`.
Commands, payloads, and the recorded environment live in
[`docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md).

| Point | Result |
| --- | --- |
| Project-scope `.codebuddy/settings.json` hooks are read by the desktop session | **Verified**: a `PreToolUse` probe logged every tool call of the session |
| `.workbuddy/settings.json` project twin | **Did not fire**; the project directory name is `.codebuddy` |
| A real turn-end block (`Stop` + `decision:"block"` on exit 0) | **Verified**: the claim continued only after the decision; the reason arrived as `Stop hook feedback` |
| `SubagentStop` block | **Refuted as an enforcement point**: fired once, decision ignored |
| Payload identity fields | **Observed**: `hook_event_name`, `stop_hook_active`, `last_assistant_message`, `transcript_path`, `client:"WorkBuddy"`, `version:"5.9.4"` |
| Hook environment | **Observed**: `WORKBUDDY_APP_NAME`, `WORKBUDDY_APP_VERSION`, `WORKBUDDY_DATA_FOLDER_NAME`, `CODEBUDDY_HOST=workbuddy-desktop`; no `*_PLUGIN_ROOT` for settings-tier hooks |
| Exit 2 as a block channel | Not probed on this host |
| Plugin-bundle hooks firing | Not probed; the loader code path was read, no run was watched |
| Domestic 5.9.3 build | Probed separately on 2026-11-01; see the section below |

## Live probe (2026-11-01, WorkBuddy 5.9.3 domestic, win32)

Run in the domestic desktop session (`D:\WorkBuddy`, config root
`~/.workbuddy`) with the same throwaway hook, registered in the same
project-scope file. Commands, payloads, and the recorded environment live in
[`docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md).

| Point | Result |
| --- | --- |
| Which project-scope file is read | **`.codebuddy/settings.json`** again; a twin written to `.workbuddy/settings.json` at the same moment produced **no** invocation at all |
| A real turn-end block (`Stop` + `decision:"block"` on exit 0) | **Verified**: the false completion continued only after a `Stop` hook printed `{decision:"block"}` and exited 0; the reason arrived as `Stop hook feedback` |
| `stop_hook_active` on re-entry | **Verified**: `true`, and the hook passed on it rather than on its own marker |
| `SubagentStop` block | **Same negative result**: fired once with `{decision:"block"}`, no re-entry, subagent not continued |
| Payload identity fields | **Observed**: `hook_event_name`, `stop_hook_active`, `last_assistant_message`, `transcript_path`, `client:"WorkBuddy"`, `version:"5.9.3"` |
| Extra 5.9.3 payload keys | `is_truncation_recovery`, `background_tasks`, `session_crons`, `permission_mode`, `agent_type` - present here, absent on 5.9.4 |
| Hook environment | **Observed**: `WORKBUDDY_APP_NAME=WorkBuddy`, `WORKBUDDY_APP_VERSION=5.9.3`, `WORKBUDDY_DATA_FOLDER_NAME=.workbuddy`, `WORKBUDDY_CONFIG_DIR` = `~/.workbuddy`, `CODEBUDDY_HOST=workbuddy-desktop`; no `*_PLUGIN_ROOT` for settings-tier hooks |
| Exit 2 as a block channel | Not probed on this build either |
| Plugin-bundle hooks firing | Not probed on this build |

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else `$HOME`):
  `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus its sidecar
  and pairer shadow records), `.jiahao-pretool.jsonl`, and the sentinel state
  and lock files. Nothing inside the repository or this plugin directory is
  written by a hook.
- No network calls: no hook fetches anything, and the bundle has no third-party
  runtime dependency to install.

## Update and uninstall

- Settings tier: replace the copied `hooks/` directory, keep the settings
  entries, and start a new session.
- Plugin tier: the host's own plugin commands (`codebuddy plugin remove jiahao`
  or the desktop plugin manager). Removing the bundle removes its hook map; the
  settings-tier copy, if you also installed it, is removed by hand.

## Verification status (honest tiering)

Pinned offline by `test/plugin-bundles.test.js` (structure, run once per host
row) and `test/workbuddy-adapter.test.js` (the `workbuddy` envelope, host
detection, and the bundled Stop gate spawned as a subprocess from a temp
materialization of the generator output): the manifest parses, its version and
license come from `package.json`, every referenced file is emitted
(`--check` pins the emitted set to disk), every hook command stays inside
`${CODEBUDDY_PLUGIN_ROOT}`, and no vendored relative `require()` escapes the
bundle.

The tier claim rests on the live probe above, not on these structural tests.
