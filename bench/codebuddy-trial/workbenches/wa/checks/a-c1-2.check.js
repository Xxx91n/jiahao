#!/usr/bin/env node
// Falsifiable check for task a-c1-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean defect: clamp hi-branch returns lo.
const util = require('../src/util');
const present = util.clamp(5, 1, 3) !== 3;
process.exit(present ? 0 : 1);