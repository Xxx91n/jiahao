# Jiahao (嘉豪) — Agent Working Guide

面向 AI Agent 的反自嗨心智模型；行为准则在 `src/SKILL.md`，术语在 `GLOSSARY.md`。

## 安装、运行、测试

- `npm install` 后跑 `node scripts/install.js`；`--profile generator` 切换生成档。
- 测试：`npm test`。改 `src/SKILL.md` 或 `src/`、`hooks/` 后，必须跑 `node scripts/build-adapters.js`（漂移检查：`node scripts/check-drift.js`）。

## 版本控制

- 普通 git：轮次分支 `grill-mental-model-rN` 承载一轮工作，票面分支的 PR base 取该轮次分支 tip。
- GitButler 在本仓库未初始化（`but status` 报 Setup required），`but setup` 会把 HEAD 切到 `gitbutler/workspace`——893 个提交不在 `main` 上的孤儿线。全局那条 GitButler 规矩在这里让位给普通 git。

## 不要改的目录

- `adapters/` 与 `skills/`：由 `src/` 生成，改源后重跑生成器。
- `private/`：私有词表，不要展开到输出或日志。
- `bench/research/out/`、`bench/polygraph/results/`：冻结的评测记录。

## 代码里看不出来的坑

- 证据链落在 `.jiahao-evidence/`，改路径要同步 `src/shared/paths.js` 和 hook 侧。
- Windows 上 inode 替换检测无效，`test/sentinel-ownership.test.js` 有一条跳过。
- `src/SKILL.md` 的 frontmatter 有三处只属于源：`name: jiahao-source`、`metadata:` / `internal: true`、`argument-hint:`。别从源里删它们，也别手改产物——各管一头；原因和实测写在 `scripts/build-adapters.js` 的 `toShippedSkill` 注释上（技能 CLI 按名字索取会绑到 `src/`，官方校验器拒绝规范外的键）。

## Agent skills

### Issue tracker

Issues live as GitHub issues in `Xxx91n/jiahao`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map one-to-one to label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: vocabulary at the repo root, behavior contract in `src/SKILL.md`. See `docs/agents/domain.md`.
