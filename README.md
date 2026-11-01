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

All exits share one content source. **The rules version is instructions only; only the plugin version adds hooks and enforcement.**

### Rules version — standard CLI, instructions only

```bash
npx skills add Xxx91n/jiahao
```

Installs `skills/jiahao/SKILL.md` into a host that reads the standard Agent Skills directory. The file carries both profiles as text; the host takes what it needs. No hook runs, so nothing is blocked. The six instruction-only adapter directories (aider, cline, cursor, instruction-tier, opencode, windsurf) are retired; a host without a standard skill directory (for example aider) has no packaged adapter in this release, though the generated `skills/jiahao/SKILL.md` can be copied as plain text.

#### Qoder: Desktop plugin (A tier on both Desktop builds) vs IDE/CLI rules (C tier)

Qoder has two product lines and they read different paths. **Qoder Desktop** (the 0.x workbench) has two exits. The one without enforcement is the rules version in its standard skill directory; on Qoder CN, the #106 check on Desktop 0.4.11 found the user-level rules path unloaded:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN → ~/.qoder-cn/skills/jiahao/SKILL.md
```

The 2026-10-31 install run exited 0 and the installed `SKILL.md` SHA-256 matched the repository's `skills/jiahao/SKILL.md` (Run A). A fresh session reported the skill visible; that observation is #106's separate Run B, not re-probed here (see the [run record](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md)). The international alias is `-a qoder`; its landing path and loading were not live-probed here. Either way this path is rules only: it has no enforcement.

With enforcement there is a sixth self-contained bundle, [`adapters/qoder/`](adapters/qoder/), and **Qoder CN Desktop 0.4.11 is an A-tier host**: in a live session on 2026-10-31 (#109) a `Stop` hook answered `{"decision":"block"}` on exit 0 and the host held the turn open and continued — 6 times against "I verified it" claims that had nothing behind them, once against the same assertion wrapped in a "this is probe payload" disclaimer. The same hook answering exit 2 with the reason on stderr also blocked and continued (3 times), but those messages themselves said no verification had been done, so that run proves the channel, not a false-completion catch. The host set `stop_hook_active` on every re-entry and honored 6 consecutive continuations before the probe's own cap ended the run. That block came through a project-scope `.qoder/settings.json` hook; installing this bundle as a Desktop plugin is declared-unverified. The **international Qoder Desktop 0.4.11 build was probed on its own** on 2026-11-01 (#113) and is A-tier too, on its own evidence: a `Stop` hook fired there through both channels (exit 0 + flat `{"decision":"block"}`, and exit 2 + stderr with the host logging `success=false exit_code=2`), the host set `stop_hook_active` on every re-entry, 3 consecutive blocks were honored before the probe's own cap, and a `.qoder-cn/settings.json` armed beside `.qoder/` never fired — the same answer the CN build gave. Of its 6 blocks, 5 landed on unfounded "I completed and verified" claims (dictated by the probe prompt, so they show the block fires on a self-contradictory claim rather than that the model invented one) and 1 on a literal that disclaimed being a claim (the exit-2 run). The run record is [qoder-intl-hook-probe-2026-11-01.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md). One measured defect ships with it: Qoder gives a hook subprocess neither `CLAUDE_CONFIG_DIR` nor `HOME`, and `src/shared/paths.js` looks for exactly those two, so the shipped gate's `.jiahao-profile` and `.jiahao-evidence` currently land under `<drive>:\tmp` instead of the `~/.qoder-cn` / `~/.qoder` the host names. The tier conclusion is unaffected — the block was watched — but the state location is broken, and repairing it means changing path resolution every host shares, which is tracked as [#116](https://github.com/Xxx91n/jiahao/issues/116) rather than folded into this exit. The CN run record is [qoder-hook-probe-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md).

**Qoder IDE/CLI** reads project rules at `.qoder/rules/`. That is what the bundle's `rules/jiahao.md` is for: one rule file generated from the same source, registering nothing. Copy it into `.qoder/rules/`; the host-side loading there is declared-unverified, not live-probed. The directory README carries all three paths and the verification status.

### Plugin version — host-native command, with hooks

CodeBuddy is one of the eight plugin bundles (the others are Claude Code, GitHub Copilot CLI, Codex CLI, Google Antigravity, Qoder, ZCode, and WorkBuddy):

```bash
codebuddy plugin install <path-to>/adapters/codebuddy
```

The plugin ships disabled (`defaultEnabled: false`); enable it after install. Then write the profile with the installer (`node scripts/install.js init -y`), which prints the value it wrote (see Profile). Once enabled, `hooks/hooks.json` wires the verifier enforcement. The bundle ships both profile rule files with `alwaysApply: true`; rule-level profile selection is declared-unverified, and the hook is the enforcement layer. The CLI plugin-install path is documented but declared-unverified; the live-verified fallback is the `.codebuddy/settings.json` merge. Install steps, the hook map, and the full verified / declared-unverified boundary are in [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md). Claude Code is the second plugin bundle: its self-contained bundle lives in [`adapters/claude-code/`](adapters/claude-code/), installed from the repository marketplace with `claude plugin marketplace add Xxx91n/jiahao` and `claude plugin install jiahao@jiahao`. The bundle's README shows the hook map and states what is not yet live-verified.

The mcp directory is no longer an install exit; the MCP server itself remains at [`jiahao-mcp/`](https://github.com/Xxx91n/jiahao/tree/main/jiahao-mcp). GitHub Copilot CLI is a third self-contained bundle (`copilot plugin install <path-to>/adapters/copilot`) and an **A-tier host**: a live prompt-mode turn on Copilot CLI 1.0.105 (2026-10-30) continued a false completion claim only after `agentStop` returned `{decision:"block"}` on exit 0; exit 2 did not block; 8 consecutive block continuations followed, and the CLI ended on the ninth block. Its README carries the camelCase / bash+powershell dialect, the `.claude/settings.json` probe, and the evidence path. Codex CLI is the fourth self-contained bundle, installed from the repository's Codex marketplace (`.agents/plugins/marketplace.json`) with `codex plugin marketplace add Xxx91n/jiahao` and `codex plugin add jiahao --marketplace jiahao`; its hook commands have to be trusted once (`/hooks`), and Codex 0.163.0 enables hooks by default (an untrusted plugin's hooks were skipped in `codex exec`, so unattended runs need persisted trust or `--dangerously-bypass-hook-trust`). Codex is **A-tier** too: a live turn on codex-cli 0.163.0 (2026-10-30) continued only after Stop returned `{decision:"block"}` on exit 0; exit 2 + stderr did not block. Details and evidence paths are in [`adapters/codex/README.md`](adapters/codex/README.md) and [docs/evidence/v0.3.0/](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/). Google Antigravity is a fifth self-contained bundle (`agy plugin install <path-to>/adapters/antigravity`) and an **A-tier host**: a live turn on Google Antigravity 1.2.12 (2026-10-31) continued a false completion claim after `Stop` returned `{decision:"block"}` on exit 0, injected as `<SYSTEM_MESSAGE>`; exit 2 did not block; 10 forced continuations followed before reaching `MAX_FORCED_INVOCATIONS`. Details and evidence paths are in [`adapters/antigravity/README.md`](adapters/antigravity/README.md) and [docs/evidence/v0.3.0/](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/). Qoder Desktop is the sixth self-contained bundle, installed as a local archive from the Desktop app's plugin settings (this repository has no Qoder marketplace). Its dialect lives in one file, `scripts/hosts/qoder.js`: the manifest is `.qoder-plugin/plugin.json`, the host discovers `hooks/hooks.json` itself, and every command spells the root as `${QODER_PLUGIN_ROOT}` and passes the platform name `qoder` as argv, because the hook subprocess gets `QODER_PROJECT_DIR` and `QODER_CONFIG_DIR` but no `QODER_SESSION_ID`. Its A tier is measured separately on each build, both through a project-scope `.qoder/settings.json` hook: Qoder CN Desktop 0.4.11 on 2026-10-31 (#109) and international Desktop 0.4.11 on 2026-11-01 (#113). The plugin install path remains declared-unverified ([qoder-hook-probe-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md), [qoder-intl-hook-probe-2026-11-01.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md)).
belongs to Qoder CN Desktop 0.4.11 alone and was measured through a project-scope `.qoder/settings.json` hook; the plugin install path and the international Desktop remain declared-unverified ([qoder-hook-probe-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md)). ZCode is the seventh self-contained bundle, installed from its own marketplace shelf with `zcode plugins marketplace add <path-to>/adapters/zcode` and `zcode plugins install jiahao@jiahao-zcode` (a direct `zcode plugins install <dir>` is refused by the host), and an **A-tier host**: a live desktop-session turn end on ZCode 3.16.2 (2026-10-31) was blocked by the Stop hook answering `{decision:"block"}` on exit 0, and the reason arrived as the next turn's context. Its README carries the seven-event dialect (no sweep hook: `SessionEnd` does not exist there), the dual-spelling payload note, the config-dir fallback note, and the evidence path. WorkBuddy is the eighth self-contained bundle, installed from [`adapters/workbuddy/`](adapters/workbuddy/) (the desktop's bundled CLI takes `codebuddy plugin add <path>`) or by merging its hook map into the applicable settings file (`~/.workbuddy-ai/settings.json` for WorkBuddy AI 5.9.4, `~/.workbuddy/settings.json` for WorkBuddy 5.9.3). It is not a CodeBuddy alias: two builds ship under two product names and two config roots (`~/.workbuddy-ai` for WorkBuddy AI 5.9.4, `~/.workbuddy` for WorkBuddy 5.9.3). The international build is **A-tier**: a live turn on 5.9.4 (2026-10-31) continued only after `Stop` returned `{decision:"block"}` on exit 0, and the reason arrived as `Stop hook feedback`. `SubagentStop` fired with the same decision and the subagent was **not** continued, so only the turn-end event is wired. The domestic 5.9.3 build is **A-tier on its own run**: on the domestic build (2026-11-01, `D:\WorkBuddy`, config root `~/.workbuddy`) a false completion continued only after a `Stop` hook returned `{decision:"block"}` on exit 0 (the probe sets that exit code by construction; what the run observed directly is the host continuing after the decision), the reason arrived as `Stop hook feedback`, and the re-entry carried `stop_hook_active: true`. The two variants share one agent CLI, but each row is its own observation and neither is inferred from the other. In both runs a probe hook stood in for the shipped gate, so what these rows establish is the host's turn-end channel, not a live run of the gate's own judgment. Details, the dialect, and the probed-versus-unprobed table are in [`adapters/workbuddy/README.md`](adapters/workbuddy/README.md).


### Profile

The plugin version defaults to `verifier` when `.jiahao-profile` is absent. The flag lives under `CLAUDE_CONFIG_DIR`, else `$HOME`; the code falls back to `/tmp` when neither is set. Run the installer from the clone; `-y` accepts the default and prints the value it wrote:

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

Start a new session after changing the profile. The flag is shared by all agents using the same config directory; use separate `CLAUDE_CONFIG_DIR` values for concurrent profiles.

The rules version has no runtime profile switch.

### Upgrade

The version comes from `package.json`. Rules version: re-run the same `npx skills add` command with the scope flags you installed with — project scope without `-g`, global scope with `-g -a <host> -y --copy`. `npx skills update jiahao -g -y` updates a global install; in skills 1.7.4 on one Windows machine with a local-path source, the project-scoped `update` reported no match and exited 127; re-running `add` is the project upgrade path in that setup. Plugin version (Claude Code): `claude plugin marketplace update jiahao`, then `claude plugin update jiahao@jiahao`. CodeBuddy uses its own plugin update/install path (the CLI install path is declared-unverified; see [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)) or re-applies the verified settings merge with the new bundle. Restart the session after upgrading. Upgrade does not touch `.jiahao-profile` or `.jiahao-active` in the config dir.

### Private corpus

The private benchmark corpus (`private/bench-corpus/`) is a maintainer/CI asset: it is not in the npm package and not tracked in this repository. The frozen evaluation records under `bench/` are tracked; they are not the private corpus. When a gate needs the private corpus, point `JIAHAO_CORPUS_DIR` at a local copy. Runtime hooks do not depend on it.

## Verification

These commands check the code, the generated outputs, and repository state on disk:

```bash
npm test                                # Full Jest suite
node scripts/build-adapters.js --check  # Generated output sync check
node scripts/check-drift.js             # Profile and retired adapter drift check
npm run check:whitespace                # Trailing whitespace / EOF blank lines, untracked files included
npm run check:links                     # Relative links in packed Markdown resolve inside the package
```

`git diff --check` only sees the lines a diff carries, so it misses a file that was never staged and a blank line at the end of an untracked file; `npm run check:whitespace` reads every tracked and untracked text file instead.

A release tag runs one more command, `npm run release:gate -- --tag vX.Y.Z`, which bundles the checks above with the tag/version match, the packed-content audit, the artifact SHA256, an install dry-run, and the no-network assertion. What the gate proves, what the artifact carries, what install writes, and how to re-run it on a clean checkout: [`docs/release.md`](docs/release.md).

## License

MIT
