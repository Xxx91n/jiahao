# Contributing

jiahao is a behavior contract for coding agents. It holds a completion claim to physical evidence: an agent may not say "done" or "fixed" unless a command it ran says so. MIT licensed.

The contract itself lives in [`src/SKILL.md`](../src/SKILL.md) and the vocabulary in [`GLOSSARY.md`](../GLOSSARY.md). You do not need to read either to contribute.

## Before you file anything

Read "Boundaries and limitations" in [the README](https://github.com/Xxx91n/jiahao#boundaries-and-limitations). Several things that look like bugs are written-down limits — the rules version has no hooks, so nothing gets blocked there. Then search the open issues.

## Reporting a problem

Two templates:

- **Bug report** — the installer, a hook, the turn-end gate, or an adapter bundle does not do what the README says.
- **Reproduction does not match** — you ran something and got a different number or result than the one we published.

A report we can act on has: the command pasted exactly, the real output pasted, the exit code, the host and its version, and which install path you used. Paraphrased output is not evidence. If you did not run it, write that instead of a guess.

## Making a change

1. Open an issue first when the change alters behaviour, so we can agree on the target before you write it.
2. Branch from `main`.
3. Edit the source, never the generated output. `adapters/`, `skills/`, `.claude-plugin/` and `.agents/` are produced by the generator. When you change `src/`, `hooks/`, `jiahao-mcp/`, the host table in `scripts/build-adapters.js`, a file under `scripts/hosts/`, or the version and repository metadata in `package.json`, run `node scripts/build-adapters.js` and commit what it wrote. A hand-edit under a generated directory is caught by `npm run check:adapters`.
4. Run the checks that cover your change:

   | command | what it proves |
   | --- | --- |
   | `npm test` | the Jest suite |
   | `npm run check:adapters` | every generated file still matches what the generator writes |
   | `npm run check:drift` | profile wording and retired adapter references have not drifted |
   | `npm run check:whitespace` | no trailing whitespace and no blank line at end of file, untracked files included |
   | `npm run check:links` | every relative link in the Markdown that ships in the npm package resolves inside that package |

5. `README.md` and `README-zh-CN.md` are one document in two languages; change both in the same commit.
6. Open the pull request against `main`, put `Closes #<n>` in the body, and paste the command output under Evidence. Merges are squashed, so `main` carries one commit per pull request.

## House rules, applied to ourselves

- **No receipt, no claim.** A number in a description has to be in a file the reviewer can open.
- **Red means stop.** Report the failing command and its output. "This does not affect the main flow" is not a fix.
- **Plain language.** If a sentence needs a word this project invented to land, rewrite the sentence.
- **The author cannot certify the work.** A completion claim needs a check that runs outside the person or agent making the claim.

## What happens next

A report with the output pasted is actionable on its own. A description of an output usually gets one question back: run it and paste what it printed.
