# Jiahao (嘉豪)

一个面向 AI Agent 的反自嗨心智模型，默认常驻主执行 Agent，目标是消除虚假完工、自我安慰、颅内高潮、显摆不做事与自造黑话。

## 术语

**交付工程师（Delivery Engineer / 凭证即一切）**：
唯一人格内核：No receipt, no claim。只认机器实际执行了什么和真实状态变更，不认嘴上声称。
*避免*：自夸完备、抒情表态、表演性小作文。

**反自嗨单一心智模型（Anti-Jiahao Mental Model）**：
动手先于动嘴、探针重于脑补、红灯绝无借口、闭环才叫交差、大白话少废话。
*避免*：繁琐条例、空洞口号、脱离工具的抽象理论。

**五语义专精防御（Five Specialized Defensive Criteria）**：
对五种嘉豪行为各有一条判据：虚假完工看逐项凭证，借口自洽看红灯即停，颅内高潮看探针回传，显摆不做事看工具前置与输出限长，虚饰黑话看大白话过滤。
*避免*：模糊泛化、五种行为等同化。

**物理退出码准入（Physical Exit Code Verification）**：
完工的唯一标准是规范化命令本轮重跑后返回 exit 0，且输出与预期一致。
*避免*：相信 Agent 自述、相信旧日志。

**三行输出硬锁（Three-Line Output Lock）**：
交付回复至多三行：行动结论、机器凭证、残留风险。
*避免*：未获指示的长篇解释与宏大分析。

**平实人话纪律（Plain Language Discipline）**：
全文本用初中生能懂的大白话，不造复合词、连字符拼凑词和晦涩句式。
*避免*：自造名词、学术黑话、长链定语。

**嘉豪式行为（Jiahao-style Behavior）**：
本项目要消灭的五种行为：自以为完成、自我安慰跑通、颅内高潮、显摆不做事、自造词装高大上。
*避免*：把态度问题与工程交付混为一谈。

**反自嗨五级行动阶梯（Anti-Jiahao Action Ladder）**：
每次交互顺次过五级：动作前置、探针锚定、红灯即停、目标核销、三行硬锁。每级只有 PASS/FAIL，最低未过级直接阻断。
*避免*：当成可跳过的说教、未经探针就断言。

**规则版（Rules Version）**：
由唯一源 `src/SKILL.md` 生成的标准技能目录 `skills/jiahao/SKILL.md`，只注入指令、不带钩子；两份纪律都在文件里，由宿主自行取用。用标准 CLI 从仓库装入。
*避免*：手工编辑生成出来的目录、承诺规则版会按 `.jiahao-profile` 选 profile、把「规则已加载」说成「拦截已生效」。

**插件版（Plugin Version）**：
自包含的插件目录（`adapters/claude-code/`、`adapters/codebuddy/`、`adapters/copilot/`、`adapters/codex/`）：清单、插件启用后宿主自动加载的钩子配置、钩子脚本及其 require 闭包、`src/` 副本与 SKILL 正文都在目录内；按宿主文档用原生命令安装（Claude Code 与 Codex 各经仓库根的 marketplace 清单，CodeBuddy 与 Copilot CLI 直接装目录）；只有插件版带强制拦截，且拦截按宿主档位说话（Copilot CLI 1.0.105 与 Codex CLI 0.163.0 已于 2026-10-30 真机看到收尾阻断，均记为 A 档）。安装路径的真机验证状态见各适配器说明。
*避免*：只登记钩子却不带脚本、把插件目录说成「装上规则就生效」、把「装上」说成「真机已验证」。

**出口（Exit）**：
分发给宿主的安装形态：规则版（标准技能目录，或按宿主规则目录分发的纯指令）与插件版（自包含插件目录，带钩子）。不是进程退出码。Qoder 的 `adapters/qoder/` 属于前者：只有规则正文和安装说明，没有清单、钩子或脚本。
*避免*：把「出口」和物理退出码混用、把退役的适配器目录当成受支持的出口、把 C 档规则出口说成插件版。

**宿主表（Host Table）**：
生成器 `scripts/build-adapters.js` 里的 `HOSTS`，一个宿主一行：名称、能力档位、目录、注册哪些宿主事件（`hooks` 必填，只有规则的宿主写空对象；`manifest: null` 表示只产出规则与 README，不产出插件清单、`src/` 副本或钩子）、档位出处，以及这一行自己的 README 文案；配置形态与主流形不同时，这一行再指向一个方言文件（`scripts/hosts/<name>.js`）。生成器、`check-drift`、发布门禁和目录结构用例都从这张表读，加宿主通常是一行（需要方言时再加一个方言文件）。
*避免*：在测试或门禁里再抄一份宿主清单、加宿主时复制另一个宿主的断言。

**方言（Dialect）**：
一个宿主自己的配置形态：事件名怎么写、命令字段分几支、超时键叫什么、清单与钩子映射放在目录哪一处、清单里的路径要不要 `./` 前缀、配置模板是否把平台名传给钩子（Codex 传 `codex`，由 `detectHost()` 识别）。配置形态的方言只许落在该宿主的宿主行与一个方言文件（`scripts/hosts/<name>.js`）里；钩子侧的输出信封（含每个宿主的阻断退出码）集中在 `hooks/jiahao-runtime.js`，判定脚本（`hooks/jiahao-verdict-gate.js`）不得再写宿主差异。
*避免*：把宿主差异写进判定脚本、在测试或门禁里再抄一份命令写法。

**能力档位（Capability Tier）**：
按宿主能在哪一步拦住分三级：A 档能在回合结束前阻断，B 档只能在工具调用前阻断，C 档只有规则注入、没有钩子。档位是发布期结论，不是宿主的永久属性；出处写在宿主表那一行里（宿主版本 + 实测看到什么）。没观测到真实回合被拦下的，对外只说「A 档候选」，不说「会拦」；Codex 与 Copilot 的 A 档各有 2026-10-30 的真机阻断记录（版本与证据见宿主表与 [docs/evidence/v0.3.0/](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)）。
*避免*：把 B 档或 C 档说成「会拦」、凭宿主文档推断档位、把档位当成宿主的永久标签。

**人工裁定（Human Verdict）**：
人工对某次完工主张的终审，唯一入口是 `jiahao resolve --verdict pass|fail|inconclusive --reason <text> --reviewer <id>`。它往证据链**追加**一条 `kind:'human_verdict'` 记录，回执给出这条记录的 event_hash 与它在链上的 seq。`pass` 放行它之前写入的记录（Stop 只看最后一条 pass 之后的记录）；`fail` 与 `inconclusive` 只留痕、不放行。没有理由的裁定不算裁定。
*避免*：手改 JSONL 解链、把裁定当成改写历史、把「命令退出 0」当成「已经落链」（回执里的 event_hash 与 seq 才是凭证）、把 inconclusive 当成中立样本（校准统计只把 pass 记作人机一致）、照着钩子提示以为只有 pass|fail 两种（钩子文案还没跟上，属后续改动）。

**进包 / 未进包（Packed / Not Packed）**：
`package.json` 的 `files` 白名单决定 tarball 里有什么，`npm pack` 打出来的清单就是「进包」的判据。仓库里存在不等于进包：`private/`、`bench/`、`docs/evidence/` 都不进包。所以仓库内的相对链接在包内可能死，指到未进包内容要用 GitHub 绝对地址。`npm run check:links` 只按包内清单判定，不读工作区。
*避免*：用「本地能打开」证明「npm 读者能打开」、把进包路径和仓库路径混为一谈。

**证据评审（Evidence Review）**：
对带真机验收证据的 PR 逐项核对：每个数字能在被引用的工件里找到、命令与钩子退出码与会话 id 来自同一次运行、没测过的部分明说成未探测。清单在 `docs/agents/evidence-review.md`。其中「可能循环的宿主 CLI 要用 `timeout` / Job Object 收住」是全局 AGENTS.md 的 owner action，不是本仓 CI 的检查项。
*避免*：拿汇总文字代替工件、把不同 run 的日志拼成一次观测、把「宿主文档这么写」说成「实测如此」。
