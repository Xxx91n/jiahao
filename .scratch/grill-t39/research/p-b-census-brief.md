# grill-t39 Q4 调研题面 — P-B 前置：本仓历史语料的装腔证据普查

派发时间：2026-10-07。`atomcode -p "<问题 verbatim>"`（ctx_batch_execute, concurrency=1）。

## 问题 verbatim

本地语料调研题：调研本仓 D:\Aworker\jiahao 提交文档中的「装腔式输出」历史证据。读 .scratch/grill-t*/reports/、.scratch/grill-t*/handoffs/、.scratch/grill-t*/decision-ledger.md、.scratch/grill-t*/spec-*.md、AGENTS.md、docs/adr/（重点 0085-0096 近期轮）、CONTEXT.md，枚举：(1) 未在 CONTEXT.md 词表注册的自造词语/隐喻词（如「落账」「烤透」「下探」「收波」「承重」「腿」「棘轮」「treadmill」类），逐类给密度估计与最典型 10-15 个实例（带文件引用）；(2) 复杂/冗长句式的典型样本；(3) 区分三类的边界证据：a) 已注册承重词（合法）b) 未注册但有实义的过程黑话 c) 纯装饰性堆砌；并评估「词表注册豁免阀」（CONTEXT.md 注册词合法、未注册承重词须登记或改平实表达）的可操作性。输出密度量化与分类清单。

## 前置调研（已完成，atomcode run 2026-10-07）

- Anthropic 一手四条线：character training（"excessive desire to be engaging" 列为不良特质）、谄媚大测（1M 会话、9% 基线、顶嘴→18%、合成数据训练减半）、honesty 微调（27%→52%→65%）、Fable 5.1 官方「Please remove all mannered prose」提示词（社区实测：一行咒覆盖修辞层、结构层仍需详细指令）。
- Kernion 归因：RL 奖励向数学/代码/LLM 解释倾斜→"adapted to LLM psychology"+"overly-dense info dumps"（The Decoder 一手报道 + Fable 5.1 文档互证）。
- 测量判据：LLM judge slop 判定 recall 0.12/κ≈0（禁建）；Wikipedia Signs-of-AI-writing 清单→Vale 三级置信度规则是当前唯一可靠自动化路线；表层规则可机械执法、深层浮夸须人判、端到端自动判定须明文放弃。
- FDR 决定可用性：proselint 1:10 vs AI 检测器 61% FP（ESL 高危）——风格执法误报面须按三级置信度分级+窄起步。
- 中文缺口：AI-isms 检测工具几乎全为英语——本仓自建中文词表面落入既有 wordlist 架构（ADR-0014/0018）。
