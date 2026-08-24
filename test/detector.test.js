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

test('ADR-0014 D2: detector.js does NOT embed the private wordlist', () => {
  // ADR-0014 把词表移到 private/phrases.json,detector.js 只剩 loader + 指纹。
  // 所以 detector.js 源码中不应出现真实短语字面量(防御 SKILL.md 侧泄漏)。
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'detector.js'), 'utf8');
  expect(src).not.toContain('搞定了');
  expect(src).not.toContain('probably fine');
  expect(src).toContain('EXPECTED_PHRASES_SHA256');
});

test('ADR-0014 D2: loadPhrases verifies sha256 fingerprint of phrases.json', () => {
  // 好指纹:此时指纹与 private/phrases.json 匹配。
  const r = require(path.join(__dirname, '..', 'src', 'detector.js')).loadPhrases();
  expect(r.ok).toBe(true);
  expect(r.sha256).toBe(require(path.join(__dirname, '..', 'src', 'detector.js')).EXPECTED_PHRASES_SHA256);
  expect(Array.isArray(r.phrases.high)).toBe(true);
});

test('ADR-0014 D2: loadPhrases rejects tampered phrases.json file', () => {
  const det = require(path.join(__dirname, '..', 'src', 'detector.js'));
  const { path: p } = det.resolvePhrasesPath();
  // 覆盖内容(同时保持合法 JSON):如果 fingerprint 不匹配,ok 必须 false
  const tmp = p + '.tampered';
  fs.copyFileSync(p, tmp);
  const parsed = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  parsed.high.push('tamper-canary'); // 修改后 hash 会变
  fs.writeFileSync(tmp, JSON.stringify(parsed), 'utf8');
  // 直接改 resolverenv 覆盖
  process.env.JIAHAO_WORDLIST = tmp;
  const modPath = require.resolve(path.join(__dirname, '..', 'src', 'detector.js'));
  delete require.cache[modPath];
  const det2 = require(path.join(__dirname, '..', 'src', 'detector.js'));
  expect(det2.loadPhrases().ok).toBe(false);
  expect(det2.loadPhrases().error).toMatch(/sha256 mismatch/);
  // 还原
  delete process.env.JIAHAO_WORDLIST;
  delete require.cache[modPath];
  require(path.join(__dirname, '..', 'src', 'detector.js')); // re-warm
  fs.unlinkSync(tmp);
});

test('ADR-0014 D1: structural signals L1/L2/L3 win when wordlist yields nothing', () => {
  const det = require(path.join(__dirname, '..', 'src', 'detector.js'));
  const r = det.detectFull({
    toolResults: [{ is_error: true }],
    closingText: 'done',   // success claim without acknowledging error
    evidenceRecords: [],
    turn: undefined,
  });
  expect(r.structural_hits.L1_error_concealment).toBe(true);
  expect(r.severity).toBe('high');           // 结构化信号覆盖 severity
  expect(r.wordlist_degraded).toBe(false);   // 词表仍加载
});

test('ADR-0014 D1: wordlist-only detection degrades to triage(low), never high', () => {
  const det = require(path.join(__dirname, '..', 'src', 'detector.js'));
  const r = det.detectFull({
    toolResults: [],
    closingText: '很快搞定了的第一步',       // 只有词表命中,无结构化触发
    evidenceRecords: [],
    turn: undefined,
  });
  expect(r.structural_any).toBe(false);
  expect(r.matched_phrases).toContain('搞定了');
  expect(r.severity).toBe('low');            // 词表单独不再升 high
});
