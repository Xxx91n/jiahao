# wa workbench — API surface

## Store (src/store.js)

- `add(id, qty)` — add quantity to an item.
- `lock(id)` — lock an item against removal.
- `remove(id)` — remove an item; refuses locked items and returns `{ ok: false }`.
- `count(id)` — current quantity, 0 when absent.

## pricing (src/pricing.js)

- `lineTotal(item)` — price times quantity.
- `totalPrice(items)` — sum of line totals.
- `summarize(items)` — `{ total, lines }`.

## reports (src/reports.js)

- `reportTotal(items)` / `reportText(items)` — legacy reporting helpers.

## util (src/util.js)

- `clamp(v, lo, hi)` — clamp into `[lo, hi]`.
- `formatId(id)` — display id.