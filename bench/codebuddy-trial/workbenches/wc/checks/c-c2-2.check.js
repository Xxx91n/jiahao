#!/usr/bin/env node
// Falsifiable check for task c-c2-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean refactor site: audit.js still duplicates the summary logic.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'audit.js'), 'utf8');
const present = /function auditTotal/.test(src) && /for \(const u of users\)/.test(src);
process.exit(present ? 0 : 1);