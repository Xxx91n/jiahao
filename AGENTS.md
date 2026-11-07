# Jiahao > 嘉豪 — 给开发 Agent 的说明

装给 Agent 的反 LLM 气息、防虚假完工插件。让它多说点人话，多做点人事。行为规则在 `src/SKILL.md`，术语在 `GLOSSARY.md`。

**你要是自己说话也像 jiahao——吹牛、糊弄、没证据就说完工——那你就是项目要治的病。开发时随时记住下面几条。**

## 装、跑、测

- 先 `npm install`，再跑 `node scripts/install.js`。加 `--profile generator` 换成生成档。
- 测试：`npm test`。
- 改了这些地方，必须重跑 `node scripts/build-adapters.js`：
  - `src/SKILL.md` 或 `src/` 里的文件；
  - `hooks/` 或 `jiahao-mcp/`；
  - 生成器的宿主表（`scripts/build-adapters.js` 里的 `HOSTS`）；
  - 宿主方言文件（`scripts/hosts/`）；
  - `package.json` 里会被抄进产物的字段（`version`、`license`、`repository`）。
- 改完用 `node scripts/build-adapters.js --check` 看产物跟没跟上，用 `node scripts/check-drift.js` 查 profile 和退役出口有没有漂移。
- 提交前跑两个检查：
  - `npm run check:whitespace`：查行尾空格和文件末尾空行，没进 git 的文件也算。不能只靠 `git diff --check`，它只看 diff 里出现的行。
  - `npm run check:links`：包里 Markdown 的相对链接必须落在包内。

## 分支和 PR

用普通 git。一张票一个分支，名字写成 `feat/<主题>-<票号>`，直接对 `main` 开 PR，base 填 `main`。PR 里写 `Closes #N`，合并后票会自动关。

## 不要手改的目录

`adapters/`、`skills/`、`.claude-plugin/`、`.agents/` 都是生成出来的。源头是 `src/`、`hooks/`、`jiahao-mcp/`，以及 `package.json` 里的版本和元数据。改源头，再跑生成器。

生成器会覆盖整个目录，不只是抄源码。下面这些看着像手写文档，其实也是生成的，手改会在下一次 `--check` 时被抹掉：

- 各出口的 `README.md`（`adapters/*/README.md`，文案来自 `scripts/build-adapters.js` 里每个宿主的 `*Readme()`）；
- 插件清单和钩子表，按宿主分：
  - 清单：`adapters/claude-code/.claude-plugin/plugin.json`、`adapters/codebuddy/.claude-plugin/plugin.json`、`adapters/codex/.codex-plugin/plugin.json`、`adapters/copilot/plugin.json`、`adapters/antigravity/plugin.json`、`adapters/qoder/.qoder-plugin/plugin.json`、`adapters/workbuddy/.workbuddy-plugin/plugin.json`、`adapters/zcode/.zcode-plugin/plugin.json`；
  - 钩子表：`adapters/*/hooks/hooks.json`，Antigravity 是 `adapters/antigravity/hooks.json`；
  - 服务注册：`adapters/codebuddy/.mcp.json`；
  - 两份插件市场清单：`.claude-plugin/marketplace.json`、`.agents/plugins/marketplace.json`。
- 规则和技能副本：`adapters/codebuddy/rules/*.md`、`adapters/qoder/rules/*.md`、`adapters/*/src/**`、`skills/jiahao/SKILL.md`；
- 出口里自带的钩子和服务端：`adapters/*/hooks/*.js`、`adapters/codebuddy/jiahao-mcp/**`。

要改这些，就改生成器的输入：`src/`、`hooks/`、宿主表、`*Readme()` 模板、`scripts/hosts/*.js`，然后跑 `node scripts/build-adapters.js`。改得对不对，用 `node scripts/build-adapters.js --check` 看。

另外两个地方别碰：

- `private/`：私有词表，不要写进输出或日志。
- `bench/research/out/`、`bench/polygraph/results/`：冻结的评测记录。

## 代码里看不出来的坑

- 证据链落在 `.jiahao-evidence/`。它是运行状态目录，路径由 `src/shared/paths.js` 定义；要改路径，`src/shared/paths.js` 和钩子那边必须一起改。
- Windows 上查不出 inode 被换掉，`test/sentinel-ownership.test.js` 有一条用例在 Windows 跳过。
- `src/SKILL.md` 的 frontmatter 有三处只该留在源文件里：`name: jiahao-source`、`metadata:` 下的 `internal: true`、`argument-hint:`。别从源里删，也别手改产物。原因写在 `scripts/build-adapters.js` 的 `toShippedSkill` 注释里：技能 CLI 按名字找会指到 `src/`，官方校验器又不认规范外的键。
- 改常量的**意思**（不是拼写）时，把所有引用点都搜一遍，逐个确认测试测的还是它以为的东西。#76 把 `BUNDLE` 从「仓库里的绝对插件目录」改成生成表的键 `'adapters/codebuddy/'`，`path.join(BUNDLE, ...)` 和 `pluginRoot: BUNDLE` 就悄悄变成了相对路径；和 #75 合并时 `merge-tree` 说没有冲突，CI 连红三次才找到。现在这个前缀叫 `GENERATED_PREFIX`，`runBundleHook` 用 `assertAbsolutePluginRoot` 拒掉相对根。

## 给 Agent 的约定

### 票在哪

票和 spec 都在 GitHub，仓库是 `Xxx91n/jiahao`，用 `gh` 命令操作。细节见 `docs/agents/issue-tracker.md`。

### 分诊标签

五个分诊角色，一对一对应到实际的标签名。对照表见 `docs/agents/triage-labels.md`。

### 领域文档

单上下文布局：词表在仓库根，行为契约在 `src/SKILL.md`。见 `docs/agents/domain.md`。

### 证据怎么审

带验收证据的 PR（真机跑、探针日志、发布记录）要按 `docs/agents/evidence-review.md` 逐项核对。清单来自 #80 那次返修：数字必须能在被引用的文件里找到；钩子退出码和会话 id 必须来自同一次运行；没探过的说法要标明是没探过。
