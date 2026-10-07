# PENDING — t6 整仓快照残渣登记（待 T-1 镇级确认）

**状态**：待批文本，**未**写入 `D:\Aworker\jiahao\docs\adr\0093-observer-equivalence-contract.md`。
ADR-0093 文件本波不碰（task 边界：不抢 ADR 文件）。待 T-1 镇级确认后，
由 T-1 择 amend 风格或 errata 通道落位，或退回本轮重议。

**依据**：`.scratch/grill-t36/decision-ledger.md` D-008#5 +
`.scratch/grill-t36/spec-t36-observer.md` §7 第三条（owner 裁量项，
拆出 ADR-0093 主体——实质项不得伪装机械项）。

**t6 快照可读口径（本波实测，只读）**：

- 路径：`D:\Aworker\jiahao\.scratch\grill-t6\audit\b7ccbeb\`
- 性质：整仓快照（非 capture 目录、非 claim 面工件）。
- 跟踪状态：已跟踪（derive 命令 `git ls-files .scratch/grill-t6/audit | Measure-Object -Line`；
  计数不钉入散文——按 grill-t21 的计数纪律，量由命令产出）。
- 与本轮 pattern 的关系：`.scratch/*/audit*-evidence/` **不**覆盖该路径
  ——实测 `git check-ignore -v --no-index .scratch/grill-t6/audit/b7ccbeb/AGENTS.md`
  无匹配（pattern 要求目录名以 `-evidence` 结尾）。
- 命名冲突史：jest-haste-map 命名冲突史 = 真实污染旁证。

**待落位文本（供 T-1 取用，逐字）**：

> **L-3 — An unrelated whole-repo snapshot is not covered by the
> never-commit convention.** `.scratch/grill-t6/audit/b7ccbeb/` is a
> whole-repo snapshot from an earlier round, tracked as-is; it is neither
> an audit-evidence capture tree nor a claim-surface artifact, so the
> nc-001 ignore pattern (`.scratch/*/audit*-evidence/`,
> `.scratch/*/audit-backup/`) does not and must not cover it. It is
> registered here as its own residue class so the non-coverage reads as a
> decision rather than an oversight. Disclosed hazard, not a defect to
> repair: the snapshot carries a jest-haste-map naming-conflict history, so
> a residue class that no automated rule governs is also a class nothing
> watches. Any future disposition of it is an owner act.

**落位建议**：ADR-0093 已知限制段（`## Known limitations`，现含 L-1/L-2）
之后追加 L-3——即残渍登记段，而非 L-1（自指残余）或 L-2（成员可闭性）
的语义面，避免与 M1/M4 可闭性划界混读。

**本波已落地部分（不重复登记）**：`.gitignore` 收编
`.scratch/*/audit*-evidence/` + `.scratch/*/audit-backup/`（D-008#1）；
AGENTS.md 的 nc-001「ignored-by-design」叙事句（D-008#2）。
本 pending 文件只承载 D-008#5 这一条。

**残余披露（承 D-008）**：ignored ≠ 保护——clean 型命令仍可误杀证据面；
未来审计新写证据不再现于 status（clean-tree 负向判定不受影响，已核）。
t35 池 61→3 缺失写入 t36 closeout 披露面（D-008#4，T-10 范围，非本文件）。