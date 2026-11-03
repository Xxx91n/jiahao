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

AI Agent 不测就宣称搞定、报错找借口自我安慰、长篇小作文挤占工具行动、自造黑话装高深。嘉豪装进去的是一份反制这些症状的行为契约；在支持钩子的宿主上，还会装上一道在回合结束前拦住无凭证声明的门。

## 装的是什么

反自嗨五级行动阶梯：动作前置、探针锚定、红灯即停、目标核销、三行硬锁。完整行为契约见 [`src/SKILL.md`](src/SKILL.md)，术语表在 [`GLOSSARY.md`](GLOSSARY.md)。

两种发行形态共用一份内容源：

- **规则版** —— `skills/jiahao/SKILL.md`，只有指令。没有钩子运行，不会拦截任何动作。
- **插件版** —— `adapters/` 下八个自包含目录，各自接上宿主钩子，由 verifier 门禁在回合收尾拦住虚假完工。

## 安装

所有出口共用一份内容源。**规则版只有指令；插件版才有钩子和强制拦截。**

### 规则版 —— 标准 CLI，只有指令

```bash
npx skills add Xxx91n/jiahao
```

把 `skills/jiahao/SKILL.md` 装进读取标准 Agent Skills 目录的宿主。文件里两份纪律都在，宿主自行取用。

6 个纯指令适配器目录（aider、cline、cursor、instruction-tier、opencode、windsurf）已退役。没有标准技能目录的宿主在本版本没有打包适配器，可以把生成的 `skills/jiahao/SKILL.md` 当普通文本复制过去。

#### Qoder：Desktop 插件出口（两个 Desktop 变体都是 A 档）与 IDE/CLI 规则（C 档）

Qoder 有两个产品线，读的路径不同。**Qoder Desktop**（0.x 工作台）把规则版装进它的标准技能目录——Qoder CN Desktop 0.4.11 上，#106 探到 `~/.qoder` 下的用户级 `rules/` 目录未被加载（该次检查只测了这一条规则路径），所以 CN 安装走 CN 自己的技能目录：

```bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # → ~/.qoder-cn/skills/jiahao/SKILL.md
```

2026-10-31 的安装 exit 0，落地文件的 SHA-256 与 `skills/jiahao/SKILL.md` 一致（[运行记录](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md)）。CN 技能路径只加载规则，没有强制。国际版别名 `-a qoder` 写 `~/.qoder/skills/`，落地路径与加载未真机验证。要强制，是自包含目录 [`adapters/qoder/`](adapters/qoder/)，由 Desktop 的插件设置以本地压缩包安装。两个 Desktop 变体都 **A 档**，各自经项目级 `.qoder/settings.json` 的 `Stop` 钩子实测——Qoder CN Desktop 0.4.11 于 2026-10-31（[qoder-hook-probe-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md)，#109），国际版 Desktop 0.4.11 于 2026-11-01（[qoder-intl-hook-probe-2026-11-01.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md)，#113）。两个版本上 `Stop` 钩子都在两条通道按住过真实回合收尾（exit 0 返回扁平 `{"decision":"block"}`，以及 exit 2 + stderr），每次重入 `stop_hook_active` 都置 true，连续按住数到探针自带上限为止。把 `adapters/qoder/` 当 Desktop 插件安装属 declared-unverified；#116 修的状态落点缺陷，在插件路径上以「同一套环境变量」为前提，那条路径没有观测过。分版本的完整记录见 [`adapters/qoder/README.md`](adapters/qoder/README.md)。

**Qoder IDE/CLI** 读取项目级 `.qoder/rules/`。该目录里的 `rules/jiahao.md` 就是这个出口：规则文件与规则版同源，不注册任何东西。把它复制到 `.qoder/rules/`；这条路径的宿主加载行为属于 declared-unverified，尚未真机验证。三条路径与验证状态见该目录 README。

### 插件版 —— 宿主原生命令，带钩子

八个自包含目录，各有自己的安装 README。**A 档**指在记录的宿主版本上真机拦下过回合收尾；细节与凭证在链接的 README 和 [`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)。

| 宿主 | 安装 | 档位 |
| --- | --- | --- |
| Claude Code | `claude plugin marketplace add Xxx91n/jiahao` 后 `claude plugin install jiahao@jiahao` | declared-unverified：真机回合拦截尚未实测（[`adapters/claude-code/`](adapters/claude-code/)） |
| CodeBuddy | `codebuddy plugin install <路径>/adapters/codebuddy` | declared-unverified：CLI 安装路径未实测；已验证的回退是合并 `.codebuddy/settings.json`（[`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)） |
| GitHub Copilot CLI | `copilot plugin install <路径>/adapters/copilot` | **A** —— Copilot CLI 1.0.105，2026-10-30（[`adapters/copilot/README.md`](adapters/copilot/README.md)） |
| Codex CLI | `codex plugin marketplace add Xxx91n/jiahao` 后 `codex plugin add jiahao --marketplace jiahao` | **A** —— codex-cli 0.163.0，2026-10-30（[`adapters/codex/README.md`](adapters/codex/README.md)） |
| Google Antigravity | `agy plugin install <路径>/adapters/antigravity` | **A** —— Antigravity 1.2.12，2026-10-31（[`adapters/antigravity/README.md`](adapters/antigravity/README.md)） |
| Qoder Desktop | Desktop 插件设置里装本地压缩包 | 两个变体都 **A 档**：CN 0.4.11（#109）、国际版 0.4.11（#113）；插件安装路径本身 declared-unverified（[`adapters/qoder/README.md`](adapters/qoder/README.md)） |
| ZCode | `zcode plugins marketplace add <路径>/adapters/zcode` 后 `zcode plugins install jiahao@jiahao-zcode` | **A** —— ZCode 3.16.2，2026-10-31；四个钩子面 2026-11-01 合并后实测（[`adapters/zcode/README.md`](adapters/zcode/README.md)） |
| WorkBuddy | 自带 CLI 用 `codebuddy plugin add <路径>/adapters/workbuddy`，或把钩子表并进 `~/.workbuddy-ai/settings.json` / `~/.workbuddy/settings.json` | 两个变体都 **A 档**：WorkBuddy AI 5.9.4（#110）、国内版 5.9.3（#118）（[`adapters/workbuddy/README.md`](adapters/workbuddy/README.md)） |

MCP 服务端留在仓库 [`jiahao-mcp/`](https://github.com/Xxx91n/jiahao/tree/main/jiahao-mcp)，不是安装出口。

## Profile

插件版在没有 `.jiahao-profile` 时缺省为 `verifier`。标记文件位于 `CLAUDE_CONFIG_DIR`，未设置取 `$HOME`；两者都没有取宿主报出的配置根（`QODER_CONFIG_DIR`、`CODEBUDDY_CONFIG_DIR` 或 `WORKBUDDY_CONFIG_DIR`），再没有退到操作系统家目录，不退到 `/tmp`。用安装器写入；`-y` 接受缺省并打印实际写入值：

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

改完 profile 重开会话。标记文件由同一配置目录下的所有 agent 共用；并发用不同 profile 时给各自单独的 `CLAUDE_CONFIG_DIR`。规则版没有运行时 profile 切换。

## 升级

版本号只在 `package.json` 里。规则版：重跑安装时那条 `npx skills add`，范围参数保持一致（项目级不带 `-g`，全局级带 `-g -a <host> -y --copy`）；`npx skills update jiahao -g -y` 只更新全局安装，skills 1.7.4 在本地路径源下项目级 `update` 报无匹配——该环境用重跑 `add` 升级。插件版（Claude Code）：`claude plugin marketplace update jiahao`，再 `claude plugin update jiahao@jiahao`。CodeBuddy 走自己的安装路径，或用新 bundle 重做已验证的 settings 合并。升级后重开会话。升级不改 `.jiahao-profile` 与 `.jiahao-active`。

## 边界与限制（limitations）

- 规则版只有指令；硬拦截只存在于插件版的钩子里。
- 宿主没有钩子能力就没有驻留注入——回退方式是按需调用技能。
- 嘉豪不替代单测或 CI，它是要你来跑单测和 CI 的纪律。目标是虚假完工综合征，不是通用提示词优化。
- 档位是具名宿主版本在发布期的实测结论，不是永久属性。`declared-unverified` 指从宿主文件断言、没看着发生；标签定义见 [`docs/agents/evidence-review.md`](docs/agents/evidence-review.md)。
- 私有评测语料 `private/bench-corpus/` 是维护者/CI 资产：不在 npm 包里，也不被本仓库跟踪。`bench/` 下的冻结记录是跟踪的，不属于这份语料。门禁需要时用 `JIAHAO_CORPUS_DIR` 指向本地副本。既没有语料也没有覆盖时，先做能力检查的脚本以 exit 2 退出并在一行 UNVERIFIABLE 里点名 `bench-corpus`，直接读语料的脚本以 exit 1 打印 `[corpus] missing`，需要它的测试套件带理由跳过。运行时钩子不依赖它。
- 第二方审计若与生成方共用模型、上下文、数据，停下来声明 NOT VERIFIED——自证只是连贯性证据，不是独立性证据。

## 本地物理检验

```bash
npm test                                # 全量 Jest 测试
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役出口漂移检查
npm run check:whitespace                # 行尾空白 / EOF 空行，未跟踪文件也算
npm run check:links                     # 包里 Markdown 的相对链接必须落在包内
```

`git diff --check` 只看 diff 带的行，没 `git add` 的新文件、未跟踪文件末尾的空行都会漏；`npm run check:whitespace` 直接读全部已跟踪与未跟踪的文本文件。

发布 tag 多跑一条 `npm run release:gate -- --tag vX.Y.Z`：上面的检查加 tag/版本一致、包内容断言、产物 SHA256、安装 dry-run、无网络外呼。门禁证明什么、怎么在干净检出复跑，见 [`docs/release.md`](docs/release.md)。

## 开源协议

MIT（[`package.json`](package.json)）；仓库里没有单独的 LICENSE 文件。
