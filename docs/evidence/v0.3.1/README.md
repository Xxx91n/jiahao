# v0.3.1 tag CI 门禁记录

这是 `v0.3.1` tag 上 CI `release-gate` job 的原始日志节选，用来支撑 [`docs/release-notes-v0.3.1.md`](../release-notes-v0.3.1.md) 里的每个数字。

- CI run：<https://github.com/Xxx91n/jiahao/actions/runs/42360582084>
- 结果：`success`，headSha `8741d02dde73`，事件 `push`，2026-11-07T09:38:23Z。
- 文件：[gate.txt](gate.txt)。只删掉了每行前面的 job 名和时间戳，其余逐字保留。

日志前缀清理方式（可复跑）：

```bash
gh run view 42360582084 --repo Xxx91n/jiahao --log \
  | sed -E 's/^release-gate\t[^\t]*\t[0-9T:.Z-]+ //'
```

这份日志里能查到的关键数字：`481567 B`、`271 files`、`708 passed, 708 total`、`6d52ee86...`、九条 `tree` 哈希。发布说明里引用的就是这些。
