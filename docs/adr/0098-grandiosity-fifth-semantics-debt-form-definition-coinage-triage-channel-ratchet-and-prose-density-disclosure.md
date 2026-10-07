# ADR-0098: Grandiosity (虚饰输出) — The Fifth Semantics, the Debt-Form Definition, the Unregistered-Coinage Triage Channel, the Ratchet Form, the Sentence-Shape Probe Family, and the prose-Density Disclosure Footer (grill-t39)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-10-07
- Ledger: `.scratch/grill-t39/decision-ledger.md` — D-004 and D-005 (both current); round scope D-001.1 (the P-B line)
- Spec: `.scratch/grill-t39/spec-t39.md` — §S-4 (the sole drafting specification; not an authority source)
- Census: `.scratch/grill-t39/research/p-b-census-brief.md` — 412-file full scan, atomcode run 2026-10-07 (finite enumeration surface)
- Relates: ADR-0014 D1 (the vocabulary triage status this channel inherits — this ADR does **not** amend it), ADR-0097 D-F (the generator-side-only rule this ADR's tool-surface clause follows), ADR-0100 (sibling carrier, different force-field; see D-G)

## Context

The repository distributes a prompt-as-mental-model. Its fourth semantics was
concision; this round adds a **fifth**: output that impersonates depth through term
density and obscure sentence shape. The failure had been observed but not named, and an
unnamed failure cannot be triaged.

Naming it required choosing between two candidate framings, and the choice is the whole
design. Framing it as *unregistered vocabulary* makes coinage itself the offence, which
contradicts DDD (a ubiquitous language is supposed to grow) and is unenforceable. Framing
it as **debt** — a term whose lifecycle never closed — keeps coinage legal and makes a
specific, checkable thing the offence. The census over 412 tracked files (finite
enumeration, not a sample) measured the shape: pure decoration is under ten percent of
the occurrences; the load is concentrated in a small set of high-frequency
load-bearing tokens spread across more than fifteen rounds of artifacts.

This ADR legislates the name, the definition form, the triage channel, the ratchet, the
sentence-shape probe family, and the disclosure footer. It mints **no blocking leg**.

## Decision

### D-A — The semantics and the name

**Grandiosity (虚饰输出)** is the fifth semantics:

> decorative fiction bearing load — depth simulated through term density and obscure
> sentence shape
> (装饰性虚构承重，以术语密度与晦涩句式伪装深度).

Two demotions are part of the naming, and they are the reason the naming is not cosmetic:

- **"unregistered" is demoted to one criterion among several**, and is not the name of the
  behavior;
- **`Unregistered Coinage` (收词分诊通道) is demoted to the name of the triage channel**,
  not of the defect.

The glossary entry lands in `CONTEXT.md` and as the fifth item of the `Jiahao-style
Behavior` list.

### D-B — The definition form: a debt form, not a verdict form

Coinage is legal. A violation is the **conjunction** of:

1. **unregistered** — the term is not in the glossary;
2. **three axes** — frequency, distribution breadth, and load-bearing semantics;
3. **lifecycle not closed** — no adjudication record exists either way.

Consequences of this form, stated because a reader will otherwise infer the opposite:

- **Unregistered is a neutral state.** Precedent: Vale's accept/reject two-column
  vocabulary — registration is an exemption, explicit rejection is red, and unregistered
  is neither.
- **The violation point is "a high-frequency load-bearing term that never enters
  adjudication"**, never "unregistered".
- **Pure decorative piling belongs to the disclosure surface, not the violation surface**
  (see D-F).
- The machine-checkable form of the third axis — **load-bearing semantics** — is
  deliberately **left to the implementation wave**, together with the owner's discretion
  over it. This ADR registers the gap rather than inventing a proxy.

### D-C — The Unregistered-Coinage Triage Channel (收词分诊通道)

The mechanical surface is a **triager**, and its status is the clause:

- **advisory, not blocking** — it inherits the ADR-0014 D1 vocabulary-triage status;
- **generator-side tool surface only; it never enters a verifier leg** — following
  ADR-0097 D-F's force-field rule, a blocking audit surface may not be weakened by the
  audited party, and equally an advisory stylistic probe may not be promoted into one;
- **bilingual scanning** (Chinese and English) — English-only scanning was demonstrated to
  let the treadmill-class tokens escape;
- **five scan surfaces** — ledgers (`.scratch/grill-*/decision-ledger.md`), reports
  (`.scratch/grill-*/reports/`), ADRs (`docs/adr/`), `AGENTS.md`, `CONTEXT.md`;
- **output** — a list of high-frequency unregistered load-bearing terms;
- **adjudication belongs to the owner, in a binary choice**: register the term in
  `CONTEXT.md`, or replace it with a plain expression, or register a deferred row. The
  channel reports; it never decides.

The statutory name of this surface is 收词分诊通道. The term 豁免阀 (exemption valve) is
**forbidden** for it, continuing the D-002.3 wording law legislated in ADR-0100.

### D-D — The ratchet form

The population is governed as a ratchet, structurally isomorphic to a better-style
budget:

- **new** unregistered load-bearing terms: **zero tolerance**;
- **existing** population (the census's high-frequency set, spread across more than
  fifteen rounds): **monotone decreasing only**, consumed in batches through
  `docs/deferred-registry.json` rows carrying a trigger and a deadline (the t38-D-006.6
  form — a warning without a deadline is suppressed debt);
- **when a batch goal is met, the row is not deleted: the budget locks at zero.** This is
  the pre-registered failure mode of betterer issue #1181 — goal met ⇒ baseline cleared ⇒
  regression no longer reported red. Deleting the row would re-open exactly the hole the
  ratchet exists to close, so the row persists at budget 0 as the standing obligation.

### D-E — The sentence-shape probe family (the second probe family)

Obscure *sentence structure* is the same semantics' second face and is adjudicated
separately from the word face. The form is **mixed**, and the mix has a hard boundary:

- the machine produces **count-type signals only** — sentence-length distribution,
  construction density (the `X面 / X域 / X形` pattern families), symbol-squeeze frequency
  (`:=`, `→`), and long-sentence ratio — and **never a score**. There is no trustworthy
  readability formula for Chinese, so a mechanical score would be a fabricated quantity;
- the convention clause is judgment-bearing: **a sentence that carries an adjudication
  must be readable in one pass**. The counting informs that judgment; it does not replace
  it, and the verdict stays with the owner;
- the two probe families (word face, sentence face) are both part of the triage channel
  and both advisory.

**Adjudication-domain layering** (the GitLab error/warning/suggestion layering shape):

| surface | strength | rationale |
|---|---|---|
| reports, handoffs | **strong** | written for a busy reader; one-pass readability is a hard requirement |
| ADR, `CONTEXT.md` | **weak** | load-bearing complexity is legitimate here, but per sentence (see D-F②) |
| ledgers | **reference** | disclosure only, never judged |

The **word face does not layer**: an unregistered load-bearing term is the same fact on
every surface.

### D-F — The prose-density disclosure footer and the three safeguards

Reports carry a fixed footer line `prose-density` (the Lexi pull-request footer-table
shape). It is **pure disclosure and never blocks**. The numbers must come from a
**deterministic counter** (regex / sentence-splitting rules); a model interprets them and
**never generates them**.

Three safeguards are legislative, negative-facing, and each exists against a named
failure mode:

1. **the footer discloses and sets no target value**, plus the clause *"existing text is
   not rewritten for the sake of a count"* (the dekobon wording). Without this the metric
   becomes a Goodhart target and produces uniformity slop.
2. **a load-bearing sentence's exemption is declared per sentence** — a long sentence must
   name which adjudication point it carries. **Document-type-wide exemption licences are
   forbidden**; a blanket licence is the same hole with a letterhead.
3. **counts must not enter generation instructions** (the documentstats lesson): injecting
   a live metric into the generator induces metric gaming at production time.

### D-G — The dual-enumeration-surface boundary argument

This round opens **two** new enumeration surfaces, and the pairing must not be read as one
family (the grill-t37 D-001 M-D constraint is what makes the argument necessary):

| surface | force-field | carrier | adjudication |
|---|---|---|---|
| **Drift-Declaration Registry** | claim-surface governance — a citation row that vanished because a mutable file was overwritten | ADR-0100 | mechanical, fail-closed |
| **Unregistered-Coinage Triage Channel** | style triage — a term's lifecycle never closed | this ADR | advisory, owner decides |

They share only the word "registry-shaped". They differ in object (a line-level historical
fact vs a living vocabulary obligation), in verdict (red signal vs advisory list), in
consumer (the rewrite-map classifier vs a generator-side tool), and in whether a blocking
leg exists at all (yes / **explicitly no**). The same argument is written on the ADR-0100
side; the two statements are one boundary drawn from both banks, not two claims.

## Registered transfers (floor, not ceiling)

| Item | Row | Exit | Content |
|---|---|---|---|
| the existing population's batch registration cost | `defer-0099` | **deferred, pre-registered degrade condition** | if the measured cost exceeds budget, the batch cadence widens; the ratchet direction and the budget-0 lock do not relax ("cut the cost, never the obligation") |
| machine-checkable form of the load-bearing axis (D-B) | — | **implementation wave** | owner discretion retained; no proxy minted here |
| Chinese sentence-splitting rule determinism (D-E) | — | **implementation wave** | the counter must be deterministically reproducible before its output may be disclosed |

## Boundaries

- **Vetoes, recorded:** the whole-style verdict form (c-form: no industrial precedent and
  not mechanically judgeable, colliding with ADR-0083 D-C); the three-requirements-at-once
  form (b-form: "a plain alternative exists" is a human call); a pure word-list blocking
  detector; the 豁免阀 wording; a mechanical readability score; any target value for the
  footer; document-class exemption licences; promoting the sentence face into a gate or
  leg; and a verifier-side landing for either probe family.
- **Zero verifier-side additions.** The triager and the counters are generator-side
  advisory surfaces.
- **ASD-STE100's forty-year lesson is the reason the judgment stays human:** the standard
  works as rules plus discretionary judgment, never as a bare count.
- **Honest gaps, registered not closed:** the load-bearing axis has no machine form yet
  (D-B); the batch cost is unmeasured (D-D); the Chinese sentence-splitting rule is
  unmeasured (D-E); and the census's ~190-occurrence figure is a finite full-scan
  enumeration over 412 files, which is evidence about that surface, not about arbitrary
  future prose.

## Human-only adjudication points

Term adjudication (register / plain-ify / defer) is an OWNER act; the machine reports the
frequency, breadth, and lifecycle state and never a verdict. Whether a long sentence is
load-bearing (D-F②) is a human call. This ADR's machinery reports state; it never issues
those verdicts.
