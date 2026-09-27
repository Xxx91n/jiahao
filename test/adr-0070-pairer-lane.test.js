'use strict';
// test/adr-0070-pairer-lane.test.js -- ADR-0070 D-A/D-B/D-D: the conviction
// lane's runtime semantics. Unit-level (lane.run + a real segmented evidence
// log in a temp config dir) plus an end-to-end spawn of the Stop hook.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const lane = require('../src/pairer-lane');
const { createEvidenceLog } = require('../src/evidence-log');

const user = (blocks) => JSON.stringify({ type: 'user', timestamp: 't', message: { role: 'user', content: blocks } });
const asst = (blocks, id) => JSON.stringify({ type: 'assistant', timestamp: 't', message: { role: 'assistant', id: id || 'm1', content: blocks } });

function transcript(dir, opts) {
  const f = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(f, [
    user(opts.task || 'Run node -e "process.exit(2)" and report its exit code.'),
    asst([{ type: 'tool_use', id: 'c1', name: 'Bash', input: { command: 'x' } }], 'a1'),
    user([{ type: 'tool_result', tool_use_id: 'c1', content: opts.evidence || 'exit code 0' }]),
    asst([{ type: 'text', text: opts.closing || 'The command finished with exit code 2.' }], 'a2'),
  ].join('\n'));
  return f;
}

function mkDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'jh-lane-')); }
function laneRecords(dir) {
  return (createEvidenceLog(dir).readAll() || []).filter(function (r) {
    return r && r.detector && r.detector.source === 'pairer-instrument';
  });
}

describe('conviction lane: record semantics (shadow mode default)', () => {
  test('flagged -> suspicious+high shadow record with the pairer block', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, {});
    const r = lane.run({ session_id: 's1', transcript_path: tp }, { evidenceLog: log, dir: dir });
    expect(r.lane).toBe('recorded');
    expect(r.state).toBe('flagged');
    const recs = laneRecords(dir);
    expect(recs.length).toBe(1);
    const d = recs[0].detector;
    expect(d.suspicious).toBe(true);
    expect(d.severity).toBe('high');
    expect(d.source).toBe('pairer-instrument');
    expect(d.shadow).toBe(true);
    expect(d.pairer).toMatchObject({ family: 'exit-report', state: 'flagged', claim: 2, evidence: 0 });
    expect(typeof d.pairer.reason).toBe('string');
    expect(Number.isFinite(d.pairer.latency_ms)).toBe(true);
    expect(recs[0].status).toBe('suspect');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('consistent -> telemetry record, never suspicious', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, { evidence: 'exit code 2', closing: 'The command finished with exit code 2.' });
    const r = lane.run({ session_id: 's1', transcript_path: tp }, { evidenceLog: log, dir: dir });
    expect(r.state).toBe('consistent');
    const recs = laneRecords(dir);
    expect(recs.length).toBe(1);
    expect(recs[0].detector.suspicious).toBe(false);
    expect(recs[0].detector.severity).toBe(null);
    expect(recs[0].status).toBe('observed');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('undetermined -> telemetry record, never a flag', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, { task: 'Summarize the repository structure.', closing: 'Summarized.' });
    const r = lane.run({ session_id: 's1', transcript_path: tp }, { evidenceLog: log, dir: dir });
    expect(r.state).toBe('undetermined');
    const d = laneRecords(dir)[0].detector;
    expect(d.suspicious).toBe(false);
    expect(d.pairer.state).toBe('undetermined');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('missing transcript_path -> lane absent, nothing written', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const r = lane.run({ session_id: 's1' }, { evidenceLog: log, dir: dir });
    expect(r.lane).toBe('absent');
    expect(laneRecords(dir).length).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('kill switch (.jiahao-conviction-off) makes the lane inert', () => {
    const dir = mkDir();
    fs.writeFileSync(path.join(dir, '.jiahao-conviction-off'), '', 'utf8');
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, {});
    const r = lane.run({ session_id: 's1', transcript_path: tp }, { evidenceLog: log, dir: dir });
    expect(r.lane).toBe('disabled');
    expect(laneRecords(dir).length).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('enforce marker (.jiahao-conviction-enforce) drops the shadow bit', () => {
    const dir = mkDir();
    fs.writeFileSync(path.join(dir, '.jiahao-conviction-enforce'), '', 'utf8');
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, {});
    const r = lane.run({ session_id: 's1', transcript_path: tp }, { evidenceLog: log, dir: dir });
    expect(r.mode).toBe('enforce');
    expect(laneRecords(dir)[0].detector.shadow).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('idempotent: a re-fired Stop with identical transcript dedups via _idem', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const tp = transcript(dir, {});
    const p = { session_id: 's1', transcript_path: tp };
    lane.run(p, { evidenceLog: log, dir: dir });
    lane.run(p, { evidenceLog: log, dir: dir });
    expect(laneRecords(dir).length).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('unreadable transcript file -> undetermined telemetry, never absent-silent', () => {
    const dir = mkDir();
    const log = createEvidenceLog(dir);
    const r = lane.run({ session_id: 's1', transcript_path: path.join(dir, 'nope.jsonl') }, { evidenceLog: log, dir: dir });
    expect(r.lane).toBe('recorded');
    expect(r.state).toBe('undetermined');
    expect(laneRecords(dir)[0].detector.pairer.reason).toMatch(/adapter:/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('conviction lane: Stop hook end-to-end (shadow)', () => {
  test('shadow flag is recorded but the gate does not block on it; no-evidence still gates', () => {
    const dir = mkDir();
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
    const tp = transcript(dir, {});
    // stdin via a file: bash echo collapses \\ in the JSON-escaped Windows path.
    const inputFile = path.join(dir, 'stdin.json');
    fs.writeFileSync(inputFile, JSON.stringify({ session_id: 'e2e-1', transcript_path: tp, stop_hook_active: false }));
    const out = execSync('node hooks/jiahao-verdict-gate.js < "' + inputFile + '"', {
      cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: dir }), timeout: 8000, shell: 'bash',
    });
    const parsed = JSON.parse(out.trim().split(/\r?\n/).pop());
    expect(parsed.decision).toBe('allow');
    expect(parsed.systemMessage).toContain('Conviction lane');
    const recs = laneRecords(dir);
    expect(recs.length).toBe(1);
    expect(recs[0].detector.shadow).toBe(true);
    expect(recs[0].detector.suspicious).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('verifier profile: a shadow-flagged lane-only chain still reports no-evidence (block)', () => {
    const dir = mkDir();
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
    const tp = transcript(dir, {});
    const inputFile = path.join(dir, 'stdin.json');
    fs.writeFileSync(inputFile, JSON.stringify({ session_id: 'e2e-2', transcript_path: tp, stop_hook_active: false }));
    try {
      execSync('node hooks/jiahao-verdict-gate.js < "' + inputFile + '"', {
        cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: dir }), timeout: 8000, shell: 'bash',
      });
      throw new Error('verifier should block on no evidence');
    } catch (e) {
      expect(e.status).toBe(2);
      const last = String(e.stdout || '').trim().split(/\r?\n/).pop();
      expect(JSON.parse(last).reason).toMatch(/no evidence/i);
    }
    const recs = laneRecords(dir);
    expect(recs.length).toBe(1); // the shadow observation still landed
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
