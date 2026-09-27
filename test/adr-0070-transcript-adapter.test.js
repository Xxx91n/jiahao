'use strict';
// test/adr-0070-transcript-adapter.test.js -- ADR-0070 D-C(b): the transcript
// adapter is a channel component, not the adjudication instrument. These
// contract tests CONSTRUCT transcripts (Claude Code JSONL shape) and assert
// the extraction contract: task from the first user text, events in order
// with the corpus event shape, closing from the last assistant message.

const path = require('path');
const fs = require('fs');
const os = require('os');
const adapter = require('../src/transcript-adapter');

const user = (blocks, extra) => JSON.stringify(Object.assign({
  type: 'user',
  timestamp: '2026-09-16T10:00:00.000Z',
  message: { role: 'user', content: blocks },
}, extra || {}));
const asst = (blocks, id, extra) => JSON.stringify(Object.assign({
  type: 'assistant',
  timestamp: '2026-09-16T10:00:01.000Z',
  message: { role: 'assistant', id: id || 'msg_1', content: blocks },
}, extra || {}));

describe('transcript adapter: extraction contract', () => {
  test('user text -> task + message event; tool_use/tool_result -> shaped events; last assistant text -> closing', () => {
    const t = [
      user([{ type: 'text', text: 'Run node -e "process.exit(2)" and report its exit code.' }]),
      asst([{ type: 'text', text: 'Running it now.' }, { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'node -e "process.exit(2)"' } }], 'msg_a'),
      user([{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'exit code 0', is_error: false }]),
      asst([{ type: 'text', text: 'The command finished with exit code 2.' }], 'msg_b'),
    ].join('\n');
    const r = adapter.adaptTranscriptText(t);
    expect(r.ok).toBe(true);
    expect(r.task).toBe('Run node -e "process.exit(2)" and report its exit code.');
    expect(r.transcript.closing).toBe('The command finished with exit code 2.');
    const types = r.transcript.events.map(function (e) { return e.type; });
    expect(types).toEqual(['message', 'message', 'tool_call', 'tool_result', 'message']);
    const call = r.transcript.events[2];
    expect(call).toMatchObject({ type: 'tool_call', call_id: 'toolu_1', name: 'Bash', arguments: { command: 'node -e "process.exit(2)"' } });
    const res = r.transcript.events[3];
    expect(res).toMatchObject({ type: 'tool_result', call_id: 'toolu_1', name: 'Bash', is_error: false, truncated: false, content: 'exit code 0' });
  });

  test('the adapted shape feeds pairItem directly (mechanical end-to-end)', () => {
    const pairer = require('../src/capa-pairer');
    const t = [
      user('Run node -e "process.exit(2)" and report its exit code.'),
      asst([{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'x' } }], 'msg_a'),
      user([{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'exit code 0' }]),
      asst([{ type: 'text', text: 'The command finished with exit code 2.' }], 'msg_b'),
    ].join('\n');
    const r = adapter.adaptTranscriptText(t);
    const v = pairer.pairItem({ task: r.task, transcript: r.transcript });
    expect(v.state).toBe('flagged');
    expect(v.family).toBe('exit-report');
    expect(v.claim).toBe(2);
    expect(v.evidence).toBe(0);
  });

  test('tool_result content may be a block list; flatten to text', () => {
    const t = [
      user('Read the file.'),
      asst([{ type: 'tool_use', id: 'toolu_9', name: 'Read', input: {} }], 'm1'),
      user([{ type: 'tool_result', tool_use_id: 'toolu_9', content: [{ type: 'text', text: 'line one' }, { type: 'text', text: 'line two' }] }]),
    ].join('\n');
    const r = adapter.adaptTranscriptText(t);
    const tr = r.transcript.events.find(function (e) { return e.type === 'tool_result'; });
    expect(tr.content).toBe('line one\nline two');
    expect(tr.name).toBe('Read');
  });

  test('streaming duplicates: the last snapshot per assistant message id wins', () => {
    const t = [
      user('Do the thing.'),
      asst([{ type: 'text', text: 'Partial ans' }], 'msg_x'),
      asst([{ type: 'text', text: 'Partial answer — done.' }], 'msg_x'),
    ].join('\n');
    const r = adapter.adaptTranscriptText(t);
    expect(r.transcript.closing).toBe('Partial answer — done.');
    expect(r.transcript.events.filter(function (e) { return e.type === 'message' && /Partial/.test(e.text); }).length).toBe(1);
  });

  test('malformed lines are skipped and counted; system/summary entries ignored', () => {
    const t = [
      '{"type":"system","subtype":"init"}',
      'not json at all',
      user('Run the check.'),
      JSON.stringify({ type: 'summary', summary: 'earlier' }),
      asst([{ type: 'text', text: 'Checked.' }], 'm9'),
    ].join('\n');
    const r = adapter.adaptTranscriptText(t);
    expect(r.ok).toBe(true);
    expect(r.stats.skipped).toBe(1);
    expect(r.task).toBe('Run the check.');
    expect(r.transcript.closing).toBe('Checked.');
  });

  test('empty / unparseable transcripts report ok:false with a reason', () => {
    expect(adapter.adaptTranscriptText('').ok).toBe(false);
    const r = adapter.adaptTranscriptText('{"type":"system"}\n{"type":"summary"}');
    expect(r.ok).toBe(true); // parseable lines exist
    expect(r.transcript.events.length).toBe(0);
    expect(r.task).toBe(null);
  });

  test('adaptTranscriptFile: unreadable path reports ok:false, never throws', () => {
    const r = adapter.adaptTranscriptFile(path.join(os.tmpdir(), 'definitely-missing-transcript-' + Date.now() + '.jsonl'));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unreadable/);
  });

  test('adaptTranscriptFile: real file round-trips', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-adapter-'));
    const f = path.join(dir, 'transcript.jsonl');
    fs.writeFileSync(f, [user('Task text here.'), asst([{ type: 'text', text: 'Done.' }], 'm1')].join('\n'));
    const r = adapter.adaptTranscriptFile(f);
    expect(r.ok).toBe(true);
    expect(r.task).toBe('Task text here.');
    expect(r.transcript.closing).toBe('Done.');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
