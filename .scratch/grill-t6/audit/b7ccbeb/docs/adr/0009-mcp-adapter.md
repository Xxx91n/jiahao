# ADR-0009: MCP Adapter

## Context

ADR-0005 established the three-tier adapter strategy: hook tier, instruction
tier, and MCP tier (deferred). The MCP adapter was a placeholder README.

Atomcode research (16 sources, ponytail-mcp source code verified line-by-line)
surveyed:
- ponytail-mcp: ~30 line index.js using @modelcontextprotocol/sdk v1,
  registerPrompt + registerTool + StdioServerTransport, private package
- Official MCP TypeScript SDK: v1 (@modelcontextprotocol/sdk) and v2
  (@modelcontextprotocol/server, 2026-07-28 spec). v1 is what ponytail uses.
- MCP prompts are user-controlled on-demand pull, NOT always-on injection.
  Hosts with hook capability should use hook-based adapters; MCP is the
  fallback for MCP-only hosts.
- Skilldex (arXiv:2604.16911): MCP as skill management API (tool form)

## Decision

Implement jiahao-mcp as a minimal stdio MCP server mirroring ponytail-mcp:

1. **registerPrompt("jiahao")**: User-invoked prompt returning SKILL.md body
   with mode parameter (lite/full/ultra). Returns messages array with
   role:user + content:text.

2. **registerTool("jiahao_instructions")**: Read-only tool returning the same
   instructions text. Annotations: readOnlyHint=true, openWorldHint=false.
   Returns structuredContent { mode, instructions }.

3. **StdioServerTransport**: stdio protocol, same as ponytail-mcp.

4. **Dependencies**: @modelcontextprotocol/sdk ^1.26.0 + zod ^3.23.0 (same
   as ponytail-mcp). Private package, not published.

build-adapters.js updated: MCP adapter README now points to jiahao-mcp/
instead of "future" placeholder.

## Consequences

- MCP-only hosts (no hook capability) can now access jiahao rules via prompt
  menu or tool invocation.
- The MCP adapter does NOT replace hook-based adapters — it is complementary.
  Hook adapters provide always-on injection; MCP provides on-demand pull.
- jiahao-mcp is a separate package with its own package.json and dependencies.
  It is NOT installed by default — users opt in by npm install in jiahao-mcp/.
- 8 new tests covering: file existence, package.json validity, prompt
  registration, tool registration, transport, SKILL.md reading, mode support,
  syntax validation.
- Total: 69 tests (was 61).
