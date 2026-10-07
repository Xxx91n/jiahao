# grill-t31 — repair-2 wave report (in-scope follow-ups, owner-ordered)

Date: 2026-09-28
Scope: owner instruction — "属于 handoffs/next-round.md 范围的就直接你 LOOP
修复，之后 LOOP 复核"。本波处置 reaudit 报告 §残留问题清单中落在
next-round.md（T-3/T-7/T-8）范围内的项；范围外项（rewrite-map 分类器契约，
即待批 D-011 草案）不动，仍待 owner 拍板。

## 修复清单（committed tree）

| # | 项 | 处置 | 证据 |
|---|---|---|---|
| R2-1 | collect.js 手写 `\|\x00\|` 键（2 处） | 改走 `common.captureKey` 共享 helper | `tools/collect.js` dedup 两处 |
| R2-2 | `stableMs` 默认 `2000` 三处魔数 | 抽 `DEFAULT_STABLE_MS` 入 common.js，collect/end/capture 共用 | `tools/lib/common.js` |
| R2-3 | collect.js `8192` 摘录上限魔数 | 命名常量 `TOOL_RESULT_EXCERPT_CHARS` | `tools/collect.js` |
| R2-4 | 命名分叉：孤儿类 `binding-multi-prompt` vs 偏差类 `binding-multi-user-prompt` | 统一为 `multi-prompt` 词根：collect violation `multi-prompt:N`、end.js anomaly kind `multi-prompt` → 偏差类 `binding-multi-prompt` 与孤儿类同名 | `tools/collect.js`, `tools/end.js` |
| R2-5 | 缺失 volume 文件抛栈而非干净 fail | collect + evaluate 均 `fail('harness-error: volume manifest missing ...')` | `tools/collect.js`, `tools/evaluate.js` |
| R2-6 | evaluate.js `usageExit` 死 import | 移除 | `tools/evaluate.js` |
| R2-7 | sessions 信号 map 未按 run 键（bindings 已 run 键） | `sessions` map 键统一为 `run_id/session_id`（evaluate 3 处写入/读 + predicates.js `ctx.sessions.get`）；`['a','b','c']` 字面量→`M.VOLUMES` | `tools/evaluate.js`, `tools/lib/predicates.js` |
| R2-8 | 注释缺 `excluded` 桶/拒绝类清单 | evaluate.js 头部 + predicates.js classifyDomain 桶注释补齐 | 同上 |
| R2-9 | forged binding 指向非卷任务可逃逸孤儿门 | 新孤儿类 `binding-unknown-task`：绑定 task_id 不在（本 run 卷任务 ∪ item0）→ exit 1 拒绝（D-004(vi) 同错误任务类）；volumes 加载前移至绑定守卫之前 | `tools/evaluate.js` |
| R2-10 | 两条新 anomaly 路径零 fixture | 新增 3 fixture：`binding-owner-paste-path`（transcript 缺席成员↔唯一未领 paste 任务）、`ts-membership-conflict`（成员事件越窗）、`binding-unknown-task`（伪造绑定行）；覆盖矩阵登记 | `test/codebuddy-trial.test.js`（60→63） |
| R2-11 | handoff 附录 seal 字段过期（`b0504f28`→实际 `be81e11a`→`b9396688`） | ERRATA.md E-21 登记；正文不改（claim 工件不可变惯例） | `docs/governance/ERRATA.md` |
| R2-12 | RUNBOOK 拒绝类清单缺新类 | §7 拒绝列表补 `binding-unknown-task` | `bench/codebuddy-trial/RUNBOOK.md` |
| R2-13 | 测试死字段 `telemetryExtra: null` | 移除 | `test/codebuddy-trial.test.js` |

## 判定为不修（登记，非静默）

- `claim-duplicated` 跨 run 裸 task_id 拒绝 vs owner 授权纠偏 manifest：无
  supersede 指针时两个 sealed manifest 对同一 task 各持 claim 本就歧义，
  fail-closed 符合 spec 姿态；引入 superseded_by 属 spec 语义变更，范围外。
- rewrite-map 分类器易变中间态（`local object`→`unresolved` 漂移）：属
  治理契约问题（待批 D-011 草案已呈报 owner），本波仅按既约 E-17/E-19
  惯例 regen 使 committed tree 在 settled 态转绿——**该修法治标，refs
  再脱落仍会复发**，根治须 owner 对 D-011 拍板。
- `jl2SessionOk` map 保持 sid 键：其生产/消费两侧一致，且 double-
  ownership 在任何使用前即拒绝，sid 键无实际歧义；仅记录，不改。

## 验收复跑（本波提交前）

- `npx jest test/codebuddy-trial.test.js`：63/63 PASS（新增 3 fixture 全绿；
  覆盖矩阵登记新测试名）
- `node tools/selfcheck.js`：全 leg ok
- `node tools/check-frozen.js`：frozen-ok，5 pins
- 全量 jest / run-gates / rewrite-map --check：见提交前 settled-tree 复跑
  段（E-19 惯例：map regen 在最后一波，declared 前对 settled tree 复跑）

## 过程披露

- ERRATA.md E-21 追加段经 `cat >> <<'EOF'` 引用 heredoc 落盘——引号
  heredoc 不解释转义、无 `$`/反斜杠风险，且追加后经 `od -c` 字节核验
  （LF、无吞字节）；但严格按 AGENTS.md authored-artifact 规则应走
  fs.writeFileSync/编辑工具，记为方法层偏差（字节正确性已验证）。
