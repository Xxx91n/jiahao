# grill-t27 GOAL

## 轮目标

CI 红腿分诊轮（t26 D-001 / ADR-0085 Consequences 既定）：分诊并处置公开克隆宇宙（GitHub Actions runner）上的残余红腿，关闭 defer-0070 的销账路径，并作为 ADR-0085 双层锚定语义（claim-point + seal boundary）收敛成本的首燃实测场。

## 痛点（原文，永存）

我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 本轮驱动输入

- 审计交接（`.scratch/grill-t26/handoffs/2026-09-24-audit-handoff.md`）Next grill direction：triage 三套件 CI-red 腿 → defer-0070 于首个绿 run 销账（记 run id）→ 收敛成本首测（waves-per-round vs t25 的 20+ 基线）。
- 实测公开态（2026-09-25，run 36030223375 @ origin/main `0ca482f7`，t26 已合并+`adjudicated/grill-t26` tag 已 push 指向 SEAL `53bff916d`）：CI 红面已收敛为 6 腿同族、零逻辑 bug——
  - gate-all 4 腿共享一根因：`corpus-leak`/`corpus-freshness`/`corpus-classes`/`mr-probes` 全 FAIL 于 `JIAHAO_CORPUS_DIR=/home/runner/work/_temp/bench-corpus` 指向不存在目录（ADR-0038 D3 fail-closed 报错）；
  - test 2 腿：`sentinel-ownership` D2b（unlink+recreate 期待新 inode——Linux inode 复用合法，断言平台脆弱）、`adr-0079-wiring` D5（npm-cli.js 经 `dirname(execPath)/node_modules/npm` 解析——Linux runner 布局为 `lib/node_modules`）；
  - 设计内非致红：`[208 rewrite-map]` UNVERIFIABLE（0084 克隆可降级正常 firing）、`[209 rewrite-map-published]` PASS。
- 锐评1.md 仍为 V6（覆盖 t15→t24，未更新）；辩证对账后 agent 可执行残余 = 本 CI 红面 + defer-0070 销账。其余未完成项全部 human-only（2026-12-15 tide 注册）。

## 约束

- grill 期间不动源码、不设其他目标；一次一个问题，调研先行。
- 每个被确认的实质性结论当场追加 `decision-ledger.md`（D-001 起）。
- 人类权威事项（tag push、renew-or-expire、countersign、drift 裁决）不由 agent 代行。
- 版本控制走 GitButler，独立分支，提交用显式 allowlist + `git show --name-only` 核验。

## 阶段注记（2026-09-25）

grill 提问段收官：账本 8 条 current（D-001..D-008），spec 与 next-round 任务书已按账本唯一源生成。当前阶段=文档提交防丢（but 显式 allowlist），随后实现轮按 handoffs/next-round.md 任务书执行。
