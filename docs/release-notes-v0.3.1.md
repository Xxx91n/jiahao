# v0.3.1 发布说明

中文说明改成说人话的写法：README-zh-CN 只留短句直说，AGENTS/GLOSSARY 同步口径；中文 README 不再重复各宿主细节，改由 adapters 文档承载。版本号 0.3.0 -> 0.3.1。

本文正文摘自 GitHub Release v0.3.1 的说明，数字照原样抄，没有改。

## 版本与产物

- tag：`v0.3.1`，指向 `8741d02dde73`。
- 门禁：RELEASE GATE GREEN，本地与 tag CI 都过。tag CI 记录：<https://github.com/Xxx91n/jiahao/actions/runs/42360582084>（conclusion `success`，headSha `8741d02dde73`）。
- 产物：`jiahao-0.3.1.tgz`（481567 B，271 files）。
- `sha256`：`6d52ee868184f79738179321ef3ff6f5d04716fc51a858374a3b50f2a0df45db`。

## 门禁记录

tag CI 上各步都 PASS。原始日志节选在 [`docs/evidence/v0.3.1/gate.txt`](evidence/v0.3.1/gate.txt)，取值方式写在 [`docs/evidence/v0.3.1/README.md`](evidence/v0.3.1/README.md)。关键行：

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
tree      adapters/zcode  ab777847ed62a8eaab8ff28998eab3845deec677c84085019ddba690a5f05f39
```

## 这个版本没有做的事

- 没有新增或改动拦截逻辑。0.3.1 只改说明文字和版本号。
- 没有推送新 tag，也没有建新的 GitHub Release；这次只是把 0.3.1 已经发布的说明落进仓库。
- 本文和 `docs/evidence/` 都不在 npm 包内，也不在树哈希范围内，补进来不会改变上面记录的那棵树。
