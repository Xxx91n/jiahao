# v0.3.1 发布说明

中文说明改成说人话的写法：README-zh-CN 只留短句直说，AGENTS/GLOSSARY 同步口径；中文 README 不再重复各宿主细节，改由 adapters 文档承载。版本号 0.3.0 -> 0.3.1。

上面这段是 GitHub Release v0.3.1 的原文。本文其他段落是把那份正文里的数字摊开、补上能查的出处，数字一个没改。

## 版本与产物

- tag：`v0.3.1`，指向 `8741d02dde73`。
- 门禁：`RELEASE GATE GREEN`。这条结论有出处的只有 tag 上那次 CI：<https://github.com/Xxx91n/jiahao/actions/runs/42360582084>（conclusion `success`，headSha `8741d02dde73`）。
  Release 正文还写了「本地与 tag CI 都过」。本地那次运行的输出没有留在仓库里，也没有链接，所以本文只把 tag CI 算作有据，本地那次标为 declared-unverified。
- 产物：`jiahao-0.3.1.tgz`（481567 B，271 files）。
- `sha256`：`6d52ee868184f79738179321ef3ff6f5d04716fc51a858374a3b50f2a0df45db`。

## 门禁记录

tag CI 上 11 步全部 PASS。原始日志节选在 [`docs/evidence/v0.3.1/gate.txt`](evidence/v0.3.1/gate.txt)，取值方式写在 [`docs/evidence/v0.3.1/README.md`](evidence/v0.3.1/README.md)。关键行：

```text
tag v0.3.1 -> version 0.3.1, commit 8741d02dde73, tree clean
All 205 tracked generated files accounted for: 205 generated + 0 allowlisted (regen-diff clean)
Tests:       708 passed, 708 total
30 packed Markdown files: every relative link resolves inside the package (271 files)
jiahao-0.3.1.tgz (481567 B, 271 files)
sha256  6d52ee868184f79738179321ef3ff6f5d04716fc51a858374a3b50f2a0df45db (identical on a second pack)
RELEASE GATE GREEN — v0.3.1 (8741d02dde73)
```

各安装形态的树哈希，同一段日志里逐行列出：

```text
tree      skills/jiahao  3be17adadbfadb4a660629d067972e03799f9e6ff6bd7de349b18016aee34ae8
tree      adapters/claude-code  ef690dfcaae0fc6d8f1598600aa07d952f539c8a294573f0718e21798cf99272
tree      adapters/codebuddy  413362af2037a6477ef215a23886f8e06756c06b18856ab8e3add1a39f85801d
tree      adapters/workbuddy  39125928f004a9c6c0abd9668405dc9d7e11c319bf8175140de48cd6054a6856
tree      adapters/copilot  1bf2764838505ec50fdc5000597f8db4b537ad5085f4a22933b6fb6dd8514f58
tree      adapters/codex  ae557b28270244b17e73a535ccc00ebafa38a6f9f9ff6085968fa3a0ed57ccea
tree      adapters/antigravity  7ff7b352e4569a04933d8ab27406c58c39eaac0fe728e13bf7fde45371ee4ec5
tree      adapters/qoder  13e6578a537638dd34b3401e908544a6639a8acc7a6880828b6a3bc865f86ac6
tree      adapters/zcode  ab777847ed62a8eaab8ff28998eab3845deec677c84085019ddba690a5f05f09
```

## 这个版本实际包含什么

Release 正文讲的是说明文字、版本号，以及门禁跑出来的产物数字（tarball 大小、文件数、`sha256`、CI 链接）。它没有讲这个 tag 里还夹着钩子和运行时的改动。`v0.3.1` 这个 tag 装的是从 `v0.3.0` 到 `8741d02d` 之间的全部提交，那些改动一并发了出去。不写清楚这一点，读的人会以为 0.3.1 没动过拦截逻辑。

tag 范围里动过 `hooks/` 或 `src/` 的提交（`git log v0.3.0..v0.3.1 --oneline -- hooks/ src/`）：

```text
3cf1832d fix(#124): Case A 只收紧有完工声明的回合，纯问答不再被拦 (#151)
59eb669e fix(#138): 平实人话纪律要求解释机器名字，三行模板同步 (#150)
796bb70d fix(#145): 能力闸门不再读已退役的 docs/gates.json (#148)
5f970535 fix(#144): correct stale capability references (#147)
20f69740 fix(#134): 中途插话纠正不再被当成任务结束 (#141)
ef27f19c feat(#136): 三行硬锁的三个交付标签换成大白话 (#139)
a065a680 fix(#135): 三行输出锁改为空行分隔的三段 (#140)
24e48623 fix(#71): 共享钩子与运行时审计遗留收口（3/4/5/8/11/12/13/14 + Codex 形状） (#133)
ecbe502c fix(#88): 守卫残余形状——状态文件改保留命名空间、补 jiahao-mcp 目录 (#132)
d2c62316 fix(#119): profile 读失败凭证、anchor null 形状、transcript 同 id 分片并集合并 (#129)
eeb3e352 fix(#116): 状态落点按宿主报出的配置根解析 (#127)
554b706a fix(#122): sentinel begin() 先持锁后建文件，堵住 reconcile 误 heal 活跃钩子的窗口 (#125)
949b2f8a fix(#121): withLockSync 竞争路径抛错而非无锁落空 (#126)
d6aaa882 feat(#110): WorkBuddy 出口与收尾拦截探针（国际版 A 档） (#117)
f8b16c93 feat(#108): ZCode 出口——A 档插件目录 + 收尾拦截探针 (#115)
9f6e9ba0 feat(#109): Qoder CN Desktop 升 A 档（收尾钩子实测 + 插件出口） (#112)
7ea451a7 feat(antigravity): A 档插件出口与收尾拦截探针 (#111) (#114)
```

`git diff --stat v0.3.0..v0.3.1 -- hooks/ src/` 合计 19 个文件、+1114/−274 行。

## 这次补做的是什么事

- 没有推新 tag，也没有建新 Release。仓库里原先没有 `docs/release-notes-v0.3.1.md`，这次是把它补上。
- 本文和 `docs/evidence/` 都不在 npm 包内，也不在任何树哈希范围内，补进来不会改变上面记录的产物。
