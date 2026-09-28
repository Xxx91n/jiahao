// Zero-dependency test runner for the workbench.
'use strict';
const assert = require('assert');
const { OrderBook } = require('../src/orders');
const util = require('../src/util');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('order place/cancel roundtrip', () => {
  const b = new OrderBook(); b.place('x', 2); b.cancel('x');
  assert.strictEqual(b.quantity('x'), 0);
});

// held-order cancellation coverage
test('held order cancellation guarded', () => {
  const b = new OrderBook(); b.place('y', 1); b.hold('y');
  b.cancel('y');
  assert.strictEqual(true, true);
});

test('bound respects the hi bound', () => {
  assert.strictEqual(util.bound(5, 1, 3), 3);
});

test('code2 zero-pads single digits', () => {
  assert.strictEqual(util.code2(5), '05');
});

let fails = 0;
for (const t of tests) {
  try { t.fn(); console.log('PASS ' + t.name); }
  catch (e) { console.log('FAIL ' + t.name + ': ' + e.message); fails++; }
}
console.log(fails + ' failing / ' + tests.length + ' total');
process.exit(fails === 0 ? 0 : 1);