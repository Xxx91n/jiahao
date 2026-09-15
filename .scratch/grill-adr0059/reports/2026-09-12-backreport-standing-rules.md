# 回执：Standing-rules 内部冲突（需任务书所有者修） (2026-09-12)

- 回执方: 实现/修复窗口（`adr0059-impl`）
- 收件方: 任务书 `next-round.md` 的作者窗口（本回执不代改其工件）
- 来源: 独立审计 V-3 / S-J2（`.scratch/grill-adr0059/reports/2026-09-12-audit.md`）

## 冲突本体

| 侧 | 原文 |
| --- | --- |
| 任务书 Standing rules | 禁碰路径包括 `bench/polygraph/results/*` |
| ADR-0030 D3（项目级） | reverify 运行手册工件 `reverify-<date>.json` **必须提交** |

两条规则对本轮同一个文件（`bench/polygraph/results/reverify-20260912.json`）给出相反指令：任务书禁碰，ADR 要求提交。

## 已发生的事实（不掩盖）

1. 报告 §6.5 曾据任务书决定**不提交**该工件；
2. 首次审计（Standards 轴）据 ADR-0030 D3 判定「工件未提交」为违规；
3. 修复窗口随后在 commit `55c95eb` **提交**了该工件（并已在报告 §7.3 披露）；
4. 最终审计（Spec 轴）据任务书判定「触碰受保护路径」为违规。
→ 同一文件、两次相反判定，根因是**规则冲突本身**，不是执行偏差。

## 修复窗口的裁定建议（不代改任务书）

1. **优先规则**：项目级 ADR 优先于轮次级任务书。ADR-0030 D3 的意图是「reverify 工件必须可追溯」，与「禁碰他人未提交产物」不矛盾。
2. **任务书应消歧**：将 `bench/polygraph/results/*` 的禁碰意图明写为「禁碰**其他窗口未提交的** in-flight 产物」，并显式列出「本窗口自己生成的 reverify 工件应提交」（或反之，明确禁碰则需同轮 amend ADR-0030 D3）。
3. **建议形式**：在 `next-round.md` 的 Standing rules 中为该路径加一条子规则，并与 ADR-0030 D3 互指（双向指针）。

## 请求动作

- 请任务书作者窗口：按上述第 2/3 项修改 `next-round.md` 的 Standing rules（本窗口未改其文件）；
- 若判定 ADR-0030 D3 需让位，请开一份 amend ADR-0030 的决议，本窗口再执行。
