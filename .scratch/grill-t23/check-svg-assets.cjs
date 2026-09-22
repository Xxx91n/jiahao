'use strict';
// grill-t23 SVG asset gate: every docs/assets/*.svg must be self-contained,
// a11y-labelled, and inside the 1200-unit viewBox convention.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (f.name.endsWith('.svg')) files.push(p);
  }
})(path.join(ROOT, 'docs', 'assets'));
let bad = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const checks = {
    viewBox: /viewBox="0 0 [0-9]+ [0-9]+"/.test(s),
    title: s.includes('<title'),
    desc: s.includes('<desc') || rel.includes('badge-'),
    noScript: !s.includes('<script'),
    noForeignObject: !s.includes('foreignObject'),
    noExternalRef: !s.includes('href="http') && !s.includes('src="http') && !s.includes('url(http'),
    noAnimation: !s.includes('<animate') && !s.includes('@keyframes') && !s.includes('transition:'),
  };
  const fails = Object.keys(checks).filter((k) => !checks[k]);
  console.log(rel + ': ' + (fails.length ? 'FAIL ' + fails.join(',') : 'OK'));
  if (fails.length) bad++;
}
console.log(files.length + ' svg files, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
