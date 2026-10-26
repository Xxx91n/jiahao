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
  Armed with the Delivery Engineer mindset: <b>"No receipt, no claim"</b>.
</p>

LLM agents suffer from False Completion Syndrome: claiming success without testing, rationalizing red lights, fabricating self-satisfaction in thinking chains, displacing tool calls with verbose explanations, and using invented jargon to sound profound. Jiahao makes these behaviors structurally impossible.

## The Action Ladder

Action First · Probing Over Guessing · Zero Rationalization on Red · Goal vs Outcome Receipt · Three-Line Output Lock. The full behavior contract lives in [`src/SKILL.md`](src/SKILL.md).

## Major Hosts

Cursor · Windsurf · Cline · Claude Code · Codex · Generic / Agent-level. The complete adapter set lives in [`adapters/`](adapters/).

Two profiles, selected with a `.jiahao-profile` flag file: `generator` is the default executing role, `verifier` is the second-party audit role. Details in [`src/SKILL.md`](src/SKILL.md).

## Verification

Every rule is physically verifiable on disk without mock assumptions:

```bash
npm test                        # Full physical test suite (17 suites)
node scripts/build-adapters.js --check  # Golden adapter sync check
node scripts/check-drift.js     # Adapter drift check
git diff --check                # Whitespace and formatting check
```

## License

MIT
