'use strict';
const fs = require('fs');
const p = 'D:/Aworker/jiahao/.scratch/grill-t6/reports/2026-09-14-audit-t1.md';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  'Re-running the documented  reproduces it byte-identically PLUS a  12-row table',
  'Re-running the documented `--phase all` reproduces it byte-identically PLUS a `## Rung 2 (survivor hyperparameter neighborhood)` 12-row table'
);
s = s.replace(
  'the repair regenerated it via a partial phase ()',
  'the repair regenerated it via a partial phase (`--phase report`)'
);
s = s.replace(
  'One-command fix: re-run  (or rung2 then report) and commit.',
  'One-command fix: re-run `--phase all` (or `--phase rung2` then `--phase report`) and commit.'
);
s = s.replace(
  '- rung_ladder.py --phase all on pinned corpus',
  '- rung_ladder.py `--phase all` on pinned corpus'
);
fs.writeFileSync(p, s);
console.log('fixed:', /--phase all` reproduces/.test(s), /Rung 2 \(survivor/.test(s), /`--phase report`\)/.test(s));
