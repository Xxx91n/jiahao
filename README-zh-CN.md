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

装完后，profile 只看一个文件：配置目录里的 `.jiahao-profile`。配置目录按这个顺序找：设了 `CLAUDE_CONFIG_DIR` 就用它，没设用 `HOME` 环境变量，宿主自己报了目录（`QODER_CONFIG_DIR`、`CODEBUDDY_CONFIG_DIR`、`WORKBUDDY_CONFIG_DIR`）就用那个，再往后用 `USERPROFILE`，都没有才用系统家目录；不会自己退到 `/tmp`，选中的那个变量指到 `/tmp` 时才会写在那儿。写 `verifier` 就拦没有凭据的完工声明（同一会话早先的记录、没带 session id 的记录、或者停止时宿主没给 session id 的情况，都可能让它放过），写 `generator` 只提醒；没这个文件按 `verifier`。在 Copilot 和 Antigravity 上，宿主不给可读的收尾消息，所以没有凭据时 `verifier` 也可能拦住没写完工声明的问答回合。这个文件要在钩子运行的环境里写；宿主从另一个 shell 启动时，两边都设 `CLAUDE_CONFIG_DIR`。改完开个新会话。

## 测试

```bash
npm test                                # 全量 Jest 测试
node scripts/build-adapters.js --check  # 生成产物一致性检查
node scripts/check-drift.js             # Profile 与退役出口漂移检查
npm run check:whitespace                # 行尾空白 / EOF 空行，未跟踪文件也算
npm run check:links                     # 包里 Markdown 的相对链接必须落在包内
```

## 开源协议

[MIT](LICENSE)
