// test/transcript-adapter.test.js — contract tests for the transcript
// adapter's mechanical extraction (the source comment used to promise these
// under test/adr-0070-transcript-adapter.test.js, which the stale-gates
// cleanup deleted; the promise is honoured here).
//
// Shapes are transcribed from real host transcripts on this machine (#119
// finding 5): both Claude Code and Qoder split ONE assistant message across
// several JSONL lines that share one message id — thinking, text and
// tool_use each land on their own line. The old "keep the last line per
// message id" rule silently dropped every earlier part: on a real Qoder
// session (14809 lines) 561 text blocks produced 229 message events and 131
// tool_results lost their tool_call. Measured shape census, same-id
// multi-line groups: 3346/3346 disjoint across three Qoder sessions,
// 545/545 disjoint across 19 Claude Code sessions — zero cumulative
// snapshots on either host.

const fs = require('fs');
const path = require('path');
const os = require('os');

const { adaptTranscriptText, adaptTranscriptFile } = require(
  path.join(__dirname, '..', 'src', 'transcript-adapter.js'));

// one assistant line in the real Qoder shape (stop_reason:null, model
// qfmodel); `blocks` may hold several entries for the classic single-line
// shape or exactly one for the split-message shape both hosts write.
function assistantLine(id, blocks, seq) {
  return JSON.stringify({
    type: 'assistant',
    uuid: 'uuid-' + id + '-' + seq,
    timestamp: '2026-11-01T10:00:0' + (seq % 10) + '.000Z',
    message: {
      id: id, type: 'message', role: 'assistant', model: 'qfmodel',
      stop_reason: null, stop_sequence: null, content: blocks,
    },
    isSidechain: false, sessionId: 's1', userType: 'external',
    version: '1.1.75-hotfix.1', gitBranch: 'main',
  });
}
function userTextLine(content, opts) {
  const line = {
    type: 'user', uuid: 'u-' + Math.random().toString(36).slice(2),
    timestamp: '2026-11-01T09:59:00.000Z',
    message: { role: 'user', content: content },
    isSidechain: false, sessionId: 's1', userType: 'external',
    version: '1.1.75-hotfix.1',
  };
  if (opts && opts.isMeta) { line.isMeta = true; line.origin = { kind: 'human' }; }
  return JSON.stringify(line);
}
function userToolResultLine(callId, content) {
  return JSON.stringify({
    type: 'user', uuid: 'u-tr-' + callId, timestamp: '2026-11-01T10:00:05.000Z',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: callId, content: content, is_error: false }] },
    isSidechain: false, sessionId: 's1', userType: 'external', version: '1.1.75-hotfix.1',
  });
}

test('finding 5: disjoint part lines sharing one message id keep every part', () => {
  const text = [
    userTextLine('Write the report and report the exit code.'),
    assistantLine('chatcmpl-m1', [{ type: 'thinking', thinking: 'plan the report' }], 1),
    assistantLine('chatcmpl-m1', [{ type: 'text', text: 'The report is written.', citations: null }], 2),
    assistantLine('chatcmpl-m1', [{ type: 'tool_use', id: 'call_1', name: 'Bash', input: { command: 'cat report.md' } }], 3),
    userToolResultLine('call_1', 'wrote report.md\nexit code 0'),
    assistantLine('chatcmpl-m1', [{ type: 'text', text: 'exit code 0', citations: null }], 4),
    JSON.stringify({ type: 'system', subtype: 'busy', timestamp: '2026-11-01T10:00:06.000Z' }),
  ].join('\n');
  const r = adaptTranscriptText(text);

  expect(r.ok).toBe(true);
  expect(r.task).toBe('Write the report and report the exit code.');
  // every text part survived (the old keep-last dropped all but the final
  // line of the group, losing both the first text and the tool_use); the
  // task line is a message event too
  const msgs = r.transcript.events.filter(e => e.type === 'message');
  expect(msgs.map(e => e.text)).toEqual(['Write the report and report the exit code.', 'The report is written.', 'exit code 0']);
  const calls = r.transcript.events.filter(e => e.type === 'tool_call');
  expect(calls).toHaveLength(1);
  expect(calls[0].name).toBe('Bash');
  expect(calls[0].call_id).toBe('call_1');
  const results = r.transcript.events.filter(e => e.type === 'tool_result');
  expect(results).toHaveLength(1);
  expect(results[0].name).toBe('Bash');
  // closing is the full text of the last assistant message: its text parts
  // in part order (the old keep-last kept only whatever fragment happened to
  // ride the group's final line)
  expect(r.transcript.closing).toBe('The report is written.\nexit code 0');
  expect(r.stats.skipped).toBe(0);
});

test('finding 5: a repeated identical content array (cumulative rewrite) still dedups', () => {
  const blocks = [
    { type: 'text', text: 'Draft one.', citations: null },
    { type: 'tool_use', id: 'call_9', name: 'Read', input: { file_path: 'x' } },
  ];
  const r = adaptTranscriptText([
    assistantLine('chatcmpl-m2', blocks, 1),
    assistantLine('chatcmpl-m2', blocks, 2),
  ].join('\n'));
  const msgs = r.transcript.events.filter(e => e.type === 'message');
  const calls = r.transcript.events.filter(e => e.type === 'tool_call');
  expect(msgs).toHaveLength(1);
  expect(msgs[0].text).toBe('Draft one.');
  expect(calls).toHaveLength(1);
  expect(calls[0].name).toBe('Read');
});

test('finding 5: several blocks in one content array (classic single-line shape) still emit in order', () => {
  const r = adaptTranscriptText([
    assistantLine('chatcmpl-m3', [
      { type: 'text', text: 'Working.', citations: null },
      { type: 'tool_use', id: 'call_2', name: 'Bash', input: {} },
    ], 1),
    userToolResultLine('call_2', 'ok'),
  ].join('\n'));
  const kinds = r.transcript.events.map(e => e.type);
  expect(kinds).toEqual(['message', 'tool_call', 'tool_result']);
});

test('finding 5: the host block-feedback isMeta user line is documented tolerance — no event, task unaffected', () => {
  const r = adaptTranscriptText([
    userTextLine('JIAHAO109-CLAIM-DONE claimed without a verification receipt; hook #109 blocked this turn end.', { isMeta: true }),
    userTextLine('Run the checks and tell me the exit code.'),
  ].join('\n'));
  expect(r.task).toBe('Run the checks and tell me the exit code.');
  expect(r.transcript.events.filter(e => e.type === 'message')).toHaveLength(1);
  expect(r.stats.parsed).toBe(2);
});

test('finding 5: adaptTranscriptFile keeps every part of a split message on disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir().replace(/\\/g, '/'), 'jiahao-ta-'));
  const file = path.join(dir, 'session.jsonl');
  fs.writeFileSync(file, [
    userTextLine('Append the marker and report.'),
    assistantLine('chatcmpl-m4', [{ type: 'text', text: 'Marker appended.', citations: null }], 1),
    assistantLine('chatcmpl-m4', [{ type: 'tool_use', id: 'call_3', name: 'Bash', input: {} }], 2),
    assistantLine('chatcmpl-m4', [{ type: 'text', text: 'exit code 0', citations: null }], 3),
  ].join('\n'), 'utf8');
  const r = adaptTranscriptFile(file);
  expect(r.ok).toBe(true);
  const msgs = r.transcript.events.filter(e => e.type === 'message');
  expect(msgs.map(e => e.text)).toEqual(['Append the marker and report.', 'Marker appended.', 'exit code 0']);
  expect(r.transcript.events.filter(e => e.type === 'tool_call')).toHaveLength(1);
  expect(r.transcript.closing).toBe('Marker appended.\nexit code 0');
});

// ---- #71 item 8: one task per turn --------------------------------------
test('#71 item 8: a later user text opens a new turn (task and events are not mixed)', () => {
  const r = adaptTranscriptText([
    userTextLine('First task: inspect A.'),
    assistantLine('chatcmpl-t1', [{ type: 'tool_use', id: 'call_a', name: 'Read', input: { file_path: 'A' } }], 1),
    userToolResultLine('call_a', 'A contents'),
    assistantLine('chatcmpl-t1', [{ type: 'text', text: 'Read A.' }], 2),
    userTextLine('Second task: inspect B.'),
    assistantLine('chatcmpl-t2', [{ type: 'tool_use', id: 'call_b', name: 'Read', input: { file_path: 'B' } }], 3),
    userToolResultLine('call_b', 'B contents'),
    assistantLine('chatcmpl-t2', [{ type: 'text', text: 'Read B.' }], 4),
  ].join('\n'));

  expect(r.task).toBe('Second task: inspect B.');
  const msgs = r.transcript.events.filter(e => e.type === 'message').map(e => e.text);
  expect(msgs).toEqual(['Second task: inspect B.', 'Read B.']);
  const calls = r.transcript.events.filter(e => e.type === 'tool_call');
  expect(calls.map(e => e.call_id)).toEqual(['call_b']);
  const results = r.transcript.events.filter(e => e.type === 'tool_result');
  expect(results.map(e => e.call_id)).toEqual(['call_b']);
  expect(r.transcript.closing).toBe('Read B.');
});

// ---- #71 / PR #97 review: Codex rollout shapes ---------------------------
function codexLine(payload, seq) {
  return JSON.stringify({
    timestamp: '2026-11-01T10:00:0' + (seq % 10) + '.000Z',
    type: 'response_item',
    payload: payload,
  });
}

test('#71: Codex rollout response_item shapes map onto the pairer event model', () => {
  const r = adaptTranscriptText([
    JSON.stringify({ timestamp: '2026-11-01T09:59:00.000Z', type: 'session_meta', payload: { id: 'codex-s1' } }),
    codexLine({ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Run the tests and quote the exit code.' }] }, 1),
    codexLine({ type: 'reasoning', summary: [], content: null }, 2),
    codexLine({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Running them.' }] }, 3),
    codexLine({ type: 'function_call', name: 'shell', arguments: '{"command":["npm","test"]}', call_id: 'call_1' }, 4),
    codexLine({ type: 'function_call_output', call_id: 'call_1', output: 'Tests: 10 passed' }, 5),
    codexLine({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Exit code 0.' }] }, 6),
  ].join('\n'));

  expect(r.ok).toBe(true);
  expect(r.task).toBe('Run the tests and quote the exit code.');
  const kinds = r.transcript.events.map(e => e.type);
  expect(kinds).toEqual(['message', 'message', 'tool_call', 'tool_result', 'message']);
  const call = r.transcript.events.filter(e => e.type === 'tool_call')[0];
  expect(call.name).toBe('shell');
  expect(call.call_id).toBe('call_1');
  expect(call.arguments).toEqual({ command: ['npm', 'test'] });
  const result = r.transcript.events.filter(e => e.type === 'tool_result')[0];
  expect(result.name).toBe('shell'); // call-name mapping survives
  expect(result.content).toBe('Tests: 10 passed');
  expect(result.is_error).toBe(false);
  expect(r.transcript.closing).toBe('Exit code 0.');
  expect(r.stats.tool_results).toBe(1);
});

test('#71: Codex rollout keeps a non-JSON function_call argument readable', () => {
  const r = adaptTranscriptText([
    codexLine({ type: 'function_call', name: 'shell', arguments: 'ls -la', call_id: 'call_raw' }, 1),
  ].join('\n'));
  const call = r.transcript.events.filter(e => e.type === 'tool_call')[0];
  expect(call.arguments).toEqual({ _raw: 'ls -la' });
});

test('#71 item 8: a system-reminder user line does not open a turn or become the task', () => {
  const r = adaptTranscriptText([
    userTextLine('Real task.'),
    assistantLine('chatcmpl-r1', [{ type: 'text', text: 'Working.' }], 1),
    userTextLine('<system-reminder>Context window is 60% full.</system-reminder>'),
    assistantLine('chatcmpl-r2', [{ type: 'text', text: 'Still working.' }], 2),
  ].join('\n'));
  expect(r.task).toBe('Real task.');
  const msgs = r.transcript.events.filter(e => e.type === 'message').map(e => e.text);
  expect(msgs).toEqual(['Real task.', 'Working.', 'Still working.']);
});

test('#71: a Codex environment_context preamble does not become the task', () => {
  const r = adaptTranscriptText([
    JSON.stringify({ timestamp: '2026-11-01T09:59:00.000Z', type: 'session_meta', payload: { id: 'codex-s2' } }),
    codexLine({ type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>cwd=/repo</environment_context>' }] }, 1),
    codexLine({ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Run the tests.' }] }, 2),
    codexLine({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'ok' }] }, 3),
  ].join('\n'));
  expect(r.task).toBe('Run the tests.');
  const msgs = r.transcript.events.filter(e => e.type === 'message').map(e => e.text);
  expect(msgs).toEqual(['Run the tests.', 'ok']);
});

test('#71 item 8: a new turn clears the previous turn closing', () => {
  const r = adaptTranscriptText([
    userTextLine('First task.'),
    assistantLine('chatcmpl-c1', [{ type: 'text', text: 'First answer.' }], 1),
    userTextLine('Second task, not answered yet.'),
  ].join('\n'));
  expect(r.task).toBe('Second task, not answered yet.');
  expect(r.transcript.closing).toBe('');
});
