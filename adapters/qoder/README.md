# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit for Qoder IDE/CLI**. It carries one
rule file generated from `src/SKILL.md`, the same source as the rules version
(`skills/jiahao/SKILL.md`). It registers **no hooks**: there is no
`hooks/hooks.json`, no hook script, and no plugin manifest.

Qoder Desktop (the 0.x workbench) installs the standard skill directory from
the rules version, not this directory. The #106 check on Qoder CN Desktop
0.4.11 found `~/.qoder/rules` was not loaded; the international build was not
probed. See "Qoder Desktop" below.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). No Qoder hook was run for this exit; C tier is the spec-assigned
ceiling, not an observed result. A probe that answers the turn-end question is
a separate ticket.

## Qoder Desktop (0.x workbench, including Qoder CN)

Install the rules version into the host's standard skills directory:

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
- The install is plain text: no hook runs and nothing is enforced.

Do not copy this directory's rule file into a Qoder Desktop rules path. On
Qoder CN the config root is `~/.qoder-cn`; the `~/.qoder` tree belongs to the
other Qoder product line, and the #106 check found `~/.qoder/rules` unloaded
there. The international Desktop was not probed, so no rules path is offered
for it.

## Qoder IDE/CLI

The IDE/CLI line reads project rules from `.qoder/rules/`
(https://docs.qoder.com/zh/user-guide/rules). This directory is that exit:

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder's rules documentation
   says rules without a `paths` or `trigger` selector load eagerly, and
   `alwaysApply: true` is one of the always-on forms (reference:
   https://docs.qoder.com/cli/memory; project-rules page:
   https://docs.qoder.com/zh/user-guide/rules).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The project-level path is the one Qoder's rules documentation names; a
user-level rules directory is not documented there and is not offered here.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no `.jiahao-profile`
switch here because no hook reads that file.

## Verification status

- Structural facts are pinned by tests: this directory contains only the rule
  file and this README, and no hook registration.
- Run A (2026-10-31) verified the install: exit 0, the file at
  `~/.qoder-cn/skills/jiahao/SKILL.md`, and a SHA-256 match with
  `skills/jiahao/SKILL.md`. That is the Desktop path, not this directory. The
  host version 0.4.11 and the fresh-session visibility are #106's Run B, a
  separate run not re-probed here. The install wrote to the operator's real
  `~/.qoder-cn` and overwrote an existing file with identical bytes, so no
  isolated config directory was used.
- Not live-probed: Qoder IDE/CLI rule loading. The behavior in the IDE/CLI
  steps is quoted from Qoder's documentation, not observed here.
- C tier is the probe list's open question, not a claim about what Qoder can do.

## What this exit does not do

- No hook registration, no subprocess, and no evidence file.
- No enforcement: the file is instructions only. This exit registers nothing
  that acts on a turn or a tool call.
- No installer for the IDE/CLI path: copy the file into Qoder's own rules
  directory. Qoder Desktop installs the rules version through the standard
  skills CLI instead.

## Update

- Qoder Desktop: re-run the same `npx skills add` command, then open a new
  session.
- Qoder IDE/CLI: re-copy `rules/jiahao.md` after a release.

The body is generated from `src/SKILL.md`; `node scripts/build-adapters.js --check`
keeps the committed copy identical to the generator output.
