// Atomic repair: restore clean report from 9efe7b6, apply T5-C edits in
// memory, write, re-read, verify, git add - all in one node process.
'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const R = 'D:/Aworker/jiahao';
const F = R + '/.scratch/grill-t24/reports/2026-09-23-report.md';

// 1. clean base bytes straight from the object store (never touches worktree)
const base = execSync('git show 9efe7b6:.scratch/grill-t24/reports/2026-09-23-report.md', { cwd: R, maxBuffer: 8 * 1024 * 1024 }).toString('utf8');
if (base.split('\n').length !== 214) throw new Error('base not clean: ' + base.split('\n').length);

let s = base;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('MISS: ' + a.slice(0, 70)); s = s.replace(a, () => b); };

rep(`- \`defer-0069\` - **registered** (the ADR-0083 D-E audit-window check lines'
  first live firing), pending-evaluation at the quarterly tide.
- \`defer-0068\` - stays pending-evaluation by design (the t23 audit's
  countersign is recorded; the row rides to the review tide).
- \`defer-0066\` - instances 1-3 stay open; no disposition change this round.
- \`defer-0067\` - terminal since the ADR-0082 amendment (discharged).`,
  `- \`defer-0069\` - **discharged-by-trigger** (the 2026-09-23 audit named all
  three ADR-0083 D-E check lines in scope with PASS verdicts -
  \`reports/2026-09-23-audit.md\` mandatory-scope table; the presence-condition
  satisfied at first firing).
- \`defer-0068\` - stays pending-evaluation by design (the t23 audit's
  countersign is recorded; the row rides to the review tide).
- \`defer-0066\` - instances 1-3 stay open; **dated backfill 2026-09-23
  (repair window): a runtime-portability instance registered - the capture
  harness inherits \`process.execPath\`; a bun runtime produced red evidence
  bytes during the audit window (worktree restored, never committed).**
- \`defer-0060\`, \`defer-0064\`, \`defer-0065\` - **dated backfill 2026-09-23
  (repair window, T5-C-1)**: pending-evaluation standing rows, no
  disposition change - named here per the t23 repair shape.
- \`defer-0067\` - terminal since the ADR-0082 amendment (discharged).`);

rep(`| \`compile-yaml.txt\` | ci.yml parses (js-yaml; top-level keys + jobs enumerated) |`,
  `| \`compile-yaml.txt\` | ci.yml parses (js-yaml; top-level keys + jobs enumerated) (artifact \`$\` line is display-form - the leg ran in-process \`yaml.load\`) |`);
rep(`| \`compile-node-check.txt\` | \`node --check\` over the round's new scripts + wiring suite |`,
  `| \`compile-node-check.txt\` | \`node --check\` over the round's new scripts + wiring suite (artifact \`$\` line is display-form) |`);
rep(`| \`never-commit-sweep.txt\` | registry enumeration + every untracked path classified by rule id |`,
  `| \`never-commit-sweep.txt\` | registry enumeration + every untracked path classified by rule id (artifact \`$\` line is display-form - the registry-driven classifier renders the label) |`);
rep(`| \`check-ci-jobs.txt\` / \`check-ci-jobs-missing.txt\` | real parse OK; missing file -> keyed exit 2 |`,
  `| \`check-ci-jobs.txt\` | EXIT 1 by design: defer-0004 unmet -> the deferral remains valid (a designed job-set verdict, not a parse failure) |
| \`check-ci-jobs-missing.txt\` | missing file -> keyed exit 2 |`);

rep(`Evidence set count (C-7 split form): the committed set is enumerated
artifact-by-artifact in \`never-commit-sweep.txt\` / \`clean-tree.txt\` rather
than asserted from memory; the suite floor (adr-0083 wiring) requires the
leg set to exist on disk, and the ordering pin requires every committed
capture to name a sha at-or-after the freshness anchor.`,
  `Evidence set count (C-7 split form): the committed set is 24 captures + 1
fixture - the table above enumerates the legs; the byte-level cross-check is
\`git ls-tree -r HEAD -- .scratch/grill-t24/evidence/\` (the sweep and
clean-tree captures classify the untracked porcelain set - a different
surface; T5-C-4 correction, citation re-pointed). The suite floor (adr-0083
wiring) requires the leg set to exist on disk, and the ordering pin requires
every committed capture to name a sha at-or-after the freshness anchor.`);

rep(`The first live firing is registered as \`defer-0069\` (pending-evaluation,
quarterly tide).`,
  `The first live firing was registered as \`defer-0069\` and discharged at the
2026-09-23 audit window: the audit named all three lines in scope and
recorded PASS for each (\`reports/2026-09-23-audit.md\`); the lines now stand
as permanent audit-window scope.`);

rep(`- Burn-rate advisory context: consecutive carve-out rounds - prefer R3
  surfaces next (advisory, not a block).`,
  `- Burn-rate advisory: the **sixth consecutive carve-out round** (the count
  ADR-0083 D-F discloses; T5-C-3 correction) - prefer R3 surfaces next
  (advisory, not a block).`);

rep(`| authored-docs fixpoint | battery scripts (capture-battery + recapture-clean-tree, registry-driven classifier), this report, audit handoff, next-round handoff (this commit) |
| regen chain | mechanism-output fixpoints: rewrite-map / round-facts / anchors regen over the committed doc surface |
| evidence endpoints | acceptance battery captures under \`captured-at-head\` headers; clean-tree re-capture post-commit (idempotent endpoints, ADR-0083 D-A) |
| closing fixpoint | final rewrite-map regen over the committed evidence surface |`,
  `| 7690fec | T-3 authored: battery scripts (capture-battery + recapture-clean-tree, registry-driven classifier), this report, audit handoff, next-round handoff, wiring fixture-exemption fix |
| b8350f6 | evidence-only: battery run-1 captures (mid-round reds disclosed, superseded) |
| ff6f03a | regen-only: mechanism-output wave over the committed doc surface |
| 482950d | regen-only: facts collect + rewrite-map regen |
| ef8ee3d | regen-only: facts/map convergence fixpoint |
| 9efe7b6 | anchor R: report facts splice + ADR-0083 wiring + recapture-final.cjs (freshness anchor) |
| 6c302d3 | evidence-only: post-anchor acceptance battery re-capture |
| 43e1cf0 | regen-only: rewrite-map over post-anchor evidence |
| d8d1ee8 | evidence-only: jest-wave re-capture (run-test-gate, adr-0083-wiring, round-facts) |
| 0debb5c | regen-only: rewrite-map after jest-wave |
| 5481a75 | evidence-only: gate-all re-capture green |
| 945b5e6 | regen-only: rewrite-map after gate-all |
| e35f9e1 | evidence-only: rewrite-map leg green |
| 27fdc59 | regen-only: rewrite-map after rewrite-map leg |
| 547d8a1 | evidence-only: round-facts leg green |
| b96e15e | regen-only: rewrite-map after round-facts leg |
| 0ef7239 | evidence-only: clean-tree re-capture CLEAN (message mislabels ref-assets nc-007; covering rule is nc-004 - disclosed) |
| 28cb29a | regen-only: closing rewrite-map fixpoint (audit-verified tip) |
| bbf5259 | repair-window anchor 1: T5-C dispositions + defer-0069 discharge + defer-0066 instance 5 + audit artifacts absorbed (its report blob landed corrupted by a concurrent write - repaired at the follow-up anchor, disclosed) |
| repair anchor 2 + evidence/regen tail | report restored coherent + pins re-tallied (adr-0033/0080); battery re-captured under it; rewrite-map/facts fixpoint + clean-tree (non-anchoring, ADR-0083 D-A) |`);

rep(`- **No push**: branch \`grill-t24-docs\` is local-only per the task book.`,
  `- **No push**: branch \`grill-t24-docs\` is local-only per the task book.
- **Repair window, disclosed**: the audit (PASS WITH FINDINGS) returned
  T5-C-1..C-5; all five disposed in the repair anchors (consent-sweep
  backfill, display-form markers, burn-rate ordinal, C-7 re-point,
  decorative cluster). Commit \`0ef7239\`'s message mislabels ref-assets
  \`nc-007\` (covering rule: \`nc-004\`; \`nc-007\` is the \`.tgz\` class) -
  the message is immutable, corrected here. The first repair anchor
  \`bbf5259\` committed a corrupted (multi-copy interleaved) report blob -
  a concurrent-write incident; reproduced to committed bytes and repaired
  at the follow-up anchor rather than silently amended (mid-round commits
  may be imperfect; the round-final state is what is verified).
- **Post-closeout evidence pollution (audit I-1)**: an external capture run
  under \`bun\` overwrote all worktree evidence files with red bytes stamped
  \`captured-at-head: 28cb29a\`; the durable tree was never affected - the
  worktree was restored to committed bytes before the repair window opened.
  Registered as a \`defer-0066\` harness-hardening instance.
- **Allowlist post-hoc limitation (audit I-3)**: GitButler's operations log
  carries no commit records, so \`but commit\` allowlist usage is not
  independently re-verifiable after the fact; conformance stands on the
  landed file lists (\`git show --name-only\` per commit).`);

// 2. write + immediate re-read verify + stage, all atomically
fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const lines = back.split('\n').length;
const marks = (back.match(/round-facts:start/g) || []).length;
if (back !== s) throw new Error('worktree flap: read-back != written buffer');
if (marks !== 1 || lines > 300) throw new Error('BAD OUTPUT: lines=' + lines + ' marks=' + marks);
execSync('git add -- .scratch/grill-t24/reports/2026-09-23-report.md', { cwd: R });
console.log('REPORT REBUILT + STAGED:', lines, 'lines,', marks, 'sentinel, sha', execSync('git hash-object ' + '.scratch/grill-t24/reports/2026-09-23-report.md', { cwd: R }).toString().trim().slice(0, 12));
