# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit** for Qoder. It carries one rule file
generated from `src/SKILL.md`, the same source as the rules version
(`skills/jiahao/SKILL.md`). It registers **no hooks**: there is no
`hooks/hooks.json`, no hook script, and no plugin manifest.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). No Qoder session was run for this exit; C tier is the spec-assigned
ceiling, not an observed result. A probe that answers the turn-end question is
a separate ticket.

## Install

1. Copy `rules/jiahao.md` into `.qoder/rules/` in the project, or into
   `~/.qoder/rules/` for every project.
2. Keep `alwaysApply: true` in the frontmatter. Qoder's rules documentation
   says rules without a `paths` or `trigger` selector load eagerly, and
   `alwaysApply: true` is one of the always-on forms (declared-unverified
   here; reference: https://docs.qoder.com/cli/memory).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no `.jiahao-profile`
switch here because no hook reads that file.

## Verification status

- Structural facts are pinned by tests: this directory contains only the rule
  file and this README, and no hook registration.
- Not live-probed: no Qoder session was run for this exit. The loading behavior
  in step 2 is quoted from Qoder's documentation, not observed here.
- C tier is the probe list's open question, not a claim about what Qoder can do.

## What this exit does not do

- No hook registration, no subprocess, and no evidence file.
- No enforcement: the file is instructions only. This exit registers nothing
  that acts on a turn or a tool call.
- No installer: copy the file into Qoder's own rules directory.

## Update

Re-copy `rules/jiahao.md` after a release. The body is generated from
`src/SKILL.md`; `node scripts/build-adapters.js --check` keeps the committed
copy identical to the generator output.
