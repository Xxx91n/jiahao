# decision-ledger — grill-t17

| ID | Question | User answer (verbatim) | Normalized requirement | Constraints / negatives | Status |
|----|----------|------------------------|------------------------|-------------------------|--------|
| D-001 | Q1 本轮轮界：纯 G 束修复轮 / G 束+残值轮 / 含委托姿态复议的全域轮 | "b" | G-束+残值轮：G-1..G-4 一束处置+审计验收电池原样复跑+节律 consent-sweep；另加三残值项——G-1 升级类杀灭（fix locality：gen-docs.cjs 逐轮副本致修复不跨轮传播）、seq-27 expiry 字面差一格处置、Re-Execution Prior dated snapshot 刷新判定（含 G 族纳入）；锐评五处方验讫已处置仅登记不重裁 | 显式排除：委托姿态（E-6 披露制）不重开——已处置决策，推翻需新论证；栈 landing=owner 域仅知情；4 patch(tq/nl/xu/my)永不提交；战略评审锁 sunset 触发器、promotion 评审锁 N/M 语料（均不本轮） | current |
| D-002 | Q2 G-2 render-pin 豁免政策：标识符形豁免 / 无条件扫描+证据文件 / 一致性钉 / 现状 | "采纳"（针对 b′） | 无条件扫描：删除 backtick-strip 豁免，canon 数字只住 sentinel 区；proseScan 移入 build-round-facts.js 导出并由 --check --report 强制执行（作者期即失败非门期）；jest 钉真报告+quoted-stale-number fixture 必须红；verbatim 工具输出入 .scratch/grill-tNN/evidence/ 提交工件，报告按路径引用不携数字 | 负向：不选标识符形豁免（grammar 边缘案例+残留洞类）；不选一致性钉（孤儿数字洞+松动单一家园原则）；证据工件随轮再生同 facts 理由不入 anchors 链；引用内数字不得复现于正文 | current |
| D-003 | Q3 G-1 类杀灭形态：仅行修 / 门禁+追溯修 / 模板 / 共享模块（经 atomcode 调研裁决 b+c 双层） | "采纳"（针对 b′+c′） | ①不变量断言门禁：所有 .scratch/grill-t*/gen-docs.cjs 的 ROOT 必须 __dirname 派生、禁绝对路径字面量；②追溯全量修：t14+t16 带菌副本改派生式，豁免册不立（副本少+修复机械，全量化成本极低）；③模板层：gen-docs 头部含 ROOT 派生固化单一模板文件，逐轮从模板起；④钉保留兜底（双层：模板防95%门禁抓5%） | 负向：不做整脚本共享模块（Wrong Abstraction——逐轮内容发散）；不用快照测试锁骨架（粒度粗）；豁免册模式拒绝（适用几千文件+修复有风险场景）；钉只钉实证过的类不预钉假想变体；t6 audit 快照按文件名排除不动 | current |
| D-004 | Q4 两残值项处置：seq-27 expiry 字面缺格 + Re-Execution Prior 刷新（经 atomcode 调研裁决） | "采纳"（针对 a′+b′） | (a) seq-27 判定实质合规+字面瑕疵登记：治理注记补记 expiry=任务耗竭语义（冻链不改写落新注记）；惯例锐化签署类授权须带字面 scope:+expiry: 双 token；CONTEXT 词条 Scribed Approval vs Proxy Signature（判别轴=authorization 字段：人决我录 vs 我决）；(b) Re-Execution Prior 发 snapshot v2：n=19@2026-09-18（G-1/G-2/G-3 纳入、G-4 质量非 claim 不计），旧 n=16 标 superseded 归档，detection-bias 条款原样携带；登记惯例"审计发现收官并入计数" | 负向：不以精神满足豁免登记（防临时批准变永久特权先例化）；不滚动窗口不就地改数；首例自披露=方向性事件单独登记非改数；instrument CLI 不加硬格式门禁（授权是逐字人语非机读字段） | current |
| D-005 | Q5 G-3 nits+G-4 smells 处置形态（经 atomcode 调研裁决为判据闸门混合式） | "采纳"（针对 b″） | 三判据闸门（分钟级~≤30行×行为不变×无需先立惯例）：tmpdir清理+helper去重+loader-in-loop 三件进当期（独立 refactor:/test: 原子commit不混修复束）；guard/exit-style 递延登记（惯例缺失非局部缺陷，先立惯例再修）附防腐烂钩子"下轮修复束首项必带一张smell票"配额行；惯例成文为闸门判据本身；nits 5件全修（更正类非可选） | 负向：不写"smells默认进当期修复束"惯例（无上限yak-shaving契约化）；不顺带修与fix混提（Goulding评审成本×2）；不动冻结面；递延票无配额=腐烂不接受 | current |
| D-006 | Q6 收尾形态与执行结构 | "采纳"（针对 a+b+c+d 全包） | 轻收尾：自检电池（t16审计§6验收电池原样复跑）+owner批准，审计节律属owner域仅呈报audit-ready；R1先行（CONTEXT两词条+seq-27注记+prior v2+ADR-0077附录+registry递延票+doc-nits）后R2（proseScan+fixture/gen-docs钉+追溯修+模板/三smell原子commit/钉名修/t17报告facts canon+evidence首用）；setup commit吸收uo+xk；consent-sweep逐条disposition行+smell票配额行；零ask、栈landing仅知情、4patch永不提交 | 负向：不自立惯例性审计（触发未响惯例审计=自立规矩自破）；carve-out不援引（R1全R3/R2全R2干净切分）；proseScan惯例走ADR-0077附录非新ADR；report_commit仍null自指披露 | current |

## T-1 dispositions (R1 documentation bundle, 2026-09-18)

Executed per handoffs/next-round.md T-1. Each row names its evidence; this
section is the same-commit ledger note for the R1 doc-surface edits
(consent-sweep framing - never "audit response").

- D-002 — ADR-0077 D-E appendix registered: unconditional-scan proseScan
  semantics (backtick-strip exemption deleted; canon numbers live only in
  the sentinel region, quoted or bare) + the evidence-file convention
  (verbatim output in .scratch/grill-tNN/evidence/, per-round artifacts,
  never in the anchors chain - same churn reasoning as round-facts.json).
  Forward-binding: earlier reports stay verbatim under the convention
  they were written to.
- D-004a — ERRATA E-7 registered: seq-27 record_signoff classified
  substantively compliant + literal defect; expiry=任务耗竭 recorded as
  the correction; the frozen hash chain is untouched; signoff-class
  authorizations carry literal scope:+expiry: tokens henceforth
  (CONTEXT Bounded Delegation sharpened; not gated in instrument CLI).
- D-004b — CONTEXT Re-Execution Prior snapshot v2 published:
  n=19@2026-09-18 (n=16 base + G-1/G-2/G-3 merged at closeout; G-4
  excluded as quality-not-claim); the n=16 snapshot is superseded and
  archived, not edited; the detection-bias clause is carried verbatim;
  conventions registered - audit findings merge at closeout, first
  self-disclosure is a directional event registered separately.
  Scribed Approval / Proxy Signature terms verified present (setup
  commit qqu); wording did not drift, no extension needed.
- D-005 — defer-0063 registered (build-round-facts guard/exit-style
  smell, missing-convention class, free-text unfreeze_if, quarterly
  2026-12-15; the gate criteria convention is written into the row and
  the anti-rot quota is registered: next fix bundle takes one smell
  ticket first). Doc-nits executed: t16 round-complete handoff
  citation-count dup + "D-E" mislabel corrected, t16 spec section-3
  member list realigned to the shipped enumeration, t16 report F-C
  wording corrected to the carve-out gloss; adr-0033 seed inventory
  re-pinned to 57 entries.

## T-2 dispositions (R2 implementation bundle, 2026-09-18)

Executed per handoffs/next-round.md T-2. Verbatim battery output is
committed under .scratch/grill-t17/evidence/ (D-002 evidence convention);
each row names its evidence or pin.

- D-002 — proseScan exported from scripts/build-round-facts.js;
  backtick-strip exemption deleted; --check --report enforces the
  unconditional scan at author time (pre-collect, pre-splice).
  Wiring: adr-0076-wiring t17 describe pins the export, a
  quoted-stale-number fixture that MUST fail --check, and the t17
  real-report pin; the t16 report is grandfathered to the render pin
  (forward-binding, E-4/E-5 pattern). Evidence: round-facts.txt +
  quoted-stale.txt.
- D-003 — gen-docs class-killer double layer: invariant pin over every
  committed .scratch/grill-t*/gen-docs.cjs (derived ROOT required,
  absolute literal banned); t14+t16 retro-fix totalization (no
  exemption registry); .scratch/gen-docs.template.cjs authoring layer.
- D-005 — gated smells fixed in three atomic commits (zmn tmpdir
  cleanup, zks yml/job dedup, lun loadTaxonomy hoist); the fourth smell
  deferred as defer-0063 with the anti-rot quota. Wiring nits folded
  into the machinery commit (adr-0076 header, adr-0069 test name).
- Battery — the t16 audit section-6 list re-ran verbatim after regen
  (map -> facts -> report-splice); every command's full output is
  committed under .scratch/grill-t17/evidence/.
- Report — rendered facts region from round-facts.json; no canon
  number in prose; report_commit stays null (self-reference disclosed,
  not faked).

## T-3 dispositions (closeout, 2026-09-18)

- Zero owner asks this round: T-3 fully discharged; the consent-sweep
  is registration, not an ask.
- Consent-sweep lines (standing cadence):
  - defer-0060 (CI 403 carrier, external-event) — stays
    pending-evaluation on quarterly cadence; review_at 2026-12-15; a
    tracked row, not an ask.
  - Sunset counter — stays 1/6 (missed check-in is not a zero;
    organic=0 across provenance classes at the last observation); next
    quarterly observation 2026-12-15.
  - defer-0053 — stays pending-evaluation (unfreeze_frozen).
  - defer-0057 — stays pending-evaluation (t13 tally row; closes at
    the next trend-anchor evaluation).
  - defer-0058 (standing per-round net-increment review) — EXECUTED
    for grill-t17: net registry increment +1 (defer-0063 registered;
    no closed/actioned transitions otherwise).
  - O-E backlog (telemetry export breadth) — stays deferred as an
    observation on the standing consent-sweep; low-priority backlog,
    no failure driver.
  - Smell-ticket quota (defer-0063) — the next fix bundle must take
    one smell ticket first; a deferred ticket with no quota is rot,
    not a deferral.
- Stack landing (grill-t15-docs, grill-t16-docs unlanded) —
  informational only; owner-domain action, not a decision item.
- The four audit patches (tq/nl/xu/my) stay untracked forever.
- Audit-ready note for the owner: the report's disposition mapping is
  the next audit's standing review surface; every claim cites a
  committed evidence path.
