# ZCode probe details (2026-10-31, ZCode 3.16.2 desktop / CLI runtime 0.17.0, win32)

Ticket #108. The probe ran in the operator's real ZCode Desktop session in the
jiahao repository workspace, with a throwaway **workspace-scope** hook config
(`.zcode/config.json`, untracked, removed after the probe) pointing at the
wrapper scripts in `probes/`. The user-wide `~/.zcode/cli/config.json` was
never edited by the probe; the plugin-install runs backed it up, and the
post-probe diff restores are recorded in `zcode-install.txt`. The real-gate
run executed the bundled gate under an isolated `CLAUDE_CONFIG_DIR`, so no
user-wide jiahao flag or evidence state was involved.

Artifact version: the working tree reports package `0.3.0`; the evidence
directory stays `v0.3.0` (the #106 precedent) and the version bump is owned by
the next release ticket. The probed bundle is the one committed on the #108
branch, named per run: the real-gate run executed the gate bytes committed in
`0734a288` (vendored copies byte-identical to the sources). The install-path
runs ran between the two commits, against a working tree whose hook map,
manifest, and gate bytes are the same in both `0734a288` and `71d333af` (only
the bundle README text and the marketplace shelf changed between them); the
three-file cache diff recorded in `zcode-install.txt` compares the installed
cache with those committed bytes.

## Route note: headless CLI could not be used

`node zcode.cjs -p` (the CLI runtime inside the desktop install) was tried
twice for an isolated probe session, wrapped in `timeout 180` both times; both
runs hit the timeout bound while the model client retried against the bundled
default provider `http://127.0.0.1:20128/v1/chat/completions` (ECONNREFUSED -
that local proxy is the desktop's, and nothing listens on it standalone; the
desktop session itself connects directly to `https://zcode.z.ai/...`). The
live desktop session was used instead. This is a route limitation of the
probe environment, not an observed host behavior claim.

## Hook configuration is read at session start

A workspace `.zcode/config.json` added mid-session did not fire. After a
restart the client surfaced both registered hooks (UserPromptSubmit and Stop)
and they fired from then on. Every later behavior switch in the probe used a
mode file read by the wrapper at fire time, so the registered command never
changed mid-session.

## Payloads (UserPromptSubmit and Stop fires)

`zcode-stop-fires.jsonl` holds every fire (five Stop fires, one
UserPromptSubmit fire). Both events carry both spellings of every identity
field: `session_id`/`sessionId`, `hook_event_name`/`hookEventName`,
`transcript_path`/`transcriptPath`, `stop_hook_active`/`stopHookActive`. The
Stop payload also carries `responsePreview`/`responseText`,
`last_assistant_message`, `toolCallCount`, `cwd`, `mode`/`permission_mode`,
`timestamp`, `traceId`, `turnId`, and a fresh per-fire temp
`transcript_path`. The hook subprocess environment carries both families
(`CLAUDE_SESSION_ID`, `CLAUDE_PROJECT_DIR` alongside `ZCODE_SESSION_ID`,
`ZCODE_PROJECT_DIR`, `ZCODE_APP_VERSION`, ...), which is what
`detectHost()`'s `ZCODE_SESSION_ID` probe keys on for config-tier installs.

## Stop channels (fires #1-#4)

| Fire | Wrapper mode | Channel | Observed |
| --- | --- | --- | --- |
| #1 | json-once | exit 0 + `{decision:"block", reason}` | turn blocked; the reason returned as the next turn's context |
| #2 | exit2 | exit 2, no output | turn blocked with the host's generic "Hook blocked execution" (no reason) |
| #3 | cap | exit 0 + block every time | blocked |
| #4 | cap | exit 0 + block every time | blocked; the turn then ended without a further continuation |

- The decision field on exit 0 is the channel the gate uses: it carries the
  reason. Exit 2 also blocks on this build, but reason-less.
- `stop_hook_active` was `false` on original stops (#1, and the real-gate
  fire below) and `true` on every post-block continuation (#2-#4).
- Cap: three consecutive block continuations were honored; the fourth
  consecutive block was followed by the turn ending without another
  continuation. The session user was present at that boundary, so the
  observation is recorded as seen rather than as an unconditional host rule.

## Real gate, real turn-end block (the tier-A observation)

With the wrapper in `realgate` mode, the turn end was judged by the real
bundled gate - `node <bundle>/hooks/jiahao-verdict-gate.js zcode`, spawned by
the wrapper with `CLAUDE_CONFIG_DIR` pointed at an isolated directory holding
`.jiahao-active` (`full`) and `.jiahao-profile` (`verifier`). The evidence
chain there was empty, so the verifier Case A applied. The wrapper recorded
(`zcode-stop-fires.jsonl`, `realgate-result` entry):

- gate exit code: `0`
- gate stdout: `{"decision":"block","reason":"Verification has no evidence: no
  test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3
  of the verification ladder first. Evidence chain empty, unparseable, or
  attributable only to other sessions."}`
- gate stderr: empty

The host blocked the turn and the reason arrived as the next turn's context
(fire #5, `stop_hook_active: false`, session
`session_cdf996954ae464b500d704e9f60f7b1d` - the same session as the wrapper
log). The continuation then ran the verification ladder
(`build-adapters --check`, `check-drift`, `check-doc-links`,
`check-whitespace`, four jest suites - 117 tests passing) and the following
stop passed.

## Plugin install path (CLI-level, `zcode-install.txt`)

- `zcode plugins validate <bundle-dir>`: exit 0, "Plugin manifest is valid".
- `zcode plugins install <bundle-dir>`: **refused** ("Plugin not found in any
  marketplace") - the install command only resolves `plugin@marketplace`.
- The bundle therefore carries its own marketplace shelf (`marketplace.json`,
  `source: "."`): `zcode plugins marketplace add <bundle-dir>` +
  `zcode plugins install jiahao@jiahao-zcode` installed the bundle
  `[enabled]`, `plugins list` reports `hooks: 4`, and the cached
  `hooks/hooks.json`, `.zcode-plugin/plugin.json`, and
  `hooks/jiahao-verdict-gate.js` are byte-identical to the generated bundle.
- Adding the **repository root** as the marketplace instead resolved
  `.claude-plugin/marketplace.json` and installed the **Claude Code** bundle;
  with both files present the host preferred the compat file. A seven-event
  Claude-shaped map was parsed down to `hooks: 4` - unsupported events
  (`SubagentStart`, `SubagentStop`, `SessionEnd`) are dropped silently.
- Uninstall needed `--force` in the non-interactive shell;
  `plugins marketplace remove` cleaned the shelf. The plugin's hooks firing
  in a restarted session was not probed: that would write the user-wide
  `.jiahao-active` flag and gate the operator's own sessions, so it is
  recorded declared-unverified instead.

## What this probe does not claim

- No claim about `SessionStart` `additionalContext` injection (the envelope
  follows the documented strict schema; the injection was not observed).
- No claim about plugin-spawned hooks in a restarted session (see above).
- No claim about `zcode plugins update` (not run).
- The headless CLI route failure is a probe-environment note, not a host
  behavior claim.
