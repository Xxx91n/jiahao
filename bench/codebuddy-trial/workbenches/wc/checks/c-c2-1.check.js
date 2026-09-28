#!/usr/bin/env node
// Falsifiable check for task c-c2-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N2 dropped weight: entryScore ignores u.weight.
const scoring = require('../src/scoring');
const present = scoring.entryScore({ base: 2, weight: 3 }) === 2
  && scoring.totalScore([{ base: 2, weight: 3 }]) === 2;
process.exit(present ? 0 : 1);