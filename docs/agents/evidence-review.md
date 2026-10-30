# Evidence review checklist

What a reviewer checks on any PR that carries acceptance evidence (a live-host
run, a probe log, a release record). Each item names the #80 rework it comes
from, so "we already know this" does not get relitigated as taste.

Review the evidence files, not the prose that summarizes them. The summary is
the claim; the files are the support.

## The checklist

1. **Every number in the prose appears in a cited file.** Open the artifact and
   grep the digits. A continuation count, a token count, a duration, an exit
   code that no file contains is a fabricated number whether or not it is true.
   `codex-loop-guard.txt` has to contain `785` for the README to say 785.

2. **The command, the hook's exit code, and the session id come from the same
   run.** A wrapper log from one session pasted next to host output from another
   is two observations, not one. Same rule for version lines and install logs:
   the `--version` output has to be in the same session directory as the run
   that claims that version. When two runs are cited, name them apart.

3. **Every claim is labeled `verified` or `declared-unverified`, and the label
   matches what was probed.** The default is `declared-unverified`. "The host
   does X" needs a run that shows X; "the host source says X" is a different
   sentence and gets the different label. In #80 the `/hooks` trust-and-restart
   flow was never step-by-step probed, and saying so is what made the rest of
   the record believable.

4. **The artifact version and the ticket version are reconciled out loud.** The
   #80 artifacts report `0.2.0` while documenting v0.3.0 content; the file that
   says this also names who owns the bump. A reader must not have to infer it.

5. **Anything that can loop was bounded, and the bound is named.** An
   always-block hook continued 785 times on Codex. Evidence for a host CLI must
   say which wrapper bounded it (`timeout`, or a Job Object on Windows), and
   when the deadline fired the log has to show the wrapper stopping the CLI, not
   the CLI deciding to stop. A probe that finishes on its own is a valid result
   too: then the evidence shows the host completing, and says the timeout never
   fired. Wrapping the CLI is the owner's global `AGENTS.md` rule, not a check in
   this repository; the reviewer's job is to confirm the evidence states how it
   was bounded.

6. **Isolated state is stated, not implied.** Probes run against an isolated
   `CODEX_HOME` / `COPILOT_HOME` / `CLAUDE_CONFIG_DIR`; the reference says which
   and where. A run that touched user-wide config cannot be reproduced by a
   reviewer without changing their own machine.

7. **Probe scripts are named and described, and they are marked as evidence.**
   Each script says what hook config it needs and what it should observe, and
   the directory says it is not part of any distributed bundle. This is why
   the probes live in
   [`docs/evidence/v0.3.0/probes/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/)
   instead of scripts scattered in `tmp/`. Reuse
   [`codex-hook-wrapper.js`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/codex-hook-wrapper.js)
   for a new hook probe: it runs the real hook, logs the hook's own
   stdin/stdout/stderr/exit as one JSON line, then replays the output and exits
   with the same code.

8. **Every path the prose cites resolves for the reader who gets the tarball.**
   A relative link that only works in the repository is a dead link on npmjs.
   `npm run check:links` covers the packed Markdown; a link to a path that does
   not ship needs an absolute GitHub URL.

9. **The bundle the evidence describes is the bundle that shipped, and the
   record names which commit it was.** `node scripts/build-adapters.js --check`
   proves only that the committed generated files match the generator; it does
   not tie the artifact to the bundle that was probed, so a later change passes
   `--check` while the evidence still describes the older bundle. The evidence
   has to name the commit (or the `release-gate` tree hash) it ran against, and
   the reviewer compares that against the PR's merge point. Evidence for a
   hand-edited adapter is evidence for a file nobody installs.

## Out of scope here (owner actions)

These were part of #80's cost but are not this repository's CI's job. They are
recorded here so they are not silently dropped, and they are deliberately not
turned into checks:

- **Global (user-level) `AGENTS.md`.** Two rules belong there, not here: the
  repository `AGENTS.md` overrides the GitButler default, and a host CLI that
  can loop (Codex continued 785 times) is wrapped in `timeout` or a Job Object
  with the process tree confirmed exited. A repository check cannot see a file
  outside the repository or a process on the reviewer's machine.
- **Evidence directory naming.** Artifacts under `docs/evidence/v0.3.0/` still
  report `0.2.0`, and #81 owns the bump. Naming evidence by ticket number
  instead of version is an option, not a requirement; whichever is chosen, the
  directory and the version it documents have to be reconciled out loud (item
  4 above).
