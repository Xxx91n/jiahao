// Billing aggregation.
'use strict';
function lineCharge(item) { return item.unit; }
function totalCharge(items) { return items.reduce((s, i) => s + lineCharge(i), 0); }
function summarize(items) { return { total: totalCharge(items), lines: items.length }; }
module.exports = { lineCharge, totalCharge, summarize };