#!/usr/bin/env node
// jiahao-subagent.js — SubagentStart hook
// Inject jiahao discipline into verifier subagents.
// Uses agent_type matcher to filter (verify|review|critic|check).

const fs = require('fs');
const path = require('path');
const { writeHookOutput } = require('./jiahao-runtime');
const sentinel = require('../src/sentinel').begin('jiahao-subagent');

// Read stdin (hook input JSON)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  sentinel.set('scan', parsed.session_id || null);

  const agentType = parsed.agent_type || parsed.agentType || '';
  const matcher = process.env.JIAHAO_SUBAGENT_MATCHER || 'verify|review|critic|check';

  // Fail-open: if we cannot determine agent type, inject anyway
  const shouldInject = !agentType || new RegExp(matcher, 'i').test(agentType);

  if (!shouldInject) {
    sentinel.end();
    process.exit(0);
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR || process.env.HOME || '/tmp';
  const flagPath = configDir + '/.jiahao-active';
  const mode = fs.existsSync(flagPath)
    ? fs.readFileSync(flagPath, 'utf8').trim()
    : 'full';

  const skillPath = path.join(__dirname, '..', 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const body = skill.replace(/^---[\s\S]*?---\n/, '');

  const injection = body + '\n---\nJIAHAO MODE ACTIVE (subagent) — level: ' + mode + '\n';

  sentinel.set('write');
  writeHookOutput(injection, 'SubagentStart');
  sentinel.end();
});

// Windows stdin hang guard (ponytail #443 lesson)
setTimeout(() => process.exit(0), 1000).unref();
