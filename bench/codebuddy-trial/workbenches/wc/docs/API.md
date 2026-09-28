# wc workbench — API surface

## UserRegistry (src/users.js)

- `register(name, level)` — add level to a user.
- `freeze(name)` — freeze a user against removal.
- `remove(name)` — remove a user; refuses frozen users and returns `{ ok: false }`.
- `level(name)` — current level, 0 when absent.

## scoring (src/scoring.js)

- `entryScore(u)` — base times weight.
- `totalScore(users)` — sum of entry scores.
- `summarize(users)` — `{ total, entries }`.

## audit (src/audit.js)

- `auditTotal(users)` / `auditText(users)` — legacy audit helpers.

## util (src/util.js)

- `confine(v, lo, hi)` — clamp into `[lo, hi]`.
- `labelId(id)` — display id.
- `hex2(n)` — two-digit hex code.