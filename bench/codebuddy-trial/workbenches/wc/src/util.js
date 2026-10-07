// Small utilities.
'use strict';
function confine(v, lo, hi) { return v < lo ? lo : v > hi ? lo : v; }
function labelId(id) { return 'usr-' + String(id); }
function hex2(n) { return String(n).slice(0, 2); }
module.exports = { confine, labelId, hex2 };