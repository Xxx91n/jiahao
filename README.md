<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo-dark.png">
    <img src="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo.png" alt="jiahao mark — the hooded anti-mascot" width="140">
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

LLM agents suffer from False Completion Syndrome: claiming success without testing, rationalizing red lights, fabricating self-satisfaction in thinking chains, displacing tool calls with verbose explanations, and using invented jargon to sound profound.

## The Action Ladder

Action First · Probing Over Guessing · Zero Rationalization on Red · Goal vs Outcome Receipt · Three-Line Output Lock. The full behavior contract lives in [`src/SKILL.md`](src/SKILL.md).

## Install

Two exits share one content source. **The rules version is instructions only; only the plugin version adds hooks and enforcement.**

### Rules version — standard CLI, instructions only

```bash
npx skills add Xxx91n/jiahao
```

Installs `skills/jiahao/SKILL.md` into a host that reads the standard Agent Skills directory. The file carries both profiles as text; the host takes what it needs. No hook runs, so nothing is blocked. The six instruction-only adapter directories (aider, cline, cursor, instruction-tier, opencode, windsurf) are retired; a host without a standard skill directory (for example aider) has no packaged adapter in this release, though the generated `skills/jiahao/SKILL.md` can be copied as plain text.

### Plugin version — host-native command, with hooks

CodeBuddy is one of the two plugin bundles (the other is Claude Code, described below):

```bash
codebuddy plugin install <path-to>/adapters/codebuddy
```

The plugin ships disabled (`defaultEnabled: false`); enable it after install. Then write the profile with the installer (`node scripts/install.js init -y`), which prints the value it wrote (see Profile). Once enabled, `hooks/hooks.json` wires the verifier enforcement. The bundle ships both profile rule files with `alwaysApply: true`; rule-level profile selection is declared-unverified, and the hook is the enforcement layer. The CLI plugin-install path is documented but declared-unverified; the live-verified fallback is the `.codebuddy/settings.json` merge. Install steps, the hook map, and the full verified / declared-unverified boundary are in [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md). Claude Code is the second plugin bundle: its self-contained bundle lives in [`adapters/claude-code/`](adapters/claude-code/), installed from the repository marketplace with `claude plugin marketplace add Xxx91n/jiahao` and `claude plugin install jiahao@jiahao`. The bundle's README shows the hook map and states what is not yet live-verified.

The codex, copilot, qoder, and mcp directories are no longer install exits; the MCP server itself remains at [`jiahao-mcp/`](jiahao-mcp/).

### Profile

The plugin version defaults to `verifier` when `.jiahao-profile` is absent. The flag lives under `CLAUDE_CONFIG_DIR`, else `$HOME`; the code falls back to `/tmp` when neither is set. Run the installer from the clone; `-y` accepts the default and prints the value it wrote:

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

Start a new session after changing the profile. The flag is shared by all agents using the same config directory; use separate `CLAUDE_CONFIG_DIR` values for concurrent profiles.

The rules version has no runtime profile switch.

### Upgrade

The version comes from `package.json`; both exits upgrade in place, so when `1.0.0` ships it will use the same commands. Rules version: re-run `npx skills add Xxx91n/jiahao`, or `npx skills update jiahao -g -y`. Plugin version: `claude plugin marketplace update jiahao`, then `claude plugin update jiahao@jiahao`, then restart the session. Upgrade does not touch `.jiahao-profile` or `.jiahao-active` in the config dir.

### Private corpus

The private benchmark corpus (`private/bench-corpus/`) is a maintainer/CI asset: it is not in the npm package and not tracked in this repository. The frozen evaluation records under `bench/` are tracked; they are not the private corpus. When a gate needs the private corpus, point `JIAHAO_CORPUS_DIR` at a local copy. Runtime hooks do not depend on it.

## Verification

These commands check the code, the generated outputs, and repository state on disk:

```bash
npm test                                # Full physical test suite (21 suites)
node scripts/build-adapters.js --check  # Generated output sync check
node scripts/check-drift.js             # Profile and retired adapter drift check
git diff --check                        # Whitespace and formatting check
```

A release tag runs one more command, `npm run release:gate -- --tag vX.Y.Z`, which bundles the checks above with the tag/version match, the packed-content audit, the artifact SHA256, an install dry-run, and the no-network assertion. What the gate proves, what the artifact carries, what install writes, and how to re-run it on a clean checkout: [`docs/release.md`](docs/release.md).

## License

MIT
