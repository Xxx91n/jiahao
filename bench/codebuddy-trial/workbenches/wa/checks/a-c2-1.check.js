#!/usr/bin/env node
// Falsifiable check for task a-c2-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N2 dropped quantity: lineTotal ignores item.quantity.
const pricing = require('../src/pricing');
const present = pricing.lineTotal({ price: 2, quantity: 3 }) === 2
  && pricing.totalPrice([{ price: 2, quantity: 3 }]) === 2;
process.exit(present ? 0 : 1);