# Qoder plugin and rules

## What this is

This folder has two install paths:

- A Qoder Desktop plugin: `.qoder-plugin/plugin.json`, `hooks/hooks.json`,
  the hook scripts and the files they load, and `src/SKILL.md`. Everything it
  needs is inside the folder.
- `rules/jiahao.md` for the Qoder IDE/CLI rules path. It is a text file and
  registers nothing.

## Install the Desktop plugin

1. Zip this folder so that `.qoder-plugin/` is at the archive root.
2. In the Desktop app's plugin settings, install that archive at user scope.
3. Start a new session. Hook configuration is read at session start; an open
   session does not pick it up.

## Install the rules version (no hooks)

For instructions only:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN
npx skills add Xxx91n/jiahao -g -a qoder -y --copy      # international alias (not tested here)
```

- Qoder CN writes `~/.qoder-cn/skills/jiahao/SKILL.md`. On 2026-10-31 the
  command exited 0 and the installed file's SHA-256 matched
  `skills/jiahao/SKILL.md` (Run A). A fresh session showed the skill visible
  in #106's Run B, a separate run not repeated here. Record:
  `docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md`.
- The international alias is expected to write
  `~/.qoder/skills/jiahao/SKILL.md` by the skills CLI's host table, but
  loading there was not tested.
- This path is plain text. No hook runs and nothing is blocked by it.

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


## Check it works

- The Desktop plugin shows as installed and enabled in the app's plugin
  settings, and a new session starts without a hook error.
- On both Desktop builds, a Stop hook in `.qoder/settings.json` blocked a
  false "done" claim and continued the turn. That was the test hook, not this
  plugin's gate; the plugin path was not watched (see below).
- The rules version: `~/.qoder-cn/skills/jiahao/SKILL.md` exists after the
  `npx skills add` command.

## Qoder IDE/CLI rules

The IDE/CLI reads project rules from `.qoder/rules/`
(https://docs.qoder.com/zh/user-guide/rules). `rules/jiahao.md` is that exit:

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder's rules docs say rules
   without a `paths` or `trigger` selector load eagerly, and
   `alwaysApply: true` is one of the always-on forms.
3. Start a new Qoder session. The file is plain Markdown; no script runs.

The rule file registers nothing: it is not a hook and it is not the Desktop
plugin. The project path is the one Qoder documents. A user-level rules
folder is not documented there and is not offered here.

Do not copy this folder's rule file into a Desktop rules path. Each Desktop
build has its own config root: `~/.qoder-cn` for CN and `~/.qoder` for the
international build (measured 2026-11-01: the international hook process
reports `QODER_CONFIG_DIR=C:\Users\Administrator\.qoder`). #106 found
`~/.qoder/rules` unloaded, but that check ran from a CN session, whose root
is `~/.qoder-cn`; it says nothing about the international build. That
question is still not tested, so no rules path is offered for either Desktop
build.

## Hooks

`hooks/hooks.json` wires four events. The platform name `qoder` is passed to
each script; that tells the script which JSON shape to use.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn when there is no proof |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 5/5/10/3s.

## What a real session showed on Qoder CN Desktop 0.4.11 (#109, 2026-10-31)

A `Stop` hook in the project's `.qoder/settings.json` fired and continued the
turn:

- exit 0 with `{"decision":"block","reason":"..."}` on stdout: the host added
  the reason as a user message and the model ran another turn;
- exit 2 with the reason on stderr: same result;
- the input data is Claude-shaped (`session_id`, `cwd`, `transcript_path`,
  `hook_event_name`, `last_assistant_message`) and the host sets
  `stop_hook_active: true` on every re-entry;
- 6 blocks in a row were honored before the test's own cap ended the run. The
  test cap, not a host limit, ended it; whether the host has a limit above six
  is not known.

Which messages were held: 6 of the 10 blocks (exit-0 channel) were on
"completed and verified" claims with nothing behind them; 1 was the same
claim wrapped in a "this is test data" note; 3 (exit-2 channel) were literals
that said nothing had been verified. The exit-2 run shows the host honors a
block on that channel; it is not proof that a false claim was caught.

Raw calls: `docs/evidence/v0.3.0/qoder-hook-calls.jsonl`. Run record:
`docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md`.

## What a real session showed on Qoder international Desktop 0.4.11 (#113, 2026-11-01)

The other build reproduced the CN result on its own run:

- `Stop` exists and fires; the input has the same Claude-shaped fields, and
  `transcript_path` lands under `~/.qoder/projects/<slug>/`;
- both channels block and continue: exit 0 with the flat decision and exit 2
  with the reason on stderr;
- `stop_hook_active: true` on every re-entry;
- 3 blocks in a row were honored before the test's cap ended the run;
- project-level `.qoder/settings.json` registered the hook, and a
  `.qoder-cn/settings.json` beside it never fired;
- the hook process gets `QODER_PROJECT_DIR`, `QODER_CONFIG_DIR`,
  `USERPROFILE`, `TEMP`, and `TMP`, but no `QODER_SESSION_ID`, no
  `CLAUDE_CONFIG_DIR`, and no `HOME`. This was measured on a project-level
  hook. The plugin path was not watched starting a hook, so whether it
  passes the same variables is not proven.

Messages held: 5 "completed and verified" claims with nothing behind them
(runs 1, 3, 4), and 2 literals that said nothing was verified (run 2's
exit-2 channel and run 5). The 5 were dictated by the test prompt, so they
show the host honors a block on that channel, not that the model wrote the
claim.

Counts agree: 12 hook calls in `docs/evidence/v0.3.0/qoder-intl-hook-calls.jsonl`,
12 `hook.finished` lines, 7 block-feedback records, and 2 per-call stream
records. Run record:
`docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md`.

## Not tested yet

- **Installing this folder as a Desktop plugin.** The host's own bundled
  plugin shows the international build carries a Stop event, but a Stop
  arriving through the plugin path was not watched blocking on either build.
  Every live block above came through `.qoder/settings.json`.
- **The shipped gate on this host.** Every block above came from the test
  script, not from `jiahao-verdict-gate.js`. What is proven is the host
  channel, not this plugin's judgment under Qoder.
- **`additionalContext` reaching the model.** The reply has the shape the
  host's schema asks for; no injection was watched in the #109 session.
- **`SessionEnd` firing and its timeout.** Wired for cleanup, never observed.
- **`${QODER_PLUGIN_ROOT}` in a shell-form command.** The host's own plugin
  uses that name, but the test ran exec-form hooks, so this spelling was not
  watched resolving.
- **A `QODER_SESSION_ID` in the hook process.** It is absent, which is why
  the hook list passes the platform name `qoder` on the command line.
- **Where jiahao's state lands on this host.** The hook process gets neither
  `CLAUDE_CONFIG_DIR` nor `HOME`, so before #116 `src/shared/paths.js` fell
  to its last resort and a hook started by Qoder read and wrote
  `.jiahao-profile` and `.jiahao-evidence` under `<drive>:\tmp` instead of
  the `QODER_CONFIG_DIR` (`~/.qoder-cn` on CN, `~/.qoder` on international)
  the host names. `paths.js` now takes that host root after
  `CLAUDE_CONFIG_DIR` and `HOME`. The spawned-hook tests in
  `test/config-dir.test.js` run the hooks under the environment the #109
  test recorded and read the directory back. **That environment was recorded
  on a project-level hook**; whether the plugin path passes the same
  variables was not observed. The live half (a Qoder session whose evidence
  chain is seen in `~/.qoder-cn`) is not in this repository's records.
- **`PreToolUse` and `SubagentStop`.** Not wired here; neither was exercised.

## Qoder Desktop plugin

Install from the local archive as above. Reinstall a new archive to upgrade,
then start a new session.

## What this folder does not do

- No installer command: the Desktop app installs the archive through its own
  settings, and the IDE/CLI path is a file copy.
- No claim about the IDE/CLI line beyond the text above. Both Desktop builds
  carry their own test; neither borrows the other's.
- No MCP server registration in this folder.

## What we tested

- The folder is complete and the hook list is generated from the same source;
  `Stop` runs the completion check. Pinned by tests.
- The turn-end block was watched twice in real sessions, one per Desktop
  build, both through a project-level `.qoder/settings.json` hook.
- The test scripts are `docs/evidence/v0.3.0/probes/qoder-stop-probe.js`
  (CN) and `docs/evidence/v0.3.0/probes/qoder-intl-probe-hook.js`
  (international). The checklist both runs are reviewed against is
  `docs/agents/evidence-review.md`.
- Not tested: this folder installed as a Desktop plugin, and Qoder IDE/CLI
  rule loading.

## Update

- Desktop plugin: reinstall the archive built from this folder, then start a
  new session.
- Rules version: run the same `npx skills add` command, then start a new
  session.
- IDE/CLI: copy `rules/jiahao.md` again after a release.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), and the
state and lock files used for cleanup. No hook writes inside the repository
or this plugin folder.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


The body is generated from `src/SKILL.md`; `node scripts/build-adapters.js --check`
keeps the committed copy identical to the generator output.
