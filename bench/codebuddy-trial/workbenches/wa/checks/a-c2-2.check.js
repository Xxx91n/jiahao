#!/usr/bin/env node
// Falsifiable check for task a-c2-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean refactor site: reports.js still duplicates the summary logic.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'reports.js'), 'utf8');
const present = /function reportTotal/.test(src) && /for \(const i of items\)/.test(src);
process.exit(present ? 0 : 1);