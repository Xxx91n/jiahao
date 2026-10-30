# Jiahao (嘉豪) — Agent Working Guide

面向 AI Agent 的反自嗨心智模型；行为准则在 `src/SKILL.md`，术语在 `GLOSSARY.md`。

## 安装、运行、测试

- `npm install` 后跑 `node scripts/install.js`；`--profile generator` 切换生成档。
- 测试：`npm test`。改 `src/SKILL.md` 或 `src/`、`hooks/`、`jiahao-mcp/`、生成器的宿主表（`scripts/build-adapters.js` 的 `HOSTS`）、宿主方言文件（`scripts/hosts/`），或改 `package.json` 的版本与仓库元数据后，必须跑 `node scripts/build-adapters.js`（漂移检查：`node scripts/check-drift.js`）。
- 提交前跑 `npm run check:whitespace`（行尾空白、EOF 空行，覆盖未跟踪文件；`git diff --check` 只看 diff 带的行）与 `npm run check:links`（包里 Markdown 的相对链接必须落在包内）。

## 版本控制

- 普通 git：票面分支 `feat/<主题>-<票号>` 直接对 `main` 开 PR，base = `main`；`Closes #N` 因此生效。仓库里没有 `grill-mental-model-rN` 轮次分支。
- GitButler 在本仓库未初始化（`but status` 报 Setup required），`but setup` 会把 HEAD 切到 `gitbutler/workspace`——893 个提交不在 `main` 上的孤儿线。全局那条 GitButler 规矩在这里让位给普通 git。

## 不要改的目录

- `adapters/`、`skills/`、`.claude-plugin/`、`.agents/`：由 `src/`、`hooks/`、`jiahao-mcp/` 与 `package.json` 的版本/元数据生成，改任一处后重跑生成器。
- 生成物覆盖整个目录，不只是源码副本。看着像手写文档的这几类也由生成器产出，手改会在下一次 `--check` 里被抹掉：
  - 各出口的 `README.md`（`adapters/*/README.md`，内容来自 `scripts/build-adapters.js` 里各宿主的 `*Readme()` 模板）；
  - 插件清单与钩子表：`adapters/*/.claude-plugin/plugin.json`、`adapters/codex/.codex-plugin/plugin.json`、`adapters/copilot/plugin.json`、`adapters/*/hooks/hooks.json`、`adapters/codebuddy/.mcp.json`，以及两份 marketplace（`.claude-plugin/marketplace.json`、`.agents/plugins/marketplace.json`）；
  - 规则与技能副本：`adapters/*/rules/*.md`、`adapters/*/src/**`、`skills/jiahao/SKILL.md`；
  - 出口里 vendor 的钩子与服务端：`adapters/*/hooks/*.js`、`adapters/*/jiahao-mcp/**`。
  要改这些内容，改生成器的输入（`src/`、`hooks/`、宿主表与 `*Readme()` 模板、`scripts/hosts/*.js`），然后跑 `node scripts/build-adapters.js`；判断改得对不对用 `node scripts/build-adapters.js --check`。
- `private/`：私有词表，不要展开到输出或日志。
- `bench/research/out/`、`bench/polygraph/results/`：冻结的评测记录。

## 代码里看不出来的坑

- 证据链落在 `.jiahao-evidence/`，改路径要同步 `src/shared/paths.js` 和 hook 侧。
- Windows 上 inode 替换检测无效，`test/sentinel-ownership.test.js` 有一条跳过。
- `src/SKILL.md` 的 frontmatter 有三处只属于源：`name: jiahao-source`、`metadata:` / `internal: true`、`argument-hint:`。别从源里删它们，也别手改产物——各管一头；原因和实测写在 `scripts/build-adapters.js` 的 `toShippedSkill` 注释上（技能 CLI 按名字索取会绑到 `src/`，官方校验器拒绝规范外的键）。
- 改一个常量的**语义**（不是拼写）时，即使文本零冲突，也要 grep 全部引用点，确认每个断言测的还是它以为的东西。#76 把 `BUNDLE` 从「仓库里的绝对插件目录」改成生成映射的键 `'adapters/codebuddy/'` 后，`path.join(BUNDLE, ...)` 与 `pluginRoot: BUNDLE` 静默变成相对路径；与 #75 合并时 `merge-tree` 报零冲突，CI 连红三轮才定位（#84 收尾改名）。现在前缀叫 `GENERATED_PREFIX`，`runBundleHook` 经 `assertAbsolutePluginRoot` 拒绝相对根。

## Agent skills

### Issue tracker

Issues live as GitHub issues in `Xxx91n/jiahao`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map one-to-one to label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: vocabulary at the repo root, behavior contract in `src/SKILL.md`. See `docs/agents/domain.md`.

### Evidence review

Any PR carrying acceptance evidence — live-host runs, probe logs, release records — is reviewed against `docs/agents/evidence-review.md`, item by item. The checklist is drawn from the #80 rework: numbers must match a cited artifact, hook exit code and session id must come from the same run, and unprobed claims are labeled as such.
