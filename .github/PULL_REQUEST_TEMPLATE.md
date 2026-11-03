## What this changes

One or two sentences. Link the issue it fixes with `Closes #<n>` — GitHub only reads that keyword when the PR targets `main`.

## Evidence

Paste the command you ran and what it printed. A claim without a rerun is not a result.

```sh

```

## Checklist

- [ ] Every number and every status written here is in a file the reviewer can open.
- [ ] I ran the checks that cover what I changed: `npm test`, `npm run check:whitespace`, `npm run check:links`.
- [ ] If I changed `src/`, `hooks/`, `jiahao-mcp/`, the host table in `scripts/build-adapters.js`, a file under `scripts/hosts/`, or the version and repository metadata in `package.json`, I ran `node scripts/build-adapters.js` and committed what it wrote.
- [ ] If I changed `README.md`, I changed `README-zh-CN.md` in the same commit.
- [ ] Anything I did not run is written as "not run", and anything asserted from a host's files without watching it happen is written as `declared-unverified`.

## Notes for the reviewer

State the verdict in the words the gate uses — PASS, FAIL, ESCALATE, NOT VERIFIED. "Should work" is not a verdict.
