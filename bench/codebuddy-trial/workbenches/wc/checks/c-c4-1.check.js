#!/usr/bin/env node
// Falsifiable check for task c-c4-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N4 doc-drift: API.md asserts remove() refuses frozen users ({ok:false})
// while the implementation returns success unconditionally.
const fs = require('fs'), path = require('path');
const api = fs.readFileSync(path.join(__dirname, '..', 'docs', 'API.md'), 'utf8');
const { UserRegistry } = require('../src/users');
const r = new UserRegistry(); r.register('a', 1); r.freeze('a');
const drift = api.includes('refuses frozen users') && r.remove('a').ok === true;
process.exit(drift ? 0 : 1);