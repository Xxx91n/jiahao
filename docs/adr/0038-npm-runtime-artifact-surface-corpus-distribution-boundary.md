# ADR-0038: npm Runtime-Artifact Surface & Corpus Distribution Boundary

Status: Accepted
Date: 2026-08-31
Amended by: ADR-0039 (narrows D1: docs/adr leaves the tarball; measured 200,000-byte budget); ADR-0059 D-B (drops `jiahao-mcp/` from the D1 files whitelist — source-only tier); ADR-0060 (drops `CONTEXT.md` from the D1 files whitelist — development surface, ADR-0039 principle)

Amends: ADR-0036 (clarifies distribution boundary now that the corpus is
private; adds the missing artifact-surface decision)

## Context

Current `npm pack` output is 314 KB / 206 files and includes the entire `test/`
tree and bench fixtures, because package.json has no `files` field (npm default
`["*"]`) and only `.gitignore` (a blacklist) keeps `private/` out. Yet the
private bench corpus is absent from the tarball *and* from any public git
clone: once it left git (ADR-0036), no public channel carries it. Two facts
follow:

1. The npm artifact pretends to be a reproducer (it ships tests and fixtures)
   while its `gate:all` inevitably fails closed (exit 2) with a message
   instructing `jiahao init` — a command that cannot succeed for a third
   party. That is a嘉豪-shaped artifact: it claims capability it cannot have.
2. The precise boundary is sharper than "git clone reproduces": git clone
   yields full source, tests, fixtures, thresholds.json (with the
   private_corpus sha256 integrity anchors), and all ADRs, but NOT the answer
   corpus. Corpus availability channels for third parties: none.

Research grounding (one atomcode round, 15 sources, official docs + primary
statements cross-verified): the wheel/sdist dual-surface model is the industry
norm — setuptools docs state the sdist carries tests/docs while the wheel
carries runtime-only; Cargo Book caps crates at 10MB explicitly naming test
data; npm's own blog calls the `files` whitelist "by far the safest way" and
blacklists a known leak vector; Go never compiles `_test.go` into binaries;
npm CLI team endorsed "want to debug/test it? git clone the repo" as registry
philosophy. Anti-contamination evidence (NIST CAISI cheating bisection;
OpenAI's SWE-bench Verified retirement; SWE-bench Pro private split; TRUCE
private-benchmark channel; BIG-bench canary limits incl. AgentLeak 8%)
unanimously rejects publishing answer corpora through public channels.
garak ships its probes openly precisely because they carry no secrecy
requirement — the contrast confirms our corpus is different in kind.

## Decision

### D1 npm tarball = wheel-equivalent runtime artifact (files whitelist)

Add `files` to package.json whitelisting the runtime surface only:
`src/`, `scripts/`, `adapters/`, `schemas/`, `hooks/`, `jiahao-mcp/`,
`docs/` (includes ADRs and gates.json), `bench/polygraph/thresholds.json`
(public integrity anchors must stay), `CONTEXT.md`, `README.md`,
`AGENTS.md`. Everything else is out: `test/`, `bench/` fixtures, results,
and artifacts, `.githooks/`, `private/` (already absent), scratch dirs.
Failure direction is safe: forgetting to whitelist a runtime file fails loudly
in install smoke tests; a blacklist fails by silently leaking.

Amended 2026-09-12 by ADR-0059 D-B: `jiahao-mcp/` is dropped from the
`files` whitelist. The MCP adapter is now a source-only git-tree component —
installed by clone + `npm install` inside `jiahao-mcp/`, never packed. Reason:
nested `package.json` dependencies are not installed from tarballs (npm by
design), so the packed tier failed at first require; hoisting
`@modelcontextprotocol/sdk` + `zod` to root would breach the zero-extra-
dependency discipline (ADR-0027 R1). ADR-0009’s original opt-in intent is
restored.

### D2 Distribution boundary is documented, not fixed with more code

The corpus gates are a maintainer-tree/CI-only contract. The npm tree and any
public git clone fail closed by design; this is specification, not defect.
README gains a short section stating exactly this, including the precise
"git clone also carries no corpus" sentence (D-Context fact 2), and points
benchmark reproduction at the maintainer channel.

### D3 Honest missing-corpus message (one-line fix)

The missing-corpus error distinguishes the three resolution tiers and tells a
third party the truth — corpus is a maintainer/CI asset (ADR-0036/0038), provide
`JIAHAO_CORPUS_DIR` if you legitimately hold it — instead of instructing an
install command that cannot work outside the maintainer tree. Honesty
principle applied to error strings.

### D4 Future corpus channel, if ever needed, is private-registry only

The only legitimate future form of a corpus distribution channel is a
`publish=false` / access-controlled private-registry package (Cargo/Turborepo
internal-package pattern). It is registered as deferred-registry entry defer-0007
(pending-evaluation, presence-condition: a real external consumer demand AND
an access-controlled channel existing), not built.

## Rejected alternatives

- R1 Standalone public corpus package (jiahao-corpus on npm): the entire
  anti-contamination literature plus ADR-0036's privatization says answer keys
  never enter public channels; also creates a two-package version-sync burden
  for zero real consumer demand.
- R2 Docs-only stance without the files whitelist: leaves a 314KB tarball
  pretending to be a test-runnable artifact; the whitelist is one field, not
  extra machinery, and npm calls it the safest mechanism.
- R3 canary + public corpus variant: BIG-bench canary is demonstrably lossy
  (AgentLeak ~8% extraction even with canaries); canary is leak *detection*,
  not leak *prevention* — wrong tool for answer keys.

## Consequences

- Implementation (next round): package.json `files` whitelist, README
  boundary section, missing-corpus message fix, deferred-registry entry for
  the private-registry corpus channel, npm pack --dry-run verified in CI
  surface (test-closure: tarball file-list assertion in jest).
- The npm artifact shrinks to roughly 50 KB and becomes honest about what it
  is: a prompt-installer. Benchmark reproduction moves entirely to the
  maintainer/CI channel.

## Implementation note (2026-08-31, impl round)

- Measured tarball after the D1 whitelist: 237,590 bytes compressed / 118 files
  (uncompressed 725 KB). The ~50 KB estimate was computed against a stale tree
  and is unreachable with the D1 whitelist intact: docs/adr alone is 228 KB
  uncompressed (38 ADRs are developer docs) and CONTEXT.md adds 65 KB. The
  wiring test asserts < 256 KB (measured + headroom). If a hard cap is wanted,
  a follow-up ADR should move docs/adr out of the npm artifact (archive
  channel), not weaken the files-whitelist boundary.
- npm always-includes `README.md` in every packed directory (unconditional);
  `bench/polygraph/README.md` is therefore present and is allowed by the
  wiring assertion alongside thresholds.json.
- `jiahao-mcp/` left the tarball under ADR-0059 D-B (source-only tier);
  the former `jiahao-mcp/.npmignore` exclusion of `package-lock.json` is
  retired with it.
- Amended 2026-09-12 by ADR-0060: `CONTEXT.md` (94,244 bytes unpacked) leaves
  the tarball under ADR-0039’s own principle — the glossary is the git-tree
  development surface, not a runtime artifact. The 200,000-byte cap (ADR-0039
  D3) had fallen to a ~350-byte margin; this restores headroom without
  weakening any check. The four maintainer gate scripts that read CONTEXT.md
  (check-bench-thresholds / check-coverage / check-deferred / check-host-contracts)
  are maintainer/CI-channel operations that cannot run from an installed
  tarball anyway (no corpus -> honest exit 2).
