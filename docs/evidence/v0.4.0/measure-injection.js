'use strict';
// Prints the measurements quoted in docs/evidence/v0.4.0/README.md and the
// 0.4.0 release notes, so every number in the prose has a file it came from.
//
// This is a record, not a test, and it ships with nothing: it is not part of any
// published package or adapter bundle, it is not registered in any host's hook
// config, nothing spawns it, and it changes no state outside the throwaway
// directory it makes. It runs the shipped activation hook, hooks/jiahao-activate.js,
// which reads .jiahao-profile from the config dir it is handed - that is the only
// input the hook needs here.
//
// Run from the repo root: node docs/evidence/v0.4.0/measure-injection.js
// The header records the commit, the working tree state and the date the numbers
// below came from.
//
// It also reproduces the pre-fix truncated output, so the "10001 chars / 10393
// bytes ending in **Lo" figure quoted in the README has a file behind it instead
// of resting on an unrecorded run: fitInjection is the same function the hook
// calls, so passing the old cap of 10000 shows what that cap did to the same
// text. That is a reproduction of the defect, not a measurement of the #167
// run itself - the README says which is which.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..', '..');
const { splitByProfile } = require(path.join(root, 'hooks', 'jiahao-profile'));
const { INJECTION_CAP, fitInjection } = require(path.join(root, 'hooks', 'jiahao-runtime'));
const { spawnHook, hostEnv } = require(path.join(root, 'test', 'helpers', 'spawned-hook'));

function run(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-measure-'));
  try {
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), profile, 'utf8');
    const res = spawnHook(path.join(root, 'hooks', 'jiahao-activate.js'), {
      env: hostEnv(dir), cwd: root,
    });
    return res;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const head = require('child_process')
  .execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const dirty = require('child_process')
  .execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
console.log('measured at: ' + head);
// The tree the numbers came from may be ahead of HEAD: say so, or a reader takes
// the commit above as the exact source.
console.log('working tree: ' + (dirty ? 'dirty (results include uncommitted changes)' : 'clean'));
console.log('date: ' + new Date().toISOString().slice(0, 10));
console.log('node: ' + process.version);
console.log('platform: ' + process.platform + ' ' + process.arch);
console.log('cap: ' + INJECTION_CAP + ' characters');
console.log('');

for (const profile of ['generator', 'verifier']) {
  const res = run(profile);
  const body = res.stdout.replace(/^\n+|\n+$/g, '') + '\n';
  console.log(profile);
  console.log('  exit: ' + res.status);
  console.log('  stderr: ' + JSON.stringify(res.stderr));
  console.log('  hook stdout: ' + res.stdout.length + ' chars / '
    + Buffer.byteLength(res.stdout) + ' bytes (console.log adds one trailing blank line)');
  console.log('  stored form: ' + body.length + ' chars / '
    + Buffer.byteLength(body) + ' bytes (that blank line removed)');
  console.log('  carries the long-answer rule: '
    + (body.indexOf('**Long answers say one thing per line.**') > -1));
  console.log('  last line: ' + JSON.stringify(body.trimEnd().split('\n').pop()));
}

console.log('');
console.log('per-version generator rules text (splitByProfile on src/SKILL.md):');
for (const ref of ['v0.2.0', 'v0.3.0', 'v0.3.1', '34b513f8', '7c075cc2', 'HEAD']) {
  const content = execFileSync('git', ['show', ref + ':src/SKILL.md'], { cwd: root, encoding: 'utf8' });
  const sections = splitByProfile(content);
  console.log('  ' + ref.padEnd(10) + ' ' + sections.generator.length);
}

console.log('');
console.log('what the old 10000-character cap did to the generator injection');
console.log('(fitInjection with cap=10000 on the current generator text; this');
console.log(' reproduces the defect, it does not re-run the #167 session):');
const genText = splitByProfile(
  fs.readFileSync(path.join(root, 'src', 'SKILL.md'), 'utf8')).generator
  + '\n---\nJIAHAO MODE ACTIVE — level: full\n';
// The old code hard-sliced at 10000 with no notice. Same slice here so the
// stored figure can be checked against a file.
const oldSlice = genText.slice(0, 10000);
console.log('  plain slice(0, 10000): ' + oldSlice.length + ' chars / '
  + Buffer.byteLength(oldSlice) + ' bytes');
// console.log appends one newline, which is the +1 in the figures the README
// quotes from the #167 run (10001 chars / 10393 bytes).
console.log('  plus the newline console.log adds: ' + (oldSlice.length + 1) + ' chars / '
  + (Buffer.byteLength(oldSlice) + 1) + ' bytes');
console.log('  last 40 chars: ' + JSON.stringify(oldSlice.slice(-40)));
console.log('  fitInjection(cap=10000) length: ' + fitInjection(genText, 10000).length);
