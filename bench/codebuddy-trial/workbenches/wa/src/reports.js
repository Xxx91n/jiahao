// Reporting helpers — predates the pricing module; duplicates its logic.
'use strict';
function reportTotal(items) {
  let t = 0;
  for (const i of items) t += i.price;
  return { total: t, lines: items.length };
}
function reportText(items) {
  const r = reportTotal(items);
  return 'lines=' + r.lines + ' total=' + r.total;
}
module.exports = { reportTotal, reportText };