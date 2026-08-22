# Jiahao (嘉豪)

Prompt-as-mental-model skill distribution for second-party verifier agents.

Jiahao injects anti-false-completion iron laws into LLM agent runtimes via
hooks, targeting the external verifier/critic — not the primary agent.

## What it does

LLM agents suffer from False Completion Syndrome: falsely claiming success,
self-deceiving about completion, hallucinating self-evaluation. Jiahao makes
this structurally impossible by injecting a 6-rung verification ladder and
7 anti-false-completion iron laws as an always-on prompt.

The pattern mirrors [ponytail](https://github.com/DietrichGebert/ponytail)
but specialized for second-party agents (verifiers) instead of primary agents.

## Verification Ladder

1. Deterministic machine check (test suites, compilers, hash comparisons)
2. Ground truth comparison (database state, oracle output)
3. Independent re-execution (re-run, re-query, replay)
4. Checklist decomposition (binary assertion verification)
5. Independent LLM critic (weakest rung — triage signal only)
6. NOT VERIFIED (honest, complete verdict)

## Install

### Claude Code

Install as a Claude Code plugin. See `hooks/jiahao-hooks.json`.

### Codex

Copy `adapters/codex/hooks.json` to `.codex/hooks.json` and hook scripts to
`.codex/hooks/`.

### Cursor / Windsurf / Cline

Copy the respective file from `adapters/` to your editor's rules directory.

## Usage

- `/jiahao lite` — rungs 1-2 only, skip LLM critic
- `/jiahao full` — full ladder (default)
- `/jiahao ultra` — full ladder + re-verify with different model at rung 5
- `/jiahao off` — disable

## Develop

```bash
npm test                              # 36 tests
node scripts/build-adapters.js        # regenerate adapters
node scripts/check-drift.js           # CI drift check
```

## Architecture

- `src/SKILL.md` — single source of truth (iron laws)
- `src/gate.js` — verification gate combination ladder
- `hooks/` — 5 hook scripts + hooks.json + runtime.js
- `adapters/` — 7 host adapters (generated)
- `docs/adr/` — 5 architecture decision records
- `test/` — 4 test files, 36 tests

## License

MIT
