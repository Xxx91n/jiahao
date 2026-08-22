# Domain Docs

This is a single-context repo. Domain language lives in CONTEXT.md at the root.
Architecture decisions live in docs/adr/.

## Before exploring, read these

1. Read CONTEXT.md first — it defines the vocabulary every other doc uses.
2. Read ADRs in docs/adr/ in numerical order — they record decisions and why.

## File structure

Single-context repo:

    /
    ├── CONTEXT.md
    ├── docs/adr/
    │   └── 0001-*.md
    └── src/

## Use the glossary's vocabulary

When writing code, docs, or issues, use the terms defined in CONTEXT.md. If a
term is ambiguous or missing, resolve it and update CONTEXT.md inline.

## Flag ADR conflicts

If a decision in an ADR conflicts with current understanding, flag it and open
a new ADR rather than silently overriding the old one.
