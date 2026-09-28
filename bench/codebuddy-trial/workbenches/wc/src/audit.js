// Audit helpers — predates the scoring module; duplicates its logic.
'use strict';
function auditTotal(users) {
  let t = 0;
  for (const u of users) t += u.base;
  return { total: t, entries: users.length };
}
function auditText(users) {
  const r = auditTotal(users);
  return 'entries=' + r.entries + ' total=' + r.total;
}
module.exports = { auditTotal, auditText };