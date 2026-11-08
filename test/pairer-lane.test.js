'use strict';
// test/pairer-lane.test.js - the hook-side conviction lane's commit boundary
// (#108 audit, CodeRabbit round 2): the dead-man switch's typed refusal
// (WITNESS_HARD_STOP_CODE) surfaces as a lane OUTCOME the gate can act on,
// while a generic commit failure keeps propagating to the gate's fail-open
// catch. The evidenceLog is injected through opts - the established injection
// point for this module (pairer-lane takes deps, never reaches for singletons).

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const { run, transcriptPathOf } = require(path.join(repoRoot, 'src', 'pairer-lane.js'));
const { WITNESS_HARD_STOP_CODE } = require(path.join(repoRoot, 'src', 'evidence-log.js'));

// A transcript path that does not exist: the adapter reports ok:false, the
// lane classifies undetermined, and the record commit is still attempted -
// which is exactly the path where the dead-man switch can refuse.
const PAYLOAD = { transcript_path: 'Z:/no/such/transcript.jsonl' };

// Hermetic flag-file directory: no .jiahao-conviction-off/-enforce leaks in
// from the real config dir (#84: one fresh directory per test).
function freshFlagDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-lane-test-'));
}

function stubLog(commitImpl) {
  return { commit: commitImpl, createRecord: function () { return {}; } };
}

test('a typed witness refusal surfaces as a hard-stop lane outcome', () => {
  const err = new Error('witness unavailable past the hard deadline (604800000ms) with 1 unverified post-detection append(s)');
  err.code = WITNESS_HARD_STOP_CODE;
  const res = run(PAYLOAD, {
    dir: freshFlagDir(),
    evidenceLog: stubLog(function () { throw err; }),
  });
  expect(res.lane).toBe('hard-stop');
  expect(res.reason).toContain('witness unavailable');
  expect(res.state).toBeNull();
});

test('a generic commit failure keeps propagating to the gate fail-open catch', () => {
  expect(() => run(PAYLOAD, {
    dir: freshFlagDir(),
    evidenceLog: stubLog(function () { const e = new Error('disk full'); throw e; }),
  })).toThrow(/disk full/);
});

test('a healthy commit appends and reports the recorded outcome', () => {
  const res = run(PAYLOAD, { dir: freshFlagDir(), evidenceLog: stubLog(function () { /* append ok */ }) });
  expect(res.lane).toBe('recorded');
  expect(res.appended).toBe(true);
  expect(res.state).toBe('undetermined'); // unadaptable transcript classifies nothing
  expect(res.closing).toBeNull(); // #124: no parsed transcript, no closing
});

// #124: the gate's claim source for transcript_path hosts — the adapted
// turn's closing rides the recorded outcome, and only when the adapter
// actually parsed one.
test('#124: a parsed transcript exposes its closing to the gate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-lane-closing-'));
  const file = path.join(dir, 'session.jsonl');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'user', message: { role: 'user', content: '看看配置目录在哪' } }),
    JSON.stringify({ type: 'assistant', message: { id: 'm1', content: [{ type: 'text', text: '任务完成，已验证。' }] } }),
  ].join('\n'), 'utf8');
  const res = run({ transcript_path: file }, { dir: freshFlagDir(), evidenceLog: stubLog(function () { return 1; }) });
  expect(res.lane).toBe('recorded');
  expect(res.closing).toBe('任务完成，已验证。');
  fs.rmSync(dir, { recursive: true, force: true });
});

// #124: a transcript whose parse produced no closing text (or a
// whitespace-only one) is not a claim source — the gate must see null, not ''.
test('#124: an empty closing parses as null, never as a claim-absent source', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-lane-closing-'));
  const file = path.join(dir, 'session.jsonl');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'user', message: { role: 'user', content: '看看配置目录在哪' } }),
    JSON.stringify({ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] } }),
  ].join('\n'), 'utf8');
  const res = run({ transcript_path: file }, { dir: freshFlagDir(), evidenceLog: stubLog(function () { return 1; }) });
  expect(res.lane).toBe('recorded');
  expect(res.closing).toBeNull();
  fs.rmSync(dir, { recursive: true, force: true });
});

// #71 item 11: SubagentStop carries the subagent's own transcript in
// agent_transcript_path; transcript_path stays the parent session. Reading only
// transcript_path paired the parent conversation with the subagent's results.
test('#71 item 11: SubagentStop reads the subagent transcript', () => {
  expect(transcriptPathOf({
    hook_event_name: 'SubagentStop',
    transcript_path: '/parent.jsonl',
    agent_transcript_path: '/agent.jsonl',
  })).toBe('/agent.jsonl');
});

test('#71 item 11: SubagentStop falls back to transcript_path when the agent path is absent', () => {
  expect(transcriptPathOf({
    hook_event_name: 'SubagentStop',
    transcript_path: '/parent.jsonl',
  })).toBe('/parent.jsonl');
});

test('#71 item 11: Stop keeps the session transcript even when an agent path rides along', () => {
  expect(transcriptPathOf({
    hook_event_name: 'Stop',
    transcript_path: '/parent.jsonl',
    agent_transcript_path: '/agent.jsonl',
  })).toBe('/parent.jsonl');
});

test('#71 item 11: camelCase hookEventName is honoured', () => {
  expect(transcriptPathOf({
    hookEventName: 'SubagentStop',
    transcript_path: '/parent.jsonl',
    agentTranscriptPath: '/agent.jsonl',
  })).toBe('/agent.jsonl');
});

// #71 (PR #97 review): the commit result says whether anything was written.
test('#71: a deduped zero-record commit does not report appended', () => {
  const res = run(PAYLOAD, { dir: freshFlagDir(), evidenceLog: stubLog(function () { return 0; }) });
  expect(res.lane).toBe('recorded');
  expect(res.appended).toBe(false);
});

// #71 item 11: the selection is only useful if run() actually uses it.
test('#71 item 11: run() reads the agent transcript for a SubagentStop payload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-lane-agent-'));
  const agentFile = path.join(dir, 'agent.jsonl');
  fs.writeFileSync(agentFile, [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'Subagent task.' } }),
    JSON.stringify({ type: 'assistant', message: { id: 'a1', content: [{ type: 'text', text: 'Subagent done.' }] } }),
  ].join('\n'), 'utf8');
  const flagDir = freshFlagDir();

  function capture(payload) {
    let seen = null;
    const log = {
      createRecord: function (kind, source, status, detail, ref, prev, extras) { seen = extras; return {}; },
      commit: function (make) { make([], null); return 1; },
    };
    const res = run(payload, { dir: flagDir, evidenceLog: log });
    return { res: res, seen: seen };
  }

  const agent = capture({
    hook_event_name: 'SubagentStop',
    transcript_path: path.join(dir, 'missing-parent.jsonl'),
    agent_transcript_path: agentFile,
  });
  expect(agent.res.lane).toBe('recorded');
  expect(String(agent.seen.detector.pairer.reason || '')).not.toMatch(/^adapter:/);

  // Control: the same payload as a plain Stop reads the (missing) parent, so
  // the contrast is the event switch, not a coincidence.
  const parent = capture({
    hook_event_name: 'Stop',
    transcript_path: path.join(dir, 'missing-parent.jsonl'),
    agent_transcript_path: agentFile,
  });
  expect(String(parent.seen.detector.pairer.reason || '')).toMatch(/^adapter:/);

  fs.rmSync(dir, { recursive: true, force: true });
});
