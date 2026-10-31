# 发布门禁（Release gate）

这个文件回答三件事：tag 上要跑什么才算能发、产物是什么、安装会写到哪里。

门禁脚本是 `scripts/release-gate.js`，一条命令跑完，任一步失败就红。

## 一条命令

```bash
npm run release:gate -- --tag v0.3.0
```

tag 推送时 CI 跑同一条命令（`.github/workflows/ci.yml` 的 `release-gate` job），tag 从 `GITHUB_REF_NAME` 读，产物和证据落在 `release-artifacts/` 并作为构建产物上传。

本地想只跑某几步用 `--only metadata,generated`（这种部分运行退出码是 3，不是 0：只跑了几步不算发布结论）；想把证据落盘用 `--evidence release-artifacts/release-evidence.json`（别写到仓库根：那是未忽略的未跟踪文件，下一次运行的「工作区干净」检查会红）；想把 tarball 留下载给发布用 `--artifact-dir release-artifacts`。

## 门禁清单

| 步骤 | 检查什么 | 对应验收 |
| --- | --- | --- |
| `metadata` | tag 形如 `vX.Y.Z`；`package.json` 版本 == tag；每个插件清单版本一致且能解析；工作区干净；HEAD 就是 tag 指向的提交 | 版本号与 tag 一致 |
| `generated` | `build-adapters.js --check`：已提交的生成物 == 生成器输出 | 生成检查 |
| `drift` | `check-drift.js`：两份 profile 片段在位，退役适配器目录没有复活 | 漂移检查 |
| `tests` | `npm test`：全套用例，含 `test/packaging.test.js` 的打包断言 | 测试 + 打包断言 |
| `links` | `check-doc-links.js`：包里每份 Markdown 的相对链接都落到包内（文件或目录）；指到没进 `files` 的路径即红，外链不查 | 包内文档链接可达 |
| `artifact` | 跑测试后先确认工作区仍然干净；再打两次 `npm pack`：必须包含 / 必须排除逐条核过，两次字节相同才算可复现，算 `sha256`，算各出口目录的树哈希 | 包内容正确、产物附 SHA256、可复现 |
| `install` | `install.js init --dry-run` 退出 0、打印目标路径；临时配置目录和临时工作目录里都没有落文件 | 安装 dry-run |
| `egress` | 扫描会随安装跑起来的代码：没有 `http/http2/https/net/dns/tls/dgram` 的 require、没有 `fetch(` / `https.request`；`package.json` 没有安装生命周期脚本；四个插件的每条钩子命令都指向各自插件根，且平台名后缀按方言校验：`${CLAUDE_PLUGIN_ROOT}/hooks/*.js`（Claude Code / CodeBuddy），`$PLUGIN_ROOT` / `$env:PLUGIN_ROOT`（Copilot CLI），`${PLUGIN_ROOT}/hooks/*.js codex`（Codex） | 无网络外呼 |
| `declarations` | 本文件带着「写入范围」「无网络外呼」两节；写入范围表的行里逐个出现代码会写的路径；README 链到这里 | 写入范围声明 |

顺序是刻意的：生成检查排在 `npm test` 前面，过期或手改的产物在测试之前就被抓住。测试套件不再重跑生成器改写工作区（#76 收了 #66：生成类用例只写临时目录，产物内容从内存里的生成结果读；有一条哨兵用例会临时往产物里塞手改，跑完子进程里两个曾读工作区产物的套件后恢复，用来证明手改不会被抹掉），所以这个顺序是保险，而不是唯一的保障。`artifact` 仍在打包前再看一次 `git status`：万一有测试写脏了已跟踪文件，这棵树已经不是 tag 那棵树，不能拿来算哈希。

tag 的 CI job 在门禁之前还跑一条 `git diff --check HEAD^1 HEAD` 和一条 `npm run check:whitespace`：分支 job 因为跳过 tag 而不跑这两条，这里补上。（`git diff --check` 用 `HEAD^1` 而不是 `git show --check`：合并提交上 `git show` 是组合 diff，什么都不报。它只看 diff 带的行，未跟踪文件靠 `check:whitespace`。）

## 产物与 SHA256

- 产物是 `npm pack` 打出的 `jiahao-<version>.tgz`。npm 固定了包内时间戳，同一棵树打两次字节相同——门禁真的打两次并比对 `sha256`，不同就是红，所以这个哈希才值得引用。
- 门禁最后打印：tarball 大小、`sha256`、各出口目录的树哈希。树哈希 = 把目录里每个文件的 `sha256` 按路径排序拼起来再哈希一次，用来一眼看出是哪个出口（规则版 / CodeBuddy / Claude Code / Copilot CLI / Codex / Qoder IDE/CLI 规则出口）变了。
- 带 `--artifact-dir` 时 tarball 被留下，并在旁边写 `jiahao-<version>.tgz.sha256`（`sha256sum -c` 直接可验）。带 `--evidence` 时同一批数字落进 JSON，CI 把两者都作为构建产物上传。
- 包里为什么还有两份 marketplace 清单：`.claude-plugin/marketplace.json` 是 Claude Code 的入口（`source` 指向 `./adapters/claude-code`），`.agents/plugins/marketplace.json` 是 Codex 的入口（`source.path` 指向 `./adapters/codex`）。少了它们，tarball 只能是"插件目录的副本"，不能当对应宿主的 marketplace 根用。两份都进了 `files`，也进了必须包含清单。

`v0.3.0` 的产物数字以 **GitHub Release 正文**为准。这份文件在 tarball 里，写自己的 `sha256` 会让记录指向另一棵树。tag 上跑出的 `artifact`、`sha256`、当时的各出口 tree 哈希，连真机验收记录一起记在该版本的发布说明与 Release 里（[`docs/release-notes-v0.2.0.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/release-notes-v0.2.0.md)、[`docs/release-notes-v0.3.0.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/release-notes-v0.3.0.md)）；那些说明不在包里，也不在各自版本的 tree 哈希范围内，所以不会改变被记录的那棵树。这里用 GitHub 绝对链接，因为 npm 包里没有这些说明。

## 升级路径

版本号只有 `package.json` 一处，每个插件清单由生成器从它抄写，所以升级不需要换命令：

- 规则版：重跑安装时那条 `npx skills add`，范围参数保持一致——项目级不带 `-g`，全局级带 `-g -a <host> -y --copy`。`npx skills update jiahao -g -y` 只适合全局安装；skills 1.7.4 在本机（Windows、本地路径源）的项目级 `update` 报无匹配并 exit 127；该环境下项目级用重跑 `add`。装到的就是仓库当前版本；`1.0.0` 打出来后同一路径升到 `1.0.0`。
- 插件版：Claude Code 用 `claude plugin marketplace update jiahao`，再 `claude plugin update jiahao@jiahao`；CodeBuddy 用宿主自己的插件更新/安装路径（CLI 安装路径 declared-unverified，见 `adapters/codebuddy/README.md`），或用新 bundle 重做已验证的 settings 合并；Copilot CLI 用宿主自己的插件命令重装目录（本地目录直装已在 1.0.105 实测，宿主提示该形态将废弃，见 `adapters/copilot/README.md`）；Codex 用 `codex plugin marketplace upgrade jiahao`，再 `codex plugin add jiahao --marketplace jiahao`（安装与未信任钩子的跳过行为已于 2026-10-30 在 0.163.0 真机验证；`/hooks` 持久化信任流程本身未逐步实测，无人值守可用 `--dangerously-bypass-hook-trust`）；ZCode 指向更新后的 bundle 重做货架安装——`zcode plugins marketplace add <包目录>` 再 `zcode plugins install jiahao@jiahao-zcode`（该流程已于 2026-10-31 在 3.16.2 真机验证；`zcode plugins update` 子命令存在但未真机验证，见 `adapters/zcode/README.md`）。按宿主提示重开会话；`1.0.0` 不换路径。
- Qoder Desktop（C 档）：重跑 `npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy`（国际版别名 `qoder`，未真机验证），再开新会话。装的是标准技能目录，没有插件安装命令，也没有 profile 文件要改。
- Qoder IDE/CLI（C 档）：重新复制 `adapters/qoder/rules/jiahao.md` 到项目的 `.qoder/rules/`，再开新会话。
- 升级只替换宿主目录里的插件/技能文件，不碰 `<config>` 下的 `.jiahao-profile` 和 `.jiahao-active`；profile 由人改，不由升级改。

升级命令在 `0.2.0` 上实测过：全局 `npx skills update jiahao -g -y` 报 up to date（exit 0）；项目级 `update -p` 在 skills 1.7.4 上报无匹配并 exit 127，项目级重跑 `add` 成功覆盖（exit 0）；`claude plugin update` 报 already at the latest version（exit 0）。这些只证明命令可用，不证明换版本。`1.0.0` 尚未发布，这条路径只承诺命令不变。

## 写入范围

会写哪些文件，按代码事实列（`src/shared/paths.js`、`scripts/install.js`、`scripts/resolve.js`、`hooks/*.js`）。

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
| `jiahao resolve` | `<config>/.jiahao-evidence/*.jsonl`、`.jiahao-evidence.keys`、`.jiahao-anchor.json`；同一次写入期间的 `.jiahao-evidence.lock/`；旧单文件链迁移时的 `.jiahao-evidence.legacy.bak*` | 手工执行人工裁定（只追加，不改写既有记录） |
| 钩子 Stop / SubagentStop | `<config>/.jiahao-evidence/*.jsonl`、`.jiahao-evidence.keys`、`.jiahao-anchor.json` | 每次判定 |
| 同上 | `<config>/.jiahao-evidence.lock/` | 每次写证据期间的短锁，写完即删 |
| 同上 | `<config>/.jiahao-evidence.legacy.bak*` | 只在本地存在旧的单文件证据链、需要迁移时写 |
| 钩子运行期 | `<config>/.jiahao-sentinel.<hook>`、`<config>/.jiahao-sentinel.<hook>.lock/` | 钩子开始到结束之间存在；正常结束删掉，被宿主杀掉则由下一次 SessionEnd 清扫回收 |
| 钩子 PreToolUse / InstructionsLoaded | `<config>/.jiahao-pretool.jsonl`、`<config>/.jiahao-instructions.jsonl` | 每次命中 |
| 校准记录 | `<config>/.jiahao-calibration.jsonl` | 校准点被记录时（当前运行时没有调用点，写入方是 `src/calibration.js` 的导出函数） |
| 宿主（插件版） | 宿主自己的插件目录或插件缓存 | `claude plugin install` / `codebuddy plugin install` / `copilot plugin install` / `codex plugin add` |
| 宿主（规则版，含 Qoder Desktop） | 宿主自己的技能目录，落地 `<host>/skills/jiahao/SKILL.md`；Qoder CN 是 `~/.qoder-cn/skills/jiahao/SKILL.md`，国际版按 skills CLI 矩阵是 `~/.qoder/skills/jiahao/SKILL.md`（未真机验证） | `npx skills add`（Qoder 用 `-a qoder-cn` / `-a qoder`） |
| 人（Qoder IDE/CLI 规则出口，C 档） | 复制到项目的 `.qoder/rules/jiahao.md` | 手工复制，没有安装命令 |

范围之外：不改系统设置，不写仓库以外的源码目录，不在当前工作目录落文件。所有运行时写入都落在 `<config>` 下。

## 无网络外呼

「外呼」就是往外发网络请求。这一节声明：**装到用户机器上会跑起来的那部分 jiahao 代码不联网**——装完之后的钩子、运行时、安装器、人工裁定命令 `scripts/resolve.js`，以及 MCP 服务端的入口 `jiahao-mcp/index.js`，都不发起任何网络请求。安装也不下载、不执行远程脚本：`node scripts/install.js` 是仓库里的本地文件，四个插件目录是本地目录，复制即可。

这条声明由门禁的 `egress` 步骤每次重跑，不是一次性的口头保证：

- 扫描装到用户机器上会跑的代码：`scripts/install.js`、`scripts/resolve.js`、`hooks/`、`src/`、`jiahao-mcp/index.js`。命中网络模块（`http`/`http2`/`https`/`net`/`dns`/`tls`/`dgram`）或网络调用（`fetch(`、`https.request`）即红。
- 四个插件目录里的钩子与 `src/` 是这些文件的逐字节副本（`generated` 步骤每次重算比对），所以扫源目录就等于扫随插件发出去的那份。
- 扫描如果连 `scripts/install.js`、`scripts/resolve.js`、`hooks/jiahao-verdict-gate.js`、`src/evidence-log.js`、`jiahao-mcp/index.js` 都没扫到，直接红——扫不到东西的检查不算检查。
- `package.json` 出现 `preinstall`/`install`/`postinstall`/`prepare`/`prepack` 即红；插件钩子命令只要不是包内 `hooks/*.js` 即红。

维护者工具（门禁脚本、生成器、漂移检查）不在扫描范围内：它们不是安装路径，也不会在用户机器上运行。已知边界两条：静态正则抓不到动态 `require()` 拼出来的模块名；MCP 服务端依赖的 SDK 依赖树没有随包 vendoring，不在扫描范围，装它那一步本身就是下面第 2 条例外。

两条已披露的例外，都不在 jiahao 的代码里：

1. 规则版的安装命令 `npx skills add` 会由 npx 到 npm 源取第三方 CLI（`skills`），再由它拉本仓库。这是宿主的安装工具，不是我们随包带的脚本。想完全不走网络，可以直接把 `skills/jiahao/SKILL.md` 复制到宿主的技能目录——规则版就是一个纯文本文件。
2. CodeBuddy 插件的 MCP 服务端（`jiahao-mcp/`）依赖要自己 `npm install --omit=dev`。Claude Code 插件不带 MCP 服务端，没有这一步。

## 在干净检出上复跑

```bash
git clone --depth 1 --branch v0.3.0 https://github.com/Xxx91n/jiahao.git /tmp/jiahao-clean
cd /tmp/jiahao-clean && npm ci
npm run release:gate -- --tag v0.3.0
```

对账点：`RELEASE GATE GREEN` 那行、`sha256`、各出口目录的 tree 哈希，应与发布时记录的值逐字相同。

复跑这件事的机器证据有三层：tag 的 CI job 本身就是一次全新检出；门禁对同一棵树连打两次包并比对 `sha256`；本命令让任何人在自己机器上再走一遍，比对上一步打印的数字。跨检出的比对只能靠人：`#64` 必须把 tag 上那次的 `sha256` 与 tree 哈希写进 Release 说明，别人才有东西可比。

## 已知限制

- 版本号只有 `package.json` 一处，每个插件清单由生成器从它抄，不手改。
- 测试套件不再改写工作区生成物（#76 收了 #66）：生成类用例只写临时目录（哨兵用例会临时往一个产物里塞手改、跑完恢复，用来证明它不会被抹掉）。门禁仍把生成检查放在测试前，打包前再查一次工作区是否干净，作为兜底。
- 不发布到 npm：tarball 是发布产物和复跑证据，不是分发渠道。规则版走 git tag，插件版走宿主原生命令。
- 门禁不调用官方 Agent Skills 规范校验器，也不跑标准 CLI 的真实安装；那两条在 #67。
- 跨机器可复现没有自动断言：门禁只能证「同一棵树两次打包字节相同」，两次不同检出之间的比对落在 `#64` 记录的对账值上。
- 「必须排除」这一半今天不会触发：`files` 是白名单，`private/`、`bench/`、`docs/research/` 本来就不在里面。它守的是以后有人把白名单放宽（比如加 `bench/`、把 `docs/agents/` 换成 `docs/`）的那一天。
- 写入范围表列的是代码事实，但门禁只核对表里有没有这些路径（按整段匹配：`.jiahao-evidence.keys` 这一行不算声明了 `.jiahao-evidence`），判断不了「某个新钩子开始写新文件」——那种改动要人改表，`release-gate.js` 的 `DECLARED_WRITE_PATHS` 与表一起改。
