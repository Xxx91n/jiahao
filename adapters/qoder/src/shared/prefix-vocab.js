'use strict';
// src/shared/prefix-vocab.js - : single fact source for the
// closed stderr prefix enum. Every fail-path emission and every
// contract assertion imports these symbols; the literals live only here.
const PREFIXES = Object.freeze({ usage: '[usage]:', config: '[config]:', internal: '[internal]:' });
module.exports = { PREFIXES };
