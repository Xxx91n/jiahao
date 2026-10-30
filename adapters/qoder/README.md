# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit** for Qoder. It carries one rule file
generated from `src/SKILL.md`, the same source as the rules version
(`skills/jiahao/SKILL.md`). It registers **no hooks**: there is no
`hooks/hooks.json`, no hook script, and no plugin manifest. Qoder loads the
rule as always-on context; that is all this exit does.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). Until a probe answers that question, this exit does not claim
enforcement and stays at C tier. A probe result is a separate ticket.

## Install

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project, or into
   `~/.qoder/rules/` for every project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder loads rules without a
   `paths` or `trigger` selector eagerly, and `alwaysApply: true` is one of
   the always-on forms (Qoder rules reference: https://docs.qoder.com/cli/memory).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no `.jiahao-profile`
switch here because no hook reads that file.

## What this exit does not do

- No hook registration, no subprocess, and no evidence file.
- No enforcement: the file is instructions only. Qoder treats it as context,
  not as a gate.
- No installer: copy the file into Qoder's own rules directory.

## Update

Re-copy `rules/jiahao.md` after a release. The body is generated from
`src/SKILL.md`; `node scripts/build-adapters.js --check` keeps the committed
copy identical to the generator output.
