#!/usr/bin/env node
// Falsifiable check for task c-c4-2 — exit 0 iff the shipped defect state
// is still present in this pristine workbench (non-zero = defect fixed/removed).
'use strict';
const assert = require('assert');

// Clean doc gap: NOTES.md still lacks the util module section.
const fs = require('fs'), path = require('path');
const notes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'NOTES.md'), 'utf8');
const present = !/util\.confine|confine\(/.test(notes);
process.exit(present ? 0 : 1);