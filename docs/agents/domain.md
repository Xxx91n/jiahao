# Domain Docs

This is a single-context repo. Domain language lives in CONTEXT.md at the root.
Architecture decisions live in docs/adr/.

## Before exploring, read these

1. Read CONTEXT.md first — it defines the vocabulary every other doc uses.
2. Read active ADRs in docs/adr/ — they record architectural decisions.

## File structure

Single-context repo:

    /
    ├── CONTEXT.md
    ├── docs/adr/
    │   ├── 0105-purging-legacy-gates-and-fusing-anti-jiahao-mental-model.md
    │   └── 0106-action-ladder-and-readme-purge.md
    └── src/

## Use the glossary's vocabulary

When writing code, docs, or issues, use the terms defined in CONTEXT.md. If a
term is ambiguous or missing, resolve it and update CONTEXT.md inline.

## Flag ADR conflicts

If a decision in an ADR conflicts with current understanding, flag it and open
a new ADR rather than silently overriding the old one.
