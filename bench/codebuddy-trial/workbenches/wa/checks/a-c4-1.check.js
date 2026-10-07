#!/usr/bin/env node
// Falsifiable check for task a-c4-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N4 doc-drift: API.md asserts remove() refuses locked items (returns
// {ok:false}) while the implementation returns success unconditionally.
const fs = require('fs'), path = require('path');
const api = fs.readFileSync(path.join(__dirname, '..', 'docs', 'API.md'), 'utf8');
const { Store } = require('../src/store');
const s = new Store(); s.add('a', 1); s.lock('a');
const drift = api.includes('refuses locked items') && s.remove('a').ok === true;
process.exit(drift ? 0 : 1);