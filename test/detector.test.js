// detector.test.js — D1/D2/D3 verification of src/detector.js
const path = require('path');
const fs = require('fs');
const { detect } = require(path.join(__dirname, '..', 'src', 'detector.js'));
const { createEvidence, verifyChain } = require(path.join(__dirname, '..', 'src', 'gate.js'));

test('detects high-severity Chinese completion claims', () => {
  const r = detect('搞定了，全做完了');
  expect(r.suspicious).toBe(true);
  expect(r.severity).toBe('high');
  expect(r.matched_phrases.length).toBeGreaterThan(0);
  expect(r.matched_phrases).toContain('搞定了');
});

test('detects high-severity English completion claims', () => {
  const r = detect('Everything works. Done.');
  expect(r.suspicious).toBe(true);
  expect(r.severity).toBe('high');
});

test('detects low-severity self-comforting language', () => {
  const r = detect('应该没问题，看起来可以');
  expect(r.suspicious).toBe(true);
  expect(r.severity).toBe('low');
  expect(r.matched_phrases).toContain('应该没问题');
});

test('detects low-severity English softeners', () => {
  const r = detect('Probably fine, seems fine');
  expect(r.suspicious).toBe(true);
  expect(r.severity).toBe('low');
});

test('does NOT flag neutral factual text', () => {
  const r = detect('tests passed: 99 pass, 0 fail; exit code 0');
  expect(r.suspicious).toBe(false);
  expect(r.severity).toBeNull();
  expect(r.matched_phrases).toEqual([]);
});

test('does NOT flag empty or null input', () => {
  expect(detect('').suspicious).toBe(false);
  expect(detect(null).suspicious).toBe(false);
  expect(detect(undefined).suspicious).toBe(false);
});

test('D1: detector verdict rides the same hash chain (tamper-evident)', () => {
  const det = detect('搞定了');
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'ok', 0.9, null,
    { detector: det, session_id: 's1', turn_id: 't7' });
  // Detector fields are ON the record, not on a sidecar file
  expect(e1.detector).toBeDefined();
  expect(e1.detector.suspicious).toBe(true);
  expect(e1.detector.severity).toBe('high');
  expect(e1.session_id).toBe('s1');
  expect(e1.turn_id).toBe('t7');
  // And they participate in the hash — changing severity must break event_hash
  const e1clone = JSON.parse(JSON.stringify(e1));
  e1clone.detector.severity = 'low';
  const recomputed = require('../src/gate.js').recordHash(e1clone);
  expect(recomputed).not.toBe(e1.event_hash);
});

test('D1: chains with detector fields still validate with verifyChain', () => {
  const det = detect('done');
  const e1 = createEvidence('det-0', 'deterministic', 'passed', 'first', 0.9, null,
    { detector: det, session_id: 's1', turn_id: 't1' });
  const e2 = createEvidence('det-1', 'deterministic', 'passed', 'second', 0.9, e1.event_hash,
    { detector: det, session_id: 's1', turn_id: 't1' });
  expect(verifyChain([e1, e2]).valid).toBe(true);
});

test('D3: SKILL.md does NOT leak the private wordlist', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'src', 'SKILL.md'), 'utf8');
  // We require the principle to be present...
  expect(skill).toMatch(/No evidence, no completion claim/i);
  // ... but the actual phrase families must NOT appear.
  const banned = ['搞定了', '跑通了', '已修复', '应该没问题', '颅内高潮',
    'all good', 'probably fine', 'seems fine'];
  for (const w of banned) {
    expect(skill).not.toContain(w);
  }
});

test('detector (D3 privacy) — detector module itself contains the wordlist', () => {
  // Sanity: the file we're keeping private actually is a wordlist module.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'detector.js'), 'utf8');
  expect(src).toContain('搞定了');
  expect(src).toContain('probably fine');
});
