'use strict';

// test/github-templates.test.js — #137 guard.
//
// Scope: the five reporter-facing pages under .github/ — the issue templates,
// their config, CONTRIBUTING.md and the PR template. `.github/workflows/` is
// CI machinery rather than a page a reporter reads, so it is out of scope here.
//
// Those pages grew references to things this repository does not have, twice:
// #41 was the PR template naming `scripts/run-test-gate.js`, which is not in the
// tree — it was deleted at de43cd7d (2026-10-20); #137 found a private
// governance vocabulary plus a label, an anchor and three file names that
// resolve nowhere. These cases read the
// paths, link anchors, npm run scripts, frontmatter keys and labels those pages
// name, and fail on the first one that does not land.
//
// Four things are narrower than the defect, and are named instead of hidden: a
// label's existence on the tracker cannot be read offline, so labels are
// matched against GitHub's default set plus the table in
// docs/agents/triage-labels.md; `npm install` and `npm ci` are npm built-ins
// rather than package scripts, so only `npm run <name>` is resolved; a path is
// read as a citation only when it starts with a citable top level or carries a
// source extension, so a bare `gates.json` or a coined `templates/anything`
// passes unexamined; and the non-vacuity count is taken across the page set
// rather than per page, so it proves the guard reads references, not that every
// page cites one.

const fs = require('fs');
const path = require('path');
const { linksIn, resolveTarget } = require('../scripts/check-doc-links');

const ROOT = path.resolve(__dirname, '..');
const GITHUB = path.join(ROOT, '.github');

// Top-level names a contribution page may cite. `private/` is absent because a
// public page must never name it (AGENTS.md keeps the wordlist there out of any
// public output) — and that ban is enforced by its own case below, not by
// leaving it out of this list and hoping the path case notices.
const CITED_TOP = [
  'src', 'hooks', 'scripts', 'docs', 'test', 'adapters', 'skills', 'schemas',
  'jiahao-mcp', 'bench', '.github', '.claude-plugin', '.agents',
];
const ROOT_DOCS = ['README.md', 'README-zh-CN.md', 'GLOSSARY.md', 'AGENTS.md', 'package.json'];

// The keys GitHub reads in an issue-template header (docs.github.com, "About
// issue and pull request templates").
const FRONTMATTER_KEYS = [
  'name', 'about', 'title', 'labels', 'assignees', 'milestones', 'projects', 'body',
];
const GITHUB_DEFAULT_LABELS = [
  'bug', 'documentation', 'duplicate', 'enhancement', 'good first issue',
  'help wanted', 'invalid', 'question', 'wontfix',
];

function walk(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function contribPages() {
  return walk(GITHUB, '.github')
    .filter((rel) => /\.(md|ya?ml)$/.test(rel))
    .filter((rel) => !rel.startsWith('.github/workflows/'))
    .sort();
}

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// The reporter-facing owner/repo is read from package.json rather than typed
// here, so a rename cannot leave this guard matching nothing and calling that
// a pass.
function repoSite() {
  const url = JSON.parse(readRepo('package.json')).repository.url;
  const m = /^(?:git\+)?https?:\/\/(github\.[a-z.]+)\/([^/]+\/[^/.]+?)(?:\.git)?\/?$/i.exec(url);
  if (!m) throw new Error('package.json repository.url is not a GitHub url: ' + url);
  return m[1] + '/' + m[2];
}

// Headings are what an `#anchor` has to match. A fenced block is skipped:
// README.md carries `# Wrote "verifier" to ...` inside a bash example.
function headings(md) {
  const found = [];
  let fenced = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^[ \t]*(`{3,}|~{3,})/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) found.push(slug(m[1]));
  }
  return found;
}

// GitHub's anchor keeps letters and digits in any script, drops other
// punctuation, and turns spaces into hyphens. \p{L} rather than \w so a heading
// in README-zh-CN.md slugs instead of collapsing to an empty string.
function slug(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
}

function frontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!m) return null;
  return m[1].split(/\r?\n/).filter((l) => l.trim() && !/^\s*#/.test(l));
}

function fmKeys(lines) {
  return lines
    .map((l) => /^([A-Za-z][\w-]*):/.exec(l))
    .filter(Boolean)
    .map((m) => m[1]);
}

// The shapes GitHub accepts: `labels: bug`, `labels: [bug, docs]`, and a block
// list under `labels:` — indented or flush with the key, both are valid YAML.
function fmLabels(lines) {
  const i = lines.findIndex((l) => /^labels:/.test(l));
  if (i === -1) return [];
  const value = lines[i].slice('labels:'.length).trim();
  const clean = (s) => s.trim().replace(/^['"]|['"]$/g, '');
  if (value) {
    const list = value.startsWith('[') ? value.slice(1, -1) : value;
    return list.split(',').map(clean).filter(Boolean);
  }
  const out = [];
  for (const line of lines.slice(i + 1)) {
    const item = /^\s*-\s*(.+)$/.exec(line);
    if (item) out.push(clean(item[1]));
    else if (/^\S/.test(line)) break;
  }
  return out.filter(Boolean);
}

function inlineCodeTokens(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
}

// A cited repository path: an inline-code token, a bare mention carrying a
// slash (so the English words "test" and "docs" are not read as paths), or any
// slashed path with a source extension — the last form is what catches a typo
// like `scipts/build-adapters.js`, whose top level is not in CITED_TOP.
function citedRepoPaths(text) {
  const top = CITED_TOP.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // Urls are this repository's own siteRefs check, not a path check: a blob
  // url read as a path would be scored against the wrong root.
  const plain = text.replace(/https?:\/\/[^\s<>)\]]+/g, ' ');
  const tokens = inlineCodeTokens(plain).concat(ROOT_DOCS.filter((d) => plain.includes(d)));
  for (const m of plain.matchAll(new RegExp('(?:' + top + ')(?:/[\\w.@/-]*)?', 'g'))) {
    if (m[0].includes('/')) tokens.push(m[0]);
  }
  for (const m of plain.matchAll(/[\w.@-]+(?:\/[\w.@-]+)+\.(?:md|js|json|ya?ml|ts|sh)/g)) {
    tokens.push(m[0]);
  }
  const unique = new Set();
  for (const token of tokens) {
    const clean = token.split('#')[0].replace(/[.,;:)\]}]+$/, '').replace(/\/+$/, '');
    if (!clean || /[<>`*|() ]/.test(clean)) continue;
    // A `../` target belongs to the page it is written in; the relative-link
    // case resolves those against that page, not against the repository root.
    if (clean.startsWith('../') || clean.startsWith('./')) continue;
    const hasExtension = /\.[a-z0-9]+$/i.test(clean);
    if (CITED_TOP.includes(clean.split('/')[0]) || ROOT_DOCS.includes(clean)
      || (clean.includes('/') && hasExtension)) unique.add(clean);
  }
  return [...unique].sort();
}

// A github.com reference to this repository. `kind` separates what this check
// can resolve (a `blob|tree/main` path, or an anchor into README.md) from a
// path it cannot (an issue, release or settings URL), so an unchecked url is
// recorded rather than silently scored against README.md. Anchors are matched
// in any script and percent-decoded, because README-zh-CN.md's headings are
// Chinese and a browser-bound link can arrive as %E8%B6....
function siteRefs(text) {
  const site = repoSite().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('https?://' + site
    + '(?:/(?:blob|tree)/main/([^#?\\s)\\]]+)|(/[^#?\\s)\\]]*))?(?:#([\\p{L}\\p{N}%][\\p{L}\\p{N}_%-]*))?', 'gu');
  return [...text.matchAll(re)].map((m) => (
    m[2]
      ? { url: m[0], kind: 'unresolved', file: null, anchor: null }
      : {
        url: m[0],
        kind: 'resolved',
        file: m[1] ? m[1].replace(/\/+$/, '') : 'README.md',
        anchor: m[3] ? decodeAnchor(m[3]) : null,
      }
  ));
}

function decodeAnchor(anchor) {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

// docs/agents/triage-labels.md carries five canonical roles. The count is
// asserted where the table is read: a header reworded or a column moved would
// otherwise change which labels this guard accepts, silently widening it.
function triageLabels() {
  const cells = readRepo('docs/agents/triage-labels.md')
    .split(/\r?\n/)
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').map((c) => c.trim().replace(/`/g, '')))
    .map((row) => row[2])
    .filter((v) => v && !/\s/.test(v) && !/^[-:]+$/.test(v));
  if (cells.length !== 5) {
    throw new Error('docs/agents/triage-labels.md: expected 5 label rows, read ' + cells.length);
  }
  return cells;
}

function packageScripts() {
  return Object.keys(JSON.parse(readRepo('package.json')).scripts);
}

// Terms named in #137. Each is a pattern rather than a loose substring, so the
// guard does not go red on ordinary English: `CAPA` is matched case sensitively
// because `capability` is a word this repository uses. A governance round id
// stays banned even though the tags adjudicated/grill-t25 and t26 are real —
// neither means anything to a reporter, and belongs on no public page.
const RETIRED = [
  { name: 'grill-t round id', re: /grill-t\d+/ },
  { name: 'round ledger', re: /round ledger/i },
  { name: 'carve-out', re: /carve-?out/i },
  { name: 'decision id (D-007 shape)', re: /\bD-\d{3,}\b/ },
  { name: 'adjudicated/ round tag', re: /adjudicated\// },
  { name: 'CAPA', re: /\bCAPA\b/ },
  { name: 'anchors.json', re: /anchors\.json/ },
  { name: 'measurement-record', re: /measurement-record/ },
  { name: 'claim-template', re: /claim-template/ },
  { name: 'devin-corpus', re: /devin-corpus/ },
  { name: 'governance anchors', re: /governance anchors?/i },
  { name: 'pairer regression', re: /pairer regression/i },
  { name: 'ADR index', re: /ADR index/i },
];

describe('.github contribution pages name things that exist', () => {
  const pages = contribPages();
  const texts = new Map(pages.map((rel) => [rel, readRepo(rel)]));
  const issueTemplates = pages.filter((p) => p.startsWith('.github/ISSUE_TEMPLATE/') && p.endsWith('.md'));

  // Non-vacuity: a guard that silently reads nothing would pass every case
  // below, so what it is looking at is asserted first. This names no file the
  // ticket added — it only requires the guard to be pointed at real pages.
  test('the guard is reading the contribution pages and finds references', () => {
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(pages).toEqual(expect.arrayContaining([
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE/bug-report.md',
    ]));
    expect(pages.filter((rel) => rel.includes('workflows'))).toEqual([]);
    const cited = pages.reduce((n, rel) => n + citedRepoPaths(texts.get(rel)).length, 0);
    // Only refs this case can actually resolve: counting the unresolved ones
    // would let a page full of /releases urls keep this assertion green while
    // nothing downstream checks anything.
    const refs = pages.reduce(
      (n, rel) => n + siteRefs(texts.get(rel)).filter((r) => r.kind === 'resolved').length, 0);
    expect(cited).toBeGreaterThan(0);
    expect(refs).toBeGreaterThan(0);
    expect(triageLabels().length).toBe(5);
  });

  test('every repository path it names is in the tree', () => {
    const missing = [];
    for (const rel of pages) {
      for (const cited of citedRepoPaths(texts.get(rel))) {
        if (!fs.existsSync(path.join(ROOT, cited))) missing.push(rel + ' -> ' + cited);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every relative link resolves to a file, and an anchor to a heading', () => {
    const broken = [];
    for (const rel of pages) {
      if (!rel.endsWith('.md')) continue;
      for (const link of linksIn(texts.get(rel))) {
        const target = link.target.replace(/^<|>$/g, '');
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) continue;
        const [filePart, anchor] = target.split('#');
        const resolvedRel = filePart ? resolveTarget(rel, filePart) : rel;
        if (!resolvedRel || !fs.existsSync(path.join(ROOT, resolvedRel))) {
          broken.push(rel + ':' + link.line + ' -> ' + target + ' (no such file)');
          continue;
        }
        if (anchor && !headings(readRepo(resolvedRel)).includes(slug(anchor))) {
          broken.push(rel + ':' + link.line + ' -> ' + target + ' (no heading slugs to "' + anchor + '")');
        }
      }
    }
    expect(broken).toEqual([]);
  });

  test('every github.com reference to this repository resolves', () => {
    const broken = [];
    for (const rel of pages) {
      for (const ref of siteRefs(texts.get(rel))) {
        if (ref.kind === 'unresolved') continue;
        if (!fs.existsSync(path.join(ROOT, ref.file))) {
          broken.push(rel + ' -> ' + ref.url + ' (no such file)');
          continue;
        }
        if (ref.anchor && !headings(readRepo(ref.file)).includes(ref.anchor)) {
          broken.push(rel + ' -> ' + ref.url + ' (no heading slugs to "' + ref.anchor + '")');
        }
      }
    }
    expect(broken).toEqual([]);
  });

  test('every npm run script it invokes is defined in package.json', () => {
    const defined = packageScripts();
    const bad = [];
    for (const rel of pages) {
      for (const m of texts.get(rel).matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g)) {
        if (!defined.includes(m[1])) bad.push(rel + ' -> npm run ' + m[1]);
      }
    }
    expect(bad).toEqual([]);
  });

  test('issue templates only use frontmatter keys GitHub reads', () => {
    expect(issueTemplates.length).toBeGreaterThanOrEqual(2);
    for (const rel of issueTemplates) {
      const lines = frontmatter(texts.get(rel));
      expect({ file: rel, frontmatter: lines === null ? 'missing' : 'present' })
        .toEqual({ file: rel, frontmatter: 'present' });
      const keys = fmKeys(lines);
      expect({ file: rel, unknownKeys: keys.filter((k) => !FRONTMATTER_KEYS.includes(k)) })
        .toEqual({ file: rel, unknownKeys: [] });
      for (const required of ['name', 'about', 'title']) expect(keys).toContain(required);
    }
  });

  test('issue templates only ask for labels this tracker has', () => {
    const real = GITHUB_DEFAULT_LABELS.concat(triageLabels());
    const bad = [];
    for (const rel of issueTemplates) {
      const lines = frontmatter(texts.get(rel));
      if (!lines) continue;
      const labels = fmLabels(lines);
      // Per template, not per sum: a parse that returns nothing for one
      // template must not be masked by another declaring two labels.
      if (!labels.length) bad.push(rel + ' -> no label parsed');
      for (const label of labels) if (!real.includes(label)) bad.push(rel + ' -> ' + label);
    }
    expect(bad).toEqual([]);
  });

  // AGENTS.md keeps the private wordlist out of any public output. The path
  // case above catches only some shapes under private/; this one covers every
  // shape, so the ban is asserted rather than claimed by a comment.
  test('no page cites the private wordlist path', () => {
    const found = [];
    for (const rel of pages) {
      for (const m of texts.get(rel).matchAll(/\bprivate\/[\w.@/-]*/gu)) found.push(rel + ' -> ' + m[0]);
    }
    expect(found).toEqual([]);
  });

  test('the retired private vocabulary stays out', () => {
    const found = [];
    for (const rel of pages) {
      for (const term of RETIRED) {
        if (term.re.test(texts.get(rel))) found.push(rel + ' -> ' + term.name);
      }
    }
    expect(found).toEqual([]);
  });
});

// #137's own defect was a claim wider than the code, and this file caught it
// twice in two rounds: first an ASCII-only anchor class while the header talked
// about CJK, then a class that still dropped a `%E4%B8%8D…` anchor while the
// comment named that very form. The capture is pinned here so the prose cannot
// outrun the regex again.
describe('the guard reads an anchor in every form a page can write it', () => {
  const site = 'github.com/Xxx91n/jiahao';

  test('a percent-encoded anchor is captured and decoded', () => {
    const refs = siteRefs('see https://' + site + '/blob/main/README-zh-CN.md#%E8%BE%B9');
    expect(refs).toHaveLength(1);
    expect({ kind: refs[0].kind, file: refs[0].file, anchor: refs[0].anchor })
      .toEqual({ kind: 'resolved', file: 'README-zh-CN.md', anchor: '边' });
  });

  test('an anchor of Chinese letters is captured', () => {
    const refs = siteRefs('see https://' + site + '#边界与限制limitations');
    expect(refs[0].anchor).toBe('边界与限制limitations');
  });

  test('a malformed escape is kept so it is reported rather than skipped', () => {
    const refs = siteRefs('see https://' + site + '#%zz');
    expect(refs[0].anchor).toBe('%zz');
  });

  test('a path this check cannot resolve is marked, not scored against README', () => {
    const refs = siteRefs('see https://' + site + '/releases');
    expect(refs[0].kind).toBe('unresolved');
  });
});
