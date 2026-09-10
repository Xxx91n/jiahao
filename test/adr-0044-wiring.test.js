'use strict';

// test/adr-0044-wiring.test.js -- ADR-0044 implementation-round wiring lock.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(60000);

const falsify = require('../src/shared/falsify');
const checkFalsify = require('../scripts/check-falsify');
const { createEvidenceLog } = require('../src/evidence-log');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));

describe('ADR-0044 falsification core', () => {
  test('the record is exactly the normative five-tuple', () => {
    const record = falsify.makeRecord('ft-0001-honest', 'repo-tree', 'node -e "process.exit(0)"', 0);
    expect(Object.keys(record).sort()).toEqual([
      'claim_id', 'claim_type', 'exit_code', 'falsification_cmd', 'falsified',
    ].sort());
    expect(record.falsified).toBe('valid');
  });

  test('exit code maps to the evidence tri-state', () => {
    expect(falsify.makeRecord('a', 'repo-tree', 'cmd', 0).falsified).toBe('valid');
    expect(falsify.makeRecord('a', 'repo-tree', 'cmd', 1).falsified).toBe('invalid');
    expect(falsify.makeRecord('a', 'repo-tree', 'cmd', null).falsified).toBe('missing');
    expect(falsify.EVIDENCE_TRI_STATE).toEqual(['valid', 'invalid', 'missing']);
  });

  test('the first batch has exactly 12 paired twins', () => {
    expect(falsify.TWINS).toHaveLength(12);
    for (const twin of falsify.TWINS) {
      expect(twin.claim_id).toMatch(/^ft-\d{4}$/);
      expect(twin.honest.falsification_cmd).toContain('node');
      expect(twin.liar.falsification_cmd).toContain('node');
    }
  });

  test('runTwin maps timeout to missing and can widen the budget for slow hosts', () => {
    const slow = {
      falsification_cmd: 'node -e "setTimeout(()=>process.exit(0),3000)"',
      argv: [process.execPath, '-e', 'setTimeout(()=>process.exit(0),3000)'],
    };
    const entry = { claim_id: 'ft-slow-host', claim_type: 'verification', honest: slow, liar: slow };

    expect(checkFalsify.runTwin(entry, 'honest', 100).falsified).toBe('missing');
    expect(checkFalsify.runTwin(entry, 'honest').falsified).toBe('valid');
  });
});

describe('ADR-0044 registry wiring', () => {
  test('falsification is registered at order 185 with the ADR-0044 source', () => {
    const entry = registry.entries.find(e => e.name === 'falsification');
    expect(entry).toBeTruthy();
    expect(entry.order).toBe(185);
    expect(entry.command).toBe('node scripts/check-falsify.js');
    expect(entry.tier).toBe('confirmatory');
    expect(entry.requires).toEqual(['repo-tree']);
    expect(fs.existsSync(path.join(ROOT, entry.source_adr))).toBe(true);
  });

  test('ADR-0044 text anchors the record and tri-state vocabulary', () => {
    const adr = fs.readFileSync(path.join(ROOT, 'docs', 'adr', '0044-claim-directed-falsification-mechanical-falsifiability-core-rule.md'), 'utf8');
    expect(adr).toContain('claim_id');
    expect(adr).toContain('claim_type');
    expect(adr).toContain('falsification_cmd');
    expect(adr).toContain('exit_code');
    expect(adr).toContain('falsified');
    expect(adr).toContain('valid');
    expect(adr).toContain('invalid');
    expect(adr).toContain('missing');
  });
});

describe('ADR-0044 spawn locks', () => {
  function makeTree(withGit) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-0044-'));
    for (const rel of [
      'docs/gates.json',
      'src/shared/capability.js',
      'src/shared/prefix-vocab.js',
      'src/shared/paths.js',
      'src/file-lock.js',
      'src/evidence-log.js',
      'src/shared/falsify.js',
      'scripts/check-falsify.js',
    ]) {
      const target = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, rel), target);
    }
    if (withGit) fs.mkdirSync(path.join(tmp, '.git'), { recursive: true });
    return tmp;
  }

  test('check-falsify passes in a repo-tree and fails honestly without one', () => {
    const withGit = makeTree(true);
    const pass = spawnSync(process.execPath, ['scripts/check-falsify.js'], {
      cwd: withGit,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: withGit }),
    });
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain('falsification OK: 12 twin pairs');
    const chain = createEvidenceLog(withGit).readAll() || [];
    expect(chain.some(r => r.gate_id === 'falsification')).toBe(true);

    const withoutGit = makeTree(false);
    const missing = spawnSync(process.execPath, ['scripts/check-falsify.js'], {
      cwd: withoutGit,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: withoutGit }),
    });
    expect(missing.status).toBe(2);
    expect(missing.stdout).toContain('::error title=UNVERIFIABLE,gate=falsification,requires=repo-tree::');
    expect(missing.stderr).toContain('a git worktree is expected');
  });
});
