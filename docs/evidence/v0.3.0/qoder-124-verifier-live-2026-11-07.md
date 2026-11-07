# Qoder 0.5.6 — verifier 档 Stop 门禁真机验证(#124 修复)

日期:2026-11-07。验证对象:PR #151(HEAD `557eae9` 时点的 vendored
bundle,gate 与 `32b302b` 一致)。目的:在 Qoder 上实测 #124 修复的两条
验收,补齐 WorkBuddy 记录(workbuddy-124-verifier-live-2026-11-07.md)之外
的第二个宿主。

## 环境

- Qoder 0.5.6(用户级安装
  `%LOCALAPPDATA%\Programs\Qoder\Qoder.exe`;#109/#113 探针为 0.4.11,
  本机为更高版本)。配置根 `~/.qoder`,全局 `settings.json` 原本只有
  `enabledPlugins` 键。
- 安装方式:全局 `~/.qoder/settings.json` 的 `hooks` 键(原文件先备份,
  验证后恢复)。`adapters/qoder` bundle 整目录复制到 `C:\Qoder.ai\jiahao`,
  事件表尾部加 `qoder` 平台参数。#109/#113 的探针走项目级
  `.qoder/settings.json`;0.5.6 全局键同样生效(本记录实测)。
- gate 代码:复制自仓库生成物,sha256 与仓库 `hooks/jiahao-verdict-gate.js`
  相同(WorkBuddy 记录同源校验值 `37A58067…`)。
- verifier 档 flag 落在 `C:\Users\Administrator\.jiahao-active`("full")与
  `.jiahao-profile`("verifier")。hook 子进程 env 实测(探针逐字记录):
  `HOME=C:\Users\Administrator` 存在(0.5.6 与 #113 记录的 0.4.11 不同,
  那时无 HOME),`QODER_CONFIG_DIR=C:\Users\Administrator\.qoder` ——
  `src/shared/paths.js` 解析顺序下 configDir = `C:\Users\Administrator`,
  即 flag 所在目录。
- 会话驱动:CDP(`--remote-debugging-port`)驱动的真实 Qoder 桌面会话,
  会话 id 见探针 payload(`sess_…`,QODER_CONFIG_DIR 逐字记录)。

## 观测通道

同 WorkBuddy 记录:探针 hook 挂 UserPromptSubmit 与 Stop(记录 spawn /
stdin-end、payload 键集、`last_assistant_message` 有无、env 子集);
Stop 的 gate 经 wrapper 转发(stdout/stderr/exit code 逐字留档)。原始
记录:`qoder-probe-log.jsonl`、`qoder-gate-log.jsonl`、
`qoder-evidence-chain.jsonl`(快照于
`C:\jiiahao\wb-live\evidence-snapshot\`)。

## 回合 A:纯问答 → advisory allow,正常结束

- 16:40 提交「回答一个问题就好:1+1等于几?不要执行任何工具,不要声称
  完成任何任务。」;模型回复「1+1 等于 2。」,会话「已处理」。
- gate wrapper 日志(16:41:17,exit **0**):

  ```text
  payload_event=Stop, stop_hook_active=false,
  last_msg_snippet="1+1 等于 2。"
  stdout={"systemMessage":"JIAHAO ADVISORY: no completion claim in this
  turn — the stop is allowed without a verification check."}
  ```

  **#124 的无条件阻断不再发生**;advisory allow 逐字落地。

## 回合 B:有完工声明、无证据 → exit 2 block + reason 注入

- 16:45 提交并让模型原样回复「任务完成,已验证。」。
- gate wrapper 日志(16:45:28,exit **2** —— Qoder 通道的 block 形态,
  `BLOCK_EXIT_CODES.qoder = 2`):

  ```text
  payload_event=Stop, stop_hook_active=false,
  last_msg_snippet="任务完成,已验证。"
  stdout={"decision":"block","reason":"Verification has no evidence: no
  test run, no state diff, no re-execution quoted. NOT VERIFIED — run
  rung 1-3 of the verification ladder first. Evidence chain empty,
  unparseable, or attributable only to other sessions."}
  ```

- host 注入 reason 后模型下一轮回复原文(界面可见):「我没有执行任何
  工具,只输出了那段文字;**这次 exit code 2 的拦截很可能来自你配置的
  Hook 拒绝了该回复。**请检查你的 Hook 配置(例如它是否拦截"任务完成"
  这类声明)……」——模型识别出 Hook 拦截,不再坚持完工声明。
- 证据链:两条 `pairer-lane[shadow]` 记录(08:41:17Z、08:45:28Z,
  session 对应本会话)写入 `C:\Users\Administrator\.jiahao-evidence\`,
  证明 gate 判定全链路执行。

## 与 #124 验收对照

- 纯问答回合(verifier 档)正常结束:回合 A 实测通过(exit 0 advisory)。
- 有完工声明但无证据仍被阻断:回合 B 实测通过(exit 2 block + reason
  注入)。
- gate 输出的 reason 与 Case A 文案逐字一致;exit code 与
  `hooks/jiahao-runtime.js` 的 `BLOCK_EXIT_CODES.qoder = 2` 一致
  (#109 实测过的通道)。

## 回滚声明

真机安装(bundle 复制、全局 settings.json 合并、flag 写入、证据链目录)
验证后已全部回滚:`settings.json` 逐字节恢复(hooks 键不存在)、flag 与
证据链目录删除、bundle 目录删除。探针/wrapper 属验证脚手架,不进任何
分发 bundle。

## 结论

#124 修复后的 verifier 档在 Qoder 0.5.6 真机上:纯问答 advisory 放行、
假完工声明 exit 2 阻断 + reason 注入,行为与 WorkBuddy 5.9.3 记录
(workbuddy-124-verifier-live-2026-11-07.md)一致。两个宿主的真机通道均
实测通过;国际版 5.9.4 WorkBuddy 未复测(以 #110/#124 现场记录为准)。
