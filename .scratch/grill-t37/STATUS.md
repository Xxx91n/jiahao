# grill-t37 常驻目标卡（防丢）

- **当前阶段**: grill 结束后整理文档环节（用户已批准定稿流程）
- **数据源纪律**: 唯一数据源 = .scratch/grill-t37/decision-ledger.md；对话回忆中的结论若账本没有→列出并停下问 owner，禁止直接写入文档。
- **步骤**:
  1. 枚举账本全部 current 记录
  2. 每条标注去向（spec 条目 / 计划表条目号 / 显式范围外+理由）
  3. 输出无去向清单——非空则停下呈报
  4. 对账通过后按 $domain-modeling + $neat-freak 整理
  5. $handoff 生成 handoffs/next-round.md（每项任务声明覆盖的 D-xxx + suggested skills 段），but commit 防丢，停住
- **账本终态**: 6 条记录（D-001 revised、D-002~D-006 current）
- **关键凭据**: atomcode q1=c91df33e / q2=单次完成 / q3=92e8722f / q4=单次完成 / q5=54f913b2 / q6=单次完成
