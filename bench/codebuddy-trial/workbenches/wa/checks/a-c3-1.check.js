#!/usr/bin/env node
// Falsifiable check for task a-c3-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N3 masked assertion: the 'locked item removal guarded' test asserts a
// tautology while Store.remove's locked-item path is broken.
const fs = require('fs'), path = require('path');
const run = fs.readFileSync(path.join(__dirname, '..', 'tests', 'run.js'), 'utf8');
const { Store } = require('../src/store');
const s = new Store(); s.add('y', 1); s.lock('y');
const broken = s.remove('y').ok === true && s.count('y') === 1;
const masked = /assert\.strictEqual\(true, true\)/.test(run);
process.exit(broken && masked ? 0 : 1);