'use strict';
// test/capability.test.js - #145: capability gates must not read docs/gates.json.
//
// Commit de43cd7d deleted that registry, but
// requireCapabilities still resolved every gate name through it, so a public
// clone crashed with ENOENT before a capability could be probed. The cases
// below pin the two behaviours that replace the lookup: a declared
// requirement that is absent degrades through the registered UNVERIFIABLE
// shape (exit 2, naming the capability), and a caller that declares nothing
// gets a plain caller error, not a file error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const capabilityPath = path.join(repoRoot, 'src', 'shared', 'capability');
const capability = require(capabilityPath);

describe('requireCapabilities declares requirements inline', () => {
  test('a satisfied requirement is returned and no registry is read', () => {
    const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-tree-'));
    try {
      fs.mkdirSync(path.join(tree, '.git'));
      expect(capability.requireCapabilities('confirmatory-bench',
        { requires: ['repo-tree'], root: tree })).toEqual(['repo-tree']);
    } finally {
      fs.rmSync(tree, { recursive: true, force: true });
    }
  });

  test('a bare gate name is a caller error, not an ENOENT', () => {
    expect(() => capability.requireCapabilities('judge-bias'))
      .toThrow(/docs\/gates\.json is retired; pass \{ requires: \[\.\.\.\] \}/);
  });

  test('an absent capability exits 2 and names it on both channels', () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-empty-'));
    try {
      const script = [
        'const cap = require(' + JSON.stringify(capabilityPath) + ');',
        'cap.requireCapabilities("judge-bias", {',
        '  requires: ["bench-corpus"],',
        '  root: ' + JSON.stringify(emptyRoot) + ',',
        '  env: { CLAUDE_CONFIG_DIR: ' + JSON.stringify(emptyRoot) + ' },',
        '});',
        'process.stdout.write("NO EXIT\\n");',
      ].join('\n');
      const run = spawnSync(process.execPath, ['-e', script], { cwd: repoRoot, encoding: 'utf8' });
      expect(run.status).toBe(2);
      expect(run.stdout).toContain('::error title=UNVERIFIABLE,gate=judge-bias,requires=bench-corpus::capability bench-corpus deterministically absent');
      expect(run.stderr).toContain('[judge-bias] UNVERIFIABLE: declared capability bench-corpus is absent');
      // The retired registry must not appear anywhere in the failure path.
      expect(run.stdout + run.stderr).not.toContain('gates.json');
      expect(run.stdout).not.toContain('NO EXIT');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});
