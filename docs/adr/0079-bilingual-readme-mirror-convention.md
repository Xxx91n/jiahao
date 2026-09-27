# ADR-0079: The Bilingual README Mirror Convention - EN-Primary Dual Files, Autonym Switch Line, Translation Baseline, English-Original Arbitration, Tarball Exemption, and Same-Commit Sync Discipline (grill-t20 documentation round)

- Status: Accepted
- Date: 2026-09-20
- Ledger: `.scratch/grill-t20/decision-ledger.md` - grill-t20 D-001..D-005 (all current); inherited charter `.scratch/grill-t19/decision-ledger.md` D-007..D-010
- Spec: `.scratch/grill-t20/spec-t20-disposition.md`

## Context

The grill-t19 charter (ledger D-007) settled the bilingual shape of the GitHub front-face: README.md stays the English-primary face and README-zh-CN.md is added as the full Chinese mirror, living in the git tree only. That charter left the mirror's maintenance question open: a translated front-face that drifts silently is worse than none - it reads as current while lying. The adjudicated options were: a same-commit sync discipline with a mechanically enforced drift pin, a convention without a drift pin, or best-effort with no discipline. This decision registers the strict form: the mirror carries a recorded translation baseline, every README-touching commit pays the sync tax, and a wiring pin makes an unsynced README edit red. The ADR exists because the convention needs a policy home - the streak feed is a disclosed fact, not the motive.

## Decision

### D1 - Dual filename: EN-primary + zh-CN mirror

README.md remains the English-primary face. README-zh-CN.md is the full Chinese mirror, structurally aligned with the primary: the same top-level `## ` heading skeleton in the same order, section content translated. The mirror lives in the git tree and is pin-free - it never pretends to be the pinned text.

**Filename note (implementation amendment, grill-t20):** the charter's dotted form `README.zh-CN.md` is unimplementable under npm semantics - npm's always-include `readme.*` glob force-packs any `README.*` basename regardless of the `files` list or `.npmignore` (verified live by `npm pack --dry-run` on 2026-09-20), which would have made the D5 tarball exemption and the pack-cap gate both fail. The hyphenated basename `README-zh-CN.md` escapes the glob (verified same run) while preserving the BCP-47 tag, the root placement, and every other element of the chartered form.

### D2 - Autonym language-switch line

Both files open with a language-switch line in autonym form: `English | 中文`, where the current language is bold and unlinked and the other language links to the sibling file (English -> README.md, 中文 -> README-zh-CN.md). GitHub never auto-selects a language, so the switch line is the whole navigation channel.

### D3 - Translation-baseline commit-hash HTML comment

The zh-CN file header carries an HTML comment recording its translation-baseline commit hash: `<!-- translation-baseline: <40-hex sha> -->`. The baseline names the commit whose README.md content the mirror was synced against - the mirror's declared answer to "which README are you a translation of".

### D4 - 'English original prevails' arbitration

Where a translated block and the English original disagree, the English original prevails. Translated renderings of pinned blocks carry an 'English original prevails' pointer back to the pinned text; the mirror is documentation, never the authority.

### D5 - zh-CN tarball-cap exemption (ADR-0039 D3)

README-zh-CN.md never enters the npm tarball - it is absent from `package.json`'s `files` list and from `npm pack` output, so it adds zero bytes to the measured pack surface. The cap headroom is protected under the pre-registered policy of ADR-0039 D3 (policy-before-value); no cap amendment is needed or made.

### D6 - Same-commit sync discipline + drift pin (grill-t20 ledger D-004)

Any commit touching README.md MUST update README-zh-CN.md in the same commit. The baseline comment then advances to name that commit's sha - physically a two-step rhythm, since a commit cannot name its own sha inside itself: the sync commit carries the mirror update, and a disclosed re-pin commit immediately after lands the new baseline (the `published_tip` stale-pin re-pin precedent). At rest, `git log -1 README.md` equals the recorded baseline. The baseline sha advances only on real sync - trivial README edits still pay the sync tax; that tax is what keeps the mirror alive. If the tax proves too heavy later, revision goes through ADR supersede, never through a broken pin.

`test/adr-0079-wiring.test.js` (R3 documentation surface - no carve-out) pins: the mirror exists; the language-switch line pair is present on both files; the baseline comment carries a 40-hex sha that exists in git history; the two files share the same top-level `## ` heading skeleton; the mirror is absent from the package files; and the drift pin - `git log -1 README.md` sha equals the recorded baseline sha (README moved without the mirror = red).

## Consequences

- The mirror can never silently rot: an unsynced README edit leaves `git log -1 README.md` ahead of the recorded baseline and the drift pin fails the suite.
- Every README-touching commit carries a bounded, mechanical obligation - update the mirror, re-pin the baseline - instead of an unbounded re-translation review.
- Arbitration is one-directional: disputes resolve to English, so the mirror never forks the project's declared surface.
- The zh-CN file costs the tarball zero bytes; the pack budget conversation is untouched.

## Registered deferrals (grill-t20, ledger D-001/D-005)

The t19 audit's two judgment/edge findings are dispositioned as named registry rows - defer-register IS the disposition, not silent deferral; each row carries its reopen trigger:

- `defer-0064` - build-round-facts collect() red-suite -> exit-2 conflation (audit B-4): `type=free-text`, `status=pending-evaluation`, `cadence_tier=quarterly`, `review_at=2026-12-15`; trigger - when the exit contract next opens, add the precision clause.
- `defer-0065` - build-round-facts `--report` bare-arg exit asymmetry (audit B-5): `type=free-text`, `status=pending-evaluation`, `cadence_tier=quarterly`, `review_at=2026-12-15`; trigger - when an arg-validation convention next forms.

- Errata pointer (2026-09-26, ERRATA E-13, grill-t28 D-002): second_reviewer countersign obligation presumed subsisting - the bare form since t15 is unregistered drift, pending entity-level adjudication; the nine bare-form ADRs (0076..0081, 0083..0085) merge into the countersign queue (10 -> 19) for the 2026-12-15 entity-level tide - defer-0074. Reversal path: a lightweight registration ADR if consensus evidence for the bare form surfaces.
