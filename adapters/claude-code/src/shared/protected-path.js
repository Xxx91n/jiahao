'use strict';
// src/shared/protected-path.js — the PreToolUse enforcement-surface decision.
//
// Extracted from hooks/jiahao-pretool-guard.js (#75) because the decision is a
// pure function of (candidate text, plugin root, path implementation): only the
// host's own separator reading is exercised by a subprocess test, so the
// platform-specific half of the bug needed path.posix / path.win32 injected.
//
// The guard protects jiahao's own apparatus. Two channels decide it:
//   - PROTECTED_FRAGMENTS: names jiahao owns outright (jiahao-*, .jiahao-*),
//     matched at a shell token's end regardless of position in the argv
//     (grill-t30 audit B-4);
//   - absolute containment under the plugin root: everything the bundle keeps
//     in an apparatus directory, including names that are ordinary elsewhere
//     (.mcp.json, hooks/hooks.json, .claude-plugin/plugin.json) and therefore
//     must not be name fragments (#75).
//
// Fail-soft by contract: the caller decides what a hit means (deny or observe);
// this module only answers "is this path on the enforcement surface".

const path = require('path');

// Distinctive fragments - fragments only cover paths whose names are
// jiahao-owned, so a same-named user file elsewhere does not trip the deny.
// Token-anchored: each fragment is evaluated against a shell token's END
// ($), so trailing args / flags cannot defeat it (grill-t30 audit B-4).
// ^ alternation covers bare relative paths ("rm rules/jiahao-verifier.md").
// Both separator spellings are accepted inside a fragment: a tool_input may
// carry either, and a fragment names a file, not a path.
const PROTECTED_FRAGMENTS = [
  /(^|[\\/=])hooks[\\/]jiahao-[a-z0-9-]+\.js$/,
  /(^|[\\/=])rules[\\/]jiahao-(verifier|generator)\.md$/,
  /(^|[\\/=])\.jiahao-(active|profile|evidence|evidence\.keys|instructions\.jsonl|pretool\.jsonl)([\\/]|$)/,
];
// Apparatus dirs under the resolved plugin root (absolute containment).
// src/ is here because the bundle vendors the rule text and the runtime copies
// the gate reads - rewriting either is the bypass the hook map alone cannot
// stop (#71 item 2).
const PROTECTED_DIRS = ['hooks', 'rules', 'src', '.claude-plugin'];
// Bundle-root files that are apparatus by position, not by name.
const PROTECTED_ROOT_FILES = ['.mcp.json'];

// Command payloads are split into shell tokens so a protected name is
// matched at token end regardless of position in the argv (grill-t30 B-4:
// `rm rules/jiahao-verifier.md` and `rm <abs> extra` both resolve).
// Separators are left exactly as they arrived: rewriting them before resolve()
// turned an absolute POSIX path into a relative one and switched the whole
// containment check off on that platform (#75).
function tokens(text) {
  return String(text || '').split(/[\s;&|<>()"']+/).filter(Boolean);
}

// A token can be spelled with the other platform's separator - a path copied
// from a Windows shell reaches a POSIX host, and a JSON tool_input on Windows
// carries forward slashes. The host-native reading is the one that actually
// mutates a file; the other reading only closes the gap where a foreign
// spelling names a file inside the plugin root, so it cannot widen the deny
// surface anywhere else.
function readings(P, cwd, tok) {
  const resolve = (p) => (cwd ? P.resolve(cwd, p) : P.resolve(p));
  const native = resolve(tok);
  const foreignTok = P.sep === '/' ? tok.split('\\').join('/') : tok.split('/').join('\\');
  if (foreignTok === tok) return [native];
  const foreign = resolve(foreignTok);
  return foreign === native ? [native] : [native, foreign];
}

// Path segments of `abs` below the plugin root, or null when it is not below
// it. `..` first, a different drive, and the root itself all read as outside.
function belowRoot(P, rootAbs, abs) {
  const rel = P.relative(rootAbs, abs);
  if (!rel || P.isAbsolute(rel)) return null;
  const segments = rel.split(/[\\/]/);
  return segments[0] === '..' ? null : segments;
}

// Windows compares paths case-insensitively, so `SRC` is `src`; on a POSIX host
// they are different directories and the name is taken as written.
function apparatusName(P, name) {
  return P.sep === '\\' ? name.toLowerCase() : name;
}

function isProtected(text, pluginRoot, opts) {
  const o = opts || {};
  const P = o.pathImpl || path;
  if (!text) return false;
  const rootAbs = pluginRoot
    ? (o.cwd ? P.resolve(o.cwd, pluginRoot) : P.resolve(pluginRoot))
    : null;
  for (const tok of tokens(text)) {
    for (const re of PROTECTED_FRAGMENTS) if (re.test(tok)) return true;
    if (!rootAbs) continue;
    for (const abs of readings(P, o.cwd, tok)) {
      const segments = belowRoot(P, rootAbs, abs);
      if (!segments) continue;
      const top = apparatusName(P, segments[0]);
      if (PROTECTED_DIRS.indexOf(top) !== -1) return true;
      if (segments.length === 1 && PROTECTED_ROOT_FILES.indexOf(top) !== -1) return true;
    }
  }
  return false;
}

module.exports = { isProtected };
