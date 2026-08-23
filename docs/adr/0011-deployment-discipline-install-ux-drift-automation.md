# ADR-0011: Verifier Deployment Discipline, Two-Tier Install UX, and Layered Drift Automation

## Date

2026-08-23

## Status

Accepted

## Context

Three open questions from the ADR-0010 handoff required grill resolution:

1. Co-installation semantics — whether generator and verifier profiles can
   coexist in one project.
2. Install UX — whether to add a CLI installer for `.jiahao-profile`.
3. Check-drift automation — how to run `check-drift.js` before merge.

Evidence gathered via two atomcode research rounds (combined 29 searches,
27 primary-source full reads):

**Industry consensus on co-installation.** No mainstream system ships two
competing auto-loaded role profiles in one repo. Claude Code / Codex /
Cursor / Cline all converge on "one canonical instruction file + role
isolation at the agent-instance layer" (separate context window, system
prompt, model). Verifier deployment is a spectrum: lightweight self-review
is a separate-context subagent; formal audit is an independent process or
deployment (CodeRabbit cloud sandbox, Copilot review on GitHub Actions,
Cursor Agent Review). Sources: code.claude.com/docs/en/sub-agents,
code.claude.com/docs/en/agent-teams, docs.coderabbit.ai/overview/architecture,
docs.github.com copilot code-review, cursor.com/docs/agent/agent-review.

**Academic basis for deployment discipline.** Self-preference bias is
model-intrinsic: a judge favors its own outputs even when unaware they are
self-generated, because the mechanism is perplexity/familiarity (Wataoka et
al. 2024, arXiv:2410.21819). Stronger same-family models can show *more*
bias, not less (Yang et al. 2026, arXiv:2604.22891, "Machiavellian Judges").
Context isolation alone cannot remove this; jiahao's verifier independence
requires separation at three layers — instance (context window), process
(independent deployment), and model family (prefer different). Config-file
co-location is inert; independence lives entirely in the deployment layer.

**Install UX precedent.** The pure-prompt/rules distribution space has three
coexisting tiers: marketplace metadata (Claude Code `/plugin marketplace`,
171k-star anthropics/skills explicitly states "This repo is not installed
like an npm package"), one-shot npx installers (emerging `npx skills`,
`npx continuous-improve-skill`), and zero-CLI copy/echo (shadcn manual tab,
40.6k-star awesome-cursorrules, AGENTS.md as file convention). npm's
official recommendation is npx over global install
(docs.npmjs.com). For prompt libraries, `prompts` is the lightest
mainstream choice (used by shadcn init). Non-interactive CI standard is
`CI` env + `stdin.isTTY` auto-detection + `-y/--no-interactive` flags
(nuxt/cli PR #1264, 2026-03; eas-cli PR #3486).

**Git hooks precedent.** For a single fast script on a small repo, native
`core.hooksPath` + one shell file is the smallest correct mechanism —
husky's own author typicode writes that hooks should be "pure shell, no
intermediate layer" (blog.typicode.com 2021). Local hooks are
convenience-only and fully bypassable (`--no-verify`, GitHub Web/IDE/bot
commits never touch contributor machines); the only enforcement layer that
covers those paths is CI + GitHub required status checks (GitHub docs
"About protected branches"). Ponytail ladder step 4 explicitly forbids
adding a new dependency for what a few lines can do.

## Decision

### 1. Co-installation — single profile per installation (Amendment to ADR-0010)

jiahao does NOT support co-installation of competing generator and verifier
profiles in one project. One `.jiahao-profile` flag per installation is the
only selection mechanism. Verifier independence is enforced at three
deployment layers: (a) separate context window, (b) separate process or
deployment for formal audit, (c) prefer a different model family. Rationale:
industry has no competing-auto-profile precedent; academic evidence shows
independence cannot come from configuration.

### 2. Install UX — two-tier: manual echo (Tier 0) + single-file CLI (Tier 1)

- **Tier 0 (always available):** document `echo "verifier" > $CONFIG_DIR/.jiahao-profile`
  as the baseline. This matches the strongest precedent tier in the
  pure-prompt distribution space.
- **Tier 1 (recommended path):** `scripts/install.js` exposed via package.json
  `bin` as `jiahao`. Single command: `npx jiahao init` (or `jiahao init` with
  `--profile generator|verifier`).
  - Uses `prompts` (lightest mainstream, shadcn init precedent) to ask one
    question only: generator or verifier, default `verifier`.
  - Non-interactive: `--profile <name>` flag, `-y` to accept defaults,
    auto-detection of `CI` env or missing `stdin.isTTY` prints the
    equivalent command and exits non-zero (nuxt PR #1264 pattern).
  - `--dry-run` prints the flag path and content without writing.
  - Scope guardrail: CLI writes **only** `.jiahao-profile`. It does NOT
    copy SKILL.md / adapter files — build-adapters.js remains the sole
    distributor, avoiding the silent-drift failure mode the research
    flagged as the main copy-mode risk.
  - After writing, prints the Verifier Deployment Discipline reminder from
    decision 1 (separate context, prefer different model family).

### 3. Drift automation — layered: CI (required) + native pre-commit (optional)

- `.github/workflows/ci.yml` on `push` and `pull_request` runs
  `npm install --ignore-scripts && npm test` and `node scripts/check-drift.js`.
  Set the workflow as a **required status check** on the default branch —
  this is the only enforcement layer that catches GitHub Web / IDE /
  Dependabot / Renovate submissions, which never touch a contributor's
  machine.
- `.githooks/pre-commit` (one file, `node scripts/check-drift.js`) plus
  `package.json` `prepare: "git config core.hooksPath .githooks || true"`.
  Zero dependencies. The `|| true` guard prevents `prepare` failure on
  CI/deploy environments without git.
- Explicitly NOT installing husky (YAGNI; typicode's own design philosophy
  holds hooks should be plain shell) or lefthook (unnecessary for <500
  files per 2026 benchmark consensus).

## Consequences

### Positive

- Closes the co-installation ambiguity with industry + academic backing.
- Install UX matches a validated precedent tier without committing to
  marketplace metadata maintenance.
- Drift is caught both pre-merge (CI, enforced) and pre-commit (local,
  convenient) with zero new runtime dependencies.

### Negative

- Adds one more script (`install.js`) and one workflow file to maintain.
- CI workflow requires GitHub; the local pre-commit hook is the only
  automation for contributors without Actions (this is the industry-standard
  trade — see pre-commit-ci issue #7).

### Alternatives considered

- **Marketplace/JSON manifest installer (rejected):** heavyweight, targets
  team auto-update scenarios jiahao does not have; maintenance cost
  disproportionate (plugin.json + marketplace.json + versioning).
- **Husky / lefthook for hooks (rejected):** added dependency and config
  surface for a 3-line shell hook goal; husky's own author recommends
  avoiding it when a plain script works.
- **No CLI (rejected):** leaves the flag-write step entirely manual; the
  `init` script exists primarily to print the deployment-discipline
  reminder at the moment of choice (research-identified failure mode).

## References

- ADR-0010 — Dual-Profile Role-Tagged Distribution (amended by decision 1)
- Wataoka et al. 2024 — Self-Preference Bias in LLM-as-a-Judge (arXiv:2410.21819)
- Yang et al. 2026 — Quantifying and Mitigating Self-Preference Bias (arXiv:2604.22891)
- Claude Code subagents / agent teams docs, CodeRabbit architecture docs,
  GitHub Copilot code review docs, Cursor Agent Review docs
- anthropics/skills discussion #166, adamdroberts/agent-skills install docs
- nuxt/cli PR #1264 (agent/CI detection), eas-cli PR #3486
- typicode blog 2021-03-26 (hooks as pure shell), 2026-05 lefthook/husky
  benchmark (johal.in), GitHub docs branch protection
