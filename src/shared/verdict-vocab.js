'use strict';
// src/shared/verdict-vocab.js — single fact source for the human-verdict enum.
// Read by the resolve CLI (which writes the value) and by the installer's usage;
// the literals live only here, the same way the fail-path prefixes live in
// prefix-vocab.js. Adding or renaming a verdict is one edit, not a hunt.
const VERDICTS = Object.freeze(['pass', 'fail', 'inconclusive']);
module.exports = { VERDICTS };
