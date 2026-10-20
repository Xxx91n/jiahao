<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/logo-dark.png">
    <img src="docs/assets/brand/logo.png" alt="jiahao mark — the hooded anti-mascot" width="140">
  </picture>
</p>

<h1 align="center">Jiahao (嘉豪)</h1>

<p align="center">
  <b>English</b> | <a href="README-zh-CN.md">中文</a>
</p>

<p align="center">
  Anti-false-completion discipline for LLM coding agents.<br>
  Armed with the Delivery Engineer mindset: <b>"No receipt, no claim (凭证即一切)"</b>.
</p>

LLM agents suffer from False Completion Syndrome: claiming success without testing, rationalizing red lights, fabricating self-satisfaction in thinking chains, displacing tool calls with verbose explanations, and using invented jargon to sound profound. Jiahao makes these behaviors structurally impossible.

## The Action Ladder (反自嗨五级行动阶梯)

Every action strictly follows the 5-rung ladder in order; any failed rung blocks completion immediately:

1. **Action First (动作前置)**: Calling a tool always precedes text. Outputting explanations or essays before tool execution is strictly forbidden.
2. **Probing Over Guessing (探针锚定)**: Ground truth comes only from real tool outputs. Reasoning without real logs, status checks, state changes, or test outputs carries zero confidence.
3. **Zero Rationalization on Red (红灯即停)**: Exit code != 0 or test failure means instant stop and reporting error proof. Any excuse or rationalization is rejected.
4. **Goal vs Outcome Receipt (目标核销)**: No evidence, no completion claim. Verify every original goal against physical exit 0 evidence before claiming done.
5. **Three-Line Output Lock (三行硬锁)**: Final delivery is strictly locked to at most 3 plain lines (`[行动结论]`, `[机器凭证]`, `[残留风险]`), with plain middle-school language.

## Quickstart & Supported Hosts

Jiahao provides unified adapters generated directly from `src/SKILL.md` for major AI coding environments:

- **Cursor**: `.cursor/rules/jiahao.mdc` & `jiahao-generator.mdc`
- **Windsurf**: `.windsurf/rules/jiahao.md` & `jiahao-generator.md`
- **Cline**: `.clinerules/jiahao.md` & `jiahao-generator.md`
- **Claude Code**: `hooks/jiahao-hooks.json`
- **Codex**: `.codex/hooks.json`
- **Generic / Agent-level**: `adapters/instruction-tier/AGENTS.md` & `AGENTS-generator.md`

Select generator (primary executing agent, default) or verifier (second-party audit agent) via `.jiahao-profile` flag file.

## Verification

Every rule is physically verifiable on disk without mock assumptions:

```bash
npm test                        # Full physical test suite (18 suites)
node scripts/build-adapters.js --check  # Golden adapter sync check
node scripts/check-drift.js     # Adapter drift check
node scripts/coinage-triage.js  # Controlled vocabulary and plain language check
git diff --check                # Whitespace and formatting check
```

## License

MIT
