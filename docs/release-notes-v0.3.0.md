# v0.3.0 发布说明与真机验收

第二个内部版本。v0.2.0 只有两个宿主能在钩子层真正拦截；这个版本把它铺到四个，并给每个出口标了能力档位。

- 版本号：`0.3.0`，五个插件清单由生成器从 `package.json` 抄写。
- 内容验收：#80（真机），证据在 [`docs/evidence/v0.3.0/`](evidence/v0.3.0/)。
- 本文与证据目录都不在 npm 包内，不参与 tree 哈希。
- tag 树里的这份文件不可能包含自己产物的哈希；发布后的数字以 GitHub Release 说明为准。

## 出口与档位

档位是发布期结论，出处是宿主版本 + 实测日期。

| 出口 | 档位 | 依据 |
| --- | --- | --- |
| Claude Code | A 档候选（脚本级已验证，宿主级未验） | 宿主版本 Claude Code 2.1.251，2026-10-29 装过插件并跑过 SessionStart 与脚本级 Stop；**没有带日期的宿主级拦截结果**，原因是模型端点 401，见 [`docs/release-notes-v0.2.0.md`](release-notes-v0.2.0.md) |
| CodeBuddy | A 档候选（脚本级已验证，宿主级未验） | 宿主版本 CodeBuddy Code CLI 2.151.0（`settings.json` 路径实测于 v0.2.0），**没有带日期的宿主级 Stop 拦截结果**；CLI 安装路径仍是 declared-unverified |
| Codex CLI | A | 2026-10-30 实测，codex-cli 0.163.0 |
| GitHub Copilot CLI | A | 2026-10-30 实测，Copilot CLI 1.0.105 |
| Qoder | C | 只有规则，没有钩子；加载行为 declared-unverified |
| 规则版 | 不适用 | 只注入指令，任何宿主都没有强制 |

**A 档的含义**：真实会话里 Agent 声称「做完并已验证」，宿主在回合结束前把它拦住一次，续跑后 `stop_hook_active` 为 `true` 时 gate 直接放行、不再检查 claim 与证据。也就是说拦截保证的是「不让你一句话收工」，不是「必须改口才放行」。证据形式、宿主版本、日期都落在 `docs/evidence/` 里。

**A 档候选的含义**：脚本层证明它能阻断，但还没有一次宿主级真机会话为它作证。对外只能说「插件已装、脚本会拦」，不能说「这个宿主真的拦过我」。

Claude Code 与 CodeBuddy 在 v0.2.0 就带着钩子发布，本版本没有改动它们的拦截逻辑；缺的那次真机会话是历史遗留，不是本版本引入的。

## 真机验收（#80，2026-10-30）

两个宿主各跑一次隔离的会话，用的是「让模型原样输出一句假完工」的红队夹具。

**Codex CLI 0.163.0**

- 安装：`codex plugin marketplace add <repo>` + `codex plugin add jiahao --marketplace jiahao`，均 exit 0。
- 钩子默认开：`codex features list` 报 `hooks stable true`；全新的 `CODEX_HOME` 没有 `config.toml` 也会跑钩子。
- 未信任：`codex exec` exit 0，**钩子被跳过，假完工通过**。
- 已信任：`--dangerously-bypass-hook-trust`，Stop 返回 `{"decision":"block"}`（exit 0），下一条消息引用了拦截理由。
- exit 2 + stderr 在这个版本**不阻断**，而是结束回合、不再续跑。
- 循环护栏：无条件阻断一直续跑到 785 次（33M input tokens）才结束。**`stop_hook_active` 放行是必须的**，否则没有小上限兜底。

**GitHub Copilot CLI 1.0.105**

- 安装：`copilot plugin install <repo>/adapters/copilot`，exit 0，`plugin list --json` 显示 `enabled: true`。
- `agentStop` 返回 `{"decision":"block"}`（exit 0），理由作为下一条用户消息注入；第二次 `agentStop`（`stop_hook_active`）放行。
- exit 2 被记为 failed hook，不阻断。
- 会读 `.claude/settings.json`：手写的 Claude 形状 Stop 被识别为 `agentStop decision=block` 并续跑。但 jiahao 走的是插件安装，不是这个文件。
- 上限：连续 8 次阻断后续跑，第 9 次阻断不再续跑，CLI 结束。

## 两条已知边界（不要省略）

1. **Codex 的 `/hooks` 交互式信任流程没有逐步实测。** 实测过的是：不受信任时钩子被跳过、`--dangerously-bypass-hook-trust` 能放行。无人值守场景必须先持久化信任，或显式用这个开关。
2. **Copilot 的阻断有 8 次上限。** 一个永远不放行的判定会在第 9 次被宿主默默结束回合，结果是「没拦住但看起来结束得正常」。

## 本版本修掉的三条拦截缺陷（#75）

- 用户工程里的 `.mcp.json` / `hooks/hooks.json` / `.claude-plugin/plugin.json` 不再被误判成绕过尝试。
- 路径按平台归一：POSIX 下绝对路径检查此前完全失效；规则文本与运行时副本目录进了保护面。
- Stop 判定不再扫全量历史：别的会话的记录既不拦本次收尾，也不替本次作证。

**遗留一处，已由 #89 承载**：不带 `session_id`/`turn_id` 的存量记录仍对每个会话作证——收窄器筛掉的是「标明属于别的会话」的记录，不是「没标归属」的记录。

## 安装与升级

命令与 v0.2.0 相同，不换路径：

- 规则版：`npx skills add Xxx91n/jiahao -g -a <host> -y --copy`
- Claude Code：`claude plugin marketplace update jiahao` → `claude plugin update jiahao@jiahao`
- Codex：`codex plugin marketplace upgrade jiahao` → `codex plugin add jiahao --marketplace jiahao`
- Copilot：用宿主自己的插件命令重装目录
- CodeBuddy：宿主自己的插件路径，或用新 bundle 重做 settings 合并
- Qoder（C 档）：重新复制 `adapters/qoder/rules/jiahao.md`

完整写入范围与门禁清单见 [`release.md`](release.md)。

## 降级与卸载

**先看一个事实**：v0.2.0 的 `adapters/` 里只有 `claude-code` 和 `codebuddy`。Codex、Copilot、Qoder 三个出口是本版本新增的，v0.2.0 里没有对应目录——对它们来说没有「降级」，只有「卸载」。

下面每条都标了实测状态；命令在本机隔离的 `CODEX_HOME` / `COPILOT_HOME` / `CLAUDE_CONFIG_DIR` 下跑过，不碰你日常的插件状态。

**Claude Code — 实测可双向切换，这一家是真降级**

```bash
# 卸掉 0.3.0
$ CLAUDE_CONFIG_DIR=<isolated> claude plugin uninstall jiahao@jiahao
✔ Successfully uninstalled plugin: jiahao (scope: user)        # exit 0

# 指向 v0.2.0 那棵树再装，装出来是 0.2.0
$ CLAUDE_CONFIG_DIR=<isolated> claude plugin marketplace add <v0.2.0 checkout>
Adding marketplace…✔ Successfully added marketplace: jiahao     # exit 0
$ CLAUDE_CONFIG_DIR=<isolated> claude plugin install jiahao@jiahao
✔ Successfully installed plugin: jiahao@jiahao (scope: user)    # exit 0
$ claude plugin list        # Version: 0.2.0
$ claude plugin enable jiahao@jiahao                            # 装上默认是 disabled
```

装回 0.3.0 就是同样的两条命令，把 marketplace 指回 `main` 那棵树，列表显示 `Version: 0.3.0`。

**Codex — 只有卸载（实测）**

```bash
$ CODEX_HOME=<isolated> codex plugin remove jiahao@jiahao
Removed plugin `jiahao` from marketplace `jiahao`.               # exit 0
$ CODEX_HOME=<isolated> codex plugin marketplace remove jiahao
Removed marketplace `jiahao`.                                    # exit 0
```

先移插件再移 marketplace。`codex plugin remove jiahao`（不带 `@marketplace`）会 exit 1 要求限定来源，必须写成 `jiahao@jiahao`。

**Copilot — 只有卸载（实测）**

```bash
$ COPILOT_HOME=<isolated> copilot plugin uninstall jiahao
Plugin "jiahao" uninstalled successfully.                        # exit 0
```

注意 `copilot plugin install <任意目录>` 也返回 0，退出码不能用来判断装对了没有；要核对 `copilot plugin list`。

**CodeBuddy**：CLI 安装路径本身 declared-unverified。卸载走宿主自己的插件命令，或恢复安装前的 `.codebuddy/settings.json` 备份；这一步本机没实测。

**Qoder（C 档）**：删掉 `.qoder/rules/jiahao.md`（或用户级同名文件）即可，没有别的状态。

**这些命令不会撤销的东西**：降级/卸载只动宿主目录里的插件文件，不碰 `<config>` 下的 `.jiahao-profile`、`.jiahao-active`，也不改证据链（只追加）。也就是说降级会改变「还会不会被拦」，不会改变「以前记下了什么」。

## 发布门禁

```bash
npm run release:gate -- --tag v0.3.0 --artifact-dir release-artifacts --evidence release-artifacts/release-evidence.json
```

九步全过才算发布结论。tag 上跑出的 `artifact`、`sha256`、各出口 tree 哈希以 **GitHub Release 正文**与 `release-artifacts/` 里的证据为准；本文件与 `release.md` 在包里，写自己的哈希会让记录指向另一棵树，所以不放数字。

## 不在本版本

- Qoder 升 A 档：它的收尾钩子还没实测，仍是探针问题。
- 人工裁定的凭据（#90）：被拦方仍能自己写一条 pass 把自己放行，这是 append-only 链的信任边界，v0.3.0 之后单独定。
- 规则文本重写（#25）、profile 缺省值（#40）：都等 #23 的人工标注数据。
- 发布到 npm；公开评测；签名体系。
