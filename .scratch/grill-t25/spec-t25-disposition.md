# spec-t25-disposition — grill-t25 execution spec (fix-round artifact)

Round: **grill-t25** — V6 critique response. Sole decision source: `.scratch/grill-t25/decision-ledger.md` (D-003..D-005 current; D-001/D-002 revised-and-preserved). Four atomcode research runs informed the records; refinements are folded into the cited D-IDs — nothing outside the ledger.

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## 1. Round topology (D-002 preserved; D-003)

- Three rounds: **R1 public-clone coordinate** -> **R2 sweep** -> **R3 human-authority**. Round boundary axes (D-002 negatives): whether the protected invariant changes / whether items share a verification surface / whether human authority is required — never merge by same-report origin.
- R1 defines the verification universe for everything after it; R2 must follow R1 closely — an unclosed prior-round verification-point account must not be left to worsen (D-002.4).
- D-001 (a+b) is preserved as scope intent: coordinate work AND the six-prescription sweep are both in range; the merged-single-round reading is superseded.
- Rejected: merging human-authority items into the mechanical round (HITL violation); agent-executed renew-or-expire or entity-level countersign (D-002 negatives).

## 2. Round 1 spec — public-clone coordinate (D-003, D-004)

Two-phase, commit-isolated (SRE stop-bleed-then-root-cause, weakened: tip-red is not an active incident so no cross-round split).

### 2.1 Landing order (D-003.5, D-004 negatives)

(a) evidence-only re-capture wave at/after the landed tip — t24 battery turns green; (b) verifier degrade + mechanism commits; (c) ADR-0084 + the ADR-0083 pointer line; (d) push adjudicated tag + SHA co-registered; (e) clean-clone acceptance run.
- Mechanism commits land BEFORE capture commits — an anchoring commit makes capture headers lag the anchor = red; intermediate red states are disclosed, never hidden (D-004 negatives).

### 2.2 ADR-0084 clauses (D-003.2, D-004.4/5, D-005.1c)

- **Clone-degradability contract**: capability probe — when old-side refs are unavailable the rewrite-map check exits 2 UNVERIFIABLE, plus `--published-only` mode asserting internal consistency (citation coverage, class enum, count self-consistency).
- **Fourth mandatory audit line**: public-clone jest + gate:all green at the tip — audits verify from a clone, not the maintainer object store.
- **Landing-tail convention**: the branch tip commit MUST be a re-capture wave; merge commits are naturally non-anchoring (git diff-tree on a merge is empty), so the merged tip stays green.
- **Exception narrowness**: direct-push applies ONLY to stop-bleed-class commits (re-capture waves + the degrade code required for clone-red repair), disclosed per round, never generalized (NIST: exception channels must not drift into the norm).
- **Tag timing**: tag push lands within the same round; it depends on the human being online — declared, not hidden.
- **First-disclosure-channel rule** (D-005.1c): classify corrections by the channel that disclosed them first; later independent re-verification does NOT reclassify; a mechanical-fault claim bears the burden of proving the commit contains no negation of a prior claim.
- ADR-0083 gets **only a pointer line** in place (audit line added by ADR-0084) — normative extension is not errata (RFC errata precedent; repo ADR append-only convention: typo/deadlink/status-field/link-to-new-record whitelist).

### 2.3 Pins & acceptance (D-003.3/4)

- Re-roll the round-scoped wiring copy with t25 BASE/EVD parameters; generalized continuous monitoring is explicitly registered as a deferred entry — fitness-function convention: pin the minimal automatable invariant now.
- Acceptance evidence is third-party reproducible: clean `git clone` -> real jest + gate:all -> captured trio (command/output/environment) archived (SLSA provenance model).

## 3. Channels & authorization (D-004)

- **Stop-bleed class -> direct push to main**, executed by the user; commit message carries the round id (break-glass audit-log equivalent). Hotfix criteria: urgent / small surface / post-review via clean-clone acceptance.
- **Normative class -> PR**, user merges: ADR-0084 + pointer line + bookkeeping. Normative promises are the diffs most in need of review surface; evidence-only via PR provably stays green, so speed is no argument.
- **Tag: always human push** after landing; the human writes the annotation = minimal review act; tag is an independent authority tier, neither reused nor delegated.
- Merge and tag-push are the user’s explicit actions; agent drafts/pushes branches only (gh-aw shape).
- Forbidden: rubber-stamping — normative content landing without PR = batch mechanical release.

## 4. Round 2 spec — merged sweep (D-005.1)

Order a -> c -> d -> b:
- **(a) CI-red history registered**: deferred-registry entry + discharged note + registration date, carrying **owner + review date** (anti-registry-rot); no published snapshot is edited (SEC 4310.17: back-registering is the standard act).
- **(c) Re-Execution Prior triage**: `bbf5259` judged a **directional event, separately registered** — first internal-disclosure-channel case; prior n=19 untouched; boundary rule lands in ADR-0084 (sec 2.2).
- **(d) Countersign queue**: all 10 entries gain "ID-level-only, awaiting entity-level" labels **with a return condition/date** — labels without it degrade into permanent exemption and may never be cited as resolved.
- **(b) Secret-scan fourth surface** = commit messages, last; honestly note the GitHub official enumeration does not include the commit-message body (the increment rationale).
- **Deferred registration**: generalized invariant monitoring -> new defer entry.
- Sweep registrations invent no new devices — bookkeeping, not new ratchet teeth (D-002 negatives).

## 5. Round 3 spec — human-authority package (D-002.3/5, D-005.2)

- Agent drafts the minimal approval package; the user decides. Agent never executes renew-or-expire or entity-level signing.
- **renew-or-expire template**, three options: renew with expiry / expire / registered exemption **with expiry date** (accept-with-expiry convention; exceptions without expiry calcify).
- **Countersign queue**: entity-level signing OR formal downgrade — forced binary.
- **Ratchet-brake criteria adopted as meta-rules in the charter layer** (CONTEXT.md/AGENTS.md meta-rule area) + review-agenda reference — NEVER the metrics layer (dashboard edits dilute silently): (i) every new device registers which old device/check it eliminates; (ii) new rules declare applicability domain; (iii) disable-test — would the prior incident slip if this device stopped; (iv) fix-produces-holes ratio registered as a metric, consecutive non-declines trigger a device-liquidation agenda.

## 6. Mechanics & closeout (D-005.3, D-004.4/5)

- kind: fix for rounds 1/2 — every R2 machinery hand-edit MUST be listed in `governance_tooling_diff` (ADR-0078 obligation); round 3 produces no code diff.
- Per-round disclosures: direct-push exception uses; tag-timing window; intermediate red states; Tavily engine absence where relevant.
- Facts-canon report per precedent; the round ledger names every consumed D-id.

## 7. Negative union

No agent-executed merge/tag-push/renew-or-expire/entity-signing; no ADR-0083 normative edit beyond the pointer line; no generalized monitoring device this round; no in-place edits to the prior n=19 snapshot or any published snapshot; no downgrade labels without return conditions; no meta-rules in the metrics layer; no mechanism+capture in one commit; no new devices invented by sweep bookkeeping; no silently unregistered classification of `bbf5259`.
