# spec-t33-correction — grill-t33 止血+披露轮规格

Authority chain: `.scratch/grill-t33/decision-ledger.md` → this spec →
`handoffs/next-round.md`. If this spec conflicts with the ledger, the
ledger wins; if the ledger is silent, ask before inventing.

Source discipline: every section cites its D-xxx record(s). Items marked
`[mechanical]` are factual implementation notes under D-004(iii) — they
carry no argumentation; anything with option-space returns to the ledger.

## 1. 轮范围与边界（D-001）

Round object: V8 critique correction track. Four in-round items, all
mechanical correction + disclosure registration; contract-design items are
delegated to the t34 contract round by explicit transfer, not dropped.

In scope:

- (a) README declared-count repair (D-001(i)①) — §2
- (b) E-25 errata registration (D-001(i)②, D-003) — §3; lands AFTER §4
- (c) countersign-queue authority closure (D-001(i)③, D-002) — §4
- (d) defer-0076 known-drift bridge (D-001(i)④, D-003(ii)) — §5
- (e) standing convention clauses (D-003(iv), D-004(i)) — §6

Registered transfers (D-001(ii)):

- t34 contract round: audit re-run surface ⊇ CI test-job surface
  mechanization — checklist generated from ci.yml, generator carries
  D-008-style weak self-consistency; pending-confirmation reject-branch
  pre-registration for ADR-0089/0086 — must include ratification-window
  expiry semantics. The audit finding-vs-note ruler rides the same item.
- Owner-side, pre-registered for round opening (agent never performs):
  adjudicated/grill-t27 tag push (3 rounds overdue), tide unbundling /
  interim checkpoint, ADR-0089 entity countersign.
- t34+ candidate registration (not silently absorbed): R2-F4 exists_at
  sanity-bound leg; F-11 generator/facade dedupe + build-rewrite-map.js
  refactor; settle-window leg + advisory-leftovers batch; t27/t28
  audit-handoff asymmetry + errata_exemptions bare-sha drift.

Negative requirements (D-001): no contract-design item inside the
correction round (closure must not be blocked by contract disputes); no
bare README fix without the bridge registration; queue boundary closes
before E-25 is written; owner-side items are never deliverables.

## 2. README 修红（D-001(i)①）

Verified declaration sites (grill-time measurements):

- `README.md:337` — "1511 tests across 87 suites ... skips 7 corpus-bound
  tests"
- `README.md:356` — "87 test suites, 1511 tests"
- `README-zh-CN.md:280` — same declaration pair, zh-CN mirror
- `README-zh-CN.md:295` — same declaration pair, zh-CN mirror

`[mechanical]` `ci.yml:107` carries `--expected-suites 89` (ADR-0057 D-C
registered expectation on the test-job call line; the wrapper is
`scripts/run-test-gate.js`, which spawns jest then asserts both README
declaration forms). The queue-reconciliation test (§4) adds one suite
(89→90); the ci.yml bump rides the same commit as the suite-adding change;
README counts are written at wave-final with the measured post-change
values (D-004(iii)①). The numbers land as a one-time measured record —
no hand-maintained-count convention is created.

`[mechanical]` "skips 7 corpus-bound tests" declaration-scope verification:
public clone measures 11 skipped; the delta-4 are bench/ci-mode
capability-negative skips. Verification only — if the declaration is
literally true for its stated scope but reads as total, the fix is
wording-precision, not a number change (D-001 negative req).

Constraints: zh-CN mirror in the same commit (ADR-0079); the correction
commit carries English + Chinese + ci.yml together.

## 3. E-25 披露条目（D-003）

Single entry, terminal-state snapshot, three numbered items:

1. Event (terminal statement, no per-run log): five consecutive
   origin/main CI failures a92efdf5→754e53c2 (2026-09-28T12:05Z →
   2026-09-29T06:20Z); the failing step in every run is the test job's
   `node scripts/run-test-gate.js --expected-suites` README declared-count
   assertion; README declared 1511/87 while the measured battery stood at
   1571/89.
2. Audit-surface fact: the t32 round's three second-party audit Hard-
   acceptance tables carry `npx jest` and `run-gates.js` rows and no
   run-test-gate.js row — the single command the CI test job actually
   runs. Recorded as the verifiable fact only; the critique's "surface
   gap" characterization is cited as the critique's finding, not
   countersigned here.
3. Disposition boundary: correction lands this round (§2 repair + §4
   queue closure); the mechanism fix (audit re-run surface ⊇ CI surface)
   goes to the t34 contract round — the erratum records facts and
   destination, it does not mint the mechanism.

Posture: factual registration, no pending-confirmation wording — every
asserted fact is mechanically verifiable (E-13-style pending wording is
reserved for contested characterizations).

Bound-by: convention-existence wiring asserting the defer-0076 row and
the AGENTS.md baseline-CI clause exist (D-003(iii)); the entry carries one
self-justifying sentence naming this as the first convention-existence
binding, so future readers do not misread it as a numeric assertion.

Negative requirements: terminal snapshot, not an event stream — the five
failures are stated once as a consecutive-failure terminal statement;
the historical figures (1511/87, 1571/89) appear once as evidence text and
never become an assertion pattern (D-002 mirror).

## 4. countersign 队列权威收口（D-002）

Authority = each ADR's own declaration surface; the queue is a
mechanically derived set, never a maintained count.

Three registered declaration forms (fact sources):

- old-form `ID-level-only, awaiting entity-level` labels — 10 members
  (ADR-0064..0074 subset; variants carry return-by 2026-12-15 text)
- E-13 pointer-annotation lines — 9 bare-form ADRs (0076..0081, 0083..0085)
- new-form `awaiting entity-level countersign` status — 0086+ (4)

`[prepass, D-002(v)]` Survey all 89 ADR declaration surfaces; normalize
the three awaiting patterns against observed wording variants; enumerate
the closed category set {awaiting×3 / countersigned-or-final /
registered-exempt}; undeclared = fail. The derived queue set is expected
23 (10+9+4) — report deviations, never repair by hand.

Member-level reconciliation wiring (D-002(ii)): every ADR file's
declaration classifies into the closed set; the queue set equals the union
of the three awaiting forms. NO count-equality assertions — total-equality
is cancellation-blind (Oath-lang lesson recorded in D-002). Optional
forward check: ADRs newer than 0089 carry no `N -> N+1` count-bump lines.

Retirement (D-002(iii)): hand-count narratives (ADR-0084 "10 entries"
enumeration, E-13 "10 -> 19", E-16 "19 rows", ADR bump lines) stay
byte-stable as historical text; NEW ADRs must not write count lines.

No retro-fix on 0087/0088 (D-002(iv)): their status lines are already
complete membership declarations; the un-bumped count narrative is
evidence the count channel lost authority, not debt.

Derived JSON may exist only as a `--check` cache product; it never carries
adjudication authority (D-002(vi)).

Convention line (D-002(vii)): one AGENTS.md working-agreement clause —
queue membership is authoritative on per-ADR declaration surfaces; the
queue is the derived set; count narratives are display text.

Ordering: this section's work lands before E-25 registration (D-002
negative requirement — E-25 must not be written while the registration
channel boundary is ambiguous).

Glossary (domain-modeling): verify CONTEXT.md "Countersign Queue" entry
(:2465) against derived-membership semantics; update inline if the term's
definition conflicts — do not add a parallel term.

## 5. 桥接与登记批（D-003(ii), D-004(ii)）

- defer-0076 (bridge): subject — test/suite declared counts lack a single
  generator source (README hand-declared; the gate asserts equality only;
  no count synthesis exists); recurrence risk registered pending the t34
  contract round. unfreeze_if = mechanically verifiable presence-condition:
  a registered artifact or ADR declares the audit re-run checklist is
  derived from ci.yml / the CI test-job command is inside the audit re-run
  table. review_at = 2026-10-15 (value pinned by this spec on 2026-09-29 —
  D-004(iii)⑥). cadence_tier = quarterly (smallest registry tier).
- defer-0077 (observation home per D-004(ii)): cap fifth-amendment
  distribution-form economics unpriced (vendored plugin bundle raised the
  pack floor ~64k); evaluate whether distribution-form cost accounting
  belongs in future cap-trend amendments. status pending-evaluation. The
  row's registration is in-round; the item itself stays out-of-round.
- Convention-existence wiring (T-8) asserts both rows are present; home =
  `test/adr-0033-wiring.test.js` (deferred-registry wiring home).

## 6. standing 规约条款（D-003(iv), D-004(i)）

Two new AGENTS.md working-agreement clauses:

1. Baseline-CI clause: every round's T-0 baseline recon MUST include a
   public-CI status check — origin/main tip's latest run conclusion and
   the failing step named.
2. Audit self-consistency clause (interim, D-004(i)): until the t34
   mechanization lands, every second-party audit re-run table MUST
   manually include the full CI test-job command surface (currently
   `run-test-gate.js --expected-suites N`). The clause retires when the
   generated checklist lands. Applies to t33's own audit.

## 7. spec 级机械绑定清单（D-004(iii) — factual notes, not decisions）

- ci.yml `--expected-suites` bump rides the suite-adding commit (§2).
- Public-CI return-to-green is an owner-side post-push observation item,
  not an agent deliverable (D-004(iii)④).
- Queue reconciliation lives in an independent test file —
  `test/countersign-queue.test.js` — whose header lists bound ADRs
  (0084, 0086) (D-004(iii)⑤).
- defer-0076 `review_at` pinned in §5 with its pinned-at annotation
  (D-004(iii)⑥).

## 8. 验收门

- jest full battery green; suites/tests = final measured values after all
  suite-affecting changes (queue test + registry wiring assertions).
- `node scripts/run-test-gate.js --expected-suites <final>` exit 0 — the
  exact CI test-job command, run locally before closeout (D-004(i)
  self-consistency applies to t33's own acceptance).
- Queue reconciliation test green; the derived queue set is enumerated in
  the baseline note (expected 23 members by declaration form).
- `node scripts/run-gates.js` exit 0; ci-mode UNVERIFIABLE legs stay
  registered degrade.
- Wave closeout per AGENTS.md E-17/E-19 order: re-capture evidence pins →
  regenerate derived artifacts (rewrite-map LAST) → `--check` +
  `--published-only` clean → declare; after the LAST `but` mutation,
  re-run `--check` on the settled tree.
- Commits via `but` with explicit path/hunk allowlists and derived
  `[ANCHORING]` footers; `git show --name-only` verified after each commit;
  audit-evidence never committed (nc-001).
