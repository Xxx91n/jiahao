# ADR-0028: Multi-Host L0 Test Closure — Regen-Diff Golden, Host Behavior Contracts, Adapter Lifecycle

## Status

Accepted (2026-08-29)

## Context

The product claims multi-host distribution (README: "11 host adapters"),
but the reality measured during this grill round was: 7 adapter directories
generating 11 files, `detectHost()` whitelisting copilot and qoder with no
adapters for them, README test counts (150 tests / 13 suites) stale versus
actual (244 / 21), and no test anywhere that feeds a hook a host event
payload and asserts its exit-code semantics. The only behavioral contract
was inline `expect(e.status).toBe(2)` assertions scattered in
test/hooks.test.js. "The hook actually fires and its exit-code semantics
correctly block or allow on each host" had zero regression protection —
the largest gap in the per-platform test-closure mental model.

Three atomcode research runs (2026-08-29; multi-host smoke industrial
templates; golden-master/approval-testing lineage from Feathers through
insta/expect-test/Go testdata/cpython regen-checks; contract placement via
Fowler CDC / DbC / specification-by-example / WPT / rustc blessed stderr /
tree-sitter corpus; host selection with lifecycle evidence) established:

- No off-the-shelf "multi LLM host hook conformance" wheel exists
  (rulesync/AgentDist surveyed); the industry mental model is a
  three-layer smoke pyramid: L0 golden+fixture conformance every PR,
  L1 no-launch preflight, L2 TF_ACC-style gated real-host matrix.
- Golden-master tests are characterization tests (historical oracle);
  the literature's two iron rules are deterministic output and explicit
  human approval of updates. Hash manifests fail review transparency
  (sbomify lockfile-drift analysis); full-file golden diff is the readable
  form. "Generated artifact committed + CI regenerates and diffs"
  (go mod tidy && git diff --exit-code; cpython generated-files workflow)
  is the mature consensus.
- Cross-system contracts must be independent, versioned, diff-able
  artifacts consumed by tests (Fowler CDC); prose-only contracts violate
  specification-by-example's executability rule ("a promise without a
  witness" — ADR-0027's own context phrasing).
- Host extinction is a live operating condition, not rhetoric: Roo Code
  EOL 2026-05-15 (repo archived), Gemini CLI retired 2026-06-18
  (succeeded by Antigravity CLI). Adapter inventories need a lifecycle
  register and retirement triggers.
- Protection rate is asymmetric by architecture: only hook-tier hosts
  (claude/codex/copilot-cli/qoder/opencode) can enforce exit-2 blocking;
  instruction-tier hosts are advisory-only soft injection. README must not
  imply all hosts are equal.

## Decision

### D1 Scope: L0 only, L1/L2 explicitly deferred

This round lands L0 only: (a) regen-diff golden over all adapter files,
(b) fixture-driven conformance for executable-hook hosts. L1 (no-launch
preflight) and L2 (RUN_HOST_SMOKE=1 container matrix, TF_ACC gating
pattern, asdf plugin-test workflow shape) are deferred: 8 long-tail hosts'
protocols are not yet verified against official docs, and Copilot CLI's
sessionStart has open non-firing bugs (github/copilot-cli #1730/#2201/
#2415/#2142). Building L2 now would build on sand.

### D2 Golden layer: regen-and-diff, no lock file

`scripts/build-adapters.js --check` regenerates all adapter file contents
in memory from src/SKILL.md, byte-compares against committed files, prints
a unified diff on mismatch, and exits 1. Zero new dependencies, zero new
file formats; the update path is the existing explicit command
`node scripts/build-adapters.js` (the approval act stays human and
explicit). Rejected: Jest toMatchSnapshot (double review surface: adapter
file plus .snap), JSON hash manifest (opaque on mismatch), Smokepod (new
dependency; its assertion syntax targets command output, not file
content). Wired into jest and CI alongside check-drift.js, which remains
the semantic (fragment/purity) layer; the two are complementary.

### D3 Conformance layer: full matrix, semantic-table driven

test/host-contracts.test.js spawns each hook script with fixture stdin and
asserts per-contract exit codes and decision JSON shape: verdict-gate's
three semantics (flag off -> exit 0 advisory passthrough; allow -> exit 0
plus JSON {decision:'allow',...}; block -> exit 2 plus JSON
{decision:'block',reason}) and fail-soft exit 0 for every input class on
the other four hooks (activate/subagent/mode-tracker/sweep). All
executable-hook hosts (claude, codex, and new copilot/qoder) are covered
where their contract differs.

### D4 Host Contract artifact + term-anchored guard

test/fixtures/host-contracts.json is the pre-registered contract registry:
entries carry {id, host, event, exit_codes, decision_keys,
decision_values, fail_soft, term, source_adr} with schema_version and _doc
header, mirroring thresholds.json conventions. Each entry's `term` must
name a glossary term present in CONTEXT.md (existence anchor, not prose
parsing — ADR-0027's prose-parsing rejection stands).
scripts/check-host-contracts.js reuses check-bench-thresholds.js's
couplingViolation pure function: modifying or deleting contract entries
without an ADR (or CONTEXT.md term change) in the same commit range fails
CI; adding new host entries starts under the same coupling (strict-first;
relax only if ADR noise appears). The contract file is consumed by tests
only, never shipped or read by hooks at runtime (fail-soft
self-containment invariant preserved).

### D5 Host补齐 (research-gated): copilot, qoder, opencode, aider

Four new adapters bring the inventory to 11 host directories. Every new
host is integrated only after a serial atomcode research pass against
current official documentation — no hallucinated protocols:
- copilot (GitHub Copilot CLI): .github/hooks/*.json repo-level plus
  user-level fallback; agentStop block is the natural verdict-gate
  mapping; sessionStart non-firing bugs become a documented degradation
  (userPromptSubmitted is the attested injection path).
- qoder: 24 documented events, hookSpecificOutput.hookEventName plus
  exit-2 blocking contract homologous to Claude Code; fixes the false
  runtime comment "Qoder has no SessionStart"; international versus
  Lingma CN fork risk recorded on the contract entry.
- opencode: instruction tier via the opencode.json instructions field
  plus Claude Code compatibility paths; distinct from blanket AGENTS.md
  coverage.
- aider: instruction tier via CONVENTIONS.md plus .aider.conf.yml read:
  line; honest acceptance note that injection is not default-on.
Explicitly not added: gemini-cli (retired 2026-06-18), roo (EOL
2026-05-15), amp/kilo/zed and other AGENTS.md-native hosts (covered by
instruction-tier; separate adapters would be pseudo-adapters).

detectHost() whitelist and adapter inventory are decoupled: the whitelist
is env-signal detection (only hook hosts have env markers); the adapter
inventory is the distribution surface. The test/hooks.test.js whitelist
assertion is updated accordingly.

### D6 Adapter lifecycle register + protection-tier disclosure

Each adapter entry gains a lifecycle state: active / deprecated / eol,
with retirement triggers (official shutdown announcement, repository
archival, or consecutive protocol-breaking versions without docs). README
gains a protection-tier statement: which hosts can run blocking verifier
semantics (hook tier: claude, codex, copilot-cli, qoder, opencode) versus
advisory-only instruction tier. README drift fixes land in the same
commit: "11 host adapters" wording and test/suite counts.

### Rejections

- R1: Jest snapshot / Smokepod / Pact Broker / Testcontainers — not
  adopted (D2/D4 rationale).
- R2: L1 preflight and L2 real-host container matrix — deferred, not
  rejected; unblocking conditions recorded in D1.
- R3: host-contracts JSON schema file — deferred; JSON.parse plus hand
  field checks suffice at this scale (ponytail).
- R4: runtime consumption of the contract file by hooks — rejected
  (self-contained fail-soft distribution invariant).
- R5: per-host adapter directories for AGENTS.md-native hosts — rejected
  as pseudo-adapters.
- R6: cross-host exit-code normalization shim — rejected; the contract
  table records differences honestly rather than hiding them behind a
  leaky abstraction.

## Acceptance

1. `node scripts/build-adapters.js --check` exits 0 clean, 1 with unified
   diff on drift; wired into npm test and CI.
2. test/fixtures/host-contracts.json covers 11 hosts; jest table-driven
   conformance green on all current contracts.
3. scripts/check-host-contracts.js: editing the contract file without an
   ADR/CONTEXT.md change in range fails (negative-path unit test via the
   shared couplingViolation guard).
4. Four new adapters generated, listed in check-drift.js, covered by the
   golden layer, each preceded by its serial atomcode protocol research.
5. README: adapter wording, counts, and protection-tier table accurate;
   CONTEXT.md +4 terms (Host Contract / Golden Regen-Diff / Adapter
   Lifecycle / Protection Tier) plus decision-log entry.
6. Full closure: jest green + check-drift green + --check green +
   npm pack --dry-run green.
