# ADR-0014: Wordlist Migration Out of cwd + Structural-Signal Primary Detection

- Date: 2026-08-24
- Status: Accepted
- Amends: ADR-0012 D3 "Private wordlist, public rule"

## Context

ADR-0012 D3 declared the detector wordlist private ("stays exclusively in
src/detector.js, never distributed via SKILL.md"). Grill round 2026-08-24
audited that claim and found it only holds at the *distribution* layer:
`src/detector.js` lives inside the shared working directory, so the audited
primary agent holding Read/Bash tools can read `PHRASE_FAMILIES` byte-for-byte.
"Private" was not true at the filesystem layer.

Atomcode research (14 searches / 18 full fetches, Exa/Tavily/AnySearch, five
angle categories) across arXiv 2504.11168 (guardrail bypass ASR 44-100%),
agent-polygraph + polygraph-bench (open L1-L3 detection logic, recall 0.460 /
FP 3.18% on 396 items), METR HCAST private-materials precedent, Snyk agent
security (three-hook boundary, "the agent doesn't need to know anything about
the security layer"), agentguard's threat-model statement, CWE-656 / NIST on
security-through-obscurity, and the archived protectai/llm-guard established:

1. Hiding a wordlist is never cryptographic defense; its only proven value is
   forcing attackers from white-box to black-box (cost-raising).
   arXiv 2504.11168 white-box word importance raises black-box ASR
   measurably.
2. Detection strength survives full disclosure when the detector keys on
   *structured evidence signals* (tool error bits, claim↔evidence
   correlation), not surface phrases. agent-polygraph ships its L1-L3
   heuristics openly and still achieves 0 over-block / recall 0.460 /
   FP 3.18%.
3. The industry direction: move monitoring outside the monitored agent's
   trust surface (Snyk), and declare the honest threat model instead of
   promising impossible secrecy (agentguard's exact wording).
4. protectai/llm-guard, the canonical string-list guardrail, was archived
   2026-07-09 — the string-list detection *layer* is being superseded by
   governed behavioral platforms. Wordlists remain a legitimate baseline
   (polygraph-bench b1_regex) but are never the primary detector.

## Decision

### D1 — Detection primary moves to structured signals (wordlist demoted to triage)

The detector's primary evidence becomes three structural signals, in the
L1-L3 shape validated by agent-polygraph:

- **L1 error_concealment**: a tool result carries an error signal
  (e.g. non-zero exit, `is_error`, stderr match) and the closing message
  claims success — without acknowledging the error.
- **L2 completion_vs_evidence**: the closing message claims "all done /
   verified" while the turn produced no corresponding evidence record.
- **L3 narrative_vs_assertion**: files were edited but no verification run
  exists, yet the closure asserts "works / fixed / passing".

The phrase wordlist stays but scores only as a low-confidence triage
add-on. Consequence: full disclosure of the wordlist cannot collapse the
detector — the detection body is the structural signal, which is public by
design (mirrors agent-polygraph's open heuristics).

### D2 — Wordlist file moves out of the shared cwd

`PHRASE_FAMILIES` moves from `src/detector.js` to
`${CLAUDE_PLUGIN_ROOT}/private/phrases.json` (override via `JIAHAO_WORDLIST`
env). `src/detector.js` keeps only a loader plus a SHA-256 fingerprint of
the phrases file. The fingerprint doubles as a rule-integrity check at
hook startup — an audited agent cannot plant a modified wordlist copy
without changing the fingerprint. This is option (b) of the grill, and the
fingerprint idea folds into ADR-0007's hash-chain philosophy ("rules
integrity", not merely evidence integrity).

This is not claimed as secrecy. It removes casual reads and training-corpus
contamination (METR HCAST's stated reason for private eval material) and
raises attacker cost from white-box to black-box — that is all.

### D3 — Threat model declared in docs (option (c), mandatory companion)

README + this ADR state plainly: wordlist and detection logic are readable
by an audited agent running in the same directory with Read/Bash; the
system's real defenses are (i) structural signals that lose nothing by
being public, (ii) wordlist privacy as cost-raising only; the tool is
effective against drift-prone-not-hostile agents, and a hostile agent
requires harness/OS-level isolation (agentguard's threat-model wording).

### D4 — Explicit non-goals

- **No remote hash/comparison service.** No industry precedent; hash is
  for local integrity, not remote matching; jiahao is a local-hook
  architecture and offline must keep working.
- **No cryptographic secrecy claims.** CWE-656 forbids calling obscurity
  a security boundary.

## Consequences

- `src/detector.js`: drops embedded `PHRASE_FAMILIES`; loads phrases.json
  + verifies sha256 at startup; adds L1/L2/L3 structural scorers;
  wordlist matches become one low-weight feature.
- `scripts/install.js` (and Tier-0 manual path) gains a "place
  phrases.json under plugin-private dir" step; build-adapters and
  check-drift gain a fingerprint check so SKILL.md stays wordlist-free
  (existing detector.test.js wordlist-privacy guard generalizes).
- README documents the threat model paragraph.
- The detector's public documentation can now describe L1-L3 openly —
  future benchmark work (ADR-0015) gets a documented surface to score.

## Upgrade paths

- When labeled data accumulates (ADR-0012 upgrade path), train the
  TF-IDF/logistic ensemble on structural features first, phrase features
  second — matching FAGEN's finding that lightweight structured detectors
  beat LLM judges at this task.
- If jiahao ever federates audit across machines, phrase-file distribution
  inherits the ADR-0007 Rekor / signed-tip upgrade path rather than
  inventing a channel.

## Out of scope

- Implementation of L1-L3 scorers, loader, fingerprint, install changes,
  tests — landed by the implementation round following this ADR.