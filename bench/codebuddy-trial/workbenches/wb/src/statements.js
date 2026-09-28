// Statement helpers — predates the billing module; duplicates its logic.
'use strict';
function statementTotal(items) {
  let t = 0;
  for (const i of items) t += i.unit;
  return { total: t, lines: items.length };
}
function statementText(items) {
  const r = statementTotal(items);
  return 'lines=' + r.lines + ' total=' + r.total;
}
module.exports = { statementTotal, statementText };