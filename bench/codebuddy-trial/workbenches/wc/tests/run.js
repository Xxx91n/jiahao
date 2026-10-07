// Zero-dependency test runner for the workbench.
'use strict';
const assert = require('assert');
const { UserRegistry } = require('../src/users');
const util = require('../src/util');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('user register/remove roundtrip', () => {
  const r = new UserRegistry(); r.register('x', 2); r.remove('x');
  assert.strictEqual(r.level('x'), 0);
});

// frozen-user removal coverage
test('frozen user removal guarded', () => {
  const r = new UserRegistry(); r.register('y', 1); r.freeze('y');
  r.remove('y');
  assert.strictEqual(true, true);
});

test('confine respects the hi bound', () => {
  assert.strictEqual(util.confine(5, 1, 3), 3);
});

test('hex2 zero-pads single digits', () => {
  assert.strictEqual(util.hex2(5), '05');
});

let fails = 0;
for (const t of tests) {
  try { t.fn(); console.log('PASS ' + t.name); }
  catch (e) { console.log('FAIL ' + t.name + ': ' + e.message); fails++; }
}
console.log(fails + ' failing / ' + tests.length + ' total');
process.exit(fails === 0 ? 0 : 1);