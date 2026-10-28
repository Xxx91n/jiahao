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

把 `skills/jiahao/SKILL.md` 装进读取标准 Agent Skills 目录的宿主。文件里两份纪律都在，宿主自行取用。没有钩子运行，因此不会拦截任何动作。原先使用纯指令适配器（aider、cline、cursor、instruction-tier、opencode、windsurf）的宿主改走这条路径。

### 插件版 —— 宿主原生命令，带钩子

本仓库里自包含的插件出口是 CodeBuddy：

```bash
codebuddy plugin install <path-to>/adapters/codebuddy
```

插件注册 `hooks/hooks.json`，verifier 纪律由钩子强制执行。完整安装步骤、钩子表，以及已验证 / 待确认边界见 [`adapters/codebuddy/README.md`](adapters/codebuddy/README.md)。Claude Code 是第二个插件出口；它的自包含插件目录还没进这棵树，因此这里不发布安装命令。

codex、copilot、qoder、mcp 目录不再作为安装出口；MCP 服务端本身保留在 [`jiahao-mcp/`](jiahao-mcp/)。

### Profile

插件版在没有 `.jiahao-profile` 时缺省为 `verifier`。在克隆里运行安装器，它会打印实际写入的值：

```bash
node scripts/install.js init --profile verifier
# Wrote "verifier" to <config-dir>/.jiahao-profile
```

规则版没有运行时 profile 切换。

### 私有语料

评测语料是维护者/CI 资产：不在 npm 包里，也不在本仓库的跟踪文件里。门禁需要时，用 `JIAHAO_CORPUS_DIR` 指向本地副本。运行时钩子不依赖它。

## 本地物理检验

以下命令在磁盘上检查代码、生成产物与仓库状态：

```bash
npm test                                # 全量 Jest 物理测试（19 套件）
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役出口漂移检查
git diff --check                        # 格式与行尾空格检查
```

## 开源协议

MIT
