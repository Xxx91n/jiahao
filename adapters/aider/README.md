# aider Adapter (instruction tier, advisory-only)

aider has no hooks (issue #2557 closed by stale bot, never implemented), so
jiahao is advisory-only plain-text injection here. The loader is explicit
configuration, not discovery: nothing is injected unless you opt in.

Install: copy CONVENTIONS.md and .aider.conf.yml to your project git root
(config search order: git root, cwd, home). The `read:` key takes a list;
swap in CONVENTIONS-generator.md for the generator profile.
