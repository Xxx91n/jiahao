// Pricing aggregation.
'use strict';
function lineTotal(item) { return item.price; }
function totalPrice(items) { return items.reduce((s, i) => s + lineTotal(i), 0); }
function summarize(items) { return { total: totalPrice(items), lines: items.length }; }
module.exports = { lineTotal, totalPrice, summarize };