#!/usr/bin/env node
// jiahao-mcp/index.js — MCP server exposing jiahao verifier discipline
// Mirrors ponytail-mcp pattern: registerPrompt + registerTool + stdio transport.
// For MCP-only hosts that lack system-prompt injection hooks.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const z = require('zod');
const fs = require('fs');
const path = require('path');

const { loadProfileSections } = require('../hooks/jiahao-profile');

// Read SKILL.md and split by profile (ADR-0010)
const sections = loadProfileSections(path.join(__dirname, '..'));

// Build instructions text with profile selection
function buildInstructions(mode, profile) {
  const m = mode || 'full';
  const p = profile === 'generator' ? 'generator' : 'verifier';
  return sections[p] + '\n---\nJIAHAO MODE ACTIVE — level: ' + m + '\n';
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
      profile: z.enum(['generator', 'verifier']).optional().describe('Agent profile (default: verifier)'),
    },
  },
  ({ mode, profile }) => ({
    messages: [{
      role: 'user',
      content: { type: 'text', text: buildInstructions(mode, profile) },
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
      profile: z.enum(['generator', 'verifier']).optional(),
    },
    outputSchema: {
      mode: z.string(),
      profile: z.string(),
      instructions: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  ({ mode, profile }) => {
    const m = mode || 'full';
    const p = profile || 'verifier';
    return {
      content: [{ type: 'text', text: buildInstructions(m, p) }],
      structuredContent: { mode: m, profile: p, instructions: buildInstructions(m, p) },
    };
  }
);

// Connect via stdio
server.connect(new StdioServerTransport()).catch(console.error);
