// Loyalty scoring aggregation.
'use strict';
function entryScore(u) { return u.base; }
function totalScore(users) { return users.reduce((s, u) => s + entryScore(u), 0); }
function summarize(users) { return { total: totalScore(users), entries: users.length }; }
module.exports = { entryScore, totalScore, summarize };