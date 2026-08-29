# ADR-0032: Generator Surface Rules Deepening — gsr Header + Coverage Map Registry + Pre-Registered Equivalence + Rule Lifecycle

- Status: Accepted
- Date: 2026-08-30

## Context

The verifier side of the dual-profile distribution (ADR-0010) has
hardened through ADR-0012..0031: seven iron laws, a deterministic
detector with a sealed consensus core, hash-chained evidence, segmented
rotation, pre-registered bench gates, behavioral probes, interval
coverage, wiring assertions, and judge bias gates. The generator side
is still three shallow natural-language rules (~15 lines) with no
metadata, no registered coverage against the iron laws it is supposed
to surface, no acceptance evidence beyond "the text is installed", and
no admission/retirement discipline.

This ADR is the product of a grill round with five serial atomcode
researches (each with Sufficiency Gate; Exa 429 degradation honestly
logged; industry sources garak/ASVS/MISRA/Guardrails/DSPy/OPA/OSCAL
plus academic anchors Tian 2021 traceability mapping study, Mader &
Egyed, Sclar et al. 2024 prompt sensitivity, Goldberg & Levy 2024
token knee, Fowler ADR supersede discipline, sunset-review literature).
Four of five questions adopted the research recommendation verbatim.

The grill round also re-scored the neighboring directions and locked
the dispositions: L1/L2 host deepening stays a latent verification
pipeline (ADR-0028 unfreeze conditions); supply-chain signing stays
refused until git remote + npm publish + CI exist; a gate registry /
unified runner is rejected as confidence theater (no CI, no remote,
nothing to enforce against); a runtime judge stays refused
(ADR-0019 D4, ADR-0025 D1); calibration-flywheel operations fold into
this ADR's companions rather than standing alone.

## Decision

### D1 Scope convergence: generator-side deepening only, three gaps

The ADR-0032 scope is exactly three gaps on the generator side:

1. Coverage gap — no addressable mapping between the 3 generator
   rules and the 7 iron laws (garak probe↔detector pairing analogue).
2. Structural gap — the rules carry no metadata and no schema latch
   (ADR-0031 D1 wiring-assertion discipline has nothing to assert).
3. Acceptance gap — no pre-registered statement of what "the rules
   work" means, and no duty assigned for behavioral evidence.

Not carried forward: L1/L2 deepening (latent verification pipeline),
supply-chain signing (preconditions absent), gate orchestration layer
(rejected), runtime judge (sealed), calibration-flywheel scheduling
(folds into existing runbook).

### D2 Rule metadata: prose + inline gsr header, git as version

Each generator rule keeps its prose body in src SKILL.md (single
source of truth, ADR-0028 D2 regen-diff unchanged) and gains one
inline metadata header line:

    <!-- gsr:N | signal-domain: <domain> | status: active -->

Fields: stable integer id `gsr:N` (garak rule-name analogue);
`signal-domain` (Guardrails `data_type` analogue: which surface signal
the rule targets); `status` from the D5 lifecycle
(active/superseded/deprecated); optional `check:` reference naming
the wiring assertion that binds the rule (jiahao's
`primary_detector`). A superseded rule carries `superseded-by: gsr:M`
in its header (Fowler ADR supersede discipline).

No sibling manifest.json (ADR-0028 D2 opaque-manifest precedent:
double-source drift surface + orphan file on 11 cold-chain hosts),
and no rules-as-JSON-schema rendering (DSPy's schema earns its keep
because three programmatic consumers exist; here the only consumers
are splitByProfile and wiring assertions, and a renderer would hide
intent drift behind a build step).

Cold-chain self-description: the header travels inside the exact
SKILL.md fragment that build-adapters.js slices into 23 host files;
regen-diff covers the new bytes for free. Version = git commit;
never a SemVer field for three rules.

### D3 Coverage map: machine fact-source + derived matrix + four states

Registry `docs/coverage-map.json` (same family as thresholds.json
ADR-0027 and host-contracts.json ADR-0028 D6) declares, per iron
law L1..L7:

- `state`: one of `covered` | `declared-gap` | `needs-adr` |
  `undecidable` (MISRA analogue — human judgment written down, never
  a silently empty cell);
- `targets`: list of covering `gsr:N` ids (covered only);
- `rationale` + `source_adr` for declared-gap/needs-adr/undecidable;
- `review_at` for declared-gap (ADR-0031 D3 rule: observers without
  review_at rot; overdue = STALE violation).

Gate `scripts/check-coverage.js` (thin CLI wrapping a pure core,
ADR-0029 D4 shape) asserts: every iron law has an entry; covered
entries' targets resolve to real gsr ids present in SKILL.md; gap
entries carry rationale + source_adr or a non-stale review_at;
status transitions are unidirectional per D5. The derived matrix is
a print artifact (stdout / generated report shown to humans), never
checked in (R4).

Seed mapping (subject to audit-round confirmation, not a frozen
claim): gsr:1 ↔ L1/L3/L7; gsr:2 ↔ L5; gsr:3 ↔ L1/L7; L2/L4/L6 enter
as declared-gap with rationale "verifier-only responsibility".

Academic basis: maintenance of manually kept trace links is the first
cost of traceability (Tian 2021, 63-study mapping) and manual links
decay trust (FDA audit gaps); but traceability pays (Mader & Egyed:
21-24% faster, 50-60% more correct) when the mapping is generated
from the source of truth rather than hand-kept.

### D4 Behavioral acceptance: no statistical gate; equivalence pre-registration

The behavioral acceptance duty is discharged by architecture, not by
a statistical gate:

1. Primary acceptance = static assertions: the D2 wiring assertion
   (injection proof) plus D3 check-coverage.js (registration proof).
2. Pre-registered equivalence statement (this ADR carries it):
   generator rules are advisory surface-signal text; the minimum
   detectable effect for a behavioral A/B is pre-registered as
   ~1200 paired observations (LREC 2026 power analysis; llm-power);
   below that, "no difference measured" is the pre-registered
   conclusion "no statistically detectable behavioral effect;
   acceptance duty returns to the injection layer", NOT a failure.
3. Light human sampling of 3-10 real tasks per release lands in
   release notes (never in CI, never a gate).
4. Statistical duties stay with the verifier side (14-probe smoke
   gate + 396-corpus regression), per ADR-0029's advisory-rules-don't-
   gate principle.

Evidence behind refusing a statistical gate: garak's own FAQ
("probe scores have no scientific validity... no normalised scale");
lm-eval-harness community: "not designed for application-layer prompt
changes"; Sclar et al. 2024: format perturbations alone swing up to
76 accuracy points — an advisory rule's effect is far under that noise
floor.

### D5 Rule lifecycle: triad admission + enforced-active cap + reasoned retirement

Admission (garak probe triad, transcribed):
novel (no overlap with existing rules) + demonstrated (behavioral
evidence: coverage-map observation or the D4 equivalence registration)
+ substantial (>= 30 observations; garak: "thirty is a reasonable
minimum bar"). Admission ships gsr header + coverage-map entry
mandatorily (garak: docs enforced by a test); confirmatory-tier rules
additionally ship their wiring assertion; per-release human sampling
covers the batch.

Cap: 6-8 enforced-active rules (status=active). attested/informational
rules do not count. Basis: Goldberg & Levy 2024 token knee
(~3000 tokens, accuracy 0.92→0.68) + Anthropic minimal-set principle
+ false-positive fatigue analogy; no direct rule-count study exists
(honestly logged). Approaching the cap triggers a capacity review;
new admission must name a replacement candidate (supersede or demote
to attested).

Retirement: unidirectional transitions active → superseded (with
`superseded-by: gsr:M` link) or active → deprecated (no replacement).
Every retirement carries exactly one ASVS-style reason tag:
not-in-scope / incorrect / not-practical / insufficient-impact /
merged / covered-by (ASVS DELETED-reason template). accepted rules
are never edited in place; they are superseded (Fowler).

Sweep: each release (or quarter, whichever first) runs a rules sweep;
rules without accumulated evidence transition to superseded or
deprecated (sunset-review literature: only credible expiration works).
A 3-rule rulebook still keeps the discipline — the cost is one status
field and one reason line.

## Consequences

- Generator rules become addressable objects: id, domain, status,
  coverage, lifecycle. ADR-0031 D1 wiring discipline gains a generator
  side target; the impl round ships `test/adr-0032-wiring.test.js`.
- SKILL.md generator section gains 3 header lines; build-adapters.js
  splitByProfile learns the header syntax (parser, not renderer).
- docs/coverage-map.json + scripts/check-coverage.js join the gate
  chain and thresholds.json coupling guard (ADR-0027 D2-style guard
  re-anchored to this ADR).
- Release process gains one human-sampling note; no new runtime code
  path, no new dependency, no CI requirement.

## Rejected

- R1 Rules without behavioral evidence admitted (noise manufacturing;
  violates the triad; the grill R1 escalation rule stands).
- R2 Sibling rules.json manifest (ADR-0028 D2 opaque-manifest
  precedent; double-source drift; cold-chain orphan file).
- R3 Rules as JSON schema rendered to prose (double review surface;
  intent drift behind a build step; no programmatic consumer). 
- R4 Hand-maintained markdown / CONTEXT.md mapping table (Tian 2021:
  manual link maintenance is the first traceability cost; FDA gap
  evidence; ADR-0027 prose-parsing refusal).
- R5 Statistical behavioral gate now (no power at any attainable
  corpus; garak no-validity FAQ; Sclar noise floor).
- R6 Offline A/B runner under cold-chain (no API key precedent; would
  import an LLM-call surface the runtime judge was refused for).
- R7 Auto/semi-auto rule authoring to fill gaps (no precedent —
  garak/ASVS/MISRA all gate by issue+deviation, none auto-generate;
  gaps are often strategic, not defects).
