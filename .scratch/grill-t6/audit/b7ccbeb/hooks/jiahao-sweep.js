#!/usr/bin/env node
// jiahao-sweep.js — ADR-0024 D3: SessionEnd sweep (Session-End Sweep).
// Thin wrapper around sentinel.reconcile(): heals residual sentinels at
// session end. Pure-sync fs work, far inside host budgets (Codex 3s /
// Claude Code 1.5-60s). If the host never fires SessionEnd, nothing here
// changes — the next session's first hook reconcile remains the baseline.
// Never blocks: every failure path exits 0.
const { configDir } = require('../src/shared/paths');
try { require('../src/sentinel').reconcile(configDir()); } catch (e) { /* degrade silently */ }
process.exit(0);
