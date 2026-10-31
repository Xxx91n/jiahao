# Qoder Adapter (self-contained plugin; A tier on Qoder CN Desktop)

This directory is a **self-contained Qoder Desktop plugin**: the manifest
(`.qoder-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; nothing reads from the repository root and
there is no third-party runtime dependency. The same directory also carries
`rules/jiahao.md` for the **Qoder IDE/CLI** rules path: it travels in the
archive because one directory holds both exits, and it registers nothing.

## Capability tier

| Surface | Tier | Basis |
|---|---|---|
| Qoder CN Desktop 0.4.11 | A | turn-end block watched in a live session on 2026-10-31 (#109) |
| Qoder international Desktop 0.4.11 | C | same worker runtime, but no turn was ever watched blocking there, so it keeps the C-tier ceiling #109 assigned it |
| Qoder IDE/CLI | C | rules text only; no hook was run for this exit |

A tier means the host can be stopped before a turn ends. The claim is stated only
for the build that was measured; the international Desktop and the IDE/CLI line
stay C until their own probes report. #109 says so explicitly: one variant's
result may not stand in for another's.

This directory supersedes the #79 rule that no hook registration may appear in
it. #79 shipped the Qoder exit as rules-only *because* the turn-end question was
open; #109 answered it for Qoder CN Desktop, so the registration is now the
point of the directory and the no-registration assertion was replaced (not
deleted) by tests that pin exactly which events are wired.

## The hook map this bundle ships

Wiring order, script, and per-event timeout, so a reader can compare the table
with `hooks/hooks.json`: SessionStart runs `jiahao-activate.js` (5s),
UserPromptSubmit runs `jiahao-mode-tracker.js` (5s), Stop runs
`jiahao-verdict-gate.js` (10s), and SessionEnd runs `jiahao-sweep.js` (3s) -
the timeouts are 5/5/10/3s. The sweep is wired for sentinel reclamation (leaked
`<config>/.jiahao-sentinel.*` files have no other collector); its firing on this
host was not observed.

## What was observed on Qoder CN Desktop 0.4.11 (#109, 2026-10-31)

A `Stop` hook registered in the project's `.qoder/settings.json` fired in a
real session and continued the turn:

- exit 0 with a flat `{"decision":"block","reason":"..."}` on stdout: the host
  injected the reason as a meta user message and the model ran another turn;
- exit 2 with the reason on stderr: same outcome;
- the payload is Claude-shaped (`session_id`, `cwd`, `transcript_path`,
  `hook_event_name`, `last_assistant_message`) and the host sets
  `stop_hook_active: true` on every re-entry;
- 6 consecutive blocks were honored before the probe's own cap ended the run, so
  no host-side consecutive-block limit was reached.

Raw calls are in
[`qoder-hook-calls.jsonl`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-calls.jsonl)
and the run record is
[`qoder-hook-probe-2026-10-31.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md).

## Declared-unverified on this host

- **The plugin registration surface.** This bundle is shaped like the host's own
  bundled `qoder-context` plugin (`.qoder-plugin/plugin.json` plus an
  auto-discovered `hooks/hooks.json`), and that plugin's `SessionStart` hook was
  watched firing with `exit_code=0`. A `Stop` hook arriving through the *plugin*
  path has not been watched blocking a turn: the live block came through the
  settings path. Installing this directory as a plugin is expected to work, not
  proven to work.
- **The shipped gate on this host.** The two blocks were produced by the probe
  script, not by `jiahao-verdict-gate.js`. What is verified is the host channel
  (a `Stop` hook can block and continue a turn here), not this bundle's verdict
  logic running under Qoder.
- **Whether an `additionalContext` injection reaches the model on Qoder.** The
  envelope is the shape the host's schema asks for; no injection was watched in
  the #109 session.
- **`SessionEnd` firing and its timeout budget.** Wired for reclamation, never
  observed on this host.
- **`${QODER_PLUGIN_ROOT}` in a shell-form command.** The host's own plugin uses
  that placeholder, but the probe ran exec-form hooks (`command` + `args`), so
  this exact spelling has not been watched resolving.
- **Whether a hook subprocess gets `QODER_SESSION_ID`.** It does not: the probe
  saw `QODER_PROJECT_DIR`, `QODER_CONFIG_DIR`, `USERPROFILE`, `TEMP` and `TMP`.
  That is why the hook map passes the platform name `qoder` on the command line.
- **Where jiahao's own state lands on this host - measured, and broken.** The
  hook subprocess gets neither `CLAUDE_CONFIG_DIR` nor `HOME`, and
  `src/shared/paths.js` resolves its config directory as
  `CLAUDE_CONFIG_DIR || HOME || '/tmp'`, so a hook spawned by Qoder reads and
  writes `.jiahao-profile` and `.jiahao-evidence` under `<drive>:\tmp` instead of
  the `QODER_CONFIG_DIR` (`~/.qoder-cn`) the host does name. The turn-end block
  above is unaffected - it was measured through the hook's own stdout/stderr -
  but the shipped gate's profile read and evidence chain are. Repairing that is a
  shared-path change reaching every host, tracked as #116 and deliberately not
  made inside this exit; until it lands, treat the plugin's state location on
  Qoder as wrong, not untested.
- **Which root registers hooks is only known for the CN build.** Project-scope
  `.qoder/settings.json` fired and a `.qoder-cn/settings.json` placed beside it
  did not; the international build's root was never tested, so one dialect row
  cannot speak for it.
- **`PreToolUse` and `SubagentStop`.** Not wired here; neither was exercised on
  this host.

## Qoder Desktop - plugin (enforcement)

Qoder Desktop installs a plugin from a local archive at user scope: package this
directory into a `.zip` whose root holds `.qoder-plugin/`, and install it from
the Desktop app's plugin settings. Then start a new session: hook configuration
is read at session start, and a session already open does not pick it up.

The event list, scripts, and timeouts are in "The hook map this bundle ships"
above - stated once, so the two cannot drift apart. What is measured is the
host's `Stop` channel (table above); what is not, is this bundle's own path to
it (Declared-unverified) - so that section describes wiring, not a witnessed
block by these scripts.

## Qoder Desktop - rules version (no enforcement)

For instructions only, with no hook, install the rules version's standard skill
directory:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN
npx skills add Xxx91n/jiahao -g -a qoder -y --copy      # international alias (not live-probed here)
```

- Qoder CN lands `~/.qoder-cn/skills/jiahao/SKILL.md`. On 2026-10-31 the
  documented command exited 0 and the installed file's SHA-256 matched
  `skills/jiahao/SKILL.md` (Run A). A fresh session reported the skill visible
  in #106's Run B, a separate run not re-probed here. The run record is
  [qoder-desktop-install-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md).
- The international alias writes `~/.qoder/skills/jiahao/SKILL.md` according to
  the skills CLI's host matrix; loading there was not live-probed here, so it
  stays declared-unverified.
- This path is plain text: no hook runs and nothing is enforced by it.

Do not copy this directory's rule file into a Qoder Desktop rules path. On
Qoder CN the config root is `~/.qoder-cn`; the `~/.qoder` tree belongs to the
other Qoder product line, and the #106 check found `~/.qoder/rules` unloaded
there. The international Desktop was not probed, so no rules path is offered
for it.

## Qoder IDE/CLI

The IDE/CLI line reads project rules from `.qoder/rules/`
(https://docs.qoder.com/zh/user-guide/rules). `rules/jiahao.md` is that exit:

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder's rules documentation
   says rules without a `paths` or `trigger` selector load eagerly, and
   `alwaysApply: true` is one of the always-on forms (reference:
   https://docs.qoder.com/cli/memory; project-rules page:
   https://docs.qoder.com/zh/user-guide/rules).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule file registers nothing: it is not a hook and it is not the Desktop
plugin. The project-level path is the one Qoder's rules documentation names; a
user-level rules directory is not documented there and is not offered here.

The rule body carries both profiles (generator and verifier), exactly like the
rules version.

## Verification status

- Structural facts are pinned by tests: the bundle is self-contained, the
  manifest and hook map come from this row, and `Stop` runs the verdict gate.
- The turn-end block is a live observation on Qoder CN Desktop 0.4.11 through a
  project-scope `.qoder/settings.json` hook (#109). The probe ran against the
  operator's real checkout rather than an isolated config home; every block was
  gated on a marker string so no other session could be affected, and the hook's
  own cap bounded the loop.
- The script that recorded those calls is
  [`probes/qoder-stop-probe.js`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/qoder-stop-probe.js),
  and the checklist the run is reviewed against is
  [`docs/agents/evidence-review.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
- Not live-probed: this directory installed as a Desktop plugin, the international
  Desktop build, and Qoder IDE/CLI rule loading. The IDE/CLI steps are quoted from
  Qoder's documentation, not observed here.

## What this exit does not do

- No installer command: the Desktop app installs the plugin from a local archive
  through its own settings, and the IDE/CLI path is a file copy.
- No claim about the international Desktop or the IDE/CLI line beyond the tier
  table above.
- No MCP server registration in this bundle.

## Update

- Qoder Desktop plugin: reinstall the archive built from this directory, then
  open a new session.
- Qoder Desktop rules version: re-run the same `npx skills add` command, then
  open a new session.
- Qoder IDE/CLI: re-copy `rules/jiahao.md` after a release.

The body is generated from `src/SKILL.md`; `node scripts/build-adapters.js --check`
keeps the committed copy identical to the generator output.
