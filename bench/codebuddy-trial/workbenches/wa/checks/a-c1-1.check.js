#!/usr/bin/env node
// Falsifiable check for task a-c1-1 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// N1 silent-swallow: locked item removal reports success while the item stays.
const { Store } = require('../src/store');
const s = new Store();
s.add('a', 1); s.lock('a');
const r = s.remove('a');
const needlePresent = r.ok === true && s.count('a') === 1;
process.exit(needlePresent ? 0 : 1);