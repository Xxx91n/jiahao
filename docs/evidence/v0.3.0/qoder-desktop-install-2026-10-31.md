# Qoder Desktop skill install (#106)

Date: 2026-10-31. Host: Windows 10.0.26100 (win32 x64). Run A used only the
`skills` CLI and did not launch the Qoder host; the host version 0.4.11 below is
reported by Run B (#106), not read by Run A.

Artifact: the released rules version from GitHub `main` at `4c134c5b`
(`git describe --tags` reports `v0.3.0-5-g4c134c5b`; the `v0.3.0` tag itself is
`587e4394`). `skills/jiahao/SKILL.md` is byte-identical at the tag, that commit,
and this branch (SHA-256 below). Ticket #106 is a post-release documentation
correction; this branch does not change that file.

## Run A: install (this window)

The documented command, run verbatim:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy
# exit 0
```

Observed output:

```text
◇  Installation complete
◇  Installed 1 skill
  ✓ jiahao (copied)
    → ~\.qoder-cn\skills\jiahao
```

Hashes, read in this session:

```text
# before Run A (immediately before the install)
~/.qoder-cn/skills/jiahao/SKILL.md  1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9
# after Run A
~/.qoder-cn/skills/jiahao/SKILL.md  1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9
skills/jiahao/SKILL.md              1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9
```

Labels:

- **verified**: exit 0; the file exists at the CN path; its SHA-256 equals the
  repository file both before and after the install.
- The run was **not isolated**: it wrote to the operator's real `~/.qoder-cn`
  (a global install). The pre-install file already had the same SHA-256, so the
  overwrite was byte-identical. A reviewer repeating it changes their own
  machine; the content is idempotent for this artifact.
- No session id applies: the install CLI exits before a host session starts.

## Run B: fresh-session check (#106, 2026-10-31)

The ticket records a fresh, independent Qoder CN Desktop 0.4.11 session with
three read-only questions: the skill exists, its description contains
"No receipt, no claim", and it lives under `~/.qoder-cn/skills/jiahao`. That
observation is **reported in Run B**, a separate run; #106 does not carry a
session id and this window did not repeat it. The same check found that
`~/.qoder/rules` was not loaded; that is the only rules path it tested.

## Wrong-path cleanup

On 2026-10-31, after the install run:

```text
$ ls -la ~/.qoder/rules
ls: cannot access '/c/Users/Administrator/.qoder/rules': No such file or directory
$ test -e ~/.qoder/rules/jiahao.md
absent
```

**verified**: the previously reported wrong-path file and its directory are
gone on this machine.

## International alias

`-a qoder` is in the skills CLI's host matrix and writes `~/.qoder/skills/`.
Those landing and loading claims are **declared-unverified** here: no
international Desktop session was run, and this machine's `~/.qoder` belongs to
the other Qoder product line.

## Reproduction

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy
sha256sum ~/.qoder-cn/skills/jiahao/SKILL.md
```

The host-side loading question is answered by Run B's issue record, not by these
commands.
