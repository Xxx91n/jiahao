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
//     its rule files, and the reserved `.jiahao-*` state namespace - matched
//     regardless of position in the argv (grill-t30 audit B-4). The state
//     files are one prefix, not an enumerated list (#88 item 4); the matching
//     detail and the missed names are in the note below the list, and the
//     census lives in STATE_SURFACE in test/protected-path.test.js;
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

// Distinctive fragments. The hook/rule names below are jiahao-owned, so a
// same-named user file elsewhere (an ordinary `hooks/` directory, a user's
// `plugin.json`) does not trip the deny; the `.jiahao-*` namespace is reserved
// wholesale below, so a user file that starts with that prefix does.
// Hook and rule fragments are anchored at a candidate's END ($), so trailing
// args / flags cannot defeat them (grill-t30 audit B-4). The state fragment
// below also matches at a name boundary, so a file inside `.jiahao-evidence/`
// counts. ^ alternation covers bare relative paths
// ("rm rules/jiahao-verifier.md"). Both separator spellings are accepted inside
// a fragment: a tool_input may carry either, and a fragment names a file, not a
// path.
// The `.jiahao-*` namespace is reserved wholesale (#88 item 4). An enumerated
// list was the shape of the bug: `.jiahao-conviction-off` / `-enforce`,
// `.jiahao-kappa-baseline.json`, `.jiahao-evidence.lock` and
// `.jiahao-calibration.jsonl` were missing, and the #110 review surfaced
// `.jiahao-anchor.json` / `.jiahao-persistence.json` as two more.
// `[a-z0-9._-]+` is the alphabet a state name may spell - dots, dashes and
// underscores are all legal in a filename (`.jiahao-evidence.keys`,
// `.jiahao-evidence.lock`, `.jiahao-sentinel.<hook>`, `.jiahao-draft_1`) - and
// `([\\/]|$)` also catches the files inside the evidence directory. The list is
// no longer a second hand-maintained copy of `src/shared/paths.js`:
// test/protected-path.test.js reads every quoted `.jiahao…` name out of the
// .js source under src/, hooks/ and jiahao-mcp/ and requires each to be denied.
// The census does not restrict the suffix to this fragment's alphabet - only
// quotes and whitespace end a name - so a state file spelled some other way
// turns the suite red instead of escaping silently.
//
// There is no exception table today. The whole prefix is reserved, so a user
// project file that happens to start with `.jiahao-` is denied as collateral;
// a name that must stay writable gets an explicit exception HERE rather than a
// narrower pattern (#88 lists the alternative as "一把抓 + 例外表").
const PROTECTED_FRAGMENTS = [
  /(^|[\\/=])hooks[\\/]jiahao-[a-z0-9-]+\.js$/,
  /(^|[\\/=])rules[\\/]jiahao-(verifier|generator)\.md$/,
  /(^|[\\/=])\.jiahao-[a-z0-9._-]+([\\/]|$)/,
];

// Windows resolves names case-insensitively, so `.JIAHAO-PROFILE` deletes the
// same file the lowercase spelling names - the Windows half of item 4, not a
// new protection class. The fragments are compiled twice and the win32 reading
// takes the folded set; a case-sensitive POSIX host keeps the two names
// distinct. isProtected() derives one `caseInsensitive` flag from the
// injected path implementation and hands it to both channels - the fragment set
// here and apparatusName() below - so the rule cannot drift between them.
// macOS reports POSIX separators but normally runs a case-insensitive
// filesystem; that residual is documented in the not-covered block below.
const PROTECTED_FRAGMENTS_FOLDED = PROTECTED_FRAGMENTS.map((re) => new RegExp(re.source, re.flags + 'i'));

// Apparatus dirs under the resolved plugin root (absolute containment).
// src/ is here because the bundle vendors the rule text and the runtime copies
// the gate reads - rewriting either is the bypass the hook map alone cannot
// stop (#71 item 2). Every host's manifest directory is listed, not just the
// Claude-shaped one: a bundle whose manifest sits somewhere unlisted is a
// manifest the guard cannot defend, which is what the WorkBuddy row exposed
// (#110). `.codex-plugin/`, `.workbuddy-plugin/`, `.zcode-plugin/`, and
// `.qoder-plugin/` are bundle-local names, so listing them costs a project
// nothing. `jiahao-mcp/` is the vendored MCP server - the writer behind the
// evidence chain - so leaving it writable let an agent rewrite the writer
// (#88 item 6).
const PROTECTED_DIRS = ['hooks', 'rules', 'src', 'jiahao-mcp', '.claude-plugin', '.codex-plugin', '.workbuddy-plugin', '.zcode-plugin', '.qoder-plugin'];
// Bundle-root files that are apparatus by position, not by name. `.mcp.json` is
// the shared registration; `plugin.json` is the Copilot CLI / Antigravity
// manifest and `hooks.json` the Antigravity hook map - both live at the bundle
// root rather than inside a directory, which is why the directory list above
// cannot cover them.
const PROTECTED_ROOT_FILES = ['.mcp.json', 'plugin.json', 'hooks.json'];

// ------------------------------------------------------------- not covered --
// The residual shapes #88 registered, each with the decision that closed it.
// These are decisions, not gaps someone forgot: read the reason before adding
// a shape.
//
// item 1 - symlink / realpath alias of the plugin root:
//   `rm /home/u/plugins/jiahao-alias/hooks/hooks.json` where jiahao-alias
//   points at the real root. Ancestor realpath resolution conflicts with this
//   hook's fail-soft contract (the target may not exist yet) and the alias
//   spelling has to be known before the shell resolves it, so an alias root
//   still passes. #88 accepted that cost (#88 comment, 2026-10-30).
//
// item 2 - the plugin root itself and its ancestors (`rm -rf <root>`): deferred
//   to #71 item 3 (read-only tool calls are still denied). Denying `<root>`
//   here would also deny `ls <root>` until that split lands.
//
// item 3 - `cd "$CLAUDE_PLUGIN_ROOT" && rm -f src/shared/protected-path.js`:
//   relative targets resolve against the hook process cwd, never a candidate
//   cwd. Treating the plugin root as a candidate cwd would also deny the same
//   relative name inside a user project - exactly the false positive #75
//   removed. Not modelled, on purpose.
//
// item 5 - brace expansion (`rm hooks/jiahao-verdict-gate.js{,.bak}`): nothing
//   expands braces here, so the token keeps the `{,.bak}` suffix, the token is
//   not split (braces are not WORD_SEPARATORS), and the end-anchored fragment
//   never sees the `.js` ending. The 53f1a2e2 baseline misses the same shape;
//   documented, not fixed.
//
// case folding on macOS: the folded fragment set is chosen by the injected path
//   implementation's separator, so Windows folds and a POSIX reading does not.
//   macOS ships case-insensitive APFS by default while reporting POSIX
//   separators, so `.JIAHAO-CONVICTION-OFF` is not folded there. Detecting the
//   filesystem's case-sensitivity would cost an fs probe per candidate and can
//   fail on a missing path; the 53f1a2e2 baseline misses the same shape.
//   Documented, not fixed (#88 item 4 reserves the namespace, not the disk).
//
// Command substitution, variables the host never exported, and glob expansion
// are excluded for the reasons stated at expandedSpelling() below.

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
  return ctx.caseInsensitive ? name.toLowerCase() : name;
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
  // The injected path implementation's separator decides: win32 folds, POSIX
  // does not. It is a proxy for the host's filesystem, not the filesystem
  // itself - macOS is the documented residual above.
  const caseInsensitive = P.sep === '\\';
  const ctx = { P: P, cwd: o.cwd || null, rootAbs: rootAbs, home: home, env: env, caseInsensitive: caseInsensitive };
  const fragments = caseInsensitive ? PROTECTED_FRAGMENTS_FOLDED : PROTECTED_FRAGMENTS;

  for (const tok of tokens(text, !caseInsensitive)) {
    for (const re of fragments) if (re.test(tok)) return true;
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
