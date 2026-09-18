# grill-t17 spec — G-bundle fix + critique-residue round

## 0. Headline

审计残值与批判残值合并处置轮：发现件全灭、字面瑕疵登记、先验轮换、类杀灭双层。
输入=t16 审计 G-1..G-4（.scratch/grill-t16/reports/2026-09-18-audit.md）+ 锐评残值
（.codex-tmp/锐评1.md=V4@3cd4e19，五处方验讫已处置仅登记不重裁）。

## 1. Round boundary (D-001)

In-scope:
- G-1..G-4 一束处置（§2-§5）
- t16 审计 §6 验收电池原样复跑
- 节律 consent-sweep（defer-0060 季度/sunset 1/6/SLA/O-E）
- 三残值项：G-1 类杀灭（§3）、seq-27 expiry 处置（§4a）、Re-Execution Prior 刷新（§4b）

Explicitly out-of-scope:
- 委托姿态（E-6 披露制）不重开——ADR-0072 P-1 已处置，推翻需新论证
- 栈 landing（grill-t15-docs 9 + grill-t16-docs 9 未推）=owner 域仅知情
- 4 patch（tq/nl/xu/my）永不提交
- 战略评审（锁 sunset 触发器 1/6）、promotion 评审（锁 N/M 语料，不存在）

## 2. G-2 render-pin policy (D-002)

Decision: unconditional scan. The backtick-strip exemption in the bare-number pin
（adr-0076-wiring）is deleted — canon numbers live ONLY in the sentinel region.
- proseScan moves into scripts/build-round-facts.js (exported), enforced by
  --check --report at author-time, not just gate-time.
- jest pins the real report + a quoted-stale-number fixture that must fail --check.
- Verbatim tool output moves to .scratch/grill-tNN/evidence/ committed artifacts;
  the report references them by path and carries no numbers inline.
- Evidence artifact: per-round regenerated, NOT in anchors chain (same churn
  reasoning as round-facts.json).

## 3. G-1 class-killer (D-003)

Decision: gate pin + retro-fix totalization + template layer (b+c double layer).
- Invariant pin: every committed .scratch/grill-t*/gen-docs.cjs must derive ROOT
  from __dirname; absolute-path literals are banned. Class dies at commit-time.
- Retro-fix totalization: t14+t16 infected copies converted to derived form;
  no exemption registry (n small, fix mechanical — atomcode: exemption pattern
  fits thousands-of-files + risky-fix scenarios, not here).
- Template layer: gen-docs header incl ROOT derivation frozen into a single
  template file; new rounds generate from template (knowledge written once).
- Pin kept as backstop: template prevents ~95%, gate catches ~5%.
- Excluded: t6 audit snapshot (frozen evidence, filename-pattern exempt).

## 4. Residue dispositions (D-004)

### 4a. seq-27 expiry letter-gap

- Verdict: substantively compliant + literal defect REGISTERED (scope-bounded
  two-named-asks = self-exhausting expiry equivalent; absence of a literal
  expiry token is a formal defect recorded to prevent precedent-normalization).
- Correction lands as a NEW governance note (frozen hash chain untouched):
  expiry=任务耗竭（两个具名任务完成即失效）.
- Convention sharpened: signoff-class authorizations carry literal scope:+expiry:
  tokens going forward (template exists — verbatim use was the missing step).
- CONTEXT terms: Scribed Approval vs Proxy Signature — the delegation-quality
  axis lives in the authorization field (人决我录 vs 我决). seq 10-13=proxy,
  seq-27=scribed; seq 3/5/6/8 pre-authorization-era = historical background.
- NOT gated in instrument CLI: authorization is verbatim human text, not a
  machine-readable field.

### 4b. Re-Execution Prior refresh

- Publish snapshot v2: n=19@2026-09-18 (16 + G-1/G-2/G-3; G-4 smells excluded
  as quality-not-claim), old n=16 marked superseded, detection-bias clause
  carried verbatim. Rotation not rolling-window not in-place edit.
- Convention registered: audit findings merge into the count at closeout.
- First self-disclosure case = directional event → separate registration,
  not a number change.

## 5. Nits + smells (D-005)

Gate criteria (registered as THE convention, not "smells default into bundle"):
minutes-scale (~≤30 lines) × behavior-preserving × no-convention-needed.
- In-bundle (independent refactor:/test: atomic commits, not mixed with fix
  commits): tmpdir cleanup (adr-0058-wiring run() helper), yml/job helper
  dedup, loadTaxonomy-in-loop lift (check-governance-inventory).
- Deferred: build-round-facts guard/exit-style — a missing convention, not a
  local defect; registry row + anti-rot quota (next fix bundle must take one
  smell ticket first). Convention written before the fix or it recurs.
- Nits ×5 all fixed (corrections, not optional): adr-0076-wiring L1 header,
  adr-0069-wiring:305 test name, t16 handoff 1412×2 + "D-E" mislabel,
  spec §3 member-list overclaim, report F-C wording.

## 6. Closeout (D-006)

- Light close: self-check battery (t16 audit §6 verbatim re-run) + owner
  approval. No habitual audit (ADR-0074 D-F triggers not fired). Audit-ready
  note: G-bundle dispositions listed as next-audit review surface.
- Phase order: R1 doc surface first, then R2 machinery (carve-out not invoked —
  R1 is all R3/doc surface, R2 is all machinery).
- Setup commit absorbs uo (t16 audit handoff) + xk (t16 audit report).
- Consent sweep: disposition lines per cadence row + smell-ticket quota line.
- Zero owner asks. report_commit stays null (self-reference disclosed).

## 7. Negative requirements union

- No fourth edit-surface category; no delegation-posture reopening.
- No rolling-window or in-place rewrite of the prior; frozen history untouched.
- No exemption registry for gen-docs copies; no whole-script shared module.
- No "smells default into fix bundle" convention; no mixed fix+refactor commits.
- No numbers in report prose outside the sentinel region (quoted or bare).
- No commits of the four audit patches (tq/nl/xu/my).
