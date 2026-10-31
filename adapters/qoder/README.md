# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit for Qoder IDE/CLI**. It carries one
rule file generated from `src/SKILL.md`, the same source as the rules version
(`skills/jiahao/SKILL.md`). It registers **no hooks**: there is no
`hooks/hooks.json`, no hook script, and no plugin manifest.

Qoder Desktop (the 0.x workbench, including Qoder CN) does not load this
directory or the IDE rules path. It reads the standard skill directory installed
by the rules version; see "Qoder Desktop" below.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). No Qoder hook was run for this exit; C tier is the spec-assigned
ceiling, not an observed result. A probe that answers the turn-end question is
a separate ticket.

## Qoder Desktop (0.x workbench, including Qoder CN)

Install the rules version into the host's standard skills directory:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN
npx skills add Xxx91n/jiahao -g -a qoder -y --copy      # international Qoder Desktop
```

- Qoder CN lands `~/.qoder-cn/skills/jiahao/SKILL.md`. This was live-checked
  on 2026-10-31 with Qoder CN Desktop 0.4.11: exit 0; the installed file's
  SHA-256 was `1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9`,
  the same as `git show v0.3.0:skills/jiahao/SKILL.md`; and a fresh session
  answered that the `jiahao` skill was present, that its description contains
  "No receipt, no claim", and that it lives under `~/.qoder-cn/skills/jiahao`.
- The international Desktop alias writes `~/.qoder/skills/jiahao/SKILL.md`.
  The layout is the same, but this path was not live-probed here; treat its
  loading as declared-unverified.
- The install is plain text: no hook runs and nothing is enforced.

Do not copy this directory's rule file into a Qoder Desktop rules path. On
Qoder CN the config root is `~/.qoder-cn`; the `~/.qoder` tree belongs to the
other Qoder product line, and Desktop does not read its `rules/` directory.

## Qoder IDE/CLI (1.x product)

The IDE/CLI line reads project rules from `.qoder/rules/`
(https://docs.qoder.com/zh/user-guide/rules). This directory is that exit:

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder's rules documentation
   says rules without a `paths` or `trigger` selector load eagerly, and
   `alwaysApply: true` is one of the always-on forms.
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no `.jiahao-profile`
switch here because no hook reads that file.

## Verification status

- Structural facts are pinned by tests: this directory contains only the rule
  file and this README, and no hook registration.
- Live-checked for Qoder Desktop (Qoder CN Desktop 0.4.11, 2026-10-31): the
  rules version installed through `npx skills add ... -a qoder-cn` and loaded
  in a fresh session. That is the Desktop path, not this directory.
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
