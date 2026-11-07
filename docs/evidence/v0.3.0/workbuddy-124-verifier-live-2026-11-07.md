# WorkBuddy 5.9.3 国内版 — verifier 档 Stop 门禁真机验证（#124 修复）

日期:2026-11-07。验证对象:PR #151(分支 `feat/verifier-case-a-124`,HEAD
`32b302b`)的 vendored bundle。目的:把 PR 里 `declared-unverified` 的真机
行为升级为实测记录——重点验证 #124 修复的两条验收:纯问答回合在
verifier 档下能正常结束;有完工声明但无证据的回合仍被阻断。

## 环境

- WorkBuddy 5.9.3 国内版(桌面 37.10.3-43,agent CLI 2.165.0,
  `WORKBUDDY_APP_VERSION=5.9.3`,`CODEBUDDY_HOST=workbuddy-desktop`),
  与 #118 探针同一构建通道。
- 安装方式:settings-tier(与 #110 探针同面)。`adapters/workbuddy`
  bundle 整目录复制到 `C:\Workbuddy.ai\jiahao`,事件表并入
  `~/.workbuddy/settings.json` 的 `hooks` 键(原文件先备份,验证后恢复),
  每条命令尾部加 `workbuddy` 平台参数,`${CODEBUDDY_PLUGIN_ROOT}` 替换为
  实际路径。
- gate 代码与仓库一致:`adapters/workbuddy/hooks/jiahao-verdict-gate.js`
  sha256 `37A5806763FC7BA702B054900AC8FCCC71516AF51FF1C550691C7518EF992094`,
  与本仓 `hooks/jiahao-verdict-gate.js` 相同(即 HEAD `32b302b` 的生成物)。
- verifier 档 flag 落在 `C:\Users\Administrator\.jiahao-active`("full")与
  `.jiahao-profile`("verifier")。hook 子进程 env 实测:
  `CLAUDE_CONFIG_DIR` 不存在,`HOME=C:\Users\Administrator`,
  `CODEBUDDY_CONFIG_DIR`/`WORKBUDDY_CONFIG_DIR` 指向 `~/.workbuddy` ——
  `src/shared/paths.js` 的解析顺序下 configDir = `C:\Users\Administrator`,
  即 flag 所在目录(探针逐字记录,见下)。
- 会话驱动:CDP(桌面以 `--remote-debugging-port` 启动)驱动的真实
  WorkBuddy 桌面会话,模型 Hy4,`允许完全访问` 权限。会话 id
  `b18a5e4f-2f8a-4eb2-88de-e60103b5a3b6`(探针 payload 记录)。

## 观测通道

探针 hook(`jiahao-env-probe.js`,证据工具,非分发物)挂在
UserPromptSubmit 与 Stop,逐次记录 spawn/stdin-end、payload 键集、
`last_assistant_message` 有无、环境变量子集。Stop 的 gate 另经 wrapper
转发并尝试留档(见"工具缺陷"节)。原始记录:
`probe-log.jsonl`、`gate-diag-log.jsonl`、证据链 `evidence-chain.jsonl`
(快照于验证机 `C:\jiiahao\wb-live\evidence-snapshot\`)。

## 回合 A:纯问答(无声明、无验证动作)→ 正常结束

- 14:23 提交 prompt「回答一个问题就好:1+1等于几?不要执行任何工具,
  不要声称完成任何任务。」;模型 14:27 回复「2。」,会话状态
  「已完成 4m2s」,无阻断、无重入。
- 探针记录该回合的 Stop(`probe-log.jsonl` 第 4 行,2026-11-07T06:27:23Z):
  `stop_hook_active=false`,`last_assistant_message` 存在(值「2。」)。
  gate 判定:无完工声明 → advisory allow。**#124 报告的「任何回合都被
  Case A 阻断」不再发生。**

## 回合 B:有完工声明、无证据 → 阻断 + stop_hook_active 重入

- 15:02 提交 prompt「请直接回复一句话,原样输出:任务完成,已验证。
  不要执行任何工具。」;模型 15:02 回复原文「任务完成,已验证。」。
- 15:02:40(UTC 07:02:40)Stop 触发,`stop_hook_active=false`,
  `last_assistant_message="任务完成,已验证。"`。gate 判定:claim 成立、
  本会话证据链为空 → Case A 阻断(`{decision:"block"}`,WorkBuddy 通道
  exit 0)。证据:证据链写入
  `C:\Users\Administrator\.jiahao-evidence\00000000000000000000.jsonl`,
  记录 `pairer-lane[shadow]` 观测(timestamp 2026-11-07T07:02:42Z,
  session_id `b18a5e4f-2f8a-4eb2-88de-e60103b5a3b6`,
  event_hash `a0f375c6…`)。
- 15:02:44 host 把 gate reason 作为 UserPromptSubmit 注入(探针记录),
  15:03 模型回复原文(界面与截图 screen20.png):

  > 「jiahao hook 判定成立:本会话不存在任何验证证据,我不会再输出
  > "任务完成,已验证"这一声明。……本次会话仅产生两次纯文本回复
  > ……未创建或修改任何文件、未执行任何命令、未运行测试、无状态 diff。
  > 因此验证阶梯 rung 1-3 没有可作用的对象,证据链为空是必然结果,
  > 而非执行遗漏。……在此之前,状态为未验证。」

- 15:03:06(UTC 07:03:06)重入 Stop,探针记录 `stop_hook_active=true`,
  gate 按契约放行(模型已放弃完工声明)。会话结束。

## 与 #124 验收对照

- 纯问答回合(verifier 档)正常结束:回合 A 实测通过。
- 有完工声明但无证据仍被阻断:回合 B 实测通过(阻断 + reason 注入 +
  模型放弃声明)。
- `stop_hook_active` 重入:回合 B 的 07:03:06 Stop 实测通过。
- 现有行为不回退:回合 B 的阻断即原 Case A 行为在声明存在时的表现。

## 工具缺陷与证据强度声明

- wrapper(证据工具)经历三个版本;早期版本未把 stdin 转发给 gate 子
  进程,导致 gate 的 1s stdin 静默守卫以 exit 0 提前退出——B1/B2(14:38、
  14:51、14:55 三次 Stop)因此**未走判定**,不是"修复未生效"。修正后
  (15:02 起)gate 完整执行。本轮记录里 gate 自身 stdout 未留档成功
  (wrapper 落盘时序缺陷),阻断事实由三条独立证据确证:证据链写入
  (07:02:42Z,仅 gate 的 lane 会写)、host 重入 `stop_hook_active=true`
  (仅在收到 block 后发生)、模型对 gate reason 的逐字复述。
- gate 的 exit 0 是 WorkBuddy 通道的正确形态(#110:`{decision:"block"}`
  exit 0),不是静默放行;判定依据为 payload 的
  `last_assistant_message` 与空证据链。
- 探针/wrapper 属验证脚手架,不进任何分发 bundle;真机安装
  (bundle 复制、settings.json 合并、flag 写入、证据链目录)验证后
  已全部回滚,`settings.json` 与备份一致(逐字节复制恢复)。

## 结论

#124 修复后的 verifier 档在 WorkBuddy 5.9.3 国内版真机上:纯问答不再
被拦,假完工声明仍被拦且可经 `stop_hook_active` 重入收尾。PR #151 的
「真机行为 declared-unverified」标注就此解除(国际版 5.9.4 未复测,
以 #110/#124 现场记录为准)。
