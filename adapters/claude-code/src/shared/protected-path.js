'use strict';
// src/shared/protected-path.js — the PreToolUse enforcement-surface decision.
//
// Extracted from hooks/jiahao-pretool-guard.js (#75) because the decision is a
// pure function of (candidate text, plugin root, path implementation): only the
// host's own separator reading is exercised by a subprocess test, so the
// platform-specific half of the bug needed path.posix / path.win32 injected.
//
// The guard protects jiahao's own apparatus. Two channels decide it:
//   - PROTECTED_FRAGMENTS: the names jiahao owns outright - its hook scripts,
//     its rule files, and the .jiahao-* state files enumerated below - matched
//     at a shell token's end regardless of position in the argv
//     (grill-t30 audit B-4);
//   - absolute containment under the plugin root: everything the bundle keeps
//     in an apparatus directory, including names that are ordinary elsewhere
//     (.mcp.json, hooks/hooks.json, .claude-plugin/plugin.json) and therefore
//     must not be name fragments (#75).
//
// Fail-soft by contract: the caller decides what a hit means (deny or observe);
// this module only answers "is this path on the enforcement surface".

const os = require('os');
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
//
// Whitespace is a word boundary, not a path boundary - but it is also not the
// only way a shell spells one argument. `candidateText()` hands the tool_input
// fields over one per line and an Edit/Write `file_path` IS the whole line (a
// directory name may contain spaces); `"/root"/hooks/hooks.json` is one word
// once the quoting is undone; `John\ Doe` is one word on POSIX. Splitting on
// whitespace alone made every one of those invisible to containment, which the
// removed name fragments used to catch by accident (CodeRabbit Major on PR #83).
// So: each line is a candidate on its own, words are reassembled from adjacent
// quoted/bare chunks, and a quoted payload that contains whitespace is read
// again as its own command line (`bash -c "echo x > rules/jiahao-verifier.md"`).
// An inner path that is neither quoted nor escaped is left split - one level
// down the shell sees two arguments and never opens that file.

const WORD_SEPARATORS = ' \t\n\r\f\v;&|<>()';

// Reassembles one shell word. Adjacent quoted and bare chunks concatenate and the
// quote characters disappear, so `"/root"/hooks/hooks.json` is the one argument
// the shell will open. On POSIX a backslash escapes the next character - an
// escaped space does NOT end the word - and both spellings are kept: the raw one
// still carries a Windows-style path for the foreign-separator reading, the
// unescaped one is what the filesystem sees. An unterminated quote takes the rest
// of the line, which is what the old flat split did with it.
function readWord(line, from, escapes) {
  let word = '';
  let plain = '';
  let quoted = false;
  let escaped = false;
  let i = from;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      quoted = true;
      const close = line.indexOf(ch, i + 1);
      if (close === -1) { word += line.slice(i + 1); plain += line.slice(i + 1); return { word: word, plain: plain, quoted: quoted, escaped: escaped, next: i }; }
      word += line.slice(i + 1, close);
      plain += line.slice(i + 1, close);
      i = close + 1;
      continue;
    }
    if (escapes && ch === '\\' && i + 1 < line.length) {
      escaped = true;
      word += ch + line[i + 1];
      plain += line[i + 1];
      i += 2;
      continue;
    }
    if (WORD_SEPARATORS.indexOf(ch) !== -1) break;
    word += ch;
    plain += ch;
    i += 1;
  }
  return { word: word, plain: plain, quoted: quoted, escaped: escaped, next: i };
}

function lexWords(line, escapes) {
  const words = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'" || WORD_SEPARATORS.indexOf(ch) === -1) {
      const read = readWord(line, i, escapes);
      if (read.word) words.push(read);
      i = read.next > i ? read.next : i + 1;
      continue;
    }
    i += 1;
  }
  return words;
}

function tokens(text, escapes) {
  const out = [];
  const seen = new Set();
  const push = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  for (const line of String(text || '').split('\n')) {
    push(line.trim());
    for (const entry of lexWords(line, escapes)) {
      push(entry.word);
      if (entry.escaped) push(entry.plain);
      // a quoted payload is its own command line one level down: read the paths
      // inside it (`bash -c "echo x > rules/jiahao-verifier.md"`)
      if (entry.quoted && /[ \t]/.test(entry.word)) {
        for (const inner of lexWords(entry.word, escapes)) push(inner.word);
      }
    }
  }
  return out;
}

// A token can be spelled the way the shell wrote it rather than the way the
// filesystem sees it. Three spellings reach the guard as text and still name a
// file inside the plugin root:
//   - the other platform's separator (a path copied from a Windows shell
//     reaches a POSIX host, and a JSON tool_input on Windows carries forward
//     slashes);
//   - `~` and an environment variable (`$HOME`, `${HOME}`, `%USERPROFILE%`,
//     `$env:HOME`), which the shell expands before anything touches a file;
//   - the host's own plugin-root variable, which is literally how the hook map
//     spells the bundle path.
// The host-native reading is the one that actually mutates the file; every
// other reading only closes a gap, because the expanded result still has to
// resolve below the root to count. So a spelling that merely *looks* like the
// apparatus (an unexpanded `$HOMEDIR`, a user project under the same home) is
// still allowed.
const HOME_VARS = ['HOME', 'USERPROFILE'];
const ROOT_VARS = ['CLAUDE_PLUGIN_ROOT', 'CODEBUDDY_PLUGIN_ROOT'];
// The two lists above are this module's own constants - never caller or host
// input - which is what makes building a RegExp out of them safe. Precompiled
// and gated by a cheap indexOf: this runs over every token of a payload that can
// be megabytes large, inside a host timeout that kills the hook instead of
// waiting for it.
const BARE_NAME_RE = {
  HOME: /\$HOME(?![A-Za-z0-9_])/g,
  USERPROFILE: /\$USERPROFILE(?![A-Za-z0-9_])/g,
  CLAUDE_PLUGIN_ROOT: /\$CLAUDE_PLUGIN_ROOT(?![A-Za-z0-9_])/g,
  CODEBUDDY_PLUGIN_ROOT: /\$CODEBUDDY_PLUGIN_ROOT(?![A-Za-z0-9_])/g,
};

function substituteName(tok, name, value) {
  if (!value || tok.indexOf(name) === -1) return tok;
  // $NAME needs a boundary so $HOMEDIR is not read as $HOME + "DIR"; the other
  // three syntaxes are delimited by their own punctuation. The function
  // replacement keeps a `$` inside the substituted value literal.
  return tok
    .split('${' + name + '}').join(value)
    .split('%' + name + '%').join(value)
    .split('$env:' + name).join(value)
    .replace(BARE_NAME_RE[name], function () { return value; });
}

function expandedSpelling(tok, ctx) {
  // almost every token is a plain path: with no marker anywhere in it, there is
  // nothing to expand
  if (tok.indexOf('$') === -1 && tok.indexOf('%') === -1 && tok.charAt(0) !== '~') return tok;
  let out = tok;
  for (const name of HOME_VARS) out = substituteName(out, name, ctx.home);
  for (const name of ROOT_VARS) out = substituteName(out, name, ctx.rootAbs);
  if (ctx.home && (out === '~' || out.startsWith('~/') || out.startsWith('~\\'))) out = ctx.home + out.slice(1);
  return out;
}

function foreignSpelling(P, tok) {
  return P.sep === '/' ? tok.split('\\').join('/') : tok.split('/').join('\\');
}

function readings(ctx, tok) {
  const resolve = (p) => (ctx.cwd ? ctx.P.resolve(ctx.cwd, p) : ctx.P.resolve(p));
  const spellings = [tok];
  const expanded = expandedSpelling(tok, ctx);
  if (expanded !== tok) spellings.push(expanded);
  const out = [];
  for (const spelling of spellings) {
    out.push(resolve(spelling));
    const foreign = foreignSpelling(ctx.P, spelling);
    if (foreign !== spelling) out.push(resolve(foreign));
  }
  return out.filter(function (abs, i) { return out.indexOf(abs) === i; });
}

// Path segments of `abs` below the plugin root, or null when it is not below
// it. `..` first, a different drive, and the root itself all read as outside.
// Split on the implementation's own separator only: a backslash is a legal
// POSIX filename character, and folding it in here would rename a file.
function belowRoot(ctx, abs) {
  const rel = ctx.P.relative(ctx.rootAbs, abs);
  if (!rel || ctx.P.isAbsolute(rel)) return null;
  const segments = rel.split(ctx.P.sep);
  return segments[0] === '..' ? null : segments;
}

// Windows compares paths case-insensitively, so `SRC` is `src`; on a POSIX host
// they are different directories and the name is taken as written.
function apparatusName(ctx, name) {
  return ctx.P.sep === '\\' ? name.toLowerCase() : name;
}

function isProtected(text, pluginRoot, opts) {
  const o = opts || {};
  const P = o.pathImpl || path;
  const env = o.env || process.env;
  if (!text) return false;
  const rootAbs = pluginRoot
    ? (o.cwd ? P.resolve(o.cwd, pluginRoot) : P.resolve(pluginRoot))
    : null;
  // A hook process does not always inherit HOME, and `~` is still what the user
  // typed. os.homedir() asks the kernel instead of the environment.
  let home = env.HOME || env.USERPROFILE || null;
  if (!home) { try { home = (o.homedir || os.homedir)() || null; } catch (e) { home = null; } }
  const ctx = { P: P, cwd: o.cwd || null, rootAbs: rootAbs, home: home };

  for (const tok of tokens(text, P.sep === '/')) {
    for (const re of PROTECTED_FRAGMENTS) if (re.test(tok)) return true;
    if (!rootAbs) continue;
    for (const abs of readings(ctx, tok)) {
      const segments = belowRoot(ctx, abs);
      if (!segments) continue;
      const top = apparatusName(ctx, segments[0]);
      if (PROTECTED_DIRS.indexOf(top) !== -1) return true;
      if (segments.length === 1 && PROTECTED_ROOT_FILES.indexOf(top) !== -1) return true;
    }
  }
  return false;
}

module.exports = { isProtected };
