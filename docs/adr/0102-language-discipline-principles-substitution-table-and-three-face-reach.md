# ADR-0102: Language discipline — principles, substitution table, and three-face reach (grill-mental-model)

- Status: Accepted
- Date: 2026-10-18
- Ledger: `.scratch/archive/2026-10-18-grill-mental-model/decision-ledger.md` — D-006, D-007 (both current); D-002 supplies the maturity baseline
- Relates: ADR-0014 D1 (the advisory triage status the substitution table inherits), ADR-0098 D-C (the coinage-triage channel this table extends — its disclosure-only status is reaffirmed, not amended)
- Numbering note: see ADR-0101; 0099/0100 are retired numbers and are not reused.

## Context

Obscure coinage is pain point 2's target. The measured distribution: git commit
messages are the worst surface (grill-t39's own commits read "pairing ratchet
still 14 over 476 scanned"), ADR-0098's title runs 19 words, and 17 of
CONTEXT.md's 52 entries are evaluation-flavored coinage (ledger D-007). Four
independent industrial systems converged on the same remedy shape: ASD-STE100
controlled English (aviation, a ~900-word one-word-one-meaning dictionary), plain
language law (the US Plain Writing Act; Sweden's spraaklagen section 11,
principle-form statutes), GOV.UK substitution lists, and the LLM writing-skill
ecosystems. This ADR copies that shape.

## Decision

### D-A — Generator face: three principles, no word list

The generator face gets at most three principle rules, in Sweden's principle-form
(few and abstract statutes, detail pushed to the guidance layer):

1. **One word, one meaning** — a concept carries exactly one name. This is the
   cure for change-reach-style compound welding.
2. **Complete short sentences** — no long welded noun chains.
3. **Register before use** — a new term must have a CONTEXT.md entry before it
   may appear in the mandatory faces.

The rule text itself must be plain: writing anti-obscurity rules in obscure
language is self-refuting. The budget is a hard cap of three rules — NUREG-0700's
hundreds of specific rules are the negative sample.

### D-B — Detector face: substitution table, never a score

coinage-triage.js extends from pure counting to a GOV.UK-style substitution
table: banned word, then plain substitute plus reason, written into the error
text itself. Two tiers: avoid (error) and avoid-unless (warning, the condition
written into the message). Disclosure only, never a score — no aggregate score
means nothing to game. ISO 24495-1's expert panel rejected readability formulas
outright, and the IRS case ("self-employment tax" re-abbreviated to "S.E. tax" to
farm the Flesch score) is why. The arms-race fear is thereby falsified as a
reason to freeze the detector: races come from scores, not from lists.

### D-C — One source, one change ticket

Generator principles and the detector substitution table live in one shared
specification file. Revisions go through one change ticket — the ADR mechanism,
the same shape as the STE change form. Every closed entry keeps its date and
reason (the GOV.UK form). One source prevents the two faces from drifting apart.

### D-D — The three-face reach

1. **Mandatory face (table plus principles): git commit messages, ADR bodies,
   CONTEXT.md entries.** These are the measured worst surfaces. New document
   types default into this face; an exception needs an ADR change ticket, so no
   new surface becomes an escape channel.
2. **Principle face (principles only, no lint): src/SKILL.md.** The product face
   is the discipline text itself; it measured clean (the gsr rules are plain),
   and a substitution table here would interrupt host output and break product
   usability — the ponytail comparison makes the same choice.
3. **Principle plus light-disclosure face: final replies to humans.** The three
   principles apply. A light disclosure footer is a future option, not this
   round: a disclosure tool must not itself become noise in human replies.

No retroactive rewrite. History — commits, ADRs, entries — stays as written;
rewriting history violates the append-only evidence discipline. The table governs
new output from the moment of legislation.

### D-E — What waits for P1

Word-list content and thresholds freeze only after the MAST mapping (ledger D-003,
P1) verifies that the five semantics are separable. Freezing them earlier repeats
D-001's banned move: premature unification is wrong abstraction. Research gaps on
record: no Chinese-language plain-language standard was covered this round; ISO
24495-1 was read through three secondary sources (the primary is paywalled); the
avoid-unless to advisory/blocking mapping is this repository's own call.

## Consequences

- Landing (coinage-triage extension, the shared spec file, SKILL.md principle
  wiring) is a later round — handoff T5. This ADR legislates; it does not edit
  the scripts.
- The recurring-review-comment signal is the face-migration test: the same
  comment appearing across many PRs means the rule moves between the detector
  face and the generator face.
- This ADR's own title and body obey D-A: the reflexivity constraint applies to
  the legislating text itself.
