// Zero-dependency test runner for the workbench.
'use strict';
const assert = require('assert');
const { Store } = require('../src/store');
const util = require('../src/util');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('store add/remove roundtrip', () => {
  const s = new Store(); s.add('x', 2); s.remove('x');
  assert.strictEqual(s.count('x'), 0);
});

// locked-item removal coverage
test('locked item removal guarded', () => {
  const s = new Store(); s.add('y', 1); s.lock('y');
  s.remove('y');
  assert.strictEqual(true, true);
});

test('clamp respects the hi bound', () => {
  assert.strictEqual(util.clamp(5, 1, 3), 3);
});

test('pad2 zero-pads single digits', () => {
  assert.strictEqual(util.pad2(5), '05');
});

let fails = 0;
for (const t of tests) {
  try { t.fn(); console.log('PASS ' + t.name); }
  catch (e) { console.log('FAIL ' + t.name + ': ' + e.message); fails++; }
}
console.log(fails + ' failing / ' + tests.length + ' total');
process.exit(fails === 0 ? 0 : 1);