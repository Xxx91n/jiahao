#!/usr/bin/env node
// Falsifiable check for task b-c3-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean failing test: code2 does not zero-pad.
const util = require('../src/util');
const present = util.code2(5) !== '05';
process.exit(present ? 0 : 1);