<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/logo-dark.png">
    <img src="docs/assets/brand/logo.png" alt="jiahao 标志 —— 兜帽蒙面像" width="140">
  </picture>
</p>

<h1 align="center">Jiahao（嘉豪）</h1>

<p align="center">
  <a href="README.md">English</a> | <b>中文</b>
</p>

<p align="center">
  面向 AI 编程智能体的反自嗨、防虚假完工心智模型分发。<br>
  核心唯一信念：<b>“凭证即一切（No receipt, no claim）”</b>。
</p>

AI Agent 普遍存在虚假完工综合征：不测就宣称搞定、报错找补借口自我安慰、思维链里脑补自嗨、长篇大论小作文挤占工具行动、自造黑话复合词装高大上。Jiahao 从底层结构上杜绝这些恶劣行为。

## 反自嗨五级物理行动阶梯

每次交互与任务执行，必须严格顺次攀爬五级行动阶梯，任何一阶未通过直接判定失败并阻断完工：

1. **第 1 阶（动作前置）**：有操作空间必须先调物理工具，无调用前输出文字严禁超过 2 行，绝对禁止长篇小作文挤占工具行动。
2. **第 2 阶（探针锚定）**：思维链推导置信度恒为零。结论必须逐字引用真实工具探针物理回传（日志/断点/状态），无外部回传严禁自信断言。
3. **第 3 阶（红灯即停）**：任何命令 exit≠0 或测试挂死，唯一合规动作是承认失败出示报错，严禁找补狡辩“不影响主流程”。
4. **第 4 阶（目标核销）**：对照原始目标逐项物理对账，每项必须有当轮新跑的 exit 0 物理证据，缺一不可宣称完成。
5. **第 5 阶（三行硬锁）**：最终交付回复硬锁至多 3 行结构化事实（`[行动结论]`、`[机器凭证]`、`[残留风险]`），全用初中生大白话，包含自造黑话直接判违规。

## 支持宿主与接入

Jiahao 从 `src/SKILL.md` 单一源头自动构建并保持全系宿主适配器同步：

- **Cursor**：`.cursor/rules/jiahao.mdc` 与 `jiahao-generator.mdc`
- **Windsurf**：`.windsurf/rules/jiahao.md` 与 `jiahao-generator.md`
- **Cline**：`.clinerules/jiahao.md` 与 `jiahao-generator.md`
- **Claude Code**：`hooks/jiahao-hooks.json`
- **Codex**：`.codex/hooks.json`
- **通用项目契约**：`adapters/instruction-tier/AGENTS.md` 与 `AGENTS-generator.md`

通过 `.jiahao-profile` 标记文件指定使用主执行 Agent 角色（`generator`，默认）或二方独立审计员角色（`verifier`）。

## 本地物理检验

所有规矩均可通过机器命令直接物理求证，不依赖任何虚构指标：

```bash
npm test                        # 全量 Jest 物理测试（17 套件）
node scripts/build-adapters.js --check  # 宿主适配器黄金镜像一致性检查
node scripts/check-drift.js     # 适配器漂移检查
git diff --check                # 格式与行尾空格检查
```

## 开源协议

MIT
