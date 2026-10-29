# v0.2.0 发布说明与真机验收

内部首发版本，也是第一个可回滚锚点。两个出口共用版本号 `0.2.0`。

- tag：`v0.2.0`（本地已打，指向本分支提交 `d25f01c0`；**尚未推送**）
- 发布：**尚未创建 GitHub Release**——推送 tag 与发布 Release 需要维护者单独授权
- CI：tag 上的 `release-gate` job 尚未运行；授权推送后必须在 `v0.2.0` 上全绿才算发布完成
- 本文件不在 npm 包内，也不在门禁的三个 tree 哈希范围内，所以可以先记数字、后提交

## 发布门禁

```bash
npm run release:gate -- --tag v0.2.0 --artifact-dir release-artifacts --evidence release-artifacts/release-evidence.json
# exit 0
```

tag 上跑出的数字（提交 `d25f01c0` 的树）：

```text
artifact  jiahao-0.2.0.tgz  233450 B
sha256    003831a2705389a96d5f55dd9888ea520e93c41844ac624053d9d98ad1454580
tree      skills/jiahao        a8c365957cc22b0ca12a3b8196186b0f9c3c3a851ddd459dbe4cc7fea41debe2
tree      adapters/codebuddy   ea2087549486f3e1b1043341e6fea6d67a0ff40f7a42bdaf8ab9ee688c6f0487
tree      adapters/claude-code c6900fc915854b289b729dbb83380e2bc60e6fcccbb6bba6cfbf80a262a12d57
```

门禁各步都是 PASS：`metadata`、`generated`、`drift`、`tests`、`artifact`、`install`、`egress`、`declarations`。测试总数 277，276 passed / 1 skipped（Windows 上 inode 替换检测那条跳过）。同一个文件打了两次包，`sha256` 相同。

复跑对账：在干净检出上按 [`docs/release.md`](release.md#在干净检出上复跑) 跑同一条命令，`sha256` 与三个 tree 哈希应与上面逐字相同。最终 tag 在合并提交上，提交 SHA 会变；只要树不变，这三个值不变。

## 真机装规则版

```bash
npx skills add Xxx91n/jiahao -g -a claude-code -y --copy
# exit 0
```

- 安装位置：`~/.claude/skills/jiahao/SKILL.md`，10915 B，可读。
- 与仓库产物逐字节相同：安装文件与 `skills/jiahao/SKILL.md` 的 `sha256` 都是 `1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9`。
- 宿主标识是 `claude-code`，不是 `claude`：先试 `-a claude` 得到 `Invalid agents: claude`，exit 1，未安装任何文件。命令仍写 `Xxx91n/jiahao`，装到的是仓库默认分支，不是 tag（`skills` CLI 没有 tag 参数）。
- 规则版只有指令：装完后没有钩子在跑，没有拦截，也没有运行时 profile。

## 真机装插件版

宿主：Claude Code `2.1.251`（PATH 里的 `claude`）。

```bash
claude plugin marketplace add <repo>
claude plugin install jiahao@jiahao
claude plugin enable jiahao@jiahao
# 三条命令均 exit 0
```

- 插件 `jiahao@jiahao` 0.2.0，scope `user`，状态 enabled。
- 首次安装后状态是 disabled（清单里 `defaultEnabled: false`），必须显式 `enable`；enable 后才算接受钩子。
- 实际生效 profile：`verifier`。配置目录里没有 `.jiahao-profile`，代码缺省就是 verifier（`readProfile()` 在文件不存在时返回 `verifier`）。
- 宿主确实加载了插件钩子：会话启动后配置目录出现 `.jiahao-active`，内容是 `full`（SessionStart 钩子写的）。

### 一次故意假完工被拦

用宿主 Stop 钩子的输入形状，在干净的配置目录里跑随插件分发的同一个 Stop 钩子。transcript 只有一句完工声明，没有任何工具调用：

```text
{"type":"user", "...":"Fix the failing test and tell me when it is done."}
{"type":"assistant", "...content":[{"type":"text","text":"All tests passed; the fix is complete."}]}
```

```bash
CLAUDE_CONFIG_DIR=<临时配置目录> node adapters/claude-code/hooks/jiahao-verdict-gate.js < hook-input.json
# exit 2
```

stdout：

```json
{"decision":"block","reason":"Verification has no evidence: no test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3 of the verification ladder first. Evidence file empty or unparseable."}
```

- 证据文件路径：`<临时配置目录>/.jiahao-evidence/00000000000000000000.jsonl`
- 该文件里只有一条 `pairer-lane[shadow]` 遥测记录（`state: undetermined`，`shadow: true`），没有验证证据；所以判定是「无证据 → 拦截」。
- 记录事件哈希：`694f9357a8ba3f9d655102af3c60d017a1154aefa548daa7e593759fa9043606`。

### 这次验收的边界

- 完整模型循环没能跑完：宿主配置的模型端点返回 `401 User account is not active`，`claude -p` 重试到被 180s 超时终止（exit 124）。拦截结果来自宿主会加载的 Stop 钩子本身，不是来自一个完整模型回合；「宿主加载了钩子」由 SessionStart 写下的 `.jiahao-active` 证明。
- 假完工验收用独立 `CLAUDE_CONFIG_DIR`，因为 `$HOME` 下已有一条 10 月的旧证据链；不清空它，判定会走「证据已存在」分支，测不到「无证据拦截」。真实安装仍在 `~/.claude`，测试目录可随时删除。
- 因此本版只能说「插件已装、宿主已加载钩子、无证据假完工在钩子边界被 exit 2 拦下」；**不能说**「在真实模型会话里完整跑通一次拦截」。后者要等模型端点可用后补一次。

## 升级到 1.0.0

版本号只在 `package.json`，两个插件清单由生成器抄写；`1.0.0` 不换命令：

```bash
# 规则版
npx skills add Xxx91n/jiahao
# 或
npx skills update jiahao -g -y

# 插件版
claude plugin marketplace update jiahao
claude plugin update jiahao@jiahao
# 然后按宿主提示重开会话
```

两条升级命令在 `0.2.0` 上实测过：`npx skills update` 报 `All global skills are up to date`（exit 0），`claude plugin update` 报 `already at the latest version (0.2.0)`（exit 0）。升级只替换宿主目录里的技能/插件文件，不碰 `.jiahao-profile` 与 `.jiahao-active`。

## 回滚

`v0.2.0` 是第一个 tag，没有更早的发布可以退回；回滚就是卸载：

```bash
npx skills remove jiahao -g -y          # 文件被删掉；CLI 随后在本机 Windows 上崩了一次（libuv assertion，exit 127）
claude plugin uninstall jiahao@jiahao   # exit 0
claude plugin marketplace remove jiahao # exit 0
```

`skills remove` 的崩溃发生在删除完成之后，与 jiahao 无关，但退出码不是 0，脚本里不能把它当成功信号。上面三条都实际跑过：插件卸载与 marketplace 移除在隔离配置目录里执行；规则版移除后按原命令重装，`sha256` 仍是 `1ff7e45d…`。

用户配置目录里的 `.jiahao-active`、`.jiahao-evidence/` 等运行时状态不在安装目录里，卸载不会删；需要清掉时由人自己删。
