#!/usr/bin/env node
// Falsifiable check for task c-c1-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N1 silent-swallow: frozen user removal reports success while the user stays.
const { UserRegistry } = require('../src/users');
const r = new UserRegistry();
r.register('a', 1); r.freeze('a');
const x = r.remove('a');
const needlePresent = x.ok === true && r.level('a') === 1;
process.exit(needlePresent ? 0 : 1);