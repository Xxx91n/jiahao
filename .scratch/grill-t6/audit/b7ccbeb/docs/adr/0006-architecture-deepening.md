# ADR-0006: Architecture Deepening

## Context

An architecture review using the codebase-design vocabulary (module, interface,
depth, seam, adapter, leverage, locality) identified 4 friction points in the
codebase. Each was a shallow module or a seam where the interface promised more
than the implementation delivered, or where locality was violated by duplicated
logic across files.

## Decision

Apply 4 targeted fixes, each addressing one friction point:

### Fix 1: Evidence Contract (P1 security)

**Problem**: verdict-gate.js checked `evidence.length > 0` on the raw string
content of .jiahao-evidence. gate.js writes JSON via `JSON.stringify()`. An
empty array `[]` has length 2 — non-empty — so the verdict gate would pass,
creating a false-completion vector: the exact failure mode jiahao exists to
prevent.

**Fix**: verdict-gate now parses JSON and checks `Array.isArray(parsed) &&
parsed.length > 0`. Empty arrays, plain text, and unparseable content all
correctly block.

### Fix 2: Shared Path Resolution (locality)

**Problem**: `process.env.CLAUDE_CONFIG_DIR || process.env.HOME || '/tmp'`
appeared in 4 files (activate.js, mode-tracker.js, verdict-gate.js, gate.js),
each independently constructing flagPath and evidencePath via string
concatenation. Any change to path logic required editing 4 files; drift in
any one would silently break the evidence handshake.

**Fix**: Extract `hooks/jiahao-paths.js` as the single source of truth.
All 4 files now import from it. Path logic changes are one-file edits.

### Fix 3: Adapter Drift Coverage

**Problem**: check-drift.js only checked 4 of 7 adapter files and used a
single fragment (`'anti-false-completion iron laws'`). A SKILL.md edit that
didn't touch that phrase would pass drift detection silently. 3 adapter files
(claude-code, codex, mcp) had no existence check at all.

**Fix**: check-drift now verifies existence of all 7 adapter files. For
instruction-tier adapters (cursor, windsurf, cline, instruction-tier), it
checks 4 distinctive fragments spanning different SKILL.md sections: iron
laws, verification ladder, judge-cannot-be-author, NOT VERIFIED.

### Fix 4: verify() Claims Interface Honesty

**Problem**: verify() accepted a `claims` parameter and the NOT VERIFIED
path attempted per-claim matching via `evidenceChain.find(e => e.gate_id
=== 'claim-' + i)`. No gate ever creates evidence with gate_id 'claim-N' —
the matching was dead code that gave the appearance of per-claim tracking
without delivering it.

**Fix**: Remove the dead matching loop. NOT VERIFIED returns
`claims.slice()` directly — all claims are unchecked, no pretense of
individual tracking. The interface no longer implies per-claim granularity
that the implementation doesn't provide.

## Consequences

- The evidence file handshake is now structurally safe: only non-empty JSON
  arrays of evidence records pass the verdict gate.
- Path resolution is a single-file change. Adding new host-specific path logic
  (e.g., XDG compliance) touches jiahao-paths.js only.
- Adapter drift detection has no blind spots: all 7 files checked, 4 fragments
  spanning the full SKILL.md body.
- verify()'s interface is honest: it accepts claims and returns them as
  unchecked when verification fails, without implying per-claim evidence
  tracking that doesn't exist.
- Two new terms added to CONTEXT.md: Evidence Contract, Adapter Drift.
- 3 new tests: empty-array block, plain-text block, paths module exports.
- Total: 39 tests (was 36).
