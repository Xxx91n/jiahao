# WorkBuddy plugin

## What this is

This folder is a complete plugin for WorkBuddy. It holds
`.workbuddy-plugin/plugin.json`, `hooks/hooks.json`, every file the hooks
load, `src/SKILL.md`, and the identity file the gate reads. It has no
third-party runtime dependency.

WorkBuddy is not a CodeBuddy alias, even though both use the same agent CLI
(`@genie/agent-cli 2.165.0`). Two builds ship under two names, two endpoints,
and two config roots. Each was identified from its own `product.json`, not
from docs.

| Variant | Product name | Build | Install folder | Config root | Endpoint |
| --- | --- | --- | --- | --- | --- |
| International | `WorkBuddy AI` (`isOversea: true`) | 5.9.4 | `D:\Workbuddy.ai\WorkBuddyAI` | `~/.workbuddy-ai` | `https://www.workbuddy.ai` |
| Domestic | `WorkBuddy` | 5.9.3 | `D:\WorkBuddy` | `~/.workbuddy` | `https://www.workbuddy.cn` |

## Install: the settings file (the tested path)

WorkBuddy's desktop session reads `hooks` from
`<configDir>/settings.json` (`~/.workbuddy-ai/settings.json` on
international, `~/.workbuddy/settings.json` on domestic). It also reads a
**project-level** `.codebuddy/settings.json` in the working folder - that is
the file the 2026-10-31 test used. The folder name is `.codebuddy`, not `.workbuddy`;
a twin written to `.workbuddy/settings.json` at the same time did not fire.

1. Copy the **whole folder** to a stable path: `hooks/`, `src/`, and
   `src/SKILL.md` together. The hook scripts load `../src/*` (the gate reads
   its helper modules from there), so a copy of `hooks/` alone fails before
   it can inject or decide anything.
2. Merge the events from `hooks/hooks.json` into the settings file and
   replace `${CODEBUDDY_PLUGIN_ROOT}` with the path you copied to. That value
   is a JSON string: on Windows use `/` (`D:/Workbuddy.ai/jiahao`) or escape
   the backslashes (`D:\\Workbuddy.ai\\jiahao`), or the settings file stops
   parsing and no hook loads.
3. Add the platform name to every command, as the shipped list does
   (`... jiahao-verdict-gate.js workbuddy`). A settings hook gets no plugin
   root, and the environment carries both `CODEBUDDY_*` and `WORKBUDDY_*`
   variables, so the argument is what identifies the host.
4. Start a new session after changing settings. On 5.9.4 the hook list was
   read per turn (an edit during a turn applied at the next turn end), and
   one turn end in three produced no call. The 5.9.3 timing is in its record,
   not generalized here. A mid-session edit is not something to rely on.

## Set the profile

The hooks get the profile from one file, `.jiahao-profile`, in the config
directory. Write `verifier` to block a completion claim with no evidence,
`generator` to only remind. If the file is missing, the hooks use `verifier`.

The config directory is the first one of these that the process has:
`CLAUDE_CONFIG_DIR`, then `HOME`, then a root the host reports
(`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`, `WORKBUDDY_CONFIG_DIR`), then
`USERPROFILE`, then the OS home. It never falls back to `/tmp`.

POSIX shell:

```bash
CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-${QODER_CONFIG_DIR:-${CODEBUDDY_CONFIG_DIR:-${WORKBUDDY_CONFIG_DIR:-${USERPROFILE:-$(node -p 'require("os").homedir()')}}}}}}"; mkdir -p "$CONFIG"
echo full > "$CONFIG/.jiahao-active"
echo verifier > "$CONFIG/.jiahao-profile"
```

PowerShell:

```powershell
$c = @($env:CLAUDE_CONFIG_DIR, $env:HOME, $env:QODER_CONFIG_DIR, $env:CODEBUDDY_CONFIG_DIR, $env:WORKBUDDY_CONFIG_DIR, $env:USERPROFILE, $HOME) | Where-Object { $_ } | Select-Object -First 1; New-Item -ItemType Directory -Force -Path $c | Out-Null
Set-Content -NoNewline -Path "$c/.jiahao-active" -Value full
Set-Content -NoNewline -Path "$c/.jiahao-profile" -Value verifier
```

Use `generator` in place of `verifier` for reminders only. Start a new session
after you change the file. All agents that use the same config directory share
this file; give each one its own directory when they need different profiles.

If `.jiahao-profile` cannot be read (a folder sits there, or the permissions
are wrong), the hooks use `verifier` and print a `[config]:` note on stderr.


### WorkBuddy: pin one directory

The desktop's hook process and the shell you install from can disagree about
the config directory. The 2026-10-31 and 2026-11-01 test sessions logged
`CLAUDE_CONFIG_DIR` absent and both builder config-dir variables set to that
build's own root; neither record logs `HOME`. The owner's 2026-11-01 run
(#116) saw the desktop's guard process with `CLAUDE_CONFIG_DIR` unset and
`HOME` set, while the shell that ran the installer carried
`CLAUDE_CONFIG_DIR` from another agent. The installer wrote the flag where
the hook does not read it, and a profile switch failed without a message.

Two reliable ways:

- **Pin one directory for both sides.** Set the user environment variable
  `CLAUDE_CONFIG_DIR` (Settings > System > Environment Variables, or
  `setx CLAUDE_CONFIG_DIR "C:\Users\<you>\.jiahao"`), restart the desktop,
  then write the flags from a shell opened **after** the change:
  `CONFIG="$CLAUDE_CONFIG_DIR"`, `mkdir -p "$CONFIG"`,
  `echo full > "$CONFIG/.jiahao-active"`,
  `echo verifier > "$CONFIG/.jiahao-profile"`.
- **Pin nothing.** Clear the variable in this shell, not just for the
  installer: `env -u CLAUDE_CONFIG_DIR` affects only that child, and the
  `CONFIG` line would still pick up the parent's value.
  `unset CLAUDE_CONFIG_DIR && node scripts/install.js init -y` prints the
  absolute file it wrote - compare that with the directory the hooks resolve
  (see the profile section above). After that, run the profile recipe from
  that section in a clean shell.

WorkBuddy ships Git Bash at `<configDir>/binaries/PortableGit`, so the POSIX
recipe above works. In PowerShell, after the `setx` and a desktop restart,
use `$c = $env:CLAUDE_CONFIG_DIR` and `Set-Content "$c\.jiahao-active" full`
/ `Set-Content "$c\.jiahao-profile" verifier`. For the no-pin path, do not
write to `$HOME` directly: PowerShell always sets `$HOME`, while the hook
reads the HOME environment variable and falls to `WORKBUDDY_CONFIG_DIR` when
it is absent. Use the shared PowerShell recipe above.

`generator` instead of `verifier` gives reminders only. Whichever way you
go, compare the installer's printed path with the directory the hooks
resolve; the flag is read from one place.

## Check it works

- Start a new session after the settings change. On both builds, a `Stop`
  hook registered in `.codebuddy/settings.json` fired at the turn end.
- With `verifier`, a Stop hook in `.codebuddy/settings.json` blocked a false
  "done" claim and continued the turn. Both builds were tested on their own
  run; the hook was the test hook, not this plugin's gate.
- If nothing fires, check that the copied folder contains `hooks/` and `src/`
  and that the settings entries point at that path.

## Install: as a plugin (not tested)

1. `codebuddy plugin add <path-to-this-dir>` with the CLI bundled with
   WorkBuddy (`<install dir>/resources/app.asar.unpacked/cli/bin/codebuddy`),
   or use the desktop plugin manager. The loader accepts `.workbuddy-plugin`,
   `.codebuddy-plugin`, and `.claude-plugin`; this folder uses the first.
2. Turn the plugin on. `defaultEnabled: false` is on purpose: turning it on
   installs five hook points at once.
3. Set the profile as above.

This path was read from the host's loader code, not watched. No plugin hook
was seen firing on 5.9.4. The settings file above is the path with evidence.

## Hooks

| Event | Script | What it does | Watched? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text | no |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder | fired; output not read back |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with `{"decision":"block"}` and exit 0; the zero exit is the observed channel | **yes, the channel** on both builds - with the test hook, not this script; the gate's own judgment was not run live |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, `jiahao-*` hook files, any `.mcp.json`, or jiahao state/evidence files - that is the script's output, **not** an observed host denial | fired; neither the deny output nor the host applying it was exercised |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files | no |

Timeouts: 5/5/10/5/3s. The host's own per-hook cap was not measured.

`SubagentStop` is deliberately **not** wired. It fires with the same input
shape (`agent_id`, `agent_type`, `last_assistant_message`), but the
2026-10-31 test answered it with `{"decision":"block"}` on exit 0 and the
subagent was **not** continued: one call, no `stop_hook_active` re-entry. The
2026-11-01 domestic run repeated that result on 5.9.3. A gate there would
print a decision the host ignores, so the folder stays on the event watched
working on both builds.

## What is different on this host

- The manifest is `.workbuddy-plugin/plugin.json`, the product-native folder
  the shared loader scans.
- Commands expand `${CODEBUDDY_PLUGIN_ROOT}`, the variable the shared loader
  sets for plugin hooks (read from the bundled CLI; not seen in a run), and
  pass the platform name `workbuddy` as the first argument.
- The block channel is the decision field on a zero exit. `Stop` honors
  `{"decision":"block","reason":"..."}` on stdout; the gate exits 0. Exit 2
  was not tested here.
- Both desktop builds set `CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1`. It
  rejects `prompt`, `agent`, and `http` hook types; `command` hooks - the
  only kind this folder ships - still load.

## What was tested

**Both builds can block a turn before it ends.** Each build was tested on its
own run and date.

- **International** (2026-10-31, WorkBuddy AI 5.9.4): a real turn whose last
  assistant message said `任务完成，已验证。` continued only after a `Stop`
  hook printed `{"decision":"block"}` and exited 0. The host added the reason
  as `Stop hook feedback: ...` and ran the turn again.
- **Domestic** (2026-11-01, WorkBuddy 5.9.3, `D:\WorkBuddy`, config root
  `~/.workbuddy`): the same shape on the other build - the false claim
  continued only after the `Stop` hook printed `{"decision":"block"}`; the
  test exits 0 by construction, so the exit status is inferred from how the
  test is written, not captured from the run. The reason arrived as
  `Stop hook feedback: ...`, and the re-entry carried
  `stop_hook_active: true`.

These are two observations, not one inferred from the shared agent CLI
(`@genie/agent-cli 2.165.0` on both). The domestic row came from its own
session, its own settings file, and its own run; the international row was
not used for it, and this document does not extend either result to a third
build it has not run. Evidence: `docs/evidence/v0.3.0/`.

- Two runs used a project-level `.codebuddy/settings.json` in the workspace
  and the throwaway hook in
  `docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js`.
- Project-scope `.codebuddy/settings.json` hooks are read by the desktop
  session: international - a `PreToolUse` test logged every tool call;
  domestic - 4 calls between 17:10:44Z and 17:11:13Z.
- `.workbuddy/settings.json` project twin: international - did not fire
  (the project folder name is `.codebuddy`); domestic - did not fire (the
  test's log file was never created).
- A real turn-end block (`Stop` + decision on exit 0): international -
  verified, the claim continued only after the decision and the reason
  arrived as `Stop hook feedback`; domestic - verified, same shape and same
  message text, though the exit status was not captured on this build (the
  record says so).
- `stop_hook_active` on re-entry: international - `true`, and the hook
  passed on it; domestic - `true` and passed on it, with the test's marker
  deleted first.
- `SubagentStop` block: international - fired once and the decision was
  ignored; domestic - same negative result (fired once, no re-entry,
  subagent not continued).
- Input identity fields: international - `hook_event_name`,
  `stop_hook_active`, `last_assistant_message`, `transcript_path`,
  `client:"WorkBuddy"`, `version:"5.9.4"`; domestic - same keys, with
  `version:"5.9.3"`.
- Hook environment: international - `WORKBUDDY_APP_NAME`,
  `WORKBUDDY_APP_VERSION`, `WORKBUDDY_DATA_FOLDER_NAME`,
  `CODEBUDDY_HOST=workbuddy-desktop`; no `*_PLUGIN_ROOT`; domestic - same
  shape: `WorkBuddy`, `5.9.3`, `.workbuddy`, config dir `~/.workbuddy`.
- Offline checks in `test/plugin-bundles.test.js` and
  `test/workbuddy-adapter.test.js`: the manifest parses, the version and
  license come from `package.json`, every referenced file is generated,
  every hook command stays inside `${CODEBUDDY_PLUGIN_ROOT}`, and no
  relative `require()` points outside the folder.

Records:
`docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md` (international)
and `docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md` (domestic).
The test hook stands in for the shipped gate in both runs.

Not tested yet:

- **Exit status on the 5.9.3 run.** The test sets exit 0 on every path and
  records its decision before it writes stdout, so an independent wrapper did
  not capture the exit status. What that run saw is the host continuing after
  the logged decision; "exit 0" is the test's own behavior, not a captured
  return code. Run it inside a wrapper to turn that into an artifact.
- **Exit 2 as a block channel.** Not tested on either build.
- **Plugin hooks firing.** Not tested on either build; only the loader code
  path was read.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), `.jiahao-pretool.jsonl`, and the
state and lock files used for cleanup. No hook writes inside the repository
or this plugin folder.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


## Update and uninstall

- Settings file: replace the **whole copied bundle** - `hooks/` and `src/`
  together - keep the settings entries, and start a new session. Replacing
  only `hooks/` leaves `src/SKILL.md` and the loaded modules at the old
  version, which is the stale half the gate reads.
- As a plugin: use the host's own plugin commands (`codebuddy plugin remove
  jiahao` or the desktop plugin manager). Removing the folder removes its
  hook list; the settings-file copy, if you also installed it, is removed by
  hand.
