<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo-dark.png">
    <img src="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo.png" alt="jiahao mark — the hooded anti-mascot" width="140">
  </picture>
</p>

<h1 align="center">Jiahao > 嘉豪</h1>

<p align="center">
  <b>English</b> | <a href="README-zh-CN.md">中文</a>
</p>

<p align="center">
  An anti-AI-fluff, anti-fake-completion plugin for coding agents. Make it talk like a human and actually do real work.
</p>

> Agents love writing unsolicited essays, flexing with buzzwords to sound smart, claiming "done" without even checking, and taking hacky shortcuts when errors blow up.

jiahao is a behavioral discipline plugin that counters this crap. On agents that support hooks, it intercepts and blocks fake completions right before the turn ends.

## What it installs

There are two versions. The only difference is that the plugin version has hard enforcement hooks, while the rules version simply injects prompts into the LLM. Everything else is identical.

Just feed this repo to your AI. The full behavior prompt is in [`src/SKILL.md`](src/SKILL.md), and the glossary is in [`GLOSSARY.md`](GLOSSARY.md).

Remember to tell it to talk like a human.

### Rules version

```bash
npx skills add Xxx91n/jiahao
```

### Plugin version

In `~/adapters/`, let the agent find its own doc. If it can't find it, open an issue in this repo.

The profile comes from one file, `.jiahao-profile`, in the config dir: `CLAUDE_CONFIG_DIR`
if it is set, otherwise `$HOME`, otherwise a dir the host reports
(`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`, `WORKBUDDY_CONFIG_DIR`), otherwise
the OS home. It never falls back to `/tmp` on its own; if you point one of
those variables at `/tmp`, that is where the files go. Write `verifier` to
block a completion claim with no evidence (an older record with no session id
can still let one pass), `generator` to only remind; with no file, `verifier`
is used. Start a new session after changing it.

## Testing

```bash
npm test                                # Full Jest test suite
node scripts/build-adapters.js --check  # Generated output sync check
node scripts/check-drift.js             # Profile & retired adapter drift check
npm run check:whitespace                # Trailing whitespace / EOF blank lines, untracked files included
npm run check:links                     # Relative links in packed Markdown must resolve inside package
```

## License

[MIT](LICENSE)
