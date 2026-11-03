## What this changes

One or two sentences. Link the issue it fixes with `Closes #<n>` — GitHub only reads that keyword when the PR targets `main`.

## Evidence

Paste the command you ran and what it printed. A claim without a rerun is not a result.

```sh

```

## Checklist

- [ ] Every number and every status written here is in a file the reviewer can open.
- [ ] I ran the checks that cover what I changed: `npm test`, `npm run check:whitespace`, `npm run check:links`.
- [ ] If I changed `src/`, `hooks/`, `jiahao-mcp/`, `scripts/build-adapters.js` in any way — its host table, an emitter, a helper —, a file under `scripts/hosts/`, or any field of `package.json` the generator copies into its output (`version`, `license`, `repository`), I ran `node scripts/build-adapters.js`, committed what it wrote, and then ran `npm run check:adapters` and `npm run check:drift`. The first reports a generated file that is stale, orphaned or hand-edited; an unchanged diff from the generator just means your edit did not reach its output.
- [ ] If I changed `README.md`, I changed `README-zh-CN.md` in the same commit.
- [ ] Anything I did not run is written as "not run", and anything asserted from a host's files without watching it happen is written as `declared-unverified`.

## Notes for the reviewer

Contribution rules are in [CONTRIBUTING.md](https://github.com/Xxx91n/jiahao/blob/main/.github/CONTRIBUTING.md). Say what the run showed: pass, fail, or NOT VERIFIED. "Should work" is not a result.
