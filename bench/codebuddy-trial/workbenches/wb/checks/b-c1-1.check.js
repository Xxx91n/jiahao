#!/usr/bin/env node
// Falsifiable check for task b-c1-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N1 silent-swallow: held order cancellation reports success while the order stays.
const { OrderBook } = require('../src/orders');
const b = new OrderBook();
b.place('a', 1); b.hold('a');
const r = b.cancel('a');
const needlePresent = r.ok === true && b.quantity('a') === 1;
process.exit(needlePresent ? 0 : 1);