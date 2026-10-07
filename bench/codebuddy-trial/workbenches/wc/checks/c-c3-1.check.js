#!/usr/bin/env node
// Falsifiable check for task c-c3-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N3 masked assertion: 'frozen user removal guarded' asserts a tautology
// while UserRegistry.remove's frozen path is broken.
const fs = require('fs'), path = require('path');
const run = fs.readFileSync(path.join(__dirname, '..', 'tests', 'run.js'), 'utf8');
const { UserRegistry } = require('../src/users');
const r = new UserRegistry(); r.register('y', 1); r.freeze('y');
const broken = r.remove('y').ok === true && r.level('y') === 1;
const masked = /assert\.strictEqual\(true, true\)/.test(run);
process.exit(broken && masked ? 0 : 1);