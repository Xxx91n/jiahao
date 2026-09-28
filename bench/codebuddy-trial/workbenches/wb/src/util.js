// Small utilities.
'use strict';
function bound(v, lo, hi) { return v < lo ? lo : v > hi ? lo : v; }
function tagId(id) { return 'ord-' + String(id); }
function code2(n) { return String(n).slice(0, 2); }
module.exports = { bound, tagId, code2 };