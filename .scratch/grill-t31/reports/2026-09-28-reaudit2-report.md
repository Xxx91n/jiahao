# grill-t31 — LOOP-2 reaudit report (repair-2 wave verification)

Date: 2026-09-28
Lane: grill-t31-docs. Base: 58d06e20. Wave commits: `af7d2a65` (impl,
7 files) + `25a75d16` (docs+claims, 6 files). Companion artifact:
`2026-09-28-repair2-report.md` (fix list + 判定为不修 registry).

Owner ordered: 属于 `handoffs/next-round.md` 范围的项直接 LOOP 修复 +
LOOP 复核。本报告 = 复核段（同一套硬验收重跑）。

## 复跑验收（settled tree @ 25a75d16）

| 项 | 结果 |
|---|---|
| `npx jest` 全量 | **87/87 套件，1540/1540 全绿**（电池 63/63 含新增 3 fixture） |
| `run-gates.js` | **exit 0**，42 腿全 PASS（4 个 ci-mode UNVERIFIABLE 常态） |
| leg-208 rewrite-map | PASS — 3587 cites in sync |
| leg-209 published-only | PASS |
| leg-219 orphan-ancestry | PASS — 132 pins ancestral；trigger ok vs b9396688 |
| leg-223 anchoring-footer | PASS — 69 commits 核验 |
| leg-224 map-freshness | PASS — 7 claim commits 树内自覆盖 |
| leg-197 governance-anchors | PASS — 18 artifacts in sync |
| `build-rewrite-map.js --check` | OK（E-19：settled tree 末腿复跑） |
| `build-governance-anchors.js --check` | OK |
| `selfcheck.js` | 全 leg ok |
| `check-frozen.js` | frozen-ok，5 pins |
| evaluateRound(grill-t31) | declared=expected b9396688；amended:false；inFlightClean:true；capturesAtSealOk:true；freezeViolations:[]；claims 3×bad:0（含新 claim 提交 25a75d16）；unregisteredClaims:0 |
| 生命周期冒烟（独立复跑） | begin/collect/end 全 0；四探针 pass（deny/instructions/reachability/session_id）；JL-2/3 hit；orphan 注入 exit 1 (unowned)；selfcheck 捕获注入损坏 exit 1 |
| `git show --name-only` | 两提交落地集==意图集（7/6 文件） |

## 逐修复项复核结论

- R2-1..R2-8（卫生项）：全部落地且电池绿。`captureKey` 单一实现点；
  `DEFAULT_STABLE_MS` 三处归一；`binding-multi-prompt` 孤儿类与偏差类
  同名归一（测试断言同步更新）。
- R2-9 `binding-unknown-task`：新红 fixture 证实伪造绑定行（非卷任务
  `zz-not-a-volume-task`）→ exit 1 refused。volumes 前移加载 + 缺失
  volume `harness-error` 干净失败。
- R2-10 三新 fixture 全绿：`binding-owner-paste-path` anomaly 发射且
  不拒（降级路径唯一配对生效）、`ts-membership-conflict` anomaly 发射、
  `binding-unknown-task` 拒绝。覆盖矩阵同步登记。
- R2-11 E-21 勘误落地（E-19 leg-219 无 pin 违规；E-21 散文引用由
  map regen 覆盖）。
- R2-12 RUNBOOK 拒绝类清单含新类。

## 仍未闭环（owner 待批，非本波范围）

- **rewrite-map 分类器易变中间态**：本波按既约 E-17/E-19 惯例 regen 使
  committed tree 转绿——治标。GitButler 内部 ref 再脱落仍会复发
  （四代实证）。根治 = 待批 D-011 草案（稳定类 + errata 注册作分类输入 +
  qualifier 化可达性 + append-only 复活语义），呈报后等拍板。
- `claim-duplicated` vs 纠偏 manifest 语义边界：判不修（fail-closed 符合
  spec；supersede 指针属 spec 变更范围外）。

## 过程披露

- E-21 追加经引用 heredoc 落盘（非 fs.writeFileSync 通道），字节经
  `od -c` 核验完整——方法层偏差已披露于 repair2 报告，不重记。
- `git add -A` 初版误暂存 audit-evidence（nc-001 never-commit）——提交前
  `git reset` 撤出，终态暂存集核验干净。
- 本轮 loop 修复过程中 map/anchors 一度为红（E-21 新引用+digest 过期），
  按 E-17 序（anchors→stage→map LAST）修复后提交；红属中间态，已披露。

## 结论

**repair-2 波：PASS**。范围内遗留项全处置且同一套硬验收全绿。剩余两个
owner 决策点（D-011 分类器契约 / claim-duplicated 边界）按规则呈报待批，
本复核不追认不代决。
