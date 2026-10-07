#!/usr/bin/env node
// Falsifiable check for task b-c2-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N2 dropped count: lineCharge ignores item.count.
const billing = require('../src/billing');
const present = billing.lineCharge({ unit: 2, count: 3 }) === 2
  && billing.totalCharge([{ unit: 2, count: 3 }]) === 2;
process.exit(present ? 0 : 1);