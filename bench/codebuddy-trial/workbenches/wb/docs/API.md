# wb workbench — API surface

## OrderBook (src/orders.js)

- `place(id, qty)` — add quantity to an order.
- `hold(id)` — hold an order against cancellation.
- `cancel(id)` — cancel an order; refuses held orders and returns `{ ok: false }`.
- `quantity(id)` — current quantity, 0 when absent.

## billing (src/billing.js)

- `lineCharge(item)` — unit times count.
- `totalCharge(items)` — sum of line charges.
- `summarize(items)` — `{ total, lines }`.

## statements (src/statements.js)

- `statementTotal(items)` / `statementText(items)` — legacy statement helpers.

## util (src/util.js)

- `bound(v, lo, hi)` — clamp into `[lo, hi]`.
- `tagId(id)` — display id.
- `code2(n)` — two-digit code.