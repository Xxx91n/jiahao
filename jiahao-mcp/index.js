#!/usr/bin/env node
// jiahao-mcp/index.js — MCP server exposing jiahao verifier discipline
// Mirrors ponytail-mcp pattern: registerPrompt + registerTool + stdio transport.
// For MCP-only hosts that lack system-prompt injection hooks.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const z = require('zod');
const fs = require('fs');
const path = require('path');

// Read SKILL.md from parent src/ directory
const skillPath = path.join(__dirname, '..', 'src', 'SKILL.md');
const skill = fs.readFileSync(skillPath, 'utf8');
const body = skill.replace(/^[\s\S]*?---\n/, '');

// Build instructions text (same as jiahao-activate.js)
function buildInstructions(mode) {
  const m = mode || 'full';
  return body + '\n---\nJIAHAO MODE ACTIVE — level: ' + m + '\n';
}

const server = new McpServer({
  name: 'jiahao',
  version: '1.0.0',
});

// Prompt: user-invoked, returns jiahao rules
server.registerPrompt(
  'jiahao',
  {
    title: 'Jiahao Verifier Discipline',
    description: 'Inject anti-false-completion iron laws for second-party verifier agents.',
    argsSchema: {
      mode: z.enum(['lite', 'full', 'ultra']).optional().describe('Intensity level (default: full)'),
    },
  },
  ({ mode }) => ({
    messages: [{
      role: 'user',
      content: { type: 'text', text: buildInstructions(mode) },
    }],
  })
);

// Tool: read-only, returns jiahao instructions
server.registerTool(
  'jiahao_instructions',
  {
    description: 'Get jiahao verifier discipline instructions.',
    inputSchema: {
      mode: z.enum(['lite', 'full', 'ultra']).optional(),
    },
    outputSchema: {
      mode: z.string(),
      instructions: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  ({ mode }) => {
    const m = mode || 'full';
    return {
      content: [{ type: 'text', text: buildInstructions(m) }],
      structuredContent: { mode: m, instructions: buildInstructions(m) },
    };
  }
);

// Connect via stdio
server.connect(new StdioServerTransport()).catch(console.error);
