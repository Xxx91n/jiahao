# Handoff — grill-t38 落地波 审计（2026-10-07）

> 身份：审计 Agent（第二方）。本文件是**审计窗口的交接**，不是修复窗口的交接。
> 审计结论：**不通过，打回原修复窗口返工**。判定理由与全部证据在
> `D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-07-audit-report.md`（下称"审计报告"），
> 本文件不重复其内容，只给下一个窗口定位与次序。

## 1. 当前状态一句话

`D:\Aworker\jiahao` 上 grill-t38 落地波（6 commit / 2 lane，未 push）已 landed 但**带 5 个未披露红 + 2 项承重义务缺失**；返工清单已写好，等待修复窗口执行。

## 2. 实物位置（读这些，别读本文件的转述）

| 用途 | 绝对路径 |
|---|---|
| 审计报告（声明→证据→结论全表 + P0/P1/P2 返工清单 + 重跑清单） | `D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-07-audit-report.md` |
| 被审计的轮报告 | `D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-06-report.md` |
| 被审计的轮 handoff（OS temp，未跟踪） | `C:\Users\Administrator\AppData\Local\Temp\grill-t38-landing-handoff-2026-10-06.md` |
| 唯一数据源（D-001~D-006） | `D:\Aworker\jiahao\.scratch\grill-t38\decision-ledger.md` |
| 合并稿 spec（S-0~S-12） | `D:\Aworker\jiahao\.scratch\grill-t38\spec-t38-assertion-anchoring.md` |
| 常驻任务书（T-0~T-12） | `D:\Aworker\jiahao\.scratch\grill-t38\handoffs\next-round.md` |
| 本轮立法 | `D:\Aworker\jiahao\docs\adr\0095-round-contract-carryover-triage-source-adr-dual-authority.md`、`D:\Aworker\jiahao\docs\adr\0096-assertion-anchoring-emit-anchor-test-anchor-emit-output-contract.md` |

版本状态：`main`=`0b7bfb68`；`grill-t38-docs` tip=`dabf82c2`（基 `fa654a05`）；`grill-t38-impl` tip=`5870d7f8`（基 `0b7bfb68`）；workspace tip=`efa91eca`（merge 两 lane）。审计产物在本窗口另建独立 lane 提交，不动上述两条。

工作树里属于**别人**的未提交项（勿动、勿顺手提交）：`D:\Aworker\jiahao\docs\adr\0094-*.md`(M)、`D:\Aworker\jiahao\test\post-land-sentinel.test.js`(M)、`.scratch/grill-t23|t27|t28|t36` 残留。

## 3. 下一个窗口的次序（修复窗口，按此顺序做）

1. 先读审计报告 §0 与 §6。**P0 七项是先决条件**，P1/P2 可同波或下波。
2. 第一项做机械面（最便宜且是其余项的前置）：
   - `docs/governance/trend-inventory.json` 补 `grill-t38` 行（须声明 5 个实测 R2 文件，清单见审计报告 §2 G3）；
   - `docs/governance/claim-surface-roles.json` 补 `.scratch/grill-t38/reports/2026-10-06-report.md` 行。
   这两项一旦落地，`test/adr-0081|0083|0084-wiring.test.js` 与 `test/adr-0093-m3-wiring.test.js` 4 个套件红应转绿，门检 `[232 claim-surface-roles]` 转绿。
3. 第二项做 lane 拓扑（P0-4）：让 `grill-t38-impl` 单飞时 `source_adr` 可解析。**决策点是二选一**（重排 lane 使 impl 依赖 docs，或按 ADR-0095 D-B 让治理文本缺席的 commit 内三腿 non-blocking），选定后在轮报告里点名。
4. 第三项补两条承重义务（P0-5 / P0-6）：D-001.7 新鲜度棘轮、D-001.8② 锚非后补 —— 各配测试；这是账本 D-001.NEG"防逃生舱三件套"缺的两件。
5. 第四项修立法文本与轮报告的诚实性（P0-3 / P0-7）：验收数字按 settled 树重写；ADR-0096:51 的虚报 deferred 登记、`:106` 的 "verified at implementation time" 过度声明一并收口。
6. **修完必须重跑审计报告 §6 末尾"重跑清单"全部命令并逐字贴输出**，其中含一项本审计窗口未做的实测：干净 clone 里 `check-status-inventory.js` 是否如实 exit 2（当前绿依赖 `.gitignore` 内的 `test-artifacts/`）。
7. 重跑后回审计窗口二次判定；二次判定通过前不 push、不 seal。

## 4. owner 手上仍未闭的三件事（agent 不得代签）

- pack cap：须按 pinned 公式重推导并同 commit 改 ADR-0039 D3 字面量。本窗口独立实测 `size=540369 / entryCount=184`，公式算术 `ceil_to_10_000(540369×1.10)=600000` 成立；**但不得拿轮报告的 "+33,319 bytes / 14 files" 当依据**（该数与实物 16 files in-tarball 不一致，基线是"约"）。
- post-land-sentinel 刷新时点：「波已 settle」属 owner 判定（E-19）。
- ADR-0096 里 F-5/F-11 的 `review_at` 偏离（账本 2026-04-30 vs registry 2027-04-30）：已披露，待裁。
- `audit-coverage v1` 具名块的归属：本审计窗口**未贴块**（未跑 CI 范围命令，不伪造覆盖），故 `check-audit-surface` 的被 assert 主体仍停在 t37 报告。要么返工窗口在 CI 面跑齐后具名贴块，要么 owner 就"部分覆盖声明是否合法"立法（详见审计报告 §5.2）。
- 审计窗口可否自登记 claim-surface 行：本窗口按 grill-t37 先例自登记为 `implementer`（不认证 examiner），与 grill-t35/t36 "registration is an owner act" 先例并存；若认定违规，撤两行即可（审计报告 §5.1）。

## 5. Suggested skills for the next session

- `$but` — 所有 VCS 写操作。返工建议在本波同两条 lane 上做，别开第三条；history 编辑后按 AGENTS.md "Post-restack ritual" 重跑 `evaluateRound`。
- `tdd` — P0-5/P0-6 与 P1-11 的绿路径/负例先行。
- `code-review` — 返工 diff 再做双轴（基准点改用返工后的 lane tip，别再用 `0b7bfb68` 单基，因为 lane 拓扑本身在修）。
- `domain-modeling` — `CONTEXT.md` 词表同步（P1-13）与 ADR-0095/0096 收口（ADR-FORMAT）。
- `grilling` — 若 P0-4 的二选一或 §7 的 Q-t39 需要烤透。
- `neat-freak` — 返工波收尾。

## 6. 下一个 grill 方向（指示，不是本轮修复项）

**Q-t39：处置-证据闭合（disposition-evidence closure）** —— ADR/账本声称"已挂 deferred 行"或"由 X 断言承接"时，有没有机械面证明被承接的义务在承接物上真的成立。三个候选切面（优先序即立案序）：
(a) 登记声称 → registry 行存在性反向核验：本轮 `docs/adr/0096-…md:51` 是**已发生的活病例**，不必虚构反例；
(b) "有界断言承接无界义务"的形状识别：D-001.7 棘轮 vs `(anchor, carrier.parent]` 区间，与 ADR-0092 波界有界子集警告同形；
(c) lane 单飞契约可达性：把 T-0 硬序机械化为"每条 lane 自身树内 `source_adr` 可解析"，先查 ADR-0095 D-B 是否已覆盖以免重复立法。

## 7. 本审计窗口的取证边界

数值全部取自本机 settled 树复跑（编译 11/11、真打包 540,369/184、tarball 内 bin 进程起、门检 46/4/3、jest 5 suites/6 tests 且复跑一次证明非偶发）。**未在干净 clone 复现门检**；`[235 status-inventory] PASS` 的机器局部依赖性由代码路径 + `.gitignore` + 工件文件名三处静态证据得出。外部一手规范（PCAOB AS 3110 主文、SLSA/K8s 先例）未复核引用真值，只做了 ADR 文本的 analogy/二手标位核对。
