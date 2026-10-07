# grill-t39 Q3 调研题面 — P-A ponytail 借鉴收割

派发时间：2026-10-07。`atomcode -p "<问题 verbatim>"`（ctx_batch_execute, concurrency=1, timeout=600000）。

## 问题 verbatim

调研裁决题：上游心智模型项目 ponytail（github.com/DietrichGebert/ponytail，现 v4.13.0）的重大更新对本仓 D:\Aworker\jiahao（二方审计心智模型系统）的借鉴收割。背景：本仓 2025 年以 ponytail 为锚定项目（docs/adr/0001、0002 记录锚定时态：7 级阶梯、lite/full/ultra 强度、基准数被独立复现打 33-50% 折扣）；上游现已演进为多宿主插件化产品。请先回顾：.scratch/grill-t39/decision-ledger.md 全部 current 记录（D-001 范围=双痛点+全结转、D-002 S-224 裁处）、.scratch/grill-t38/decision-ledger.md、docs/adr（重点 0001/0002/0025/0029/0067/0068/0087/0091/0096）、CONTEXT.md 词表、AGENTS.md 工作约定。再调研 ponytail 上游现状（README/INSTALL/releases/命令实现），逐项裁决以下借鉴清单的处置：1) `ponytail:` 行内上限注释惯例（有意简化具名上限+升级路径）；2) `/ponytail-debt` 行内注释扫描收割→账本；3) `/ponytail-review|audit` 过工程化审查→编号删除清单+删前 whole-tree caller check；4) `/ponytail-gain` impact scoreboard；5) 诚实基准方法学（真 agent×真仓 n=4、caveman/YAGNI 对照臂、safe 轴单列、纠正被膨胀基线误导的旧数）；6) 强度持久化+per-project mode+off 真 off；7) 「何时不启用」显式排除域；8) 编号 findings；9) 多宿主插件矩阵；10) 生命周期 hook 硬化。对每项给 adopt/adapt/defer/reject 建议与理由，并调研工业界成熟落地的心智模型（重点：技术债务行内标记惯例如 TODO/FIXME/HACK 的扫描收割、debt ledger、效果度量 scoreboard、行为干预对照评测方法学、功能排除域声明）。辩证指出我呈报的处置矩阵（1/2 adapt、3/4 defer、5/7 adopt、8 已有等价、9/10 reject）的潜在问题。若与本仓 current 决策冲突，明确指出不迁就。

## 裁决点

- 十项 delta 的 adopt/adapt/defer/reject
- 采纳/改造项的落点载体（ADR-0097 / deferred-registry / CONTEXT.md 词目）
