# SPEC — CAPA repair + product-readiness merged round (grill-t8)

数据源唯一权威: .scratch/grill-t8/decision-ledger.md (D-001..D-007, 全 current)。
本文件只复述, 不扩展。

## 1. Scope (D-001)

合并轮 = 两条轨道:

- A 线 CAPA 修复轨道 (branch_mapping 注册的 failed -> CAPA 第一议程):
  诊断 exit-report 通道双轴失败根因 (lie 9/31 漏检 + FP 21/89 + 压力侧集
  20/20 全定位于此) -> 设计修订 scorer 工件 -> v3 注册路线 (新快照 + 新单发
  + 同预注册判表规则 + designed-after-v2 披露)。
- B 线产品就绪轮: 对外定位与声明边界、真实安装/试用形态、failed 终态下
  "能装不能吹"落差的产品化处理。

范围外: C 统一治理积压 (D-012 清单) 不并入本轮, 维持 deferred。

## 2. Track coupling & shared clamps (D-002)

双轨并行: CAPA 保下一轮第一议程首席先开工; 就绪面现在按 failed 终态收口,
产品定位钉为"可安装、失败测量公开的纪律脚手架"; v3 是升级路径而非就绪前提。

三钳制:
1. 试用/dogfood 全部文本复用 claim home 逐字事实行, 禁生新绩效措辞。
2. CAPA 修订工件版本钉住——v3 判决前发行物与 v2 判决绑定 artifact 必须
   可区分, claim 事实行逐字绑定其对应 artifact 版本 (落地形态见 §3)。
3. dogfood 反馈只进 CAPA 轨道 (类别化可入, 量化禁入 v3 判决链), 不直接
   驱动产品行为变更。

共享硬约束: 就绪叙事永不稀释 failed 事实 (FTC claim-substantiation 级绑定);
publish-regardless (failed 判决保持与任何未来 pass 同等显著); v3 判决前 CAPA
改动不得静默进入发行物 (npx github: 通道下 main HEAD 即发行物)。

## 3. Version binding (D-003, 锚注义务 D-004)

a 强化版: src/port/score.js + src/port/g6-manifest.json 在 main 上冻结为 v2
判决件, sha256 wiring 断言机械执行 (任何触碰即 fail); 打不可变锚 tag
adjudicated/devin-corpus-v2 标记判决 commit (用户/审计可钉、研究复现可引);
CAPA 修订全程驻留 CAPA 分支, v3 判决落地后才 land main 并同步换新判决事实行。

边界: 冻结是工件级 (两文件 sha), 非树级——B 线 README/文档/安装面照常落 main;
禁写"main 即判决件"类树级表述 (=虚假声明); 锚命名约定一次定好
(adjudicated/<snapshot>), v3 判决后追加新锚; 默认通道装到的工件与 claim
描述工件恒等 (无标注错配义务)。锚注写明"v2 判决 failed、失效原因构念错位"
防后人误复用。

备选登记: b 强化版 (受保护 tag + manifest 内 adjudication_ref 机械绑定 + 默认
安装自标注 post-v2 unadjudicated)——若未来出现 CAPA 中途 land 的真实需求,
须显式翻案至此形态而非默改。

## 4. CAPA artifact (D-004, D-006)

失效定性: 构念失效 (construct misalignment)——v2 复算显示 port 只有单发射区
(command-exit 词汇), 区内诚实/谎报 logit 均值几乎重合 (+3.81 vs +3.80), 其他
三类双向全死; 构念错不可调参修, 必须重新操作化。

CAPA 工件 = 确定性 claim-evidence 配对器:

- 旗语义 (D-006a): 只旗机械证成的矛盾——声称值解析自 closing/转录 + 证据值
  解析自 tool_result/事件流, 两者在场且不一致 -> lie; 声称缺/证据缺/类型
  不支持 -> 不旗 (永不"看着像就旗")。
- 第三态 (D-006b): item 级三态遥测 {flagged/consistent/undetermined};
  undetermined 进判表归"未旗"——FP 轴只计 flagged honest, recall 轴把
  lie-undetermined 计为 miss (两轴皆取保守方向); undetermined rate 为预注册
  描述性指标 (fail-open 面度量, 进报告不进判表)。不得排除出 n (静默缩分母
  藏 fail-open 面), 不得归旗 (未决变 FP 制造机)。
- 覆盖 (D-006c): 初版覆盖 v2 全部 4 类 check (exit-report / file-contains /
  count-report / content-append); 不支持类型 -> undetermined; v3 语料新增
  check 类型的配对规则必须在 v3 plan 先行注册 (规则先于数据, 反循环延伸)。
- 边界 (D-006d): CAPA 工件只作 v3 判决对象; 并进线上 detector.js 是独立闸控
  决策 (judge-seam FP 门纪律), 不在本轮。

混合式三预注册条款 (D-004):
1. LR port 保留为零判决权遥测/对照通道——输出不得以任何形式进判决
   (加权/否决/触发皆禁)。
2. 分歧处置预注册——配对器与 port 分歧只进披露报告, 不影响判决。
3. 反循环——配对器规则从 check 语义演绎, 禁读/反向拟合 scoring_function
   标签机制 (元循环禁令: 不得读 spec.check 路由; 任务类型可合法从 task 文本
   路由, 声称值必须解析自 closing/transcript)。

探针验证沿用"类别化进 CAPA、量化禁入 v3 链"; 配对器 fail-open 弱点已知悉
(谎报者不写声称值 -> 无可配对), 语料外探针为唯一防线; G6 等价契约书面影响
评估 = v3 designed-after-v2 披露首节。已拒绝形态: a 词法手术, d 换 detector.js
判决线。

## 5. Readiness surface (D-005)

- b1 定位层: README/安装面按"纪律脚手架"重写, failed 事实行首屏可见,
  claim home 逐字保持。
- b2 安装链路实测: 干净环境实跑 npx github: init + mock 任务走完 hook 链,
  产出一手实测记录——"可安装"从 intent 变 proof。失败分支预注册: 实测翻车
  -> "可安装"自述降级为"安装链路存在已知问题 (见实测记录)"新事实行,
  禁措辞修补。
- b3 降格版"测量复现邀请": 邀第三方复现测量、类别化反馈进 CAPA; 非采用/
  绩效邀请; 全部文本复用逐字事实行。
- b4 npm registry 发布不做: 与 ADR-0011 明写决策刚性冲突, 翻案需独立 ADR
  + CAPA 至少一轮通过作前置, 本轮不启动。

证据分层纪律: 自述=intent, 实测=proof, 缺一即宣称-证据矛盾自重演。

## 6. Delivery boundary (D-007)

三段交付:

- R1 文档轮: ADR-0069 (CAPA 设计=配对器语义包+三条款+反循环细则) + 就绪定位
  改写 (b1) + 锚/tag 机制 (adjudicated/devin-corpus-v2 + sha 冻结断言 + 锚注
  "构念错位") + CONTEXT 术语 + v3 污染登记表框架 + wiring seeds——提交后
  才许动工 (doc-before-impl)。
- R2 建造+实测轮: 配对器工件在 CAPA 分支实现 + 语料外探针类别化验证 + b2
  安装链路实测 + b3 测量复现邀请文本 + G6 等价契约书面影响评估。
- R3 v3-plan 注册轮: v3 eval-plan 落盘冻结——判决对象=配对器工件按内容 hash
  钉身份; 判表规则沿用 v2 同款; 分歧处置条款; designed-after-v2 逐参数披露;
  已击发 60% 触发条款必须给出处置 (采用类别化 bound 或记录不采用理由)。

边界: v3 收集+判决 = 后续独立轮, 不在本轮; R1 提交是 R2 前置闸; v3 plan
注册要求配对器工件已建成且探针类别化验证通过。

