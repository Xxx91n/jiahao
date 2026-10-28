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

两个出口共用一份内容源。**规则版只有指令；插件版才有钩子和强制拦截。**

### 规则版 —— 标准 CLI，只有指令

```bash
npx skills add Xxx91n/jiahao
```

把 `skills/jiahao/SKILL.md` 装进读取标准 Agent Skills 目录的宿主。文件里两份纪律都在，宿主自行取用。没有钩子运行，因此不会拦截任何动作。6 个纯指令适配器目录（aider、cline、cursor、instruction-tier、opencode、windsurf）已退役；没有标准技能目录的宿主（例如 aider）在这个版本里没有打包适配器，但可以把生成的 `skills/jiahao/SKILL.md` 当普通文本复制过去。

### 插件版 —— 宿主原生命令，带钩子

CodeBuddy 是两个插件出口之一（另一个是 Claude Code，见本节末）：

```bash
codebuddy plugin install <path-to>/adapters/codebuddy
```

插件默认关闭（`defaultEnabled: false`），安装后需要显式启用。随后用安装器写入 profile（`node scripts/install.js init -y`），它会打印实际写入的值（见 Profile）。启用后 `hooks/hooks.json` 接上 verifier 纪律的强制拦截。插件同时带两份 `alwaysApply: true` 的规则文件；规则级 profile 选择属于待确认，强制层是钩子。CLI 插件安装路径已记录但属于待确认；现场验证过的回退路径是合并 `.codebuddy/settings.json`。完整安装步骤、钩子表，以及已验证 / 待确认边界见 [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)。Claude Code 是第二个插件出口：自包含插件目录在 [`adapters/claude-code/`](adapters/claude-code/)，用仓库根的 marketplace 安装——`claude plugin marketplace add Xxx91n/jiahao`、`claude plugin install jiahao@jiahao`。钩子表与尚未真机验证的部分见该目录的 README。

codex、copilot、qoder、mcp 目录不再作为安装出口；MCP 服务端本身保留在 [`jiahao-mcp/`](jiahao-mcp/)。

### Profile

插件版在没有 `.jiahao-profile` 时缺省为 `verifier`。标记文件位于 `CLAUDE_CONFIG_DIR`，未设置时取 `$HOME`，两者都没有时兜底 `/tmp`。在克隆里运行安装器；`-y` 接受缺省值并打印实际写入的值：

```bash
node scripts/install.js init -y
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

改完 profile 后要重开会话。标记文件由同一个配置目录下的所有 agent 共用；并发使用不同 profile 时，给每个 agent 单独的 `CLAUDE_CONFIG_DIR`。

规则版没有运行时 profile 切换。

### 私有语料

私有评测语料 `private/bench-corpus/` 是维护者/CI 资产：不在 npm 包里，也不在本仓库的跟踪文件里。`bench/` 下的冻结评测记录是跟踪的，不属于这份私有语料。门禁需要时，用 `JIAHAO_CORPUS_DIR` 指向本地副本。运行时钩子不依赖它。

## 本地物理检验

以下命令在磁盘上检查代码、生成产物与仓库状态：

```bash
npm test                                # 全量 Jest 物理测试（20 套件）
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役出口漂移检查
git diff --check                        # 格式与行尾空格检查
```

## 开源协议

MIT
