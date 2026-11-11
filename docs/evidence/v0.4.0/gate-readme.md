# v0.4.0 tag CI 门禁记录

这是 `v0.4.0` tag 上 CI `release-gate` job 的原始日志节选，用来支撑 [`docs/release-notes-v0.4.0.md`](../../release-notes-v0.4.0.md) 里的每个数字。

- CI run：<https://github.com/Xxx91n/jiahao/actions/runs/43013980646>
- 结果：`success`，headSha `e8bd895c4df1`，事件 `push`，2026-11-11T11:41:14Z。
- 当次 job：`release-gate` 成功；同一次运行里的 `test` job 因为 tag 分支跳过（tag 上由门禁的 `tests` 一步代替）。

## 文件里有什么

[gate.txt](gate.txt) 是**节选**，不是全文。它从第一条 `PASS metadata` 开始，保留到最后的汇总，删掉了 `##[group]` 步骤标题、命令行回显和 `actions/upload-artifact` 那一段。与 v0.3.1 那份的区别：这次保留了全部 11 条 `PASS` 行以及每步后面那行输出，也保留了 `artifact` 步里的 `trees` 目录清单和 `kept` 产物路径。

**补了一行，说明如下**：`artifact` 步的 `jiahao-0.4.0.tgz (478337 B, 272 files)` 这行在原始输出里位于 `PASS artifact` 和 `sha256` 之间，我的抓取脚本按前缀过滤时漏掉了它，后来按 CI 日志里的原文补回。补回的那行与日志逐字相同（`478337 B` 和 `272 files` 两个数都能在本文件和最后一次 `artifact` 汇总里对上）。

每保留的一行都是原样抄的，只删掉了行首的 job 名和时间戳。

日志前缀清理方式（可复跑）：

```bash
gh run view 43013980646 --repo Xxx91n/jiahao --log \
  | sed -E 's/^release-gate\t[^\t]*\t[0-9T:.Z-]+ //'
```

## 关键数字

```text
tag       v0.4.0 -> version 0.4.0, commit e8bd895c4df1, tree clean
artifact  jiahao-0.4.0.tgz  478337 B, 272 files
sha256    d846d42bc80b825d7814dafebc0caae8bf53322c595c67244854ab0ee0659043
tests     724 passed, 724 total
```

本地跑 `npm test` 是 723 通过 / 1 跳过 / 724 总数；CI 上是 724 全通过。差的那一条是 Windows 上查不出 inode 被换掉的用例，见 `AGENTS.md` 里「代码里看不出来的坑」那节——不是这次改动引入的差异。

## 这些数字能证明什么、不能证明什么

- 能证明：tag 指向的提交与 `package.json` 版本一致、工作区干净、205 个生成文件与生成器输出一致、8 个宿主产物与 `src/SKILL.md` 同步。
- 能证明：同一棵树上连打两次包，`sha256` 相同；九个安装形态的树哈希都记在上面。
- 不能证明：模型会不会照着新规则说话。这一轮只证明「装进去的规则文本是对的」。
- 不能证明：八个宿主各自的注入长度上限。这一点在 #170 里就没测，发布说明的「注入上限」一节写明了。
- 不能证明：真机安装。按约定，真机安装不作为发版门槛。
