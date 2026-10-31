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
//     at a candidate's end regardless of position in the argv
//     (grill-t30 audit B-4);
//   - absolute containment under the plugin root: everything the bundle keeps
//     in an apparatus directory, including names that are ordinary elsewhere
//     (.mcp.json, hooks/hooks.json, .claude-plugin/plugin.json) and therefore
//     must not be name fragments (#75).
//
// The second channel is the one that has to be strict: it replaces the fragments
// it removed, so every way the shell spells "that file" has to reach it - see
// tokens() and expandedSpelling().
//
// Fail-soft by contract: the caller decides what a hit means (deny or observe);
// this module only answers "is this path on the enforcement surface".

const os = require('os');
const path = require('path');

// Distinctive fragments - fragments only cover paths whose names are
// jiahao-owned, so a same-named user file elsewhere does not trip the deny.
// Anchored at a candidate's END ($), so trailing args / flags cannot defeat it
// (grill-t30 audit B-4). ^ alternation covers bare relative paths
// ("rm rules/jiahao-verifier.md"). Both separator spellings are accepted inside
// a fragment: a tool_input may carry either, and a fragment names a file, not a
// path.
const PROTECTED_FRAGMENTS = [
  /(^|[\\/=])hooks[\\/]jiahao-[a-z0-9-]+\.js$/,
  /(^|[\\/=])rules[\\/]jiahao-(verifier|generator)\.md$/,
  /(^|[\\/=])\.jiahao-(active|profile|evidence|evidence\.keys|instructions\.jsonl|pretool\.jsonl)([\\/]|$)/,
];
// Apparatus dirs under the resolved plugin root (absolute containment).
// src/ is here because the bundle vendors the rule text and the runtime copies
// the gate reads - rewriting either is the bypass the hook map alone cannot
// stop (#71 item 2). .zcode-plugin is ZCode's manifest directory (#108), the
// same protection .claude-plugin gets for the other bundles.
const PROTECTED_DIRS = ['hooks', 'rules', 'src', '.claude-plugin', '.zcode-plugin'];
// Bundle-root files that are apparatus by position, not by name.
const PROTECTED_ROOT_FILES = ['.mcp.json'];

// ---------------------------------------------------------------- candidates --

// Whitespace is a word boundary, not a path boundary - and it is not the only way
// a shell spells one argument. `candidateText()` hands the tool_input fields over
// one per line and an Edit/Write `file_path` IS the whole line (a directory name
// may contain spaces); `"/root"/hooks/hooks.json` is one argument once the
// quoting is undone; on POSIX `John\ Doe` is one argument too. Splitting on
// whitespace alone made every one of those invisible to containment, which the
// removed name fragments used to catch by accident (CodeRabbit Major on PR #83).
//
// So candidates are: the whole line, every reassembled word, the de-escaped
// spelling of a word that used backslashes, and the words inside a quoted payload
// (`bash -c "echo x > rules/jiahao-verifier.md"` runs that text as its own command
// line, so it is read again, nested up to MAX_QUOTE_DEPTH). A path that is neither
// quoted nor escaped stays split - one level down the shell sees two arguments and
// never opens that file, and this is the same class of shape #75 removed from the
// fragment list on purpose.
const WORD_SEPARATORS = ' \t\n\r\f\v;&|<>()';
const MAX_QUOTE_DEPTH = 3;

// One shell word: adjacent quoted and bare chunks concatenate, the quote
// characters disappear. An unterminated quote takes the rest of the line, which is
// what the old flat split did with it. Parts are collected as slices and joined
// once - this runs over payloads measured in megabytes inside a host timeout.
const DQ_ESCAPABLE = '$`"\\';

// Inside double quotes a backslash escapes only these four, and everywhere else
// it is literal; inside single quotes nothing is escaped.
function findQuoteEnd(line, quote, from, escapes) {
  if (quote !== '"' || !escapes) return line.indexOf(quote, from);
  let k = from;
  while (k < line.length) {
    if (line[k] === '\\' && k + 1 < line.length && DQ_ESCAPABLE.indexOf(line[k + 1]) !== -1) { k += 2; continue; }
    if (line[k] === quote) return k;
    k += 1;
  }
  return -1;
}

function readWord(line, from, escapes) {
  const raw = [];
  const plain = [];
  let quoted = false;
  let escaped = false;
  let i = from;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      quoted = true;
      const close = findQuoteEnd(line, ch, i + 1, escapes);
      if (close === -1) {
        raw.push(line.slice(i + 1)); plain.push(line.slice(i + 1));
        i = line.length;
        break;
      }
      const inner = line.slice(i + 1, close);
      raw.push(inner);
      if (ch === '"' && escapes && inner.indexOf('\\') !== -1) {
        escaped = true;
        plain.push(inner.replace(/\\([$`"\\])/g, '$1'));
      } else {
        plain.push(inner);
      }
      i = close + 1;
      continue;
    }
    if (escapes && ch === '\\' && i + 1 < line.length) {
      escaped = true;
      raw.push(ch + line[i + 1]); plain.push(line[i + 1]);
      i += 2;
      continue;
    }
    // the word ends here: a separator at this position is not part of it
    if (WORD_SEPARATORS.indexOf(ch) !== -1) break;
    let j = i;
    while (j < line.length) {
      const c = line[j];
      if (c === '"' || c === "'") break;
      if (escapes && c === '\\' && j + 1 < line.length) break;
      if (WORD_SEPARATORS.indexOf(c) !== -1) break;
      j += 1;
    }
    if (j === i) { j = i + 1; } // a character nothing else claimed (trailing `\`)
    const run = line.slice(i, j);
    raw.push(run); plain.push(run);
    i = j;
  }
  return { word: raw.join(''), plain: plain.join(''), quoted: quoted, escaped: escaped, next: i };
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
  const pushWord = (value) => {
    push(value);
    // `--config=<path>`, `of=<path>`: the argument's value begins after the first
    // `=`, and that value is the path the tool opens. The fragments this ticket
    // removed used to catch the spelling by name; containment has to catch it now
    // (#75 review). The `=` inside PROTECTED_FRAGMENTS' boundary class is the same
    // intent, one level earlier.
    const eq = value.indexOf('=');
    if (eq !== -1) push(value.slice(eq + 1));
  };
  const readLine = (line, depth) => {
    push(line.trim());
    for (const entry of lexWords(line, escapes)) {
      pushWord(entry.word);
      if (entry.escaped) pushWord(entry.plain);
      if (entry.quoted && depth < MAX_QUOTE_DEPTH && /[ \t]/.test(entry.word)) {
        readLine(entry.word, depth + 1);
        if (entry.escaped) readLine(entry.plain, depth + 1);
      }
    }
  };
  for (const line of String(text || '').split('\n')) readLine(line, 0);
  return out;
}

// A candidate can also be spelled the way the shell wrote it rather than the way
// the filesystem sees it:
//   - a variable reference (`$HOME`, `${HOME}`, `%USERPROFILE%`, `$env:HOME`, and
//     any other name the host does have in its environment), which the shell
//     substitutes before anything touches a file;
//   - `~`, which the shell substitutes from the account, not from the environment.
// The host-native reading is the one that actually mutates the file; every other
// reading only closes a gap, because the substituted result still has to resolve
// below the root to count. So a spelling that merely *looks* like the apparatus -
// an unknown `$SOMEVAR`, a user project under the same home - is still allowed.
// Not modelled, and deliberately not pretended to be: command substitution
// (`$(...)`, backticks), because their values are not knowable here, and glob
// expansion, because the files may not exist yet.
const REF_BRACED = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const REF_POWERSHELL = /\$env:([A-Za-z_][A-Za-z0-9_]*)/g;
const REF_BARE = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
const REF_PERCENT = /%([A-Za-z_][A-Za-z0-9_]*)%/g;

function refValue(name, ctx) {
  // The plugin-root variables are how the hook map spells the bundle, so they are
  // answered even when the host did not export them into this process.
  if (name === 'CLAUDE_PLUGIN_ROOT' || name === 'CODEBUDDY_PLUGIN_ROOT') return ctx.rootAbs || null;
  const value = ctx.env[name];
  if (typeof value === 'string' && value.length > 0) return value;
  if (name === 'HOME' || name === 'USERPROFILE') return ctx.home || null;
  return null;
}

function expandRef(match, name, ctx) {
  const value = refValue(name, ctx);
  return value === null ? match : value;
}

function expandedSpelling(tok, ctx) {
  // almost every candidate is a plain path: with no marker anywhere in it there is
  // nothing to expand, and the passes below are full string scans
  if (tok.indexOf('$') === -1 && tok.indexOf('%') === -1 && tok.charAt(0) !== '~') return tok;
  const sub = (match, name) => expandRef(match, name, ctx);
  let out = tok
    .replace(REF_BRACED, sub)
    .replace(REF_POWERSHELL, sub)
    .replace(REF_BARE, sub)
    .replace(REF_PERCENT, sub);
  if (ctx.home && (out === '~' || out.startsWith('~/') || out.startsWith('~\\'))) out = ctx.home + out.slice(1);
  return out;
}

// No separator folding: `path.win32` already accepts forward slashes, while on
// POSIX a backslash is an ordinary character in a filename - folding it there
// would read a file literally named `hooks\hooks.json` as if it were the hook
// map. Rewriting separators before resolving is the bug #75 was filed about.
function readings(ctx, tok) {
  const resolve = (p) => (ctx.cwd ? ctx.P.resolve(ctx.cwd, p) : ctx.P.resolve(p));
  const spellings = [tok];
  const expanded = expandedSpelling(tok, ctx);
  if (expanded !== tok) spellings.push(expanded);
  const out = [];
  for (const spelling of spellings) out.push(resolve(spelling));
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
  const ctx = { P: P, cwd: o.cwd || null, rootAbs: rootAbs, home: home, env: env };

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
