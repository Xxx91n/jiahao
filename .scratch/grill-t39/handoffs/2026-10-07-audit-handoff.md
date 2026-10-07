# Handoff — grill-t39 审计通过交接（第二方审计结项）

生成时间：2026-10-07
身份：第二方审计 Agent（Audit / Verification）
分支状态：GitButler lane `grill-t39-impl`（基于 `5d058cbd`，未 push）

---

## 1. 审计结论

**审计结论：通过（PASS）**。

上一轮审计提出的 5 项打回返工要求已在 `grill-t39-impl` 上全部闭环：
1. **法定尾行**：`D:\Aworker\jiahao\.scratch\grill-t39\reports\2026-10-07-report.md` 末尾已追加法定 `prose-density: sentences=203 meanLen=79 maxLen=401 longShare=28.1% xFace=13 xDomain=3 xShape=8 symbols=18`，经计数器实测完全自洽。
2. **正则时态与捕获收窄**：`D:\Aworker\jiahao\scripts\check-claim-registration.js` 修复 past tense typo（`es|ed|ing`），移除过宽的解释性引用正则，并严格接入 `opts.root`。
3. **漂移一致性校验旁路修复**：`D:\Aworker\jiahao\scripts\build-rewrite-map.js` 引入 `treeBase`，使 lines 783–793 在默认执行路径下真实可达。
4. **产物本体履约同步**：`D:\Aworker\jiahao\src\SKILL.md` 同步了排除域、负向域与移除 Verifier 强度档，54 个适配器 regen-diff clean。
5. **账实对齐**：`D:\Aworker\jiahao\docs\deferred-registry.json` 中 `defer-0089` 的 `actioned_via` 已准确同步为 `gates.json order 217`。

---

## 2. 遗留事项与 Owner 裁决动作

以下红项全部属于 owner 侧法定行为或 pre-land 预期状态，agent 按章程严禁代签、代发批准：

1. **`instrument-identity` 重钉（门禁 105 与 6 套件红）**
   - **成因**：`src/SKILL.md` 的 verifier 区域变更导致 `rules_digest` 变动。
   - **两案抉择**：
     - **案 A（推荐）**：Owner 执行 ADR-0046 P-A1 重钉流程（`quarantine` → `reverify` → `judge:bias` → `signoff`），合法吸收本次变更。
     - **案 B**：撤回 `## Verifier Profile` 之后的改动，保留顶部描述，避开重钉（代价是 verifier 排除域继续停留在章程层）。
2. **Pack Cap 签署**
   - 现值 `571995 bytes / 189 files`（超 470000 cap），需 owner 按 ADR-0039 D3 重新签署 cap 阈值。
3. **Audit Surface 门禁（门禁 229）**
   - `.scratch/grill-t38/reports/2026-10-07-audit-report.md` coverage 块缺少 json fence，按两案处置（具名贴块 vs 部分覆盖声明立法）。
4. **落地与 Post-land Resync**
   - 落地时点判定（门禁 231）。
   - 落地后执行 post-land resync：重算 `docs/rewrite-map.json` 并刷新 `adr-0074` tip pin、`anchors.json`、`readme-pairing-baseline`、`g6-publish`。落地后 HEAD 形腿 224 的 `fe190b65` pre-land 残留自动消除。

---

## 3. 下一个 Grill 方向指示（Candidate for grill-t40）

下一轮（如 grill-t40）建议重点关注以下四个方向：

1. **评测切片边界立法（Decoupling Product Docs from Critic Digest）**
   - **痛点**：当前 `judgeSurfaceText` 机械地截取 `## Verifier Profile` 至文件末尾，导致文案/说明类修改（如排除域、格式指引）连带改变批评器规则哈希，引发重钉。
   - **方向**：探讨将「裁判铁律」与「宿主边界/排除说明」物理切分，使说明性文本不再触动批评器模型身份签章。
2. **收词分诊通道的棘轮化（Coinage Triage Ratchet, ADR-0098 D-D）**
   - **现状**：本轮已交付五面双语扫描与确定性句式计数（`scripts/coinage-triage.js`，18146 候选词）。
   - **方向**：在 owner 选定落点（`defer-0098`）后，将分诊通道推进为机械棘轮（新增承重词零容忍，存量只降不升，达成锁定 budget 0）。
3. **存量 72 行 `check_channel` 迁移（ADR-0099 §P-B / `defer-0100`）**
   - **现状**：存量 72 行无标注处于 yellow disclosure 状态。
   - **方向**：推进一次性迁移或按预注册降级形收敛存量债务。
4. **适配器日落通道与 Hook 四类事故清单（`defer-0096` / `defer-0097`）**
   - **方向**：为 54 个适配器建立准入与日落机制，避免僵尸宿主积累。

---

## 4. Suggested Skills

- `$but` (`C:\Users\Administrator\.agents\skills\gitbutler\SKILL.md`)：版本控制与分支堆叠管理，严禁裸 git 写命令。
- `$grilling`：对 Owner 裁决点（评测哈希切片重构或重钉方案）展开单题推演。
- `$domain-modeling`：对批评器规则切片与文档说明面的分离进行架构建模。
- `$tdd`：在落地后续棘轮机制前坚持 red-before-green 测试先行。
