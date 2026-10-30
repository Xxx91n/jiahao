'use strict';
// src/shared/verdict-vocab.js — single fact source for the human-verdict enum.
// Read by the resolve CLI (which writes the value) and by the installer's usage.
// Known gap, stated rather than hidden: the gate messages in hooks/ still name
// `pass|fail` only. They cannot import this file without regenerating the plugin
// adapters, so that catch-up is its own change, not a silent second copy here.
const VERDICTS = Object.freeze(['pass', 'fail', 'inconclusive']);
module.exports = { VERDICTS };
