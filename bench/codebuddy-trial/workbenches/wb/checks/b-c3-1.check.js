#!/usr/bin/env node
// Falsifiable check for task b-c3-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N3 masked assertion: 'held order cancellation guarded' asserts a
// tautology while OrderBook.cancel's held path is broken.
const fs = require('fs'), path = require('path');
const run = fs.readFileSync(path.join(__dirname, '..', 'tests', 'run.js'), 'utf8');
const { OrderBook } = require('../src/orders');
const b = new OrderBook(); b.place('y', 1); b.hold('y');
const broken = b.cancel('y').ok === true && b.quantity('y') === 1;
const masked = /assert\.strictEqual\(true, true\)/.test(run);
process.exit(broken && masked ? 0 : 1);