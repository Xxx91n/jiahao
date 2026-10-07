# grill-t38 常驻目标卡

## 当前阶段：整理文档环节（grill 后）

- 唯一数据源：decision-ledger.md（禁对话回忆补结论；疑似遗漏→列出停下问）
- 步骤：①枚举全部 current 记录 ②每条标去向（spec 节号/任务条目号/范围外+理由）③无去向清单非空则停 ④对账通过后按 domain-modeling+neat-freak 起草 spec-t38 ⑤按 handoff 写 handoffs/next-round.md（每任务挂 D-xxx+suggested skills）⑥but commit 防丢后停
- 禁：改源码/改 ADR-0094 status 行/碰 t23/t27/t28/t36 残留/碰 post-land-sentinel.test.js
- 版本控制：but（路径/hunk-id allowlist，禁裸 but commit）；提交后 git show --name-only 核对落地集=意图集
- 写文件一律 Node.js fs.writeFileSync（防嵌套断连）；写后重读校验关键片段
