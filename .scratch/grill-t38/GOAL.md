# grill-t38 落地波 GOAL（常驻目标卡·防丢失）

> 起草 2026-10-06。身份：修复/开发子 Agent。唯一数据源：.scratch/grill-t38/decision-ledger.md + spec-t38-assertion-anchoring.md + handoffs/next-round.md。

## 目标
落地 grill-t38 断言锚定波（T-0~T-12）：使每个对树态的 committed claim 声明评测锚，核验机制按所声明锚（非当下世界）判定。

## T-0 硬序（违规=漂移窗复发）
1. ADR-0095 起草落地（含 S-9 登记内容）
2. ADR-0096 起草落地
3. 机制实现（T-3~T-7）
4. gates.json 三腿注册（assert 腿最后，防 source_adr 悬空）
5. deferred 行落盘（T-9）
6. E-19/AGENTS.md 注记（T-10）

## 验收标准（原文）
「验收标准：编译通过、打包通过、启动并测活软件进程；每个平台都要有 test 闭环，避免只引入却没做到。」

## 版本控制
- 仅 but 写（专用分支，与其他分支并行互不影响）；禁 git 写命令。
- 显式 path/hunk-id allowlist，禁裸 but commit；提交后 git show --name-only 核对落地集=意图集。
- WORKFLOW.md §4.2 本仓不存在（t14/t15 登记永久缺失）；语义=专用分支+仅 but+不 push+偏差披露。

## 交付
- 报告：D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-06-report.md（每条声明附可复跑证据：命令+输出摘要）。
- 交接：$handoff 生成（OS 临时目录）。

## 范围外（勿做）
pack cap 签署/post-land 刷新时点（owner act）；source_adr 数组扩形；audit-coverage/post-land-verify 锚定收编；HEAD-绑 live-eval 全量枚举；t23/t27/t28/t36 残留；ADR-0094 status 行；post-land-sentinel.test.js 未跟踪文件。
