'use strict';

// test/github-templates.test.js — #137 guard.
//
// The pages under .github/ are what an outside reporter reads first. Twice
// they grew references to things this repository does not have: #41 named a
// script that was never here, #137 found a private governance vocabulary plus
// a label, an anchor and three file names that resolve nowhere. These cases
// read the paths, anchors, npm run scripts, frontmatter keys and labels the
// contribution pages name, and fail on the first one that does not land.
//
// Two things are checked indirectly, and said here rather than pretended
// about: whether a label exists on the tracker cannot be read offline, so
// labels are matched against GitHub's default set plus the table in
// docs/agents/triage-labels.md; npm built-ins (npm install, npm ci) are not
// package scripts, so only `npm run <name>` is resolved.

const fs = require('fs');
const path = require('path');
const { linksIn, resolveTarget } = require('../scripts/check-doc-links');

const ROOT = path.resolve(__dirname, '..');
const GITHUB = path.join(ROOT, '.github');

// Top-level names a contribution page is allowed to cite. `private/` is left
// out on purpose: AGENTS.md keeps the wordlist there out of any public output,
// so a page naming it is wrong whatever the tree happens to contain.
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

// Both shapes GitHub accepts: `labels: bug`, `labels: [bug, docs]` and the
// block form with `- bug` on the following lines.
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
    const item = /^\s+-\s*(.+)$/.exec(line);
    if (item) out.push(clean(item[1]));
    else if (/^\S/.test(line)) break;
  }
  return out.filter(Boolean);
}

function inlineCodeTokens(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
}

// A cited repository path: an inline-code token or a bare mention that starts
// with a top level this repository tracks, or names a root document outright.
function citedRepoPaths(text) {
  const bare = new RegExp(
    '(?:' + CITED_TOP.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')'
    + '(?:/[\\w.@/-]*)?', 'g');
  const tokens = inlineCodeTokens(text)
    .concat(ROOT_DOCS.filter((d) => text.includes(d)));
  // A bare mention only counts when it carries a slash, so the English words
  // "test" and "docs" are not read as paths.
  for (const m of text.matchAll(bare)) if (m[0].includes('/')) tokens.push(m[0]);
  const unique = new Set();
  for (const token of tokens) {
    const clean = token.split('#')[0].replace(/[.,;:)\]}]+$/, '').replace(/\/+$/, '');
    if (!clean || /[<>`*|() ]/.test(clean)) continue;
    const top = clean.split('/')[0];
    if (CITED_TOP.includes(top) || ROOT_DOCS.includes(clean)) unique.add(clean);
  }
  return [...unique].sort();
}

function siteRefs(text) {
  const site = repoSite().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Closing brackets are excluded from the path group: a link written as
  // `([text](https://…/file.md))` would otherwise capture the trailing `)`.
  const re = new RegExp('https?://' + site + '(?:/(?:blob|tree)/main/([^#?\\s)\\]]+))?(?:#([A-Za-z0-9_-]+))?', 'g');
  return [...text.matchAll(re)].map((m) => ({
    url: m[0],
    file: m[1] ? m[1].replace(/\/+$/, '') : 'README.md',
    anchor: m[2] || null,
  }));
}

function triageLabels() {
  return readRepo('docs/agents/triage-labels.md')
    .split(/\r?\n/)
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').map((c) => c.trim().replace(/`/g, '')))
    .map((cells) => cells[2])
    .filter((v) => v && v !== 'Label in our tracker' && !/^[-:]+$/.test(v));
}

function packageScripts() {
  return Object.keys(JSON.parse(readRepo('package.json')).scripts);
}

// Terms named in #137. Each is a pattern rather than a loose substring, so the
// guard does not go red on ordinary English: `CAPA` is matched case sensitively
// because `capability` is a word this repository uses. grill-t<digits> stays a
// banned shape even though the real tags adjudicated/grill-t25 and t26 exist —
// a governance round id means nothing to a reporter and belongs on no public
// page.
const RETIRED = [
  { name: 'grill-t round id', re: /grill-t\d+/ },
  { name: 'round ledger', re: /round ledger/i },
  { name: 'carve-out', re: /carve-?out/i },
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

  // Non-vacuity: a guard that silently reads nothing would pass every case
  // below, so the volume it is looking at is asserted first.
  test('the guard is reading the contribution pages and finds references', () => {
    expect(pages).toEqual(expect.arrayContaining([
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE/bug-report.md',
    ]));
    const cited = pages.reduce((n, rel) => n + citedRepoPaths(texts.get(rel)).length, 0);
    const refs = pages.reduce((n, rel) => n + siteRefs(texts.get(rel)).length, 0);
    expect(cited).toBeGreaterThan(0);
    expect(refs).toBeGreaterThan(0);
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
        const resolvedRel = filePart
          ? resolveTarget(rel, filePart)
          : rel;
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
    const templates = pages.filter((p) => p.startsWith('.github/ISSUE_TEMPLATE/') && p.endsWith('.md'));
    expect(templates.length).toBeGreaterThanOrEqual(2);
    for (const rel of templates) {
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
    const checked = [];
    for (const rel of pages.filter((p) => p.startsWith('.github/ISSUE_TEMPLATE/') && p.endsWith('.md'))) {
      const lines = frontmatter(texts.get(rel));
      if (!lines) continue;
      for (const label of fmLabels(lines)) {
        checked.push(rel);
        expect({ file: rel, label: real.includes(label) ? label : label + ' (not a known label)' })
          .toEqual({ file: rel, label: label });
      }
    }
    // Both templates carry a label; if parsing ever regresses to none, this
    // case has to go red instead of passing on an empty list.
    expect(checked.length).toBeGreaterThanOrEqual(2);
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
