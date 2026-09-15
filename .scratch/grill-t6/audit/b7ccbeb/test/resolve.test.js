// test/resolve.test.js — jiahao resolve CLI cases (ADR-0017 D2/D3/D4).
// Two-phase anti-anchoring, human_verdict chain append, calibration write-back.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TMP = require('os').tmpdir().replace(/\\/g, '/') + '/jiahao-resolve-test';

const { createEvidenceLog, verifyChain } = require(path.join(__dirname, '..', 'src', 'evidence-log.js'));

function seed() {
  fs.mkdirSync(TMP, { recursive: true });
  const log = createEvidenceLog(TMP);
  log.clear();
  try { fs.unlinkSync(TMP + '/.jiahao-calibration.jsonl'); } catch (e) {}
  const det = log.createRecord('det-0', 'deterministic', 'passed', 'tests ok', 0.9, null);
  log.append([det]);
  return det;
}

function runCli(args) {
  return execSync('node scripts/resolve.js ' + args, {
    encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: TMP }, timeout: 5000, shell: 'bash',
  });
}

function runCliFailing(args) {
  try {
    runCli(args);
    return { status: 0 };
  } catch (e) {
    return { status: e.status, stderr: String(e.stderr || ''), stdout: String(e.stdout || '') };
  }
}


test('phase 1 only: no --verdict => preview prints evidence, no write', () => {
  const det = seed();
  const out = runCli('');
  expect(out).toContain('[deterministic] tests ok');
  // anti-anchoring: machine verdict fields must not be shown
  expect(out).not.toContain('"passed"');
  expect(out).toContain('Phase 2');
  const chain = createEvidenceLog(TMP).readAll();
  expect(chain).toHaveLength(1);
  expect(chain[0].event_hash).toBe(det.event_hash);
});


test('full adjudication: appends human_verdict, chain valid, calibration point written', () => {
  seed();
  const out = runCli('--verdict fail --reason diff-missing-migration --reviewer alice');
  expect(out).toContain('human_verdict recorded');
  expect(out).toContain('OVERTURN'); // machine said passed, human said fail

  const chain = createEvidenceLog(TMP).readAll();
  expect(chain).toHaveLength(2);
  const hv = chain[1];
  expect(hv.kind).toBe('human_verdict');
  expect(hv.reviewer_id).toBe('alice');
  expect(hv.verdict).toBe('fail');
  expect(hv.overturn).toBe(true);
  expect(verifyChain(chain).valid).toBe(true);

  const cal = JSON.parse(fs.readFileSync(TMP + '/.jiahao-calibration.jsonl', 'utf8').trim());
  expect(cal.passed).toBe(false);
  expect(cal.score).toBe(0.9);
});


test('schema validation: bad verdict / missing reviewer / missing reason => exit 2', () => {
  seed();
  expect(runCliFailing('--verdict maybe --reason x --reviewer a').status).toBe(2);
  expect(runCliFailing('--verdict pass --reason x').status).toBe(2);
  expect(runCliFailing('--verdict pass --reviewer a').status).toBe(2);
  const chain = createEvidenceLog(TMP).readAll();
  expect(chain).toHaveLength(1); // no partial writes
});


test('empty chain => exit 1, nothing to adjudicate', () => {
  fs.mkdirSync(TMP, { recursive: true });
  createEvidenceLog(TMP).clear();
  const r = runCliFailing('--verdict pass --reason x --reviewer a');
  expect(r.status).toBe(1);
});
