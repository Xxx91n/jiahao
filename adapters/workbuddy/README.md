# WorkBuddy Adapter (self-contained plugin, A tier on both builds)

## What this is

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
   replacing `${CODEBUDDY_PLUGIN_ROOT}` with the path you copied to. That value
   is a JSON string: on Windows write the separators as `/`
   (`D:/Workbuddy.ai/jiahao`) or escape them (`D:\\Workbuddy.ai\\jiahao`),
   otherwise the settings file stops parsing and no hook loads at all.
3. Append the platform name to every command, as the shipped map does
   (`... jiahao-verdict-gate.js workbuddy`). A settings-tier hook receives no
   plugin root, and the environment carries both `CODEBUDDY_*` and
   `WORKBUDDY_*` variables, so the argument is what identifies the host.
4. Activate the jiahao profile flag **where the hooks read it**, and pin that
   directory first. The hooks resolve it as `CLAUDE_CONFIG_DIR`, else `HOME`,
   else `CODEBUDDY_CONFIG_DIR` / `WORKBUDDY_CONFIG_DIR` (the order
   `src/shared/paths.js` checks), else the OS home. What the record says, and
   what it does not: the 2026-10-31 and 2026-11-01 probe sessions logged
   `CLAUDE_CONFIG_DIR` absent and both builder config-dir variables set to
   that build's own root, and neither record logs `HOME` at all. The owner's
   separate run on 2026-11-01 (#116) saw the desktop's guard process with
   `CLAUDE_CONFIG_DIR` unset and `HOME` set, while the shell that ran the
   installer carried `CLAUDE_CONFIG_DIR` from another agent - so the installer
   wrote the flag where the hook does not read it and a profile switch failed
   silently. A shell supplies a `HOME` of its own, which is exactly why
   writing the flag from an arbitrary shell can land out of view.

   The reliable recipe pins one directory for both sides. Either set
   `CLAUDE_CONFIG_DIR` for the desktop process (a user environment variable
   works on Windows), restart the desktop, then write the flags **there** from
   a **freshly opened shell** - a shell started before the change keeps the
   old, unset value; or, if the shell carries a `CLAUDE_CONFIG_DIR` that the
   desktop does not, drop it for the installer run so both sides fall to the
   same `HOME`:

   Git Bash (WorkBuddy ships it at `<configDir>/binaries/PortableGit`), path
   one - the desktop is pinned to one directory. Set the *user* environment
   variable first (Settings > System > Environment Variables, or
   `setx CLAUDE_CONFIG_DIR "C:\Users\<you>\.jiahao"`), restart the desktop,
   then from a shell that was opened AFTER the change:
   `CONFIG="$CLAUDE_CONFIG_DIR"`, `mkdir -p "$CONFIG"`,
   `echo full > "$CONFIG/.jiahao-active"`,
   `echo verifier > "$CONFIG/.jiahao-profile"`. The `setx` line is what makes
   the hooks see the same value; without it the flags sit in a directory the
   desktop never looks at.
   An unreadable `.jiahao-profile` (a directory in its place, or unreadable
   permissions) also resolves to the default `verifier`, with a `[config]:` note
   on stderr.

   Git Bash, path two - no pin. Clear the variable in THIS shell, not just for
   the installer: `env -u CLAUDE_CONFIG_DIR` affects only that child, and the
   `CONFIG` line below would still pick up the parent's value, writing the
   flags somewhere else than the installer just reported.
   `unset CLAUDE_CONFIG_DIR && node scripts/install.js init -y` (it prints the
   absolute file it wrote - that is the directory to compare against), then
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-${QODER_CONFIG_DIR:-${CODEBUDDY_CONFIG_DIR:-${WORKBUDDY_CONFIG_DIR:-${USERPROFILE:-$(node -p 'require("os").homedir()')}}}}}}"; mkdir -p "$CONFIG"`,
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"`.

   PowerShell, path one (after the `setx` above and a desktop restart, in a
   shell opened after it): `$c = $env:CLAUDE_CONFIG_DIR`, then
   `Set-Content "$c\.jiahao-active" full` and
   `Set-Content "$c\.jiahao-profile" verifier`.

   PowerShell, path two - no pin. Do not write to `$HOME` directly: that is
   PowerShell's automatic variable and it is always set, while the hook reads
   the HOME *environment* variable and falls through to
   `WORKBUDDY_CONFIG_DIR` when it is absent. Resolve the same way instead:
   `$c = @($env:CLAUDE_CONFIG_DIR, $env:HOME, $env:QODER_CONFIG_DIR, $env:CODEBUDDY_CONFIG_DIR, $env:WORKBUDDY_CONFIG_DIR, $env:USERPROFILE, $HOME) | Where-Object { $_ } | Select-Object -First 1; New-Item -ItemType Directory -Force -Path $c | Out-Null`, then
   `Set-Content "$c\.jiahao-active" full` and
   `Set-Content "$c\.jiahao-profile" verifier`.

   `generator` instead of `verifier` for advisory-only. Whichever way you go,
   read the installer's printed path and make sure it is the directory the
   hooks resolve - the flag is only read from one place.
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

## Hook map

| Event | Script | Behavior | Observed? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext | no |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder | fired; its output was not read back |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: prints `{decision:"block", reason}` and exits 0; the zero exit is the observed channel | **yes, the channel** on both builds - observed with the probe hook, not with this script; the gate's own judgment was not run live |
| PreToolUse | hooks/jiahao-pretool-guard.js | emits `permissionDecision: "deny"` (verifier profile) for tool calls that target the hook map, the plugin manifest, `jiahao-*` hook files, any `.mcp.json`, or the jiahao state/evidence files - that is the script's output, **not** an observed host denial | fired; neither the deny output nor the host applying it was exercised |
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

## Verified and declared-unverified

**A tier on both builds** - verified twice, once per variant, each on its own
run and its own date:

- **International** (2026-10-31, WorkBuddy AI 5.9.4): a real turn whose last
  assistant message claimed `任务完成，已验证。` continued only after a `Stop`
  hook printed `{decision:"block"}` and exited 0. The host injected the reason
  as `Stop hook feedback: ...` and re-ran the turn.
- **Domestic** (2026-11-01, WorkBuddy 5.9.3, `D:\WorkBuddy`, config root
  `~/.workbuddy`): the same shape on the other build - the false completion
  continued only after the `Stop` hook printed `{decision:"block"}`; the
  probe exits 0 by construction, so the exit status is inferred from the
  probe's implementation rather than captured from the run. The reason
  arrived as `Stop hook feedback: ...`, and the re-entry carried
  `stop_hook_active: true`.

These are two observations, not one inferred from the shared agent CLI
(`@genie/agent-cli 2.165.0` on both). The domestic row came from its own
session, its own settings file, and its own run; the international row was not
substituted for it, and this document does not extend either result to a third
build it has not run. Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

**Verified** (live probes: international 2026-10-31 on 5.9.4, domestic
2026-11-01 on 5.9.3, win32; both runs used a project-scope
`.codebuddy/settings.json` in the workspace and the throwaway hook in
`docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js`; commands, payloads,
and the recorded environments are in
[`workbuddy-hook-probe-2026-10-31.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md)
(international) and
[`workbuddy-cn-hook-probe-2026-11-01.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md)
(domestic); the probe hook stands in for the shipped gate in both runs):

- **Project-scope `.codebuddy/settings.json` hooks are read by the desktop
  session**: international - verified, a `PreToolUse` probe logged every tool
  call; domestic - verified, 4 invocations between 17:10:44Z and 17:11:13Z.
- **`.workbuddy/settings.json` project twin**: international - did not fire
  (the project directory name is `.codebuddy`); domestic - did not fire (the
  probe's log file was never created).
- **A real turn-end block (`Stop` + `decision:"block"` on exit 0)**:
  international - verified, the claim continued only after the decision and
  the reason arrived as `Stop hook feedback`; domestic - verified, same shape
  and same message text, though the exit status itself was not captured on
  this build (the record says so).
- **`stop_hook_active` on re-entry**: international - `true`, and the hook
  passed on it; domestic - `true` and passed on it, with the probe's marker
  deleted first.
- **`SubagentStop` block**: international - refuted as an enforcement point
  (fired once, decision ignored); domestic - same negative result (fired once,
  no re-entry, subagent not continued).
- **Payload identity fields**: international - `hook_event_name`,
  `stop_hook_active`, `last_assistant_message`, `transcript_path`,
  `client:"WorkBuddy"`, `version:"5.9.4"`; domestic - same keys, with
  `version:"5.9.3"`.
- **Hook environment**: international - `WORKBUDDY_APP_NAME`,
  `WORKBUDDY_APP_VERSION`, `WORKBUDDY_DATA_FOLDER_NAME`,
  `CODEBUDDY_HOST=workbuddy-desktop`; no `*_PLUGIN_ROOT`; domestic - same
  shape: `WorkBuddy`, `5.9.3`, `.workbuddy`, config dir `~/.workbuddy`.
- **Offline, pinned by `test/plugin-bundles.test.js`** (structure, run once
  per host row) and `test/workbuddy-adapter.test.js` (the `workbuddy`
  envelope, host detection, and the bundled Stop gate spawned as a subprocess
  from a temp materialization of the generator output): the manifest parses,
  its version and license come from `package.json`, every referenced file is
  emitted (`--check` pins the emitted set to disk), every hook command stays
  inside `${CODEBUDDY_PLUGIN_ROOT}`, and no vendored relative `require()`
  escapes the bundle. The tier claim rests on the live probes above, not on
  these structural tests.

**Declared-unverified / not probed** (the limitations of this record):

- **Exit status on the 5.9.3 run.** The probe assigns exit 0 on every path by
  construction and records its decision before it writes stdout, so the exit
  status in the 5.9.3 run was **not captured by an independent wrapper**. What
  that run observed directly is the host continuing the turn after the logged
  block decision; "exit 0" above is the probe's own contract, not a captured
  return code. Re-running it inside a wrapper is the way to turn that into an
  artifact.
- **Exit 2 as a block channel**: not probed on either build.
- **Plugin-bundle hooks firing**: not probed on either build; the loader code
  path was read.

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else `$HOME`;
  a hook that gets neither takes a config root the host reports
  (`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR` or `WORKBUDDY_CONFIG_DIR`),
  then the OS home):
  `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus its sidecar
  and pairer shadow records), `.jiahao-pretool.jsonl`, and the sentinel state
  and lock files. Nothing inside the repository or this plugin directory is
  written by a hook.
- No network calls: no hook fetches anything, and the bundle has no third-party
  runtime dependency to install.

## Update and uninstall

- Settings tier: replace the **whole copied bundle** - `hooks/` and `src/`
  together - keep the settings entries, and start a new session. Replacing only
  `hooks/` leaves `src/SKILL.md` and the vendored modules at the old version,
  which is the stale half the gate reads.
- Plugin tier: the host's own plugin commands (`codebuddy plugin remove jiahao`
  or the desktop plugin manager). Removing the bundle removes its hook map; the
  settings-tier copy, if you also installed it, is removed by hand.
