# v0.3.1 tag CI 门禁记录

这是 `v0.3.1` tag 上 CI `release-gate` job 的原始日志节选，用来支撑 [`docs/release-notes-v0.3.1.md`](../../release-notes-v0.3.1.md) 里的每个数字。

- CI run：<https://github.com/Xxx91n/jiahao/actions/runs/42360582084>
- 结果：`success`，headSha `8741d02dde73`，事件 `push`，2026-11-07T09:38:23Z。
- 文件：[gate.txt](gate.txt)。它是**节选**，不是全文：完整日志约 418 行，这里只留了门禁各步的 `PASS`/`FAIL` 行、每步后面那行关键输出，以及最后的 `artifact`/`sha256`/`tree` 汇总。每保留的一行都是原样抄的，只删掉了行首的 job 名和时间戳。
  没保留的是同一批输出里的其他明细行（比如 `Retained adapters in sync with src/SKILL.md`、`trees` 目录清单、`kept` 产物路径、dry-run、skills-ref、egress、declarations 的具体说明）。要查全文就按下面的命令重跑。

日志前缀清理方式（可复跑）：

```bash
gh run view 42360582084 --repo Xxx91n/jiahao --log \
  | sed -E 's/^release-gate\t[^\t]*\t[0-9T:.Z-]+ //'
```

这样拿到的是全文（约 418 行）。`gate.txt` 是同一份输出里挑出来的 29 行。

这份日志里能查到的关键数字：`481567 B`、`271 files`、`708 passed, 708 total`、`6d52ee86...`、九条 `tree` 哈希。发布说明里引用的就是这些。
