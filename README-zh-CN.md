<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo-dark.png">
    <img src="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo.png" alt="jiahao 标志 —— 兜帽蒙面像" width="140">
  </picture>
</p>

<h1 align="center">Jiahao（嘉豪）</h1>

<p align="center">
  <a href="README.md">English</a> | <b>中文</b>
</p>

<p align="center">
  面向 AI 编程智能体的反自嗨、防虚假完工心智模型分发。<br>
  核心唯一信念：<b>“凭证即一切”</b>。
</p>

AI Agent 普遍存在虚假完工综合征：不测就宣称搞定、报错找补借口自我安慰、思维链里脑补自嗨、长篇大论小作文挤占工具行动、自造黑话复合词装高大上。

## 反自嗨五级行动阶梯

动作前置 · 探针锚定 · 红灯即停 · 目标核销 · 三行硬锁。完整行为契约见 [`src/SKILL.md`](src/SKILL.md)。

## 安装

所有出口共用一份内容源。**规则版只有指令；插件版才有钩子和强制拦截。**

### 规则版 —— 标准 CLI，只有指令

```bash
npx skills add Xxx91n/jiahao
```

把 `skills/jiahao/SKILL.md` 装进读取标准 Agent Skills 目录的宿主。文件里两份纪律都在，宿主自行取用。没有钩子运行，因此不会拦截任何动作。6 个纯指令适配器目录（aider、cline、cursor、instruction-tier、opencode、windsurf）已退役；没有标准技能目录的宿主（例如 aider）在这个版本里没有打包适配器，但可以把生成的 `skills/jiahao/SKILL.md` 当普通文本复制过去。

#### Qoder：Desktop 与 IDE/CLI（C 档，只有规则）

Qoder 现在有两个产品，读的路径不同。**Qoder Desktop**（0.x 工作台）通过标准技能目录加载规则版；Qoder CN 上，#106 在 Desktop 0.4.11 上检查到用户级规则路径未被加载。请把规则版装进它的标准技能目录：

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN → ~/.qoder-cn/skills/jiahao/SKILL.md
```

2026-10-31 的安装命令 exit 0，落地的 `SKILL.md` 与仓库里的 `skills/jiahao/SKILL.md` SHA-256 一致（Run A）。新开独立会话能看到该技能，这是 #106 另一次运行（Run B）的记录，本次未重跑（见[运行记录](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md)）。国际版别名是 `-a qoder`，其落地路径与加载本机尚未真机验证。两种都只加载规则，没有强制。

**Qoder IDE/CLI** 读取项目级 `.qoder/rules/`。这正是 [`adapters/qoder/`](adapters/qoder/) 的用途：规则文件与规则版同源，没有任何钩子。把 `rules/jiahao.md` 复制到 `.qoder/rules/`；这条路径的宿主加载行为属于 declared-unverified，尚未真机验证。两条安装路径与验证状态见该目录 README。

### 插件版 —— 宿主原生命令，带钩子

CodeBuddy 是五个插件目录之一（另外四个是 Claude Code、GitHub Copilot CLI、Codex CLI 与 ZCode，见下文）：

```bash
codebuddy plugin install <path-to>/adapters/codebuddy
```

插件默认关闭（`defaultEnabled: false`），安装后需要显式启用。随后用安装器写入 profile（`node scripts/install.js init -y`），它会打印实际写入的值（见 Profile）。启用后 `hooks/hooks.json` 接上 verifier 纪律的强制拦截。插件同时带两份 `alwaysApply: true` 的规则文件；规则级 profile 选择属于待确认，强制层是钩子。CLI 插件安装路径已记录但属于待确认；现场验证过的回退路径是合并 `.codebuddy/settings.json`。完整安装步骤、钩子表，以及已验证 / 待确认边界见 [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)。Claude Code 是第二个插件目录：自包含插件在 [`adapters/claude-code/`](adapters/claude-code/)，用仓库根的 marketplace 安装——`claude plugin marketplace add Xxx91n/jiahao`、`claude plugin install jiahao@jiahao`。钩子表与尚未真机验证的部分见该目录的 README。

mcp 目录不再作为安装出口；MCP 服务端本身保留在 [`jiahao-mcp/`](https://github.com/Xxx91n/jiahao/tree/main/jiahao-mcp)。GitHub Copilot CLI 是第三个自包含目录（`copilot plugin install <路径>/adapters/copilot`），档位是 **A 档**：2026-10-30 在 Copilot CLI 1.0.105 的真机会话里，假完工只在 `agentStop` 以 exit 0 返回 `{decision:"block"}` 后继续；exit 2 不阻断；连续 8 次阻断续跑后，第 9 次阻断时 CLI 结束回合。方言（驼峰事件名、bash / powershell 两支、决策字段阻断）、`.claude/settings.json` 实测与证据路径都写在它的 README 里。Codex CLI 是第四个自包含目录，用仓库里的 Codex marketplace（`.agents/plugins/marketplace.json`）安装——`codex plugin marketplace add Xxx91n/jiahao`、`codex plugin add jiahao --marketplace jiahao`；它的钩子命令要一次性信任（`/hooks`），Codex 0.163.0 默认就开着钩子（未信任插件的钩子在 `codex exec` 里被静默跳过，无人值守需持久化信任或 `--dangerously-bypass-hook-trust`）。Codex 同样是 **A 档**：2026-10-30 在 codex-cli 0.163.0 的真机会话里，回合只在 Stop 以 exit 0 返回 `{decision:"block"}` 后继续；exit 2 + stderr 不阻断。细节与证据路径见 [`adapters/codex/README.md`](adapters/codex/README.md) 与 [docs/evidence/v0.3.0/](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)。ZCode 是第五个自包含目录，用包内自带货架安装——`zcode plugins marketplace add <路径>/adapters/zcode` 后 `zcode plugins install jiahao@jiahao-zcode`（直接 `zcode plugins install <目录>` 会被宿主拒绝），档位是 **A 档**：2026-10-31 在 ZCode 3.16.2 的真机会话里，回合收尾被 Stop 以 exit 0 返回 `{decision:"block"}` 拦下，阻断原因作为下一回合的上下文回注。它的 README 写明七事件方言（没有 sweep 钩子：宿主不存在 `SessionEnd`）、载荷双拼写与证据路径。

### Profile

插件版在没有 `.jiahao-profile` 时缺省为 `verifier`。标记文件位于 `CLAUDE_CONFIG_DIR`，未设置时取 `$HOME`，两者都没有时兜底 `/tmp`。在克隆里运行安装器；`-y` 接受缺省值并打印实际写入的值：

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

改完 profile 后要重开会话。标记文件由同一个配置目录下的所有 agent 共用；并发使用不同 profile 时，给每个 agent 单独的 `CLAUDE_CONFIG_DIR`。

规则版没有运行时 profile 切换。

### 升级

版本号只在 `package.json` 里。规则版：重跑安装时那条 `npx skills add`，范围参数保持一致——项目级不带 `-g`，全局级带 `-g -a <host> -y --copy`。`npx skills update jiahao -g -y` 只更新全局安装；skills 1.7.4 在本机（Windows、本地路径源）的项目级 `update` 报无匹配并 exit 127；在该环境下项目级用重跑 `add` 升级。插件版（Claude Code）：`claude plugin marketplace update jiahao`，再 `claude plugin update jiahao@jiahao`。CodeBuddy 用宿主自己的插件更新/安装路径（CLI 安装路径 declared-unverified，见 [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)），或用新的 bundle 重做已验证的 settings 合并。升级后重开会话。升级不改配置目录里的 `.jiahao-profile` 与 `.jiahao-active`。

### 私有语料

私有评测语料 `private/bench-corpus/` 是维护者/CI 资产：不在 npm 包里，也不在本仓库的跟踪文件里。`bench/` 下的冻结评测记录是跟踪的，不属于这份私有语料。门禁需要时，用 `JIAHAO_CORPUS_DIR` 指向本地副本。运行时钩子不依赖它。

## 本地物理检验

以下命令在磁盘上检查代码、生成产物与仓库状态：

```bash
npm test                                # 全量 Jest 测试
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役出口漂移检查
npm run check:whitespace                # 行尾空白 / EOF 空行，未跟踪文件也算
npm run check:links                     # 包里 Markdown 的相对链接必须落在包内
```

`git diff --check` 只看看 diff 带出来的行，没 `git add` 过的新文件和未跟踪文件末尾的空行都会漏掉；`npm run check:whitespace` 直接读全部已跟踪与未跟踪的文本文件。

发布 tag 上还会多跑一条 `npm run release:gate -- --tag vX.Y.Z`：把上面的检查与 tag/版本一致、包内容断言、产物 SHA256、安装 dry-run、无网络外呼合并成一道门。门禁证明什么、包里有什么、安装会写哪里、怎么在干净检出上复跑，见 [`docs/release.md`](docs/release.md)。

## 开源协议

MIT
