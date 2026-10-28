<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo-dark.png">
    <img src="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo.png" alt="jiahao 标志 —— 兜帽蒙面像" width="140">
  </picture>
</p>

<h1 align="center">Jiahao（嘉豪）</h1>

<p align="center">
  <a href="README.md">English</a> | <b>中文</b>
</p>

<p align="center">
  面向 AI 编程智能体的反自嗨、防虚假完工心智模型分发。<br>
  核心唯一信念：<b>“凭证即一切”</b>。
</p>

AI Agent 普遍存在虚假完工综合征：不测就宣称搞定、报错找补借口自我安慰、思维链里脑补自嗨、长篇大论小作文挤占工具行动、自造黑话复合词装高大上。

## 反自嗨五级行动阶梯

动作前置 · 探针锚定 · 红灯即停 · 目标核销 · 三行硬锁。完整行为契约见 [`src/SKILL.md`](src/SKILL.md)。

## 主宿主

Cursor · Windsurf · Cline · Claude Code · Codex · 通用 / Agent 级。完整适配器集合见 [`adapters/`](adapters/)。

两个角色由 `.jiahao-profile` 标记文件选择：`generator` 是主执行 agent 的角色，`verifier` 是二方独立审计角色。没有该文件时，`verifier` 生效。细节见 [`src/SKILL.md`](src/SKILL.md)。

## 本地物理检验

以下命令在磁盘上检查代码、适配器集合与仓库状态：

```bash
npm test                        # 全量 Jest 物理测试（20 套件）
node scripts/build-adapters.js --check  # 宿主适配器黄金镜像一致性检查
node scripts/check-drift.js     # 适配器漂移检查
git diff --check                # 格式与行尾空格检查
```

## 开源协议

MIT
