# Qoder Desktop skill install (#106)

Date: 2026-10-31. Host: Windows 10.0.26100 (win32 x64). The ticket reports
Qoder CN Desktop 0.4.11; this run used only the `skills` CLI and did not launch
the host.

Artifact: the released rules version from GitHub `main` at `4c134c5b` (v0.3.0).
Ticket #106 is a post-release documentation correction; this branch does not
change `skills/jiahao/SKILL.md`, so the installed bytes are the same file the
branch ships.

## Run A: install (this window)

The documented command is without npx's own prompt flag; `npx --yes` here only
answers npx's package-install prompt.

```bash
npx --yes skills add Xxx91n/jiahao -g -a qoder-cn -y --copy
# exit 0
```

Observed output:

```text
◇  Installation complete
◇  Installed 1 skill
  ✓ jiahao (copied)
    → ~\.qoder-cn\skills\jiahao
```

Hashes:

```text
~/.qoder-cn/skills/jiahao/SKILL.md  1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9
skills/jiahao/SKILL.md              1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9
```

Labels:

- **verified**: exit 0; the file exists at the CN path; its SHA-256 equals the
  repository file.
- The run was **not isolated**: it wrote to the operator's real `~/.qoder-cn`
  (a global install). A file was already present with the same SHA-256, so the
  overwrite was byte-identical. A reviewer repeating it changes their own
  machine; the content is idempotent for this artifact.
- No session id applies: the install CLI exits before a host session starts.

## Run B: fresh-session check (#106, 2026-10-31)

The ticket records a fresh, independent Qoder CN Desktop 0.4.11 session with
three read-only questions: the skill exists, its description contains
"No receipt, no claim", and it lives under `~/.qoder-cn/skills/jiahao`. That
observation is **issue-attested**, not re-run in this window; #106 does not
carry a session id. It is a separate run from Run A.

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
