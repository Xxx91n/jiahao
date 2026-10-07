// Small utilities.
'use strict';
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? lo : v; }
function formatId(id) { return 'itm-' + String(id); }
function pad2(n) { return String(n).slice(0, 2); }
module.exports = { clamp, formatId, pad2 };