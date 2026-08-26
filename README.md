# Jiahao (嘉豪)

Prompt-as-mental-model skill distribution with **dual profiles** for LLM agents.

Jiahao ships two install-time rule sets. Pick once at install:

| Profile | Installed in | Behavior |
|---------|--------------|----------|
| **generator** | The primary Agent doing the work | 3 surface-signal rules (no evidence → no claim, list verified state changes, verification = calling a tool). **Advisory only** — never blocks. |
| **verifier** (default) | The audit Agent reviewing the work | 7 iron laws + 6-rung verification ladder + hash chain + confidence calibration + bias guards. **Blocking** on missing evidence. |

## What it does

LLM agents suffer from False Completion Syndrome: falsely claiming success,
self-deceiving about completion, hallucinating self-evaluation. Jiahao makes
this structurally impossible. The **generator profile** attacks the surface
signals inside the primary agent (you cannot self-verify — verified advice).
The **verifier profile** runs in a separate audit agent, where
independence theorems actually apply: an external verifier can find errors
the generator itself is structurally blind to.

The pattern mirrors [ponytail](https://github.com/DietrichGebert/ponytail)
but specialized for the verifier role; for a primary agent, use the generator
profile to keep tokens cheap while still blocking the worst self-deception.

## Verification Ladder

1. Deterministic machine check (test suites, compilers, hash comparisons)
2. Ground truth comparison (database state, oracle output)
3. Independent re-execution (re-run, re-query, replay)
4. Checklist decomposition (binary assertion verification)
5. Independent LLM critic (weakest rung — triage signal only)
6. NOT VERIFIED (honest, complete verdict)

If rung 5 runs but ends indecisive (error, timeout, contradictory), the
gate emits **ESCALATE** instead of passing silently — an advisory-only
fourth verdict routing the claims to human adjudication via
`jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>`
(ADR-0017). Human verdicts write back as append-only `human_verdict`
records in the same hash chain and feed the calibration loop.

## Install

### CLI installer (Tier 1, recommended)

```sh
npx jiahao init                      # interactive profile prompt
npx jiahao init --profile verifier   # non-interactive (CI-safe)
npx jiahao init -y                   # accept default (verifier)
npx jiahao init --dry-run            # print, do not write
npx jiahao resolve                   # phase 1: preview evidence (no machine verdict shown)
npx jiahao resolve --verdict pass --reason "tests re-run green" --reviewer alice
```

The CLI writes only `.jiahao-profile`. Adapter files are distributed by
`scripts/build-adapters.js`, never copied by the installer (drift guardrail).

The manual `echo` below remains Tier 0 (zero-dependency fallback).
### Profile selection (install-time)

Create a flag file in the config dir (default `$CLAUDE_CONFIG_DIR` or `$HOME`):

```bash
# Pick ONE — verifier is the default if the flag is absent.
echo generator > ~/.jiahao-profile      # primary agent
echo verifier > ~/.jiahao-profile       # audit agent
```

The `SessionStart` activate hook reads this flag and serves the matching
rule set. The `Stop` verdict-gate hook blocks on missing evidence only in
verifier mode; in generator mode it emits a `JIAHAO ADVISORY` system message.

### Verifier deployment discipline

Verifier independence is enforced at the deployment layer, not by config:

- Run the verifier in a **separate context window** — subagent, teammate
  session, or independent process. Never same-context self-review.
- **Prefer a different model family** for the verifier. Same-family judges
  carry intrinsic self-preference bias that context isolation cannot fix
  (Wataoka et al. 2024); stronger same-family models can show *more* bias
  (Yang et al. 2026).
- One profile per installation — generator and verifier are not meant to
  coexist as competing auto-loaded rule sets in one project.

See ADR-0011 for the full deployment discipline.

### Threat model (mandatory, ADR-0014 D3)

Jiahao's wordlist and detection logic are **not hidden secrets**. Anything
running in the same working directory with file-read access (the audited
agent itself, its Bash tool, its peers) can read them. The system's actual
defenses are:

1. **L1-L3 structural signals** that are public by design — they key on
   tool-output evidence the agent does not control, and do not improve
   from disclosure.
2. **Wordlist privacy as cost-raising only** — phrases.json lives in a
   private directory and is fingerprint-checked (SHA-256). It is not
   ciphertext; an attacker with read access can read it. This matches
   CWE-656's definition of obscurity: useful, never a security boundary.

Jiahao is effective against *drift-prone-not-hostile* agents — the LLM
that optimistically says "搞定了" without checking — and is not a
containment control against a truly hostile actor. If the agent needs to
be sandboxed, use harness/OS-level isolation in addition to jiahao.

### Claude Code

Install as a Claude Code plugin. See `hooks/jiahao-hooks.json`.

### Codex

Copy `adapters/codex/hooks.json` to `.codex/hooks.json` and hook scripts to
`.codex/hooks/`.

### Cursor / Windsurf / Cline

Copy the verifier adapter (e.g. `adapters/cursor/jiahao.mdc`) for a verifier
agent, or the `*-generator.*` variant for the primary agent. Both are
generated from the same `src/SKILL.md`.

## Usage

- `/jiahao lite` — rungs 1-2 only, skip LLM critic
- `/jiahao full` — full ladder (default)
- `/jiahao ultra` — full ladder + re-verify with different model at rung 5
- `/jiahao off` — disable

## Develop

```bash
npm test                              # 150 tests across 13 suites
node scripts/kappa.js                 # ADR-0018 κ governance report (--save-baseline to pin)
node scripts/build-adapters.js        # regenerate 11 adapter files
node scripts/check-drift.js           # CI drift check + profile purity
```

## Architecture

- `src/SKILL.md` — single source of truth (generator + verifier + shared Boundaries)
- `src/gate.js` — verification gate combination ladder (PASS / FAIL / ESCALATE / NOT VERIFIED)
- `scripts/resolve.js` — human adjudication CLI (two-phase anti-anchoring write-back)
- `hooks/jiahao-profile.js` — profile module (SSOT for split + select)
- `hooks/` — 6 hook scripts + hooks.json + runtime.js
- `adapters/` — 11 host adapters (generated)
- `jiahao-mcp/` — MCP-only adapter (profile parameter)
- `docs/adr/` — 18 architecture decision records (0010 = dual-profile; 0011 = deployment discipline; 0012 = detector verdict + hook idempotency; 0013 = cross-turn chain + idempotency key; 0014 = wordlist migration + structural signals; 0015 = benchmark adoption + citation calibration; 0016 = evidence-log/gate split; 0017 = escalate verdict + human adjudication; 0018 = calibration flywheel: threshold band + few-shot injection + kappa)
- `test/` — 13 test suites, 150 tests
- `bench/polygraph/` — ADR-0015 benchmark adapter + frozen dev-split baseline (FAIL vs pre-registered thresholds; see its README)

## License

MIT
