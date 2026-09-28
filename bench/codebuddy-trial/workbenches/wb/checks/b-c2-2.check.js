#!/usr/bin/env node
// Falsifiable check for task b-c2-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean refactor site: statements.js still duplicates the summary logic.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'statements.js'), 'utf8');
const present = /function statementTotal/.test(src) && /for \(const i of items\)/.test(src);
process.exit(present ? 0 : 1);