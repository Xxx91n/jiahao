# ADR-0016: EvidenceLog/GateLadder Split and Shared Core Relocation

## Context

- `src/gate.js` (363 lines, 13 exports) mixes hash-chain persistence
  (canonicalJSON / recordHash / idempotencyKey / appendEvidence / writeEvidence
  / clearEvidence / verifyChain — fs-touching) with the pure verification
  ladder (TIERS / LEVELS / runGate / verify). Fat interface = shallow module
  (Ousterhout); business logic entangled with external entities (Cockburn
  2005); audit data must be separated from business logic (Fowler / audit-log
  industry rule).
- `src/gate.js:10` and `src/calibration.js` reverse-depend on
  `hooks/jiahao-paths.js` — a Clean Architecture dependency-rule violation.
  `appendEvidence` also inlines the same path-join decision (information
  leak: change the path format, touch two places).
- Backed by atomcode research (18 searches / 13 full-text fetches across 3
  engines; Cockburn, Fowler, Uncle Bob, Parnas, Ousterhout, nodebestpractices,
  Node.js Packages docs; every key claim ≥2 independent sources).

## Decision

D1: Split `src/gate.js` into two deep modules. `EvidenceLog` = factory
closure `createEvidenceLog(dir?)` exposing exactly
`{append, readAll, verify, clear, createRecord}`; all hashing, canonical
JSON, idempotency sidecar, and chain verification hide behind it.
`GateLadder` = `{runGate, verify, TIERS, LEVELS}` remaining pure and fs-free.
Exactly one seam is opened — it is a real seam because two adapters already
exist (real fs adapter + override-config-dir test adapter).

D2: Move `hooks/jiahao-paths.js` to `src/shared/paths.js` so every
dependency on path knowledge points inward (hooks → src → src/shared).
package.json `exports` is explicitly REJECTED: per Node.js docs it only
governs by-name resolution and package self-reference; all imports here are
relative requires, so `exports` would change runtime behavior by zero while
adding maintenance cost and ERR_PACKAGE_PATH_NOT_EXPORTED lockout risk. With
no npm package consumers (users are agent runtimes), `exports` is
ritualistic ceremony.

D3: Chain/hash/idempotency/verify-on-read test cases move (not rewrite) to
`test/evidence-log.test.js`; `test/gate.test.js` keeps only ladder cases.
Interface = test surface; a case needing both modules marks a misplaced seam.

D4: Explicitly deferred (recorded so future reviews do not re-suggest
without new facts): industrial verifiable-log wheels (hypercore / ssb /
Rekor — size-correct ~150-line chain stays self-maintained; trigger for
Rekor remains cross-host audit per ADR-0013); `hooks/jiahao-profile.js`
relocation and `src/detector.js` configDir dedup; dependency-cruiser or
ESLint no-restricted-imports boundary enforcement. Sub-item (i) is registered
as `defer-0027` (pending-evaluation, yearly, review_at 2027-09-01); sub-items
(ii) and (iii) stay in this prose - no live trigger, no registry entry
(ADR-0033 D4).

## Consequences

- Dependency direction becomes uniformly inward: hooks → src → src/shared.
- ADR-0013-family chain changes now localize to one file behind a 5-method
  interface; ladder changes never touch fs code.
- No new dependencies, no package.json change, no publish flow impact.
- Three new CONTEXT.md terms: EvidenceLog, GateLadder, Shared Core.
