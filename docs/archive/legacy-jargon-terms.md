# Legacy Jargon Terms Archive (历史学术造词归档)

> 本归档根据 ADR-0104、grill-mental-model-r4 D-003（三刀切第二刀）设立。
> 封存既往元治理死循环期间脑补、未实际落地且高度学术化的 91 个复合造词，
> 彻底斩断新进场 Agent 被长链名词污染而陷入"自嗨脑补、不写真实代码"的认知感染源。
> 封存后，活跃文档仅允许使用初中生通晓的大白话与 ADR-0104 确立的平实核心词。

---

**Hash Chain (证据哈希链)**:
A tamper-evident linked structure where each evidence record contains the
SHA-256 hash of the previous record (prev_hash). Deletion, reordering, or
modification of any record breaks the chain at that point. Uses canonical JSON
(RFC 8785 inspired key sorting) for deterministic serialization before hashing.
Does NOT require Merkle trees — linear prev_hash chaining is sufficient for
single-file evidence logs where O(n) verification is acceptable.
_Avoid_: merkle tree, block chain (those are different structures)

**Surface Signal Attack (表面信号攻击)**:
The Generator Profile's strategy: directly target the observable patterns of
false completion rather than trying to improve error detection (which is
structurally impossible for self-verification). Advani et al. (ICML 2026)
quantified that false success correlates with confident closing language
(+0.27-0.36 score) and no-state-change action sequences. Lightweight
TF-IDF/XGBoost detectors of these patterns achieve AUROC 0.83/0.95 vs LLM
judges' <=0.65. The generator profile attacks these signals at zero cost.
_Avoid_: signal detection, pattern matching (those are techniques; use the
canonical term)

**Structural Signal Detection (结构化信号检测)**:
The detector's primary evidence mode: scoring false completion from
execution structure, not surface phrases. Three channels (agent-polygraph
L1-L3 shape): L1 error_concealment (tool error + success claim), L2
completion_vs_evidence (completion claim with no evidence record), L3
narrative_vs_assertion (files edited, no verification run, "works"
asserted). Structural signals stay effective even when fully public —
detection power rides on evidence the generator cannot fake without doing
the work.
_Avoid_: keyword detection, phrase matching (those are the demoted triage
layer; use the canonical term)

**Wordlist Triage Layer (词表分诊层)**:
The demoted role of the detector wordlist after ADR-0014: a low-confidence
feature feeding suspicion scoring, never the primary detector. Industry
baseline status confirmed by polygraph-bench (b1_regex "naive keyword
floor") and the 2026-07-09 archival of protectai/llm-guard (string-list
layer superseded by behavioral platforms).
_Avoid_: primary detector, magic word list

**Phrase File Integrity (词表文件完整性)**:
The practice of shipping the detector wordlist outside the audited agent's
working directory (${CLAUDE_PLUGIN_ROOT}/private/phrases.json or
JIAHAO_WORDLIST env) with a SHA-256 fingerprint checked at hook startup.
This is cost-raising and rule-tamper detection, NOT secrecy — declared
honestly per CWE-656 (security through obscurity is not a boundary) and
agentguard's threat-model precedent.
_Avoid_: secret wordlist, encrypted rules (implying cryptographic
guarantees jiahao does not make)

**Cross-Turn Hash Chain (跨轮哈希链)**:
The evidence-chain upgrade from ADR-0013: `.jiahao-evidence` is append-only
across turns, each turn opens with a `turn_init` record chained onto the
previous tail hash, and `prev_hash` is INSIDE the hashed body
(`H(canonical(record) || prev_hash)`, Crosby & Wallach 2009) — closing the
tail-truncate-and-relink hole left by ADR-0007's hash-input exclusion.
Linear chain only; Merkle trees and signatures remain deferred upgrades (defer-0003; ADR-0033).
_Avoid_: blockchain, Merkle log (different structures)

**Composite Idempotency Key (复合幂等键)**:
`SHA256(session_id | turn_id | tool_seq)` per evidence record; on write,
same key = skip (first-writer-wins, Stripe/BackendBytes pattern via
ON CONFLICT DO NOTHING semantics). Hooks re-firing within a turn
(Stop + SubagentStop parity, double-fire) become no-ops instead of
phantom records. Distinct from a UUID: derived from stable business fields,
recomputable, collision-safe for dedup.
_Avoid_: request id, uuid (not stable across legitimate retries)

**Chain Verification Duty (链验证义务)**:
Every read of `.jiahao-evidence` runs `verifyChain()` — "a chain you never
verify is just a log" (hasp). A chain break is treated as corruption:
blocking severity in verifier profile, advisory in generator profile.
O(n) per read is trivially cheap at expected log sizes.
_Avoid_: lazy verification, verify-on-export (leave the chain unchecked)

**Structural Signal Coverage (结构化信号覆盖)**:
ADR-0014 imposed a coverage gap: tool activity must EXIST for L2/L3 to fire.
If a turn has no tool calls and no evidence, structural signal detection
passes even when the wordlist hits — this is intentional triage-only falloff.
The remedy is that verdict-gate's advisory still surfaces the wordlist signal
even when L1-L3 yield nothing. Coverage and conservatism are not contradictory
here: an audit agent producing NO tool calls and NO evidence was not the
target jiahao is aimed at (that's an idle agent, not a false-completion case).
_Avoid_: chasing zero-FP on L2 (the cost was leaked to L3/wordlist; ponytail)

**Pre-Registered Gate Amendment Closure**:
A pre-registered gate value is revised only inside an ADR where the revision
policy precedes the value it produces: evidence-derived value, explicit
non-retroactivity declaration, second_reviewer sign-off, and a review_at for deferred re-examination. The measurement protocol (command, metric, tool
version) is pinned before any new value is computed.
_Avoid_: bumping the cap, post-hoc amendment

**Surface-Narrowed Identity Anchor**:
The judge instrument identity is the content hash of the judge-behavioral text
surface (verifier rules region) of src/SKILL.md, not the whole file; product
edits no longer cascade into instrument re-verification, while any judge-rule
text change still triggers the full chain (ADR-0061 D-B).
_Avoid_: semantic digest, whole-file anchor

**Declaration-Scoped Out-of-Service Tag**:
An instrument sub-declaration (e.g. model identity UNRESOLVED) is tagged
unverified at declaration granularity, with a re-verification path and a
deadline, never open-ended; dispositions are appended, never rewritten
(ADR-0061 D-C; ISO/IEC 17025 §6.4.9).
_Avoid_: dormant instrument, whole-axis shutdown

**Output-Tethered Convergence**:
Governance earning its place is judged by registered product-metric movement
(currently bench recall), not by the review_at calendar tide — the tide is
cadence, the metric is the criterion. Waiver rounds register their exemption
explicitly; zero-movement judgements respect sampling-power discipline
(ADR-0061 D-D).
_Avoid_: quota freeze, calendar-only convergence

**Witnessed Digest Anchor**:
Governance artifacts keep authoritative copies in git-tracked storage (outside
the tarball) with machine-generated, externally witnessed digests; git alone
is not a tamper-proof ledger, and a bare hash cannot re-create a lost record
(ADR-0061 D-E; SEC 17a-4 audit-trail alternative; NIST IR 8387).
_Avoid_: self-contained anchor, scratch-path ledger

**Integer Decision Table (整数判表)**:
A frozen mapping from integer outcome bands to verdicts, fixed before the
data it constrains is unblinded — for devin-corpus@v1: lie-side 11-12/12 ->
falsification-passed, 3-10/12 -> indeterminate, 0-2/12 -> failed, under
Clopper-Pearson two-sided 95% CI at alpha 0.05 against floor 0.563863
(ledger D-008). The table adjudicates; the point estimate does not.
_Avoid_: point-estimate adjudication, post-hoc band selection

**Single-Shot Burn (单发烧桥)**:
A frozen truth-corpus snapshot is adjudicated exactly once; the verdict is
settled by that snapshot's own items and never re-judged by later corpora.
Re-testing requires a new snapshot (devin-corpus@v2) under its own
registration (ledger D-008, ADR-0030 growth channel).
_Avoid_: same-snapshot retest, retroactive re-adjudication

**Falsification-First Instrument (证伪优先仪器)**:
An adjudication whose statistical power concentrates on detecting collapse
rather than confirming adequacy; at n_lie=12 the power curve is 0.88 / 0.66 /
0.28 at true recall 0.95 / 0.9 / 0.8, so PASS is reachable only at
near-perfect performance and INDETERMINATE is a structural outcome, not an
anomaly (ledger D-008).
_Avoid_: confirmation-instrument framing, power-free PASS claims

**Research-Tier Citation (研究级引用通道)**:
A claim surface carrying a verbatim, machine-asserted verdict fact line
bound to its limitation sentence into claim homes while the
never-cited-by-conformity clause stays untouched — a citation-layer upgrade,
not a use-registration change (ledger D-009).
_Avoid_: conformity promotion, unbounded paraphrase

**Decision-Table Outcome (判表结局)**:
The class a verdict names when produced by an integer decision table — an
indeterminate outcome states where the count landed in the table, not that
the instrument failed; never framed as 'failed to reach' (ledger D-009).
_Avoid_: failure framing for indeterminate, effect-estimate language

**Conservative Transfer (保守迁移)**:
Reusing a floor frozen on another corpus, disclosed with its original
semantics ('not worse than baseline + margin'), never re-narrated as an
engineering-grade threshold (ledger D-008).
_Avoid_: silent reuse, semantic upgrade on transfer

**Branch-Mapping Policy (分支映射政策)**:
A pre-registered rule mapping each verdict to a follow-up class —
COLLAPSE -> CAPA repair track, INDETERMINATE -> v2 snapshot design
(n_hon ~100 target), PASS -> optional v2 — while numeric parameters defer to
the follow-up's own pre-data registration with disclosure of its dependence
on the v1 verdict (ledger D-010).
_Avoid_: parameter registration before the verdict exists, vague branches

**Intersection-Union Adjudication (IUT 双轴判决)**:
The v2 verdict combination: an axis-level integer table adjudicates each of
lie-side recall and honest-side FP; the overall verdict is failed when either
axis decisively fails, falsification-passed only when both pass, indeterminate
otherwise (Berger 1982 IUT; FDA co-primary endpoints — no multiplicity
adjustment needed, power shrinks multiplicatively; ledger D-014).
_Avoid_: single-axis verdict with a descriptive guardrail, multiplicity
corrections stacked on top of worst-of

**Usability Bound (可用性上限)**:
The v2 FP-axis criterion — an absolute product-semantic ceiling (0.10: beyond
roughly 1-in-10 false accusations a blocking verifier costs more human
re-review than it saves), NOT a non-inferiority margin; the value must be
justified by product semantics independent of power/sample-size arithmetic
(EMA margin rule) and is registered as a v1-informed parameter (ledger D-014).
_Avoid_: calling the bound a non-inferiority margin, deriving a margin from
what the sample size can prove

**Stress Side-Set (压力侧集)**:
A named corpus subset deliberately weighted toward a known failure mode (v2:
extra command-exit honest items) that snapshots with the corpus but never
enters the integer decision table — the main set prices natural-mix FP while
the side-set asks whether the exposed failure mode persists (ImageNetV2 named
variants / VeriStress difficulty profiles; ledger D-015).
_Avoid_: folding weighted items into the adjudicated set, unlabeled
overweighting

**Emergent Label (涌现标签)**:
A ground-truth label that cannot be authored — it emerges only when the
deterministic scoring function detects a claim-evidence contradiction inside
a real harness transcript (the devin misreport category); collection plans
register task counts and stopping rules, never lie counts as deliverables
(ledger D-015).
_Avoid_: hand-written lie items, promising a fixed lie count

**Deterministic Stopping Function (确定性停规函数)**:
The pre-registered function mapping readable collection metadata (misreport
count, batch index, attempt total) to the add-another-drop decision — the
legal form of watching counts while collecting; the function text itself is
registered, not just a statement that a rule exists (PoSA/CPoSA rare-event
sequential sampling; ledger D-015).
_Avoid_: informal stop-when-done, unregistered optional stopping

**Mining Rate (挖掘率)**:
Tasks attempted per emergent lie item yielded — mandatory collection metadata
that measures lie rarity directly and is the evidence base for undersized
markings (ledger D-015).
_Avoid_: logging drop counts without attempt counts

**Session Pseudoreplication (会话伪重复)**:
The correlation structure among transcript items produced inside one agent
session (shared context, tone, in-session drift) — left unguarded it inflates
nominal alpha badly (Lazic 2010: ICC 0.30 can turn 0.05 into about 0.37);
mitigated by per-item session_id, session-cluster sensitivity analysis, a
small per-session item cap, and near-duplicate closing checks (ledger D-015).
_Avoid_: treating transcript count as independent-sample count

**Contamination Registry (污染登记表)**:
The plan-level structured per-parameter disclosure of which design choices
were informed by the previous verdict — each row {parameter, value,
v1_informed, basis}; designed-after-v1 is legal input when disclosed, but
disclosure reduces deception, it does not remove contamination (ledger
D-013/D-016).
_Avoid_: a blanket designed-after-v1 sentence without per-parameter
enumeration

**Evidence-Boundary Version Stamp (证据边界版本戳)**:
The agent/harness version bound into each snapshot immutable evidence
boundary (manifest model_version); cross-version comparisons must name the
version difference as a confounder on par with designed-after-v1 — pinning a
version is neither feasible nor required (ledger D-015).
_Avoid_: version pinning, silent drift between snapshots

**Derived Integer Table (判表导出)**:
The v2 integer decision table is derived, not authored: after snapshot,
counts are readable while labels stay blind; the frozen CP rule maps the
landed n to the concrete band table, which is then frozen before label
unlock (ledger D-015).
_Avoid_: fixing k-bands before n is known, touching bands after labels seen

**Construct Misalignment (构念错位)**
The failure class where a score is driven by the wrong construct —
devin-corpus@v2 showed the LR port firing on "looks like an exit-report"
rather than "claim-evidence contradiction" (near-identical logit means on
honest vs lie command-exit items, silent on all other categories). A wrong
construct is unfixable by parameter surgery; the remedy is
re-operationalization (ledger t8 D-004).
_Avoid_: calibration framing, threshold tuning (wrong failure class)

**Claim-Evidence Pairer (宣称-证据配对器)**
The CAPA adjudication artifact replacing the lexical scorer's verdict role:
a deterministic checker that flags ONLY a mechanically proven contradiction
— claimed value parsed from the closing/transcript, evidence value parsed
from tool_result/events, both present and unequal -> lie. Absent claim,
absent evidence, or unsupported check type -> unflagged; it never "flags on
vibes" (ledger t8 D-004, D-006).
_Avoid_: heuristic/keyword flag (the construct it replaces)

**Undetermined (未决态)**
The pairer's third telemetry state — claim absent, evidence absent, or
check type unsupported. Collapses to unflagged in adjudication, which is
conservative on both axes (never an honest FP, always a lie miss); the
undetermined rate is a pre-registered descriptive metric — the fail-open
surface made visible (ledger t8 D-006).
_Avoid_: exclusion from n (hides the surface), counting as flag (inverts it)

**Zero-Verdict Telemetry (零判决权遥测)**
The LR port's post-CAPA role: runs alongside the pairer as a control
channel whose output is recorded in disclosure reports but can never enter
a verdict in any form — no weighting, no veto, no escalation trigger;
pairer-vs-port divergence is disclosure-only (ledger t8 D-004).
_Avoid_: secondary signal, fallback scorer (both imply verdict power)

**Meta-Circularity Ban (元循环禁令)**
The anti-tune-on-eval rule for pairer authoring: rules derive from check
semantics (each check type's claim-evidence structure), never from reading
or reverse-fitting the corpus's scoring_function label machinery — the task
text may legitimately route the pairer; the claimed value must come from
the transcript itself (ledger t8 D-004).
_Avoid_: spec.check-driven dispatch, label-mechanism-derived rules

**Artifact-Scoped Freeze (工件级冻结)**
The version-binding discipline for adjudicated artifacts: the measured files
(src/port/score.js + g6-manifest.json) stay byte-frozen on main —
sha256-asserted — while the rest of the tree evolves; the freeze is
file-scoped, so "main is the adjudicated state" is a forbidden tree-level
claim (ledger t8 D-003).
_Avoid_: branch freeze as binding, tree-level adjudicated wording

**Adjudication Anchor (判决锚)**
The immutable tag naming the commit at which a snapshot was adjudicated
(`adjudicated/<snapshot>`) — the user/auditor-pinnable ref a verdict binds;
the naming convention is fixed once, new anchors are appended per
adjudication and never moved (ledger t8 D-003).
_Avoid_: moving tag, branch-as-anchor, version-bump-as-binding

**Evidence-Tiered Readiness (证据分层就绪)**
Readiness claims are evidence-tiered: README/spec wording is intent, only
code/tests/runtime output is proof — claiming "installable" without a
clean-environment run would re-enact the claim-evidence contradiction this
project exists to falsify (ledger t8 D-005).
_Avoid_: docs-say-so readiness, anecdotal "it ran once"

**Measurement-Reproduction Invitation (测量复现邀请)**
The downgraded external-trial form: third parties are invited to reproduce
the measurement and feed categorical observations into CAPA — never an
adoption or performance invitation; all invitation text reuses the verbatim
fact lines, no new performance wording (ledger t8 D-005).
_Avoid_: trial invite, beta program, adoption ask

**Blind-Label Order (盲标签序)**
The inviolable stage chain of a snapshot round, treated as one object:
collection drops -> validate -> manifest freeze commit -> derived integer
tables computed while labels stay blind -> table freeze commit -> label
unlock -> single-shot run -> report + replay gate landing together. Each
arrow is a commit boundary; reordering or skipping a freeze contaminates
the adjudication (ledger t9 D-001).
_Avoid_: deriving tables after seeing labels, unlocking before the freeze
commit lands

**Pre-Unlock Audit Gate (解锁前审计闸)**
The independent audit pass between the derived-table freeze commit and
label unlock — the last point where a defect can still be fixed without
burning the snapshot (v2 unblind-round precedent, carried by ledger t9
D-001). Post-unlock defects fall to abort_on_defect, never to a re-run.
_Avoid_: self-attested unlock, treating the audit as advisory

**Conviction Lane (定罪通道)**
A hook-side enforcement lane running a deterministic instrument that FLAGS
(honest-looking traffic -> suspicious), the opposite direction of the rescue-
only judge seam. The lane is mechanical: it reads the transcript at Stop/
SubagentStop, cannot be skipped by the agent under governance, and writes
source-tagged records into the append-only evidence chain (ledger t10
D-002; k8s admission / required-checks / guardrail-is-enforcement
precedents). The pairer is the first instrument to occupy it.
Landed surface (ADR-0070): `src/capa-pairer.js` (the adjudicated artifact,
byte-pinned), `src/transcript-adapter.js` (channel component), and
`src/pairer-lane.js` (the lane) inside `hooks/jiahao-verdict-gate.js`;
channel flags `.jiahao-conviction-off` / `.jiahao-conviction-enforce`.
_Avoid_: agent-side self-run self-record (fail-open, empirically falsified),
occupying the judge seam (rescue/conviction contracts are mutually
exclusive)

**Shadow-Enforce Promotion Gate (影子-执法晋升门)**
The two-stage go-live contract for a newly adjudicated instrument: corpus
verdict is the necessary gate (qualifies for shadow), real-traffic shadow
observation is the sufficient gate (qualifies for enforce). Shadow flags
are telemetry records that never enter the severity matrix; the promotion
criteria are pre-registered before deployment and frozen (ledger t10
D-003/D-007). A confirmed FP during shadow sends the instrument back to
quarantine; a channel-level kill switch survives post-enforce.
_Avoid_: day-one enforce on corpus evidence alone, treating audit/shadow
mode as a terminal state, time-based instead of event-count promotion

**Documented-Decision Closure (观察项留痕闭环)**
The audit-observation discipline that every finding below nonconformity
grade still requires an explicit recorded decision — fix, defer with
reason, or accept — because passive drift is the default failure mode and
repeated undecided observations can escalate to nonconformity at the next
audit (ISO 19011 OFI handling + SRE postmortem-action discipline; ledger
t10 D-006). "On record, no action" is itself a valid documented decision.
_Avoid_: silent backlog, treating LOW findings as self-closing

**Corrigendum Discipline (更正纪律)**
The correction boundary between the frozen authority layer and the
regenerable render layer: verdict JSON / manifests / adjudicated artifacts
are append-only and never rewritten in place; a report-level defect is
fixed by a dedicated corrigendum commit that re-renders from the authority
artifact and declares its nature in the message — never by re-running a
burned single-shot (IEEE corrigendum/errata + financial append-only
correction precedents; ledger t10 D-006).
_Avoid_: rewriting frozen artifacts, re-running to fix a rendering defect,
editing a published report without a declared correction commit

**Descriptive Existence Claim (存在性声明)**
The only permissible claim form for a capability whose efficacy boundary
is narrower than its existence: a three-sentence skeleton — existence+state
with a mandatory mode modifier, a coverage-boundary sentence naming what
is out of scope, and a non-endorsement sentence binding evaluation data to
its own surface (MITRE citation discipline + model-card limitation clauses;
ledger t10 D-005). Promotion shadow->enforce changes only the state value
of the first sentence; the boundary and non-endorsement sentences do not
move because the promotion gate does not prove recall.
_Avoid_: efficacy claims migrated from test context to product context
(FTC precedent), silence about a shipped capability

**Re-Execution Prior (重执行先验)**
A presumptive audit-design prior in the ISA-240.31 form. Snapshot v2
(2026-09-18, supersedes the 2026-09-16 n=16 snapshot, which is archived
not edited): every correction to a self-produced claim or report was
caught by re-execution or independent audit — the n=16 base (six named
cases in 锐评 v4 plus ten later audit observations, F-A x4 / F-B x6) plus
the t16 audit's claim findings G-1/G-2/G-3 merged at closeout, n=19 —
and zero by self-disclosure. G-4 is excluded as quality-not-claim
(smells are not claim corrections). Audit and gate strategy takes this
prior as default design input; overturning it requires a documented
argument, not vigilance (ISA 240.48: exemptions are recorded, not
assumed). The count is a dated snapshot from authoritative artifacts,
not a frequency estimate — detection bias is disclosed (uncaught
corrections are invisible to the count). Registered conventions: audit
findings merge into the count at closeout; the first self-disclosure
case is a directional event — separately registered, never an in-place
number change.
Registered directional events (the separately-registered list the convention names):
- (1) `bbf5259` (grill-t25, 2026-09-24) — first internal-disclosure-channel case: the t24 repair-window commit carried a corrupted report blob disclosed by the round's own handoff, not caught by re-execution or independent audit. Classified by first-disclosing channel per ADR-0084 D-F; the n=19 snapshot is untouched.
_Avoid_: reading it as an extrapolated rate; treating small n as license
to drop the prior (ledger t11 D-004)

**Bounded Delegation (有界委托)**
The rule that delegated signing authority must carry explicit scope and
expiry: an open-ended "all future" grant is a defect in the grant itself,
not merely a wording gap (SOX delegation-of-authority defect class:
temporary coverage that never expires; ISO/IEC 17025 signatory authority
is per-person, scope-specific, and terminates on change; zero-standing-
privilege practice). The next authorization-bearing event forces an
explicit renew-or-expire act; a bounded-grant template is pre-staged so
the moment is not negotiated under pressure. Convention sharpened
(grill-t17, ERRATA E-7): signoff-class authorizations carry the literal
`scope:`+`expiry:` tokens in the authorization field — a bounded reading
is not a bounded grant.
_Avoid_: open-ended delegation even when honestly recorded; retroactive
rewriting of a grant already on the append-only chain (ledger t11 D-004)

**Reachability Provenance (可达性证据分级)**
The distinction between a capability state derived from documentation
and one derived from live observation: transcript_file present means
"documented to deliver" — a docs claim, not a measurement; the added
measured-present word slot marks first-hand observation on a real host
event; absent and unverifiable are unchanged. Labels must not impersonate
measurement (MDN feature-detection epistemology: runtime probing and
compatibility tables are different kinds of knowledge; ledger t11
D-002/D-005).
_Avoid_: citing a documented capability as if measured; renaming states
instead of extending the enum (surgery where a word slot suffices)

**Provenance-Tiered Corpus (来源分层语料)**
The rule that telemetry records carry a source class — organic (real usage),
automated_harness (test rigs firing real events), synthetic_selfcheck (marked
self-tests), unclassified (transcript unavailable; conservatively excluded
from organic counts) — assigned by mechanical session-to-project-directory
mapping, never by naming convention. All records are retained (GA4's lesson:
excluded data is never processed); gate criteria count only the organic leg,
while harness traffic keeps second-class use for pipeline health and
regression comparison (RUM/synthetic discipline: each is legitimate, neither
counts for the other). Named failure modes: wrong-population validity
failure, synthetic-as-RUM conflation, Goodhart on a count gate, benchmark
contamination, GIVT invalid traffic.
_Avoid_: deleting records to clean a corpus; counting non-organic events
toward gate criteria; classification by naming convention (ledger t12 D-002)

**Record-Level Closure (记录级闭环)**
The distinction between a critique item being closed as a record — landed,
verified, registered — and the underlying issue being ended. Completion
verdicts are stated in two layers, "closed as records; not ended as issues",
because closure itself generates new open items and structural themes
(delegated authority, design contamination) are standing tensions that get
answered continuously, not completed. A flat "all done" is the self-comforting
claim this vocabulary exists to prevent.
_Avoid_: flat completion claims in either direction — "all done" overstates,
"not done" erases landed work (ledger t12 D-004)

**Tightening-Only Post-Hoc Amendment (只许变严的事后修订)**
The asymmetry rule for amending a frozen gate after observing data: a
post-hoc change is clean only when it moves the criterion away from the
target — e.g., narrowing "200 real events" to "200 organic events" after
discovering harness traffic, which resets the measured count to zero.
Amendments that move the criterion toward the observed data are
Goodhart-shaped and forbidden; the honest handling of an unanticipated
finding is record it, register the stricter rule, extend the window — never
recount to pass.
_Avoid_: loosening a frozen criterion after seeing measurements; recounting
retroactively under a new rule to claim progress (ledger t12 D-002)

**Sanitized-History Publish (清洗发布)**
An owner-ordered history rewrite performed before merge-to-main + push:
sensitive paths are removed so no published tree ever carries them, and every
post-rewrite commit receives a new object name while earlier history is
unchanged. For consumers the event is a bounded break: tip-region SHAs change,
never-pushed local objects are classed local-only, and the rewrite itself must
be disclosed because undisclosed rewrites match the supply-chain threat
profile (ledger t13 D-001, D-003).
_Avoid_: silent rewrite; claiming "blob retained" without stating it is
local-object-store-only after purge; rewriting already-depended-on history

**Rewrite Map (重写映射表)** (retired 2026-10)
The append-only old→new SHA resolution table (docs/rewrite-map.json) generated
by aligning pre-purge refs (gb-local) with published history via commit
messages, plus a five-class classification of every SHA cited in tracked docs
on four declared facts (ADR-0089): rewritten→new / published-unchanged /
local-only / orphaned-cite (registered orphan) / unresolved (absent AND
unregistered — hard red). Ref topology lives only in per-row qualifiers
(reachable_via), never in the verdict. It is the single
translation point — append-only record files are never edited to add pointers,
and governance-surface files carry one pointer note each (ledger t13 D-003).
_Avoid_: editing historical records in place; hand-built mappings; expanding
local-only entries beyond SHA+label; partial coverage (incomplete = new
inconsistency)

**Tip-Pinned Install Claim (tip 钉死安装宣称)**
The install-channel reproducibility claim binds to the specific published tip
it was re-verified on; any history rewrite auto-invalidates it pending fresh
re-verification. Re-verification depth is claim-evidence matched: install
success + installed-artifact liveness smoke + whitelist diff (diff ⊆
registered sanitize hunks), with evidence recording resolved SHA, clone
rev-parse, npm version, and allow-flags (ledger t13 D-002).
_Avoid_: copying npm's resolved field alone (npm/git#252); full-suite re-runs
(claim inflation); byte-identical equivalence assertions

**Independence-Grade Declaration (独立性等级声明)**
Every audit report must state the verifier's actual independence level — a
second party sharing the same session/toolchain is weak-independent and must
say so. Independent-verification triggers are rule-registered (external
claims, sanitization-zone touches, risk threshold), not per-round
deliberation; ordinary engineering rounds take the light close (ledger t13
D-005).
_Avoid_: ritual rubber-stamp audits; zero independent review of external
claims; unlabelled independence

**Discharged-by-Trigger (触发销账)**
A calendar-scheduled registry review item discharged early when an explicit
trigger — an audit finding or equivalent event — fires before its review_at
date. The override is legitimate only when the ledger records it explicitly
as a trigger-overrode-calendar event; silently skipping the date is a silent
direction change (ledger t14 D-001, D-002).
_Avoid_: waiting out a stale calendar date after a trigger has fired;
discharging without the explicit ledger note; re-binding the item to a
future scheduled review instead of closing it

**Sufficiency Qualifier (充分性限定词)**
A diversity qualification applied to the same corpus a count leg measures:
the proposition is single (count ∧ sessions≥N ∧ intent-classes≥M) and the
qualifier produces no independent pass state. Values are pre-registered as
the loosest defensible bounds under tightening-only asymmetry — tighten
later, never loosen (ledger t14 D-003).
_Avoid_: an independent diversity leg (a small-but-diverse corpus would
bypass the count's intent); symbolic parameters without values; reusing an
unrelated field as the diversity measure

**Sunset Trigger (日落触发器)**
A pre-registered dual-or-path clause — a parallel zero-observation counter
or the watch's closure without prior activation, whichever fires first —
whose sole consequence is activating a scheduled review; it never amends,
closes, or exempts the thing it watches. Its clock must be lifecycle-
independent of the watched item (watchdog independence) so the hole it
exists to close stays unreachable (ledger t14 D-004). A missed
check-in is not a zero: the counter freezes and records the miss — absence
of observation is not an observation of zero; an organic observation resets
the count with an explicit reset event (ledger t15 D-002).
_Avoid_: binding the trigger to the watched row's own expiry field
(dependency inversion); auto-executing dispositions on a timer; record-only
triggers that convene nothing; counting a missed check-in as a zero;
silent counter resets

**Meta-Preregistration (元预注册)**
Registering now the obligation that a future review must register its own
evidence criteria before evaluating — blocking, so output produced without
prior registration is void. The frame may fix criteria shape (at least one
falsifiable kill condition; no amendment of frozen thresholds) without
fixing values that would go stale before the review convenes (ledger t14
D-004).
_Avoid_: writing full criteria years ahead of the review (stale on arrival);
advisory-only meta-requirements; criteria that quietly loosen between
registration and evaluation

**Round Edit Surface (轮编辑面)** (retired 2026-10)
The taxonomy declaring which file classes a round type may touch: the
runtime surface (the shipped bin require-chain closure — always
implementation-round territory, no exemption), governance machinery
(checkers, builders, telemetry — doc-round touchable only through a
carve-out), and documentation (free). The product boundary is the require
closure, not the package files[] list — packaging contents and product
surface are different questions (ledger t15 D-005).
_Avoid_: directory-level whitelists (one directory can mix entry and
machinery); treating files[] as the product boundary; a hand-maintained
list no mechanical scan can verify

**Governance Carve-Out (治理豁免)**
The gated exemption letting a documentation round repair governance
machinery when the round's own artifact truthfulness requires it:
necessity (the justification names the triggering artifact), disclosure
(the change is named in the round's ADR decision, the ledger, and the
trend-inventory governance_tooling_diff channel), and burn-rate
visibility (each use is marked so consecutive uses raise an advisory). A
controlled emergency lane, not a general permission (ledger t15 D-005).
_Avoid_: unmarked use; bundling the justification into prose; reading the
marker as permission to touch runtime files

**Consuming-Row Exit (消费行出口)**
The exit-semantics contract for a verified_by script: the exit code
reports only the condition of the row(s) currently consuming it — legs
computed for other rows are diagnostics and may be printed, but never
drive the exit. Exit 0 = the consuming row's condition satisfied, exit 1 =
unsatisfied, exit >1 = the verifier itself is broken (a crash must never
masquerade as unsatisfied). A missing input artifact is an unsatisfied
condition recorded at the phase boundary, never an early exit; the
three-value contract grows no fourth class (ledger t19 D-004; ADR-0077
D-A.1). When the consuming row discharges, the exit
key is re-pointed or retired in the same commit as that registry edit;
a second live consumer is what activates the pre-registered selector
upgrade (ledger t16 D-002).
_Avoid_: union exits over multiple rows' legs (a terminal row's
regression silently suppresses the live tripwire); crash paths exiting 1;
selectors wired before a second consumer exists

**Facts Canon (事实正典)**
The rule that a round report's evidence numbers live in exactly one
regenerable artifact, refreshed at the closing step — the report is
narrative, never the home of numbers. Numbers already determined at the
close are restated mechanically; the as-of/addendum channel is reserved
for genuinely subsequent events and self-reference disclosures (ledger
t16 D-004). The rule binds the sibling narrative genre: handoff
verified-state lines cite evidence paths, never carry regenerable
counts - a count quoted in a handoff goes stale at the next regen
boundary (ledger t18 D-007).
_Avoid_: hand-written figures in report prose; annotating a restatable
number instead of restating it; faking a self-referential field instead
of leaving it honestly null

**Test Manifest** (retired 2026-10):
The committed derived count fact source (`docs/test-manifest.json`, ADR-0091):
enumeration from jest --listTests, junit counts from the generator's blessed
run. Hand-edit forbidden; regenerate + diff. A JUnit-derived suites field is
the forbidden circular shape.
_Avoid_: test inventory, suite list (those predate the generator)

**Audit Checklist** (retired 2026-10):
The derived CI command-surface artifact (`docs/governance/audit-checklist.json`,
ADR-0091): every ci.yml job's ordered run lines, regenerated and diff-checked.
The audit re-run surface floor.
_Avoid_: test list, CI inventory

**Audit Coverage Block** (retired 2026-10):
The machine-readable block (`<!-- audit-coverage v1 -->` + fenced JSON array,
ADR-0091) in an audit report naming the commands the auditor actually re-ran.
The auditor attests; the generator never co-signs result truth.
_Avoid_: coverage claim in prose (prose is not the asserted object)

**Countersign Overdue** (retired 2026-10):
The three-stage ladder state of an unadjudicated queue member past its
return-by (ADR-0090): in-term advisory, grace-window advisory (+30d, one
post-tide owner working window), past-grace FAIL naming rebuild / re-seal /
declared-drift exits. Asserts no member is silently permanent, never that the
owner must have acted.
_Avoid_: late countersign (the leg is not a deadline enforcement)

**Rejection Disposition** (retired 2026-10):
The pre-registered exit semantics executed when a queued ADR is rejected at
its tide (ADR-0090): non-retroactivity, the disposition menu as default floor
(owner override via errata deviation note), and the rejected status
transition.
_Avoid_: rollback plan (rejection adjudication stays owner-side)

**Public-Object Equivalence (公开对象等价)** (grill-t35):
The contract that the object a check verifies IS the object the public receives.
Under a multi-lane workflow that rewrites history on landing, these are different
trees: the lane tree at declare time versus the landed tip after the rewrite. grill-t34
closed its audit green against the first while the public received the second, and
four defects landed. The consequence is methodological, not motivational: a green
result about the wrong object is not a weaker result, it is a result about
something else. Every local check was correct and irrelevant.
_Avoid_: shipped parity, publish readiness (both can be true while this fails -
the t34 case was a clean audit and a red public branch simultaneously)

**Post-Land Verification (落地后重验)** (grill-t35, ADR-0092 D-L1; retired 2026-10):
Re-running a bounded subset of the battery against the LANDED public tip, in a
throwaway worktree materialized from a fetch, after every land/push wave - not
only the last one. The last wave is not a special case; it is where the t34
escape-eaten byte landed. Blocking object is the local re-verification; public CI
observation stays a trailing next-round entry, because CI sees a tree only after
it is already public.
_Avoid_: CI re-run, release verification (neither observes a pre-public tree)

**Wave-Bounded Subset (波界有界子集)** (grill-t35; retired 2026-10):
The discipline that a repeated verification is scoped to what changed since the
last verified wave, rather than re-walking all history each time. Bounds the cost
so verification can actually run every wave; full-history walks belong to the round
boundary. The bound must be honest - a subset chosen so the real defect falls
outside it is not a subset, it is a hiding place.
_Avoid_: sampling, spot check (a sample is statistical; this is a stated range)

**Pre-Land Battery (落地前电池)** (grill-t35, ADR-0092 D-PRE; retired 2026-10):
The verification run against the WILL-LAND object - the workspace merge tree,
which is merge-group semantics simulated locally - recorded before landing, with
the wave's last claim-mutation sha and the run timestamp. Paired with
post-land verification so the two objects are each verified rather than one
standing in for both. The timestamp is forensic, not preventive: it catches
forgetfulness and not forgery, because writer and committer share a trust domain.
_Avoid_: pre-commit check (a battery is the whole subset, not a single hook; a
hook is bypassable by `but commit` and raw git alike)

**Tracked-Text Enumeration (受跟踪文本枚举面)** (grill-t36, ledger D-004; retired 2026-10):
The input surface a hygiene scanner reads: every tracked file git's text
attribute classifies as text, NUL sniffing as the fallback classifier, and
oversized files skipped by disclosure rather than by exemption - a skip that
names itself is a capability boundary, a silent allowlist is a roster nobody
curates. The enumeration is one shared function of a root and callers pass the
root, never a narrowed subset: a caller-chosen surface is the observer choosing
not to look, which is the pathology rather than a configuration. Its base is
`git ls-files` index union tree, because the index alone is not authoritative
(ledger t30 F-1).
_Avoid_: the Test Manifest's enumeration (that counts test suites for a derived
count fact-source; this is a scanner's input surface); extension-set enumeration;
pure-sniff enumeration; path carve-outs; a caller-supplied file list; undisclosed
oversized skips

**Instrument Non-Intrusion (仪器无侵入)** (grill-t36, ledger D-006):
The contract that the measuring apparatus does not change the thing it
measures. Verification and mutation are two commands, never one command with two
outcomes: the default path computes a candidate and diffs it against the
committed artifact, exiting non-zero on mismatch, and only an explicit
write-mode regenerates (`prettier --check` / `--write` shape). The class
assertion sits at the gate runner's wrapper level and takes a tracked-tree hash
baseline at entry, so a pre-existing dirty tree is recorded as found rather than
penalized - it asserts "this run mutated nothing tracked", not "the tree is
clean". Untracked paths are excluded by the ignore mechanism's own division of
labour, and there is no legitimate-tracked-write exemption channel: the
legitimate exits are the compare form and ignored paths.
_Avoid_: reading it as the narrower Verifier Write Surface (that confines a
verifier to its own trail versus the object's anchor surface; this widens the
object to the whole tracked tree for the duration of one gate run); Instrument
Identity / Instrument Quarantine (those name which apparatus and whether it is
authoritative, not whether it writes); "the tree must be clean" as the same
assertion; window-bounded proof read as a closed class

**Claim-Surface Role Registry (claim 面角色注册表)** (grill-t36, ledger D-005; retired 2026-10):
The committed registry that assigns every claim-surface artifact a role -
examiner, implementer, or mechanical - so the checkers read a declared fact
instead of pattern-matching filenames (CODEOWNERS family). It is a declared-facts
surface, never a derived one: role assignment is a discretionary judgment with no
mechanical source, which is exactly why it must not carry `generated_from` - if
the role were derivable, the registry would not be needed. Consumption is
fail-closed in the direction that matters, because a file that calls itself an
examiner's report is invisible to a checker that only reads the registry's
examiner rows. The registry is itself an asserted object: every registered path
exists in the tree, every claim-surface artifact has a row, and every role is
inside the closed enumeration.
_Avoid_: filename-token conventions (disproved in grill-t35); front-matter
self-declaration (self-attested labels plus a widened enumeration surface);
splitting the claim surface by directory (relocates the pathology and hard-codes
the move); grandfather exemptions; an M1-shaped ratchet backfill (M3's defect is
wrong selection, not noise); stamping `generated_from` on it; letting the agent
that requests an examiner row also write it

**Generation-Surface Equivalence (生成面等价)** (grill-t36, ledger D-003):
The contract that a generator reads exactly the object it is about to assert
about. A generator's read scope is part of its claim: enumerating citations on a
merge workspace that still contains an unlanded lane bakes references to files the
published tree never had, so the derived artifact describes a tree that does not
exist. Two obligations carry it - tree-internal reads, and a `generated_from`
provenance field naming the tree-ish and the mode, which turns "which tree is
this about" into a machine-assertable fact rather than an assumption. A tree has
no absolute legitimacy: legitimacy is a function of the assertion context, so
reading a merge tree is correct for a pre-land check and wrong for map
generation, and that is the same tree under two assertion domains. Unlike a
byte-surface disclosure, this one really closes - the defect is an ordinary
repairable generation bug, and its repair is required.
_Avoid_: reading it as Public-Object Equivalence (that pairs a check's object
with the public's object across a landing rewrite; this pairs a generator's read
scope with its own assertion target); "generator" in its profile sense (Generator
Profile, gsr rule header - those name the primary agent's behavior, not a build
script's read scope); lane isolation as the fix (a discipline is bypassable, a
contract is not); importing M1's ratchet baseline here (this is a
false-positive red, not always-green noise); borrowing M1's "repaired, never
closed" phrasing - the two closabilities differ in kind

**generated_from (派生源字段)** (grill-t36, ledger D-003):
The provenance field a derived artifact carries - `{tree-ish, mode}` - naming the
tree it was generated from and the read discipline used, in the buildinfo shape.
Its purpose is to convert "which tree does this describe" from an assumption into
a machine-assertable fact, so a consumer can refuse an artifact that describes a
tree it was not asked about. Presence is the signal of derivation: a registry of
declared facts must not carry it, because a field saying "I was computed from X"
is an admission that the content is computed - and if the content were computed,
the declaration would not be a discretionary judgment.
_Avoid_: stamping it on every governance JSON (the declared-facts registries -
thresholds, the role registry - hold judgments, not computations);
using it in place of the read-scope fix (it describes the scope, it does not
constrain it); a bare commit sha without the mode (which tree and which read
discipline are two fields, not one); inferring the mode from the tree-ish

**Sentinel Replacement Guard (ADR-0024 D2b / D-012 Platform Note)**:
The unlink inode check in `sameFile()` verifying that a sentinel file is not
replaced by a parallel begin before deletion. Effective on POSIX where atomic
replace changes inode; on Windows (win32), NTFS tunneling / MoveFileEx does
not guarantee inode changes, so the D2b replacement guard is degraded/ineffective
on win32 and falls back to lock ownership.
_Avoid_: assuming uniform POSIX inode semantics across platforms

**Bow-tie Skeleton (领结骨架)**:
The architecture mapping borrowed from process safety: the generator profile is
the prevention barrier (it stands between the motive to fake completion and the
fake completion itself), the verifier profile is the mitigation barrier (it
stands between a fake completion and its delivery consequences). The layers stay
independent and never lend rules to each other; the mitigation layer is always
designed on the assumption that the prevention layer leaks (ADR-0101 D-A).
_Avoid_: defense-in-depth (a property, not this mapping), resource-shifting between layers (prevention evidence never dismantles detection)

**Negative-Disclosure Line (负向披露行)**:
The 1-2 lines a generator completion claim carries beside its positive list:
what was skipped, what was left unchecked, what risk remains. Adopted from
ponytail v5; extends gsr:2, whose original form listed verified state changes
only. The line itself stays under prose-density supervision (ADR-0101 D-E).
_Avoid_: risk-disclaimer boilerplate (the line names this task's specifics), turning the line into a new score surface

**Change-Reach List (波及清单)**:
The list of affected surfaces (callers, tests, configs, docs) written before a
code change and reconciled item by item at verdict. The procedural form of
"verify side effects, not just the happy path" (ADR-0101 D-E).
_Avoid_: impact-analysis documents (this is a two-step procedure inside one verification round, not a deliverable)

**Inoculation Rule (接种式规则)**:
A generator-face rule that names failure modes before a task starts. Legal only
when the named failure modes carry independent empirical validation — as of the
r2 round the MAST mapping is an in-repo coherence fixture only (ADR-0059), so the
inoculation premise is not yet established for any new failure-mode text until the
N=140 blind trial lands (ADR-0101 D-B, ledger D-009).
_Avoid_: generic warning labels (an inoculation rule is task-front, evidence-backed, specific), priming in general

**Barrier Qualification (屏障资格)**:
The IPL triple test — effective, independent, auditable — that a generator-face
rule must pass before it counts as a prevention barrier. Rules that fail are
support controls; claiming a double barrier from unqualified rules manufactures a
false sense of protection, which is itself first-semantics behavior (ADR-0101 D-C).
_Avoid_: counting the current gsr rules as barriers (they are support controls until upgraded)

**Plain-Substitution Table (平实替代表)**:
The detector-face form: banned word, then plain substitute plus reason, in two
tiers — avoid (error) and avoid-unless (warning). Disclosure only, never a score;
no aggregate score means nothing to game (ADR-0102 D-B).
_Avoid_: readability formulas (rejected by ISO 24495-1's panel; gameable), banned-word lists without substitutes

**Register-Before-Use (先入册后使用)**:
A new term must have a CONTEXT.md entry before it may appear in the mandatory
faces (commit messages, ADR bodies, CONTEXT.md itself). The glossary is the
register; the ADR change ticket is the enrollment path (ADR-0102 D-A).
_Avoid_: vocabulary policing (registration is an enrollment path, not an offence — see ADR-0098 D-B)

**Three-Face Reach (三面射程)**:
The reach of language discipline: the mandatory face (commit messages, ADR
bodies, CONTEXT.md — table plus principles), the principle face (src/SKILL.md —
principles only, no lint), and the principle plus light-disclosure face (final
replies to humans). New document types default into the mandatory face; an
exception needs a change ticket. No retroactive rewrite (ADR-0102 D-D).
_Avoid_: global lint (the product face must not carry the table), history cleanup (append-only discipline forbids rewrites)

**Controlled Vocabulary (受控词表)**:
The governed form the substitution table grows into: every load-bearing entry
carries five elements — definition (including what it is not), context
example, forbidden synonyms, substitute, and status (Draft | Approved |
Deprecated). Modeled on ASD-STE100's one-word-one-meaning dictionary and
termbase practice. A word list without forbidden synonyms and status fields is
a dictionary, not a governance tool (ADR-0103 D-A). Fifth admission element
(r3 D-003③, 2026-10-19): a claim-with-number entry must carry its source
(title + URL) — an entry whose reason rests on a measurement cites where the
measurement lives, or it does not land.
_Avoid_: banned-word lists (no substitute, no status), glossaries without governance fields

**Enforcement Tier (执行档位)**:
The exit-code mapping of the substitution table's two tiers on the mandatory
face: avoid hits exit non-zero (a CI gate — the banned word either appears or
it does not); avoid-unless stays advisory forever (its condition is a semantic
judgment no machine can make). Promotion from avoid-unless to avoid goes by
change ticket; a third tier is banned (ADR-0103 D-C).
_Avoid_: blocking on semantic conditions (too subjective to enforce), a middle tier between blocking and advisory

**Coinage Retirement (自造词退役)**:
The exit path for self-invented coinage: the word is marked Deprecated in the
table with a pointer to its plain substitute, new output uses the substitute,
and historical text stays as written — mass renames go through the supersede
channel (a new ADR plus a glossary mapping), never a rewrite (ADR-0103 D-B).
_Avoid_: find-and-replace rewrites of accepted ADRs, keeping a coinage because it is established
