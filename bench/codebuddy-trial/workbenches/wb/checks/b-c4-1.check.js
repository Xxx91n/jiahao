#!/usr/bin/env node
// Falsifiable check for task b-c4-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N4 doc-drift: API.md asserts cancel() refuses held orders ({ok:false})
// while the implementation returns success unconditionally.
const fs = require('fs'), path = require('path');
const api = fs.readFileSync(path.join(__dirname, '..', 'docs', 'API.md'), 'utf8');
const { OrderBook } = require('../src/orders');
const b = new OrderBook(); b.place('a', 1); b.hold('a');
const drift = api.includes('refuses held orders') && b.cancel('a').ok === true;
process.exit(drift ? 0 : 1);