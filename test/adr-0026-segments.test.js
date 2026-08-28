// test/adr-0026-segments.test.js — ADR-0026 segmented evidence log.
// D1 segments+cross-segment anchor / D2 256KiB byte threshold /
// D3 base-seq naming / D4 verifyTail+verifyFull / D5 transparent migration.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { createEvidenceLog, verifyChain } = require('../src/evidence-log');

function mktmp(tag) {
  const d = path.join(os.tmpdir(), 'jiahao-adr26-' + tag + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const pad = (n) => String(n).padStart(20, '0') + '.jsonl';
const segDir = (dir) => path.join(dir, '.jiahao-evidence');

function fill(log, n, tag) {
  for (let i = 0; i < n; i++) {
    log.commit((chain, prev) => [
      log.createRecord(tag + i, 'deterministic', 'passed', 'payload ' + i + ' padding-padding-padding-padding', 0.9, prev),
    ]);
  }
}


test('D1/D3: genesis segment created on first append; reads round-trip', () => {
  const dir = mktmp('genesis');
  const log = createEvidenceLog(dir);
  const r1 = log.createRecord('g1', 'deterministic', 'passed', 'ok', 0.9, null);
  log.append([r1]);
  expect(fs.existsSync(path.join(segDir(dir), pad(0)))).toBe(true);
  const all = log.readAll();
  expect(all).toHaveLength(1);
  expect(all[0].gate_id).toBe('g1');
  expect(verifyChain(all).valid).toBe(true);
  expect(log.verifyTail().valid).toBe(true);
  expect(log.verifyFull().valid).toBe(true);
  log.clear();
  expect(fs.existsSync(segDir(dir))).toBe(false);
});


test('D2/D3/D4: byte-threshold rotation writes a valid cross-segment anchor', () => {
  const dir = mktmp('rotate');
  const log = createEvidenceLog(dir, { rotateBytes: 256 });
  fill(log, 6, 'r');
  const segs = fs.readdirSync(segDir(dir)).filter(f => f.endsWith('.jsonl')).sort();
  expect(segs.length).toBeGreaterThan(1);
  expect(segs[0]).toBe(pad(0));

  const genesisPath = path.join(segDir(dir), segs[0]);
  const genesisRecs = fs.readFileSync(genesisPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const seg2recs = fs.readFileSync(path.join(segDir(dir), segs[1]), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const anchor = seg2recs[0];

  expect(anchor.kind).toBe('segment_anchor');
  expect(anchor.segment_format_version).toBe(1);
  expect(anchor.seq_start).toBe(genesisRecs.length);
  expect(segs[1]).toBe(pad(genesisRecs.length));
  expect(anchor.prev_segment_bytes).toBe(fs.statSync(genesisPath).size);
  expect(anchor.prev_segment_count).toBe(genesisRecs.length);
  expect(anchor.prev_segment_hash).toBe(crypto.createHash('sha256').update(fs.readFileSync(genesisPath)).digest('hex'));
  expect(anchor.prev_hash).toBe(genesisRecs[genesisRecs.length - 1].event_hash);

  // D1: the concatenated chain stays valid across the segment boundary
  const all = log.readAll();
  expect(verifyChain(all).valid).toBe(true);
  expect(log.verifyTail().valid).toBe(true);
  expect(log.verifyFull().valid).toBe(true);
});


test('D4: verifyFull catches a copied/renamed segment (filename vs cumulative count)', () => {
  const dir = mktmp('xcheck');
  const log = createEvidenceLog(dir, { rotateBytes: 200 });
  fill(log, 5, 'x');
  const segs = fs.readdirSync(segDir(dir)).filter(f => f.endsWith('.jsonl')).sort();
  expect(segs.length).toBeGreaterThan(1);
  // duplicate the genesis segment under a wrong sequence number
  fs.copyFileSync(path.join(segDir(dir), segs[0]), path.join(segDir(dir), pad(77)));
  const res = log.verifyFull();
  expect(res.valid).toBe(false);
});


test('D5: legacy JSON array migrates transparently on first write', () => {
  const dir = mktmp('migrate');
  const log = createEvidenceLog(dir);
  const r1 = log.createRecord('l1', 'deterministic', 'passed', 'old', 0.9, null);
  const r2 = log.createRecord('l2', 'deterministic', 'passed', 'older', 0.9, r1.event_hash);
  fs.writeFileSync(segDir(dir), JSON.stringify([r1, r2]), 'utf8');
  // legacy reads work before migration (read-only legacy mode)
  expect(log.readAll()).toHaveLength(2);

  log.commit((chain, prev) => [log.createRecord('n1', 'deterministic', 'passed', 'new', 0.9, prev)]);

  expect(fs.statSync(segDir(dir)).isDirectory()).toBe(true);
  expect(fs.existsSync(segDir(dir) + '.legacy.bak')).toBe(true);
  expect(fs.existsSync(path.join(segDir(dir), pad(0)))).toBe(true);
  const all = log.readAll();
  expect(all.map(r => r.gate_id)).toEqual(['l1', 'l2', 'n1']);
  expect(verifyChain(all).valid).toBe(true);
  expect(log.verifyFull().valid).toBe(true);
  // .bak retains the untouched legacy bytes
  expect(JSON.parse(fs.readFileSync(segDir(dir) + '.legacy.bak', 'utf8'))).toHaveLength(2);
});


test('D5: broken legacy chain (>0) migrates with a legacy_migration marker', () => {
  const dir = mktmp('broken-mid');
  fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'generator', 'utf8');
  const log = createEvidenceLog(dir);
  const r1 = log.createRecord('l1', 'deterministic', 'passed', 'old', 0.9, null);
  const r2 = log.createRecord('l2', 'deterministic', 'passed', 'older', 0.9, r1.event_hash);
  const r3 = log.createRecord('l3', 'deterministic', 'passed', 'oldest', 0.9, r2.event_hash);
  const tampered2 = Object.assign({}, r2, { detail: 'HACKED' }); // breaks event_hash at index 1
  fs.writeFileSync(segDir(dir), JSON.stringify([r1, tampered2, r3]), 'utf8');

  log.commit((chain, prev) => [log.createRecord('n1', 'deterministic', 'passed', 'new', 0.9, prev)]);

  const all = log.readAll();
  expect(all).toHaveLength(5);
  expect(all[3].kind).toBe('legacy_migration');
  expect(all[3].broken_at).toBe(1);
  expect(all[4].gate_id).toBe('n1');
  expect(fs.existsSync(segDir(dir) + '.legacy.bak')).toBe(true);
  // Schneier-Kelsey breakpoint semantics: the damage stays visible
  const full = log.verifyFull();
  expect(full.valid).toBe(false);
  expect(full.broken_at).toBe(1);
});


test('D5: chain broken at genesis + verifier profile = refuse migration (read-only)', () => {
  const dir = mktmp('refuse');
  // no .jiahao-profile => default profile is the blocking verifier
  const log = createEvidenceLog(dir);
  const bad = log.createRecord('x', 'deterministic', 'passed', 'old', 0.9, null);
  bad.detail = 'TAMPERED'; // event_hash no longer matches => broken_at 0
  fs.writeFileSync(segDir(dir), JSON.stringify([bad]), 'utf8');

  log.append([log.createRecord('n', 'deterministic', 'passed', 'new', 0.9, null)]);

  expect(fs.statSync(segDir(dir)).isFile()).toBe(true); // untouched
  expect(fs.existsSync(segDir(dir) + '.legacy.bak')).toBe(false);
  const all = log.readAll();
  expect(all).toHaveLength(1);
  expect(all[0].detail).toBe('TAMPERED');
  expect(log.verifyTail().valid).toBe(false);
});


test('consequences: torn last line of the ACTIVE segment is truncated, not fatal', () => {
  const dir = mktmp('torn');
  const log = createEvidenceLog(dir);
  log.append([log.createRecord('t1', 'deterministic', 'passed', 'ok', 0.9, null)]);
  const seg = path.join(segDir(dir), pad(0));
  fs.appendFileSync(seg, '{"gate_id":"torn', 'utf8'); // partial JSON, no newline
  const all = log.readAll();
  expect(all).toHaveLength(1);
  expect(log.verifyTail().valid).toBe(true);
  expect(log.verifyFull().valid).toBe(true);
});
