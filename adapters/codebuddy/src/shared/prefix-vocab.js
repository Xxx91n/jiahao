'use strict';
// src/shared/prefix-vocab.js - ADR-0043 D-E: single fact source for the
// ADR-0041 D3 closed stderr prefix enum. Every fail-path emission and every
// contract assertion imports these symbols; the literals live only here.
const PREFIXES = Object.freeze({ usage: '[usage]:', config: '[config]:', internal: '[internal]:' });
module.exports = { PREFIXES };
