#!/usr/bin/env node
// jiahao-subagent.js — SubagentStart hook
// Inject jiahao discipline into verifier subagents.
// Uses agent_type matcher to filter (verify|review|critic|check).

const fs = require('fs');
const path = require('path');
const { writeHookOutput, normalizePayload } = require('./jiahao-runtime');
const sentinel = require('../src/sentinel').begin('jiahao-subagent');

// Read stdin (hook input JSON)
// Windows stdin hang guard: fires only while stdin is still silent. Cleared the
// moment stdin ends - after that the only pending work is the stdout write, and
// a forced exit would truncate it (#84).
const stdinGuard = setTimeout(() => process.exit(typeof process.exitCode === 'number' ? process.exitCode : 0), 1000);
stdinGuard.unref();
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinGuard); // stdin arrived; the hang guard has done its job
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  parsed = normalizePayload(parsed);
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
