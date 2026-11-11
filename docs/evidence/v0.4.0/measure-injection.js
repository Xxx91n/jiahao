'use strict';
// Prints the measurements quoted in docs/evidence/v0.4.0/README.md and the
// 0.4.0 release notes, so every number in the prose has a file it came from.
// This is a record, not a test: it spawns the shipped activation hook twice,
// once per profile, and reports what came back.
//
// Run from the repo root: node docs/evidence/v0.4.0/measure-injection.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..', '..');
const { splitByProfile } = require(path.join(root, 'hooks', 'jiahao-profile'));
const { INJECTION_CAP } = require(path.join(root, 'hooks', 'jiahao-runtime'));
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
