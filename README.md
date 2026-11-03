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

LLM agents claim success without testing, rationalize red lights, displace tool calls with verbose explanations, and invent jargon to sound profound. Jiahao installs a behavior contract that counters these tells, plus — on hosts that support hooks — a gate that blocks turn end until the claim carries evidence.

## What it installs

The five-rung action ladder: Action First, Probing Over Guessing, Zero Rationalization on Red, Goal vs Outcome Receipt, Three-Line Output Lock. The full behavior contract lives in [`src/SKILL.md`](src/SKILL.md); vocabulary is defined in [`GLOSSARY.md`](GLOSSARY.md).

Two distribution shapes share one source:

- **Rules version** — `skills/jiahao/SKILL.md`, instructions only. No hooks run; nothing is blocked.
- **Plugin version** — eight self-contained bundles under `adapters/`, each wiring the host's hooks so the verifier gate can block a false completion at turn end.

## Install

All exits share one content source. **The rules version is instructions only; only the plugin version adds hooks and enforcement.**

### Rules version — standard CLI, instructions only

```bash
npx skills add Xxx91n/jiahao
```

Installs `skills/jiahao/SKILL.md` into a host that reads the standard Agent Skills directory. The file carries both profiles as text; the host takes what it needs.

The six instruction-only adapter directories (aider, cline, cursor, instruction-tier, opencode, windsurf) are retired. A host without a standard skill directory has no packaged adapter in this release; the generated `skills/jiahao/SKILL.md` can be copied as plain text.

#### Qoder: Desktop plugin (A tier on both Desktop builds) vs IDE/CLI rules (C tier)

Qoder has two product lines and they read different paths. **Qoder Desktop** (the 0.x workbench) takes the rules version in its standard skill directory — on Qoder CN Desktop 0.4.11, #106 probed the user-level `rules/` directory under `~/.qoder` and found it unloaded (the only rules path that check tested), so the CN install uses the CN build's own skill directory:

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # → ~/.qoder-cn/skills/jiahao/SKILL.md
```

The 2026-10-31 install exited 0 and the installed file's SHA-256 matched `skills/jiahao/SKILL.md` ([run record](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md)). The CN skills path loads rules only, with no enforcement. The international alias `-a qoder` writes `~/.qoder/skills/`; its landing path and loading were not live-probed. With enforcement there is a self-contained bundle, [`adapters/qoder/`](adapters/qoder/), installed as a local archive from the Desktop app's plugin settings. Both Desktop builds are **A tier**, each measured through a project-scope `.qoder/settings.json` `Stop` hook — Qoder CN Desktop 0.4.11 on 2026-10-31 ([qoder-hook-probe-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md), #109) and international Desktop 0.4.11 on 2026-11-01 ([qoder-intl-hook-probe-2026-11-01.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md), #113). On each build a `Stop` hook held a real turn open on both channels (exit 0 + flat `{"decision":"block"}`, and exit 2 + stderr), `stop_hook_active` was set on every re-entry, and consecutive holds were honored up to the probe's own cap. Installing `adapters/qoder/` as a Desktop plugin is declared-unverified, and #116 — the state-location repair those runs exposed — is conditional on the plugin path handing over the same environment variables, which was not observed. The full per-build record lives in [`adapters/qoder/README.md`](adapters/qoder/README.md).

**Qoder IDE/CLI** reads project rules at `.qoder/rules/`. That is what the bundle's `rules/jiahao.md` is for: one rule file generated from the same source, registering nothing. Copy it into `.qoder/rules/`; the host-side loading there is declared-unverified, not live-probed. The directory README carries all three paths and the verification status.

### Plugin version — host-native command, with hooks

Eight self-contained bundles, each with its own install README. **A tier** means a live turn end was blocked by the gate on the recorded host build; details and receipts are in the linked README and [`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

| Host | Install | Tier |
| --- | --- | --- |
| Claude Code | `claude plugin marketplace add Xxx91n/jiahao` then `claude plugin install jiahao@jiahao` | Declared-unverified: live turn-end block not yet probed ([`adapters/claude-code/`](adapters/claude-code/)) |
| CodeBuddy | `codebuddy plugin install <path-to>/adapters/codebuddy` | Declared-unverified: CLI install path unprobed; the `.codebuddy/settings.json` merge is the verified fallback ([`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)) |
| GitHub Copilot CLI | `copilot plugin install <path-to>/adapters/copilot` | **A** — Copilot CLI 1.0.105, 2026-10-30 ([`adapters/copilot/README.md`](adapters/copilot/README.md)) |
| Codex CLI | `codex plugin marketplace add Xxx91n/jiahao` then `codex plugin add jiahao --marketplace jiahao` | **A** — codex-cli 0.163.0, 2026-10-30 ([`adapters/codex/README.md`](adapters/codex/README.md)) |
| Google Antigravity | `agy plugin install <path-to>/adapters/antigravity` | **A** — Antigravity 1.2.12, 2026-10-31 ([`adapters/antigravity/README.md`](adapters/antigravity/README.md)) |
| Qoder Desktop | Local archive via the Desktop app's plugin settings | **A** on both builds: CN 0.4.11 (#109), international 0.4.11 (#113); the plugin install path itself is declared-unverified ([`adapters/qoder/README.md`](adapters/qoder/README.md)) |
| ZCode | `zcode plugins marketplace add <path-to>/adapters/zcode` then `zcode plugins install jiahao@jiahao-zcode` | **A** — ZCode 3.16.2, 2026-10-31; all four hook surfaces observed post-merge 2026-11-01 ([`adapters/zcode/README.md`](adapters/zcode/README.md)) |
| WorkBuddy | `codebuddy plugin add <path-to>/adapters/workbuddy` (bundled CLI), or merge its hook map into `~/.workbuddy-ai/settings.json` / `~/.workbuddy/settings.json` | **A** on both variants: WorkBuddy AI 5.9.4 (#110), WorkBuddy 5.9.3 domestic (#118) ([`adapters/workbuddy/README.md`](adapters/workbuddy/README.md)) |

The MCP server stays in the repository at [`jiahao-mcp/`](https://github.com/Xxx91n/jiahao/tree/main/jiahao-mcp) but is not an install exit.

## Profile

The plugin version defaults to `verifier` when `.jiahao-profile` is absent. The flag lives under `CLAUDE_CONFIG_DIR`, else `$HOME`; when a hook gets neither it takes a config root the host reports (`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`, or `WORKBUDDY_CONFIG_DIR`), then the OS home — never `/tmp`. Write it with the installer; `-y` accepts the default and prints the value written:

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

Start a new session after changing the profile. The flag is shared by every agent on the same config directory; use separate `CLAUDE_CONFIG_DIR` values for concurrent profiles. The rules version has no runtime profile switch.

## Upgrade

The version comes from `package.json`. Rules version: re-run the same `npx skills add` with the scope flags you installed with (project scope without `-g`, global with `-g -a <host> -y --copy`); `npx skills update jiahao -g -y` updates a global install, and on skills 1.7.4 with a local-path source the project-scoped `update` reported no match — re-running `add` is the project upgrade path there. Plugin version (Claude Code): `claude plugin marketplace update jiahao`, then `claude plugin update jiahao@jiahao`. CodeBuddy re-applies its own install or the verified settings merge with the new bundle. Restart the session after upgrading. Upgrades do not touch `.jiahao-profile` or `.jiahao-active`.

## Boundaries and limitations

- The rules version is instructions only; hard blocking exists only in the plugin version's hooks.
- On a host without hook capability there is no resident injection — the fallback is on-demand skill invocation.
- Jiahao is not a replacement for unit tests or CI; it is the discipline that demands them. It targets False Completion Syndrome specifically, not general prompt optimization.
- Tier labels are release-period observations on named host builds, not permanent properties. `declared-unverified` means asserted from the host's files, not watched happening; [`docs/agents/evidence-review.md`](docs/agents/evidence-review.md) defines the labels.
- The private benchmark corpus `private/bench-corpus/` is a maintainer/CI asset: not in the npm package, not tracked here. The frozen records under `bench/` are tracked and are not the corpus. When a gate needs it, point `JIAHAO_CORPUS_DIR` at a local copy. With no corpus and no override, a gate that probes for the corpus exits 2 and names `bench-corpus` on an UNVERIFIABLE line, a direct corpus reader exits 1 with `[corpus] missing`, and a suite that needs it skips with a reason. Runtime hooks do not depend on it.
- If a second-party audit ends up sharing the generator's model, context, and data, stop and declare NOT VERIFIED — self-validation is coherence evidence, not independence evidence.

## Verification

```bash
npm test                                # Full Jest suite
node scripts/build-adapters.js --check  # Generated output sync check
node scripts/check-drift.js             # Profile and retired adapter drift check
npm run check:whitespace                # Trailing whitespace / EOF blank lines, untracked files included
npm run check:links                     # Relative links in packed Markdown resolve inside the package
```

`git diff --check` only sees the lines a diff carries, so it misses unstaged files and blank lines at the end of untracked files; `npm run check:whitespace` reads every tracked and untracked text file instead.

A release tag adds `npm run release:gate -- --tag vX.Y.Z`: the checks above plus tag/version match, packed-content audit, artifact SHA256, install dry-run, and the no-network assertion. [`docs/release.md`](docs/release.md) documents what the gate proves and how to re-run it on a clean checkout.

## License

MIT ([`package.json`](package.json)); no separate license file ships in this repository.
