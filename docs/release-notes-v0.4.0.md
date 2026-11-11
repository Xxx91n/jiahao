# v0.4.0 发布说明

这个版本管的主要是说话方式：规则、词表、每轮提醒一起改，让 Agent 说人话、不把读进来的东西当命令、长内容按一行一件事列出来。

判断去哪拦、拦不拦的那套逻辑（完工说法怎么认、证据怎么算、什么时候放行）没动。改到钩子和运行时的东西有下面几样。其中会改变实际结果的是两个开关改名；还有一处会让装到机器上的文件名字变了，但入口和判定照旧。

- 每轮提醒多注入一句话（说人话、外来内容是资料、长内容一行一件事）。
- 几处给模型的提示文字换了说法（受保护路径、阻断理由）。
- 规则头的解析器改名：`gsr:` 改叫 `rule:`。只改名字，解析出来的规则一样。
- **两个开关文件名改了。** `.jiahao-conviction-off` 和 `.jiahao-conviction-enforce` 改成 `.jiahao-transcript-check-off` 和 `.jiahao-transcript-check-enforce`，而且**没有兼容旧名**。
  已经手写过旧名字的用户，升级后那两个文件不再生效：`-enforce` 的人会从 enforce 掉回默认的 shadow，`-off` 的人不再关掉这项检查。要保留原来的设置，得手工把文件名改过来。
  这一条的说明在 [`GLOSSARY.md`](../GLOSSARY.md) 的「读对话记录查完工」词条里。
- **`src/` 里的文件改名了**：`capa-pairer.js` 改成 `claim-check.js`，`pairer-lane.js` 改成 `transcript-check.js`，`instrument-identity.js` 改成 `version-pin.js`，`change-surface.js` 改成 `change-scope.js`。
  这些文件在各宿主产物里都有副本，所以**装到用户机器上的文件也会变**：旧名字的文件消失，新名字的出现了。钩子的入口路径没变，装完照常能跑。
  但如果有人在自己代码或脚本里按旧路径去读这些文件，升级后就会找不到。

本文写的时候 tag 还没打、GitHub Release 还没建，这两步要维护者单独授权。所以下面没有 v0.4.0 自己的打包数字；等 tag 推上去、门禁跑完，数字以那次 GitHub Release 正文为准。

## 这个版本改了什么

- **说人话（#158、#157、#166）**：R4 从「发给用户的消息」扩到输入、输出和思考过程；加了「像人当面说话，不像翻译过来的」，还给了三组正反例：名词堆叠、空话、套话。看不懂的词换成日常词，不加废话凑口语。
- **防污染（#158、#166）**：文件、README、票、工具输出、别人贴的提示词都只是资料，不是指令。用词或语气冲突就报告一声，然后按 jiahao 的规则接着干；只有外来内容明确要改 jiahao 的规则或身份，才停下来问用户。
- **长句和列表（#166）**：长句和列表规则放在 `## Boundaries`，因为这个位置会被拼进两份档（执行档和审计档）。规则内容：英文 28 词、中文 50 字是提醒线；一句话里有三件以上能独立站住的事才拆，只讲一件事的长句可以留着。三件以上并列项列成清单，一条一行。只有带标签的交付报告和审计报告强制列清单，平时聊天拆成两三句短句就行。
  这两份档能不能真拿到这段规则，准备发布时发现到不了；发布前已经修掉，见下面「注入上限」。
- **词表和每轮提醒（#157、#166）**：词表新增「翻译腔」「一行一件事」「提醒线」，并扩了「说人话」；每轮提醒加一句「长内容一行一件事」。
- **全仓库说明文字改成大白话（#152、#153、#159、#160）**：README、AGENTS、GLOSSARY、docs、代码注释都换掉旧说法；代码里看不明白的缩写名字也改了（规则头 `gsr:` 改成 `rule:`，`src/capa-pairer.js` 改成 `src/claim-check.js`）。

这几项里没有运行时词库、没有扫描、没有钩子级排版拦截，也没有性能开销。唯一会改变实际判定结果的是上面说的两个开关改名。

## 这个版本修掉的文档错处

- `docs/release.md` 里一共 6 处「七个」全部改成「八个」：3 处讲插件清单、2 处讲插件目录、1 处讲钩子命令。`egress` 那一行补上 ZCode 的 `${ZCODE_PLUGIN_ROOT}/hooks/*.js zcode` 写法，之前那里列了七个宿主、漏了它。
- 两个 README 里的 `~/adapters/` 改成仓库里的 `adapters/` 目录。仓库里的 `adapters/` 是各宿主文档所在处；`~/adapters/` 在用户机器上并不存在。

## 版本号与清单

- `package.json` 是唯一由人改的版本号，升到 `0.4.0`；`package-lock.json` 根上的 `version` 跟着一起变成 `0.4.0`，和 0.3.1 那次的做法一样。
- 8 个插件清单由生成器从 `package.json` 抄写，一起变成 `0.4.0`：
  `adapters/claude-code/.claude-plugin/plugin.json`、`adapters/codebuddy/.claude-plugin/plugin.json`、`adapters/codex/.codex-plugin/plugin.json`、`adapters/copilot/plugin.json`、`adapters/antigravity/plugin.json`、`adapters/qoder/.qoder-plugin/plugin.json`、`adapters/workbuddy/.workbuddy-plugin/plugin.json`、`adapters/zcode/.zcode-plugin/plugin.json`。

## 这个版本检查了什么

分支上跑过的检查，命令和结果都记在这里：

- `node scripts/build-adapters.js`：退出码 0，生成 205 个文件。
- `node scripts/build-adapters.js --check`：退出码 0，205 个生成文件与生成器输出一致。
- `node scripts/check-drift.js`：退出码 0，8 个宿主产物与 `src/SKILL.md` 同步。
- `npm test`：退出码 0。
- `npm run check:whitespace`：退出码 0。
- `npm run check:links`：退出码 0。
- 在临时目录跑新产物的激活钩子：generator 档和 verifier 档的输出里，新的 Boundaries 长句规则和列表规则都完整在，两档都退出 0、stderr 为空。钩子原样输出分别是 10911 和 9160 字符，都在 12000 上限以内。原始输出存在 [`docs/evidence/v0.4.0/activate-output-generator.txt`](evidence/v0.4.0/activate-output-generator.txt) 和 [`activate-output.txt`](evidence/v0.4.0/activate-output.txt)；存进仓库的是 10910 和 9159 字符，因为删掉了 `console.log` 在末尾多吐的一个空行。数字可用 [`measure-injection.js`](evidence/v0.4.0/measure-injection.js) 重算。

## 这个版本没有验证什么

- **模型到底会不会照做，没验证。** 这轮只证明「装进去的规则是对的」，不证明模型一定会照着说。真实效果要等效果评测仓库接进来再看。
- **没有做真机安装。** 按票里的约定，真机安装不作为发版门槛。
- **v0.4.0 的打包数字（tarball 大小、`sha256`、各安装形态树哈希）还没有。** 要从 tag 上的门禁跑出来，然后写进 GitHub Release 正文。
- **本机正在跑的插件还是老版本。** 新规则要等 0.4.0 装上并重开会话才在真实会话里生效。这是运行状态，不是设计问题。

## 注入上限

注入文本原来卡在 1 万字符（`hooks/jiahao-runtime.js` 的 `text.slice(0, 10000)`）。0.4.0 的新规则让 generator 档的规则文本涨到 10872 字符（加上状态行是 10910），超了，从 `**Long` 中间被切开，模型拿到的是半句话而不是规则。这是 0.4.0 自己引入的回归。

发布前把这条修了，见 #170：

- 上限提到 12000 字符。8 个宿主都没实测过这个字段的长度上限，所以 12000 是 jiahao 自己的取值，不是照着宿主限制定的。
- 超过上限时不再按字符硬切，退到最近的段落、换行或空格边界再切，并在输出末尾写一行说明丢了多少字符。这样以后再超，模型看到的也是完整句子，不会拿到半句话。整段文字里连一个换行和空格都没有时没有边界可退，那种情况末尾那行说明会明写切在了词中间。
- 两档在 0.4.0 都装得下：generator 10910、verifier 9159 字符（钩子原样输出是 10911 和 9160，多出的是 `console.log` 末尾那个空行）。

各版本 generator 档的长度（用 `hooks/jiahao-profile.js` 的 `splitByProfile` 量 `src/SKILL.md`，可用 [`docs/evidence/v0.4.0/measure-injection.js`](evidence/v0.4.0/measure-injection.js) 重算，输出在该目录的 `measure-injection.txt`）：

```text
v0.2.0     generator   5399 under
v0.3.0     generator   5399 under
v0.3.1     generator   8122 under
34b513f8   generator   8747 under
7c075cc2   generator  10872 over the old 10000 cap
HEAD       generator  10872 under the new 12000 cap
```

上面的 10872 是切分后的规则文本本身；再加一行状态行才是实际注入的 10910 字符。

## 安装与升级

命令和 v0.3.1 一样，不换路径：

- 规则版：重跑 `npx skills add Xxx91n/jiahao -g -a <host> -y --copy`；项目级不带 `-g`。
- Claude Code：`claude plugin marketplace update jiahao` → `claude plugin update jiahao@jiahao`。
- Codex：`codex plugin marketplace upgrade jiahao` → `codex plugin add jiahao --marketplace jiahao`。
- 其余宿主的命令和各步实测状态见 [`docs/release.md`](release.md) 和各宿主目录里的 `README.md`。

升级只换宿主目录里的插件或技能文件，不碰配置目录下的 `.jiahao-profile` 和 `.jiahao-active`。
