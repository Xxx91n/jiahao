# 发布门禁（Release gate）

这个文件回答三件事：tag 上要跑什么才算能发、产物是什么、安装会写到哪里。

门禁脚本是 `scripts/release-gate.js`，一条命令跑完，任一步失败就红。

## 一条命令

```bash
npm run release:gate -- --tag v0.2.0
```

tag 推送时 CI 跑同一条命令（`.github/workflows/ci.yml` 的 `release-gate` job），tag 从 `GITHUB_REF_NAME` 读，产物和证据落在 `release-artifacts/` 并作为构建产物上传。

本地想只跑某几步用 `--only metadata,generated`；想把证据落盘用 `--evidence release-evidence.json`；想把 tarball 留下载给发布用 `--artifact-dir release-artifacts`。

## 门禁清单

| 步骤 | 检查什么 | 对应验收 |
| --- | --- | --- |
| `metadata` | tag 形如 `vX.Y.Z`；`package.json` 版本 == tag；两个插件清单版本一致且能解析；工作区干净；HEAD 就是 tag 指向的提交 | 版本号与 tag 一致 |
| `generated` | `build-adapters.js --check`：已提交的生成物 == 生成器输出 | 生成检查 |
| `drift` | `check-drift.js`：两份 profile 片段在位，退役适配器目录没有复活 | 漂移检查 |
| `tests` | `npm test`：全套用例，含 `test/packaging.test.js` 的打包断言 | 测试 + 打包断言 |
| `artifact` | 跑测试后先确认工作区仍然干净；再打两次 `npm pack`：必须包含 / 必须排除逐条核过，两次字节相同才算可复现，算 `sha256`，算三个目录的树哈希 | 包内容正确、产物附 SHA256、可复现 |
| `install` | `install.js init --dry-run` 退出 0、打印目标路径；临时配置目录和临时工作目录里都没有落文件 | 安装 dry-run |
| `egress` | 扫描会随安装跑起来的代码：没有 `http/http2/https/net/dns/tls/dgram` 的 require、没有 `fetch(` / `https.request`；`package.json` 没有安装生命周期脚本；两个插件的每条钩子命令都指向 `${CLAUDE_PLUGIN_ROOT}/hooks/*.js` | 无网络外呼 |
| `declarations` | 本文件带着「写入范围」「无网络外呼」两节；写入范围表逐个列出代码会写的路径；README 链到这里 | 写入范围声明 |

顺序是刻意的：生成检查排在 `npm test` 前面。三个用例会在跑测试时重跑生成器、把 `adapters/` 与 `skills/` 重写一遍（#66 在收），跑完再查生成物就等于拿生成结果比自己。`artifact` 因此在打包前再看一次 `git status`：如果测试真的改动了已跟踪文件，这棵树已经不是 tag 那棵树，不能拿来算哈希。

tag 的 CI job 在门禁之前还跑一条 `git show --check HEAD`：分支 job 因为跳过 tag 而不跑那条白空格检查，这条补上。

## 产物与 SHA256

- 产物是 `npm pack` 打出的 `jiahao-<version>.tgz`。npm 固定了包内时间戳，同一棵树打两次字节相同——门禁真的打两次并比对 `sha256`，不同就是红，所以这个哈希才值得引用。
- 门禁最后打印：tarball 大小、`sha256`、三个目录的树哈希。树哈希 = 把目录里每个文件的 `sha256` 按路径排序拼起来再哈希一次，用来一眼看出是哪个出口（规则版 / CodeBuddy / Claude Code）变了。
- 带 `--artifact-dir` 时 tarball 被留下，并在旁边写 `jiahao-<version>.tgz.sha256`（`sha256sum -c` 直接可验）。带 `--evidence` 时同一批数字落进 JSON，CI 把两者都作为构建产物上传。
- 包里为什么还有 `.claude-plugin/marketplace.json`：它是插件版的 marketplace 清单，`source` 指向 `./adapters/claude-code`。少了它，tarball 只能是"两个插件目录的副本"，不能当 marketplace 根用。所以它进了 `files`，也进了必须包含清单。

发布打 `v0.2.0` 时该记下的值（由 `#64` 填，本文件在 tag 之前留空）：

```text
artifact  jiahao-0.2.0.tgz
sha256    <tag 上跑门禁得到>
trees     skills/jiahao, adapters/codebuddy, adapters/claude-code
```

## 写入范围

会写哪些文件，按代码事实列（`src/shared/paths.js`、`scripts/install.js`、`hooks/*.js`）。

`<config>` 指配置目录：`$CLAUDE_CONFIG_DIR`，没有就用 `$HOME`，两者都没有时退到 `/tmp`。

| 谁写 | 写什么 | 什么时候 |
| --- | --- | --- |
| `scripts/install.js init` | `<config>/.jiahao-profile` | 手工执行安装命令 |
| 同上 | `<config>/private/phrases.json` | 同上（检出里有 `private/` 时） |
| 同上 | `<config>/private/bench-corpus/*` | 同上（同上） |
| 同上 | `<config>/.jiahao-persistence.json` | 同上 |
| 同上 | `<config>/.jiahao-evidence/`、`<config>/.jiahao-evidence.keys` | 同上；首次安装没有证据时是空操作 |
| 钩子 SessionStart | `<config>/.jiahao-active`（不存在时写 `full`） | 每个会话开始 |
| 钩子 UserPromptSubmit | `<config>/.jiahao-active` | 模式命令（`lite\|full\|ultra`） |
| 钩子 Stop / SubagentStop | `<config>/.jiahao-evidence/*.jsonl`、`.jiahao-evidence.keys`、`.jiahao-anchor.json` | 每次判定 |
| 钩子 PreToolUse / InstructionsLoaded | `<config>/.jiahao-pretool.jsonl`、`<config>/.jiahao-instructions.jsonl` | 每次命中 |
| 宿主（插件版） | 宿主自己的插件目录 | `claude plugin install` / `codebuddy plugin install` |
| 宿主（规则版） | 宿主自己的技能目录，落地 `<host>/skills/jiahao/SKILL.md` | `npx skills add` |

范围之外：不改系统设置，不写仓库以外的源码目录，不在当前工作目录落文件。所有运行时写入都落在 `<config>` 下。

## 无网络外呼

「外呼」就是往外发网络请求。这一节声明：**jiahao 自己的代码不联网。** 安装不下载、不执行任何远程脚本：`node scripts/install.js` 是仓库里的本地文件，两个插件目录是本地目录，复制即可。

这条声明由门禁的 `egress` 步骤每次重跑，不是一次性的口头保证：

- 扫描装到用户机器上会跑的代码：`scripts/install.js`、`hooks/`、`src/`、`jiahao-mcp/index.js`。命中网络模块（`http`/`http2`/`https`/`net`/`dns`/`tls`/`dgram`）或网络调用（`fetch(`、`https.request`）即红。
- 两个插件目录里的钩子与 `src/` 是这些文件的逐字节副本（`generated` 步骤每次重算比对），所以扫源目录就等于扫随插件发出去的那份。
- 扫描如果连 `scripts/install.js`、`hooks/jiahao-verdict-gate.js`、`src/evidence-log.js`、`jiahao-mcp/index.js` 都没扫到，直接红——扫不到东西的检查不算检查。
- `package.json` 出现 `preinstall`/`install`/`postinstall`/`prepare`/`prepack` 即红；插件钩子命令只要不是包内 `hooks/*.js` 即红。

维护者工具（门禁脚本、生成器、漂移检查）不在扫描范围内：它们不是安装路径。已知边界：静态正则抓不到动态 `require()` 拼出来的模块名。

两条已披露的例外，都不在 jiahao 的代码里：

1. 规则版的安装命令 `npx skills add` 会由 npx 到 npm 源取第三方 CLI（`skills`），再由它拉本仓库。这是宿主的安装工具，不是我们随包带的脚本。
2. CodeBuddy 插件的 MCP 服务端（`jiahao-mcp/`）依赖要自己 `npm install --omit=dev`。Claude Code 插件不带 MCP 服务端，没有这一步。

## 在干净检出上复跑

```bash
git clone --depth 1 --branch v0.2.0 https://github.com/Xxx91n/jiahao.git /tmp/jiahao-clean
cd /tmp/jiahao-clean && npm ci
npm run release:gate -- --tag v0.2.0
```

对账点：`RELEASE GATE GREEN` 那行、`sha256`、三个 tree 哈希，应与发布时记录的值逐字相同。

复跑这件事的机器证据有三层：tag 的 CI job 本身就是一次全新检出；门禁对同一棵树连打两次包并比对 `sha256`；本命令让任何人在自己机器上再走一遍，比对上一步打印的数字。

## 已知限制

- 版本号只有 `package.json` 一处，两个插件清单由生成器从它抄，不手改。
- `npm test` 会在工作区重写生成物（#66）。门禁把生成检查放在测试前，打包前再查一次工作区是否仍干净；本地跑完 `git status` 可能不干净，提交前要看清改了什么。
- 不发布到 npm：tarball 是发布产物和复跑证据，不是分发渠道。规则版走 git tag，插件版走宿主原生命令。
- 门禁不调用官方 Agent Skills 规范校验器，也不跑标准 CLI 的真实安装；那两条在 #67。
- 「必须排除」这一半今天不会触发：`files` 是白名单，`private/`、`bench/`、`docs/research/` 本来就不在里面。它守的是以后有人把白名单放宽（比如加 `bench/`、把 `docs/agents/` 换成 `docs/`）的那一天。
