<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo-dark.png">
    <img src="https://raw.githubusercontent.com/Xxx91n/jiahao/main/docs/assets/brand/logo.png" alt="jiahao 标志 —— 兜帽蒙面像" width="140">
  </picture>
</p>

<h1 align="center">Jiahao > 嘉豪</h1>

<p align="center">
  <a href="README.md">English</a> | <b>中文</b>
</p>

<p align="center">
  装给 Agent 的反 LLM 气息、防虚假完工插件。让它多说点人话, 多做点人事。
</p>

> Agent 老喜欢写长篇小作文、造行业黑话装逼、不去看就说完事、报错还他妈投机取巧改。

jiahao 是反制这些狗屎的行为约束插件, 在支持钩子的Agent上, 还会在对话结束前把虚假完工给拦截。

## 装的是什么
有两种使用的版本, 唯一区别就是插件版有强制性的钩子, 规则版的纯把提示词注入给LLM, 其他没区别。

直接把项目地址喂给你的AI, 完整行为约束提示词在 [`src/SKILL.md`](src/SKILL.md), 术语表在 [`GLOSSARY.md`](GLOSSARY.md)。

记得让他给你说人话。

### 规则版

```bash
npx skills add Xxx91n/jiahao
```


### 插件版

在 ~/adapters/ 里面，让 Agent 去找他自己的文档，找不到就来项目开 issue。

## 测试

```bash
npm test                                # 全量 Jest 测试
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役安装形态漂移检查
npm run check:whitespace                # 行尾空白 / EOF 空行，未跟踪文件也算
npm run check:links                     # 包里 Markdown 的相对链接必须落在包内
```

## 开源协议

[MIT](LICENSE)
