# v0.2.0 发布说明与真机验收

内部首发版本，也是第一个可回滚锚点。两个出口共用版本号 `0.2.0`。

- tag：`v0.2.0`，本地已打，指向 `6cdeb39f`，**尚未推送**。本文与证据提交在 tag 之后的提交里：把证据提交进去会移动 HEAD，门禁要求 HEAD 就是 tag，所以证据不能同时钉在 tag 上。合并后用同一棵树重建 tag，数字不变。
- Release：**尚未创建**——推送 tag 与发布 GitHub Release 需要维护者单独授权。
- CI：tag 上的 `release-gate` job 尚未运行；授权推送后必须在该 tag 上全绿才算发布完成。
- 本文与 `docs/evidence/v0.2.0/` 都不在 npm 包内，也不在三个 tree 哈希的范围内，记录它们不会改变被记录的产物。
- tag 树里的这份文件是定稿前的上一版：tag 不可能包含自己产物的哈希。合并后以 `main` 上的本文件与 GitHub Release 说明为准。

## 发布门禁

```bash
npm run release:gate -- --tag v0.2.0 --artifact-dir release-artifacts --evidence release-artifacts/release-evidence.json
# exit 0
```

tag 上跑出的数字：

```text
artifact  jiahao-0.2.0.tgz  233970 B
sha256    12acab660326d20672befff7642fac0c11f3b486cc63c034a3e1e64c2511d8ab
tree      skills/jiahao        a8c365957cc22b0ca12a3b8196186b0f9c3c3a851ddd459dbe4cc7fea41debe2
tree      adapters/codebuddy   ea2087549486f3e1b1043341e6fea6d67a0ff40f7a42bdaf8ab9ee688c6f0487
tree      adapters/claude-code c6900fc915854b289b729dbb83380e2bc60e6fcccbb6bba6cfbf80a262a12d57
```

门禁各步都是 PASS：`metadata`、`generated`、`drift`、`tests`、`artifact`、`install`、`egress`、`declarations`。测试总数 277，276 passed / 1 skipped（Windows 上 inode 替换检测那条跳过）。同一棵树打了两次包，`sha256` 相同。

机器证据：[gate.txt](evidence/v0.2.0/gate.txt)、[gate-evidence.json](evidence/v0.2.0/gate-evidence.json)。这两份是 tag 提交 `6cdeb39f` 上那一次运行的原始输出；之后提交本文与证据只改 `docs/evidence/` 和本文，都不入包，所以 tag 的产物数字不变。

在干净检出上复跑：等 tag 推送后按 [`docs/release.md`](release.md#在干净检出上复跑) 执行。本机只验证了同树两次打包的 `sha256` 相同，没有在干净克隆上跑过；那一步由 tag 的 CI job 和发布后的复跑补上。

## 真机装规则版

```bash
npx skills add Xxx91n/jiahao -g -a claude-code -y --copy
# exit 0
```

- 安装位置：`~/.claude/skills/jiahao/SKILL.md`，10915 B，可读。
- 与仓库产物逐字节相同：两边的 `sha256` 都是 `1ff7e45df7a0b5ec38e617b5f6be46627401a157213e48b7d5100c9a0ce61fc9`，见 [skill-sha256.txt](evidence/v0.2.0/skill-sha256.txt)。
- 这条 GitHub 命令的完整输出见 [skills-add-github.txt](evidence/v0.2.0/skills-add-github.txt)：`Source: https://github.com/Xxx91n/jiahao.git`，exit 0。
- 宿主标识是 `claude-code`，不是 `claude`：先试 `-a claude` 得到 `Invalid agents: claude`，exit 1，未安装任何文件，见 [skills-add-invalid-agent.txt](evidence/v0.2.0/skills-add-invalid-agent.txt)。
- 命令写 `Xxx91n/jiahao`，装到的是仓库默认分支，不是 tag；`skills` CLI 没有 tag 参数。这是规则版的已知限制。
- 规则版只有指令：装完后没有钩子在跑，没有拦截，也没有运行时 profile。

## 真机装插件版

宿主：Claude Code `2.1.251`（PATH 里的 `claude`），见 [claude-version.txt](evidence/v0.2.0/claude-version.txt)。

| 命令（实测用本地候选目录） | exit |
| --- | --- |
| `claude plugin marketplace add D:/Aworker/jiahao-wt-64` | 0 |
| `claude plugin install jiahao@jiahao` | 0 |
| `claude plugin enable jiahao@jiahao` | 0 |
| `claude plugin list`（`jiahao@jiahao` 0.2.0，user，enabled） | 0 |

发布后用户侧的第一条命令是 `claude plugin marketplace add Xxx91n/jiahao`，其余相同。`claude plugin list` 的 jiahao 段见 [plugin-list.txt](evidence/v0.2.0/plugin-list.txt)。

- 首次安装后状态是 disabled（清单里 `defaultEnabled: false`），必须显式 `enable`；enable 后才算接受钩子。
- 安装落地目录：`~/.claude/plugins/cache/jiahao/jiahao/0.2.0`。
- 实际生效 profile：`verifier`。真实配置目录里没有 `.jiahao-profile`，`readProfile()` 返回 `verifier`，见 [profile-real.txt](evidence/v0.2.0/profile-real.txt)；在隔离配置目录里跑安装器，打印 `Wrote "verifier" to ...`，exit 0，再读回仍是 `verifier`，见 [profile-install.txt](evidence/v0.2.0/profile-install.txt)。
- 宿主确实加载了插件钩子：真实配置目录下起一次会话后出现 `.jiahao-active`，内容是 `full`，见 [real-session.txt](evidence/v0.2.0/real-session.txt)。`full` 是模式/强度标记，不是 profile；profile 只看 `.jiahao-profile`。

### 一次故意假完工被拦

跑的是**已安装插件副本**（不是仓库源目录）的 SessionStart 与 Stop 钩子。输入是手工构造的宿主钩子 payload；transcript 只有一句完工声明，没有任何工具调用：

- 输入：[stop-hook-input.json](evidence/v0.2.0/stop-hook-input.json)
- transcript（手工构造）：[stop-hook-transcript.handcrafted.jsonl](evidence/v0.2.0/stop-hook-transcript.handcrafted.jsonl)
- 命令、退出码与安装路径：[stop-hook-command.txt](evidence/v0.2.0/stop-hook-command.txt)；SessionStart 注入的正文：[stop-hook-activate.out](evidence/v0.2.0/stop-hook-activate.out)。

```bash
CLAUDE_CONFIG_DIR=<temp>/jiahao-block node <installed>/hooks/jiahao-activate.js < sessionstart-input.json
# exit 0，写下 .jiahao-active=full
CLAUDE_CONFIG_DIR=<temp>/jiahao-block node <installed>/hooks/jiahao-verdict-gate.js < hook-input.json
# exit 2
```

stdout，另见 [stop-hook-stdout.json](evidence/v0.2.0/stop-hook-stdout.json)：

```json
{"decision":"block","reason":"Verification has no evidence: no test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3 of the verification ladder first. Evidence file empty or unparseable."}
```

- 证据文件路径：`C:\Users\Administrator\AppData\Local\Temp\jiahao-block\.jiahao-evidence\00000000000000000000.jsonl`，完整副本见 [stop-hook-evidence.jsonl](evidence/v0.2.0/stop-hook-evidence.jsonl)。
- 该文件里只有一条 `pairer-lane[shadow]` 遥测记录（`state: undetermined`，`shadow: true`），没有验证证据；所以判定是「无证据 → 拦截」。
- 记录事件哈希：`0430012dbbe8383e1562f420a2e6f1477f2c48430635077046101dc092f8b624`。
- transcript 里的时间戳是构造输入时随手写的，不代表钩子时钟；钩子记录的 `timestamp` 是 `2026-10-29T05:32:24.484Z`，见证据文件第一行。

### 这次验收的边界

- 完整模型循环没能跑完：宿主配置的模型端点返回 `401 User account is not active`，`claude -p` 重试到被 180s 超时终止（exit 124），见 [endpoint-401.txt](evidence/v0.2.0/endpoint-401.txt)。拦截结果来自宿主会加载的 Stop 钩子本身，不是来自一个完整模型回合。
- 「宿主加载了钩子」有两次观察：隔离配置目录的第一次会话、真实配置目录的 `claude -p "hi"`；后者先 `rm -f ~/.jiahao-active`，记录 `before_session=absent`，会话后 `after_session=present`、内容 `full`，见 [real-session.txt](evidence/v0.2.0/real-session.txt)。
- 假完工验收用独立 `CLAUDE_CONFIG_DIR`，因为 `$HOME` 下已有一条 10 月的旧证据链；不清空它，判定会走「证据已存在」分支，测不到「无证据拦截」。真实安装仍在 `~/.claude`。
- 因此本版只能说「插件已装、宿主已加载钩子、已安装副本对无证据假完工 exit 2」；**不能说**「在真实模型会话里完整跑通一次拦截」。模型端点恢复后应补一次完整会话。

## 升级到 1.0.0

版本号只在 `package.json`，两个插件清单由生成器抄写；`1.0.0` 尚未发布，这条路径只承诺命令不变：

```bash
# 规则版：重跑安装时那条 add，范围参数保持一致
npx skills add Xxx91n/jiahao -a claude-code -y --copy    # 项目级
npx skills add Xxx91n/jiahao -g -a claude-code -y --copy  # 全局级
npx skills update jiahao -g -y                            # 只更新全局安装

# 插件版（Claude Code）
claude plugin marketplace update jiahao
claude plugin update jiahao@jiahao
# CodeBuddy：用宿主自己的插件更新/安装路径，或用新 bundle 重做 settings 合并
# 然后按宿主提示重开会话
```

升级命令在 `0.2.0` 上实测过：全局 `npx skills update jiahao -g -y` 报 `All global skills are up to date`（exit 0，源是 GitHub 安装写入的 `Xxx91n/jiahao`，见 [upgrade-skill.txt](evidence/v0.2.0/upgrade-skill.txt)）；项目级 `update -p` 在本机的 skills 1.7.4（Windows、本地路径源）上报 `No installed skills found matching: jiahao` 并 exit 127，随后重跑项目级 `add` 成功覆盖（exit 0），见 [upgrade-skill-project.txt](evidence/v0.2.0/upgrade-skill-project.txt)；`claude plugin update` 报 `already at the latest version (0.2.0)`（exit 0，见 [upgrade-plugin.txt](evidence/v0.2.0/upgrade-plugin.txt)）。这些只证明命令可用，**不能**证明换版本；换版本要等 `1.0.0` 真的发布。升级只替换宿主目录里的技能/插件文件，不碰 `.jiahao-profile` 与 `.jiahao-active`。

## 回滚

`v0.2.0` 是第一个 tag，没有更早的发布可以退回；回滚就是卸载：

```bash
npx skills remove jiahao -g -y          # 文件被删掉；CLI 随后在本机 Windows 上崩了一次（libuv assertion，exit 127）
claude plugin uninstall jiahao@jiahao   # exit 0
claude plugin marketplace remove jiahao # exit 0
```

`skills remove` 的崩溃发生在删除完成之后，与 jiahao 无关，但退出码不是 0，脚本里不能把它当成功信号。三条命令的完整输出与退出码：[skills-remove-reinstall.txt](evidence/v0.2.0/skills-remove-reinstall.txt)、[uninstall-plugin.txt](evidence/v0.2.0/uninstall-plugin.txt)；规则版移除后已用安装命令重装，`sha256` 仍是 `1ff7e45d…`。

用户配置目录里的 `.jiahao-active`、`.jiahao-evidence/` 等运行时状态不在安装目录里，卸载不会删；需要清掉时由人自己删。
