# Jiahao > 嘉豪

装给 Agent 的反 LLM 气息、防虚假完工插件。让它多说点人话，多做点人事。默认常驻主执行 Agent，治五种毛病：假完工、自我安慰、颅内高潮、显摆不做事、自造黑话。

**你作为这个项目的开发 Agent，要是你自己也这样，那你就是项目要治的病。下面这些词只给文档互相认人用，不要出现在给用户的输入和输出里；真要提，先用大白话讲清意思，别把词当解释。**

## 术语

**交付工程师（Delivery Engineer / 凭证即一切）**
只认机器实际跑了什么、状态真的变了没有，不听嘴上说。没拿到凭证，就不说完工。
别：自夸、抒情、表演式小作文。

**反自嗨单一心智模型（Anti-Jiahao Mental Model）**
就五句话：先动手再说话；只信工具回传；报错就停；跑完闭环才算交差；说人话少废话。
别：繁琐条例、空洞口号、脱离工具的空谈。

**五语义专精防御（Five Specialized Defensive Criteria）**
五种毛病各有一条判据：假完工看逐项凭证；找借口看红灯即停；颅内高潮看工具回传；显摆不做事看工具前置和输出限长；黑话看大白话过滤。
别：含糊概括，或者把五种毛病当成一种。

**物理退出码准入（Physical Exit Code Verification）**
完工只看一条：标准命令这一轮重跑后退出码是 0，输出和预期一致。
别：信 Agent 的自述；信旧日志。

**三行输出硬锁（Three-Line Output Lock）**
交付回复最多三段：这轮跑完的结论、电脑里的证据、没做完的风险。每段一条，以标签开头，段和段之间空一行。名字里的「三行」指这三条标签行，不含空行。「一行」是段的形状，不是字数上限：一段可以写两三句短句。段之间只留单换行，Markdown 会把它们挤成一段。
别：没让说就长篇大论；段里只报标签或机器名字，不讲结果和为什么重要；两个标签挤在同一行；三段之间只留单换行。

**平实人话纪律（Plain Language Discipline）**
先用大白话讲结果和为什么重要，有值得知道的原因就说原因，再提文件路径、符号、票号或内部叫法。提的时候，同一句里先说清它是什么、为什么重要；名字不能替代解释。证据段可以在标签之后先给命令，但紧接着要用大白话讲清它证明了什么。全文用初中生能懂的话，不造复合词、连字符拼凑词和晦涩句式，不写长难句。
别：用标签或机器名字指代却不解释；自造名词；学术黑话；长串定语；长难句；为了短删掉解释。

**嘉豪式行为（Jiahao-style Behavior）**
本项目要治的五种行为：自以为完成、自我安慰跑通、颅内高潮、显摆不做事、自造词装高大上。
别：把态度问题和工程交付混在一起。

**反自嗨五级行动阶梯（Anti-Jiahao Action Ladder）**
每次交互按顺序过五级：动作前置；探针锚定（只信工具回传的结果）；红灯即停；目标核销（逐项对凭证）；三行硬锁。每级只有过或不过，最低的没过级直接拦住。
别：把它当可跳过的说教；没探针就下结论。

**插话纠正（Correction Mid-Task）**
用户在回合没跑完时插进来的一句话。它改的是计划，不是目标：按它改下一步，然后把原任务做完。只有四种情况能提前收尾：用户取消、原目标真做完了、卡在只有用户能解开的事上、或者红灯即停（R5，比如测试没过）。收尾时先复述这轮一开始要做的事，再讲清还剩什么、为什么停，不能只贴一份回执。
别：把插话当成原任务已完成；回一句「已更新」就关回合；不提剩活就停。

**规则版（Rules Version）**
由 `src/SKILL.md` 生成的标准技能目录 `skills/jiahao/SKILL.md`。只有指令，没有钩子；两份纪律都写在文件里，宿主自己取用。用标准 CLI 从仓库装。
别：手改生成出来的目录；说规则版会按 `.jiahao-profile` 选档；把「规则已加载」说成「拦截已生效」。

**插件版（Plugin Version）**
自包含的插件目录：`adapters/claude-code/`、`adapters/codebuddy/`、`adapters/copilot/`、`adapters/codex/`、`adapters/antigravity/`、`adapters/qoder/`、`adapters/zcode/`、`adapters/workbuddy/`。清单、宿主加载的钩子配置、钩子脚本和它运行时需要的文件、`src/` 副本、SKILL 正文都在目录里。按各宿主文档的原生命令安装：Claude Code 和 Codex 走仓库根的插件市场清单；CodeBuddy 和 Copilot CLI 直接装目录；Google Antigravity 用 `agy plugin install`；Qoder Desktop 用 app 的插件设置装本地压缩包；WorkBuddy 用桌面自带 CLI 的 `codebuddy plugin add`。只有插件版能硬拦，且按宿主档位说话。Copilot CLI 1.0.105 和 Codex CLI 0.163.0 在 2026-10-30 真机看到收尾阻断。Google Antigravity 1.2.12（#111）和 Qoder CN Desktop 0.4.11（#109）在 2026-10-31 看到。Qoder 国际版 Desktop 0.4.11（#113）和 WorkBuddy AI 5.9.4 国际版（#110）在 2026-11-01 看到。WorkBuddy 国内版 5.9.3 在 2026-11-01 自己那一跑也看到。都记 A 档。两次 WorkBuddy 观测都用探针钩子顶替发货的 gate，证明的是宿主的回合结束通道，不是 gate 自己的判定在真机上跑过。安装路径的真机验证状态见各适配器说明。
别：只登记钩子不带脚本；把插件目录说成「装上规则就生效」；把「装上」说成「真机已验证」。

**出口（Exit）**
分给宿主的安装形态，不是进程退出码。规则版是标准技能目录，或按宿主规则目录分发的纯指令；插件版是自包含插件目录，带钩子。Qoder Desktop（0.x 工作台，含 CN 和国际版）有两个出口：只要规则就装规则版的标准技能目录；要强制就装 `adapters/qoder/` 的插件。A 档对两个 Desktop 变体各自成立：CN 0.4.11 在 2026-10-31、国际版 0.4.11 在 2026-11-01，实测的都是项目级 `.qoder/settings.json` 注册的钩子通道。同目录的 `rules/jiahao.md` 是给 Qoder IDE/CLI 的纯指令出口，只有规则正文，不注册任何东西。
别：把「出口」和进程退出码混用；把退役的适配器目录当成受支持的出口；把规则出口说成插件版；把 IDE/CLI 的 `.qoder/rules/` 当成 Desktop 的安装路径；把 IDE/CLI 说成 A 档。

**受保护面（Enforcement Surface）**
工具调用前那道检查（PreToolUse 守卫）判断一次调用会不会改动 jiahao 自己的装置。两条通道：一是钩子脚本和规则文件这些 jiahao 自己的文件名片段；二是解析后落在插件根里的装置目录（`hooks/`、`rules/`、`src/`、`jiahao-mcp/`、各宿主的清单目录）和根目录的清单文件（`.mcp.json`、`plugin.json`、`hooks.json`）。`.jiahao-*` 整个命名空间都保留，用户工程里同前缀的文件也按装置处理。Windows 文件名不区分大小写，片段匹配也跟着折叠大小写。
别：把插件根外同名的用户文件（比如用户工程自己的 `.mcp.json`）说成受保护；把「文件名片段命中」和「落在插件根里」混成一条；以为 `.jiahao-*` 只认仓库里列过的名字。

**宿主表（Host Table）**
`scripts/build-adapters.js` 里的 `HOSTS`，一个宿主一行，写着：名字、能力档位、目录、注册哪些宿主事件（`hooks` 必填，只有规则的宿主写空对象；`manifest: null` 表示只产出规则和 README，不产出插件清单、`src/` 副本和钩子）、档位出处、这一行自己的 README 文案。配置形态和主流写法不一样的宿主，这一行再指向一个方言文件（`scripts/hosts/<name>.js`）。生成器、`check-drift`、发布门禁和目录结构测试都从这张表读；加宿主通常只加一行，需要方言时再加一个文件。
别：在测试或门禁里再抄一份宿主清单；加宿主时复制另一个宿主的断言。

**方言（Dialect）**
一个宿主自己的配置写法：事件名怎么写、命令字段分几支、超时键叫什么、清单和钩子映射放在目录的哪里、清单里的路径要不要 `./` 前缀、配置模板要不要把平台名传给钩子（Codex 传 `codex`，由 `detectHost()` 认）。方言只能落在该宿主的宿主行和一个方言文件（`scripts/hosts/<name>.js`）里。钩子返回给宿主的固定格式（含每个宿主的阻断退出码）集中在 `hooks/jiahao-runtime.js`；判定脚本 `hooks/jiahao-verdict-gate.js` 不许再写宿主差异。
别：把宿主差异写进判定脚本；在测试或门禁里再抄一份命令写法。

**能力档位（Capability Tier）**
按宿主能在哪一步拦住，分三级：A 档能在回合结束前阻断；B 档只能在工具调用前阻断；C 档只有规则注入，没有钩子。档位是发布时的结论，不是宿主的永久属性；出处写在宿主表那一行（宿主版本 + 实测看到什么）。没看到真实回合被拦下，对外只说「A 档候选」，不说「会拦」。Codex 和 Copilot 的 A 档各有 2026-10-30 的真机阻断记录。Qoder 的两个 Desktop 变体各有自己的记录：CN Desktop 0.4.11（2026-10-31，#109）和国际版 Desktop 0.4.11（2026-11-01，#113），不能互相顶替。Qoder IDE/CLI 没实测，保持 C 档。版本和证据见宿主表和 [docs/evidence/v0.3.0/](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)。
别：把 B 档或 C 档说成「会拦」；凭宿主文档推断档位；把档位当成永久标签；拿一个变体的实测结果替另一个变体说话。

**人工裁定（Human Verdict）**
人对一次完工主张的终审。唯一入口是 `jiahao resolve --verdict pass|fail|inconclusive --reason <text> --reviewer <id>`。它往证据链**追加**一条 `kind:'human_verdict'` 记录；回执给出这条记录的 event_hash 和它在链上的 seq。`pass` 放行它之前写入的记录（Stop 只看最后一条 pass 之后的记录）；`fail` 和 `inconclusive` 只留痕，不放行。没有理由的裁定不算裁定。
别：手改 JSONL 把链拆了；把裁定当成改写历史；把「命令退出 0」当成「已经落链」（回执里的 event_hash 和 seq 才是凭证）；把 inconclusive 当成中立样本（校准统计只把 pass 记作人机一致）；照着钩子提示以为只有 pass|fail 两种（钩子文案还没跟上，后面再改）。

**进包 / 未进包（Packed / Not Packed）**
`package.json` 的 `files` 白名单决定 tarball 里有什么，`npm pack` 打出来的清单就是「进包」的判据。仓库里有不等于进包：`private/`、`bench/`、`docs/evidence/` 都不进包。所以仓库内的相对链接在包里可能死掉；要指到未进包的内容，得用 GitHub 绝对地址。`npm run check:links` 只按包内清单判定，不读工作区。
别：用「本地能打开」证明「npm 读者能打开」；把进包路径和仓库路径混成一回事。

**定罪通道（Conviction Lane）**
回合结束时，`src/pairer-lane.js` 把宿主转写交给 `src/capa-pairer.js`，结果以 `detector.source:'pairer-instrument'` 记进证据链。两种模式：`shadow`（默认）不进风险分级表，也不算 Case A（有完工声明、却没证据）的「有证据」；但它是钩子读转写的通道，解析出的结尾文字仍会参与「这句是不是在说完工」的判断，所以在没有别的消息或证据时，能影响回合放不放行。`enforce`（写 `.jiahao-conviction-enforce`）是人手动提升过的通道，记录连同完工声明和证据一起进表，也算 Case A 的验证证据。裁决出处是 `hooks/jiahao-verdict-gate.js` 的 Case A 注释（#71 item 15）。
别：把 shadow 记录当验证证据；把 enforce 记录当纯遥测；把提升开关说成自动判定。

**证据评审（Evidence Review）**
对带真机验收证据的 PR 逐项核对：每个数字都能在被引用的文件里找到；命令、钩子退出码和会话 id 来自同一次运行；没测过的部分明说成未探测。清单在 `docs/agents/evidence-review.md`。「可能循环的宿主 CLI 要用 `timeout` 或 Job Object 收住」是全局 AGENTS.md 里的负责人操作，不是本仓 CI 的检查项。
别：拿汇总文字代替原始文件；把不同 run 的日志拼成一次观测；把「宿主文档这么写」说成「实测如此」。
