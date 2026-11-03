'use strict';

// test/github-templates.test.js — #137 guard.
//
// The pages under .github/ are the first thing an outside reporter reads.
// Twice now they grew references to things this repository does not have:
// #41 named a script that was never there, #137 found a whole private
// governance vocabulary plus a label, an anchor and a file that resolve
// nowhere. These cases read every path, anchor, command and label the
// contribution pages name and fail on the first one that does not land.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GITHUB = path.join(ROOT, '.github');

// Only directories this repository tracks are treated as repo paths, so a
// runtime path (`<config-dir>/.jiahao-profile`), a build directory
// (`release-artifacts/`) and an action name (`actions/checkout@v4`) are not
// mistaken for one.
const TRACKED_TOP = [
  'src', 'hooks', 'scripts', 'docs', 'test', 'adapters', 'skills',
  'schemas', 'jiahao-mcp', 'bench', '.github',
];
const ROOT_DOCS = ['README.md', 'README-zh-CN.md', 'GLOSSARY.md', 'AGENTS.md', 'package.json'];

const FRONTMATTER_KEYS = ['name', 'about', 'title', 'labels', 'assignees', 'milestones', 'body'];
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

// Headings are what an `#anchor` has to match. A fenced block is skipped:
// README.md carries `# Wrote "verifier" to ...` inside a bash example.
function headings(md) {
  const found = [];
  let fenced = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line.trim())) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) found.push(slug(m[1]));
  }
  return found;
}

function slug(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function frontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!m) return null;
  return m[1].split(/\r?\n/).filter((l) => l.includes(':'));
}

function fmKeys(lines) {
  return lines.map((l) => l.split(':')[0].trim()).filter(Boolean);
}

function fmLabels(lines) {
  const line = lines.find((l) => /^labels:/.test(l));
  if (!line) return [];
  const value = line.slice('labels:'.length).trim();
  const list = value.startsWith('[') ? value.slice(1, -1) : value;
  return list.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function inlineCodeTokens(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
}

// A Markdown link is `](target)` — a bare `(url)` in prose or a call in the
// workflow's embedded JavaScript is not one.
function linkTargets(text) {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1].replace(/^<|>$/g, ''));
}

// The candidate rule: a token that starts with a tracked top directory,
// or names a root document outright.
function candidateRepoPath(token) {
  const clean = token.split('#')[0].replace(/\/+$/, '');
  if (!clean || /[<>`*|() ]/.test(clean)) return null;
  const top = clean.split('/')[0];
  if (TRACKED_TOP.includes(top)) return clean;
  if (!clean.includes('/') && ROOT_DOCS.includes(clean)) return clean;
  return null;
}

function githubSiteRef(url) {
  const m = /^https?:\/\/github\.com\/Xxx91n\/jiahao(?:\/(?:blob|tree)\/main\/([^#?\s]+))?(?:#([A-Za-z0-9_-]+))?/.exec(url);
  if (!m) return null;
  return { file: m[1] ? m[1].replace(/\/$/, '') : 'README.md', anchor: m[2] || null };
}

// A URL written bare in the body of a page, not as a Markdown link.
function rawUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s`"'<>|)]+/g)].map((m) => m[0]);
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

describe('.github contribution pages name things that exist', () => {
  const pages = contribPages();

  test('the guard is reading something', () => {
    expect(pages.length).toBeGreaterThanOrEqual(4);
    expect(pages).toContain('.github/PULL_REQUEST_TEMPLATE.md');
  });

  test('every repository path it names is in the tree', () => {
    const missing = [];
    for (const rel of pages) {
      const text = readRepo(rel);
      for (const token of inlineCodeTokens(text)) {
        const candidate = candidateRepoPath(token);
        if (candidate && !fs.existsSync(path.join(ROOT, candidate))) {
          missing.push(rel + ' -> `' + token + '`');
        }
      }
      if (!rel.endsWith('.md')) continue;
      for (const target of linkTargets(text)) {
        if (/^https?:/.test(target) || target.startsWith('#')) continue;
        const resolved = path.resolve(path.join(ROOT, path.dirname(rel)), target.split('#')[0]);
        if (!fs.existsSync(resolved)) missing.push(rel + ' -> ' + target);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every jiahao.github.com anchor lands on a real heading', () => {
    const broken = [];
    for (const rel of pages) {
      for (const target of linkTargets(readRepo(rel)).concat(rawUrls(readRepo(rel)))) {
        const ref = githubSiteRef(target);
        if (!ref) continue;
        if (ref.file && !fs.existsSync(path.join(ROOT, ref.file))) {
          broken.push(rel + ' -> ' + target + ' (no such file)');
          continue;
        }
        if (ref.anchor && !headings(readRepo(ref.file)).includes(ref.anchor)) {
          broken.push(rel + ' -> ' + target + ' (no heading slugs to "' + ref.anchor + '")');
        }
      }
    }
    expect(broken).toEqual([]);
  });

  test('every npm script it runs is defined in package.json', () => {
    const defined = packageScripts();
    const bad = [];
    for (const rel of pages) {
      for (const m of readRepo(rel).matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g)) {
        if (!defined.includes(m[1])) bad.push(rel + ' -> npm run ' + m[1]);
      }
    }
    expect(bad).toEqual([]);
  });

  test('issue templates only use frontmatter keys GitHub reads', () => {
    const templates = pages.filter((p) => p.startsWith('.github/ISSUE_TEMPLATE/'))
      .filter((p) => p.endsWith('.md'));
    expect(templates.length).toBeGreaterThanOrEqual(2);
    for (const rel of templates) {
      const lines = frontmatter(readRepo(rel));
      expect({ file: rel, lines: lines === null ? 'no frontmatter' : 'present' })
        .toEqual({ file: rel, lines: 'present' });
      const keys = fmKeys(lines);
      expect({ file: rel, keys: keys.filter((k) => !FRONTMATTER_KEYS.includes(k))})
        .toEqual({ file: rel, keys: [] });
      for (const required of ['name', 'about']) {
        expect(keys).toContain(required);
      }
    }
  });

  test('issue templates only ask for labels this tracker has', () => {
    const real = GITHUB_DEFAULT_LABELS.concat(triageLabels());
    for (const rel of pages.filter((p) => p.endsWith('.md'))) {
      const lines = frontmatter(readRepo(rel));
      if (!lines) continue;
      for (const label of fmLabels(lines)) {
        expect({ file: rel, label: real.includes(label) ? label : label + ' (not a known label)' })
          .toEqual({ file: rel, label: label });
      }
    }
  });

  test('the retired private vocabulary stays out', () => {
    // Named in #137: a governance round tag, a document that is not in this
    // repository, and measurement artefacts a reporter cannot open.
    const retired = [
      'grill-t', 'round ledger', 'carve-out', 'CAPA', 'anchors.json',
      'measurement-record', 'claim-template', 'devin-corpus',
      'governance anchor', 'pairer regression', 'ADR index',
    ];
    const found = [];
    for (const rel of contribPages()) {
      const text = readRepo(rel);
      for (const term of retired) {
        if (text.toLowerCase().includes(term.toLowerCase())) found.push(rel + ' -> ' + term);
      }
    }
    expect(found).toEqual([]);
  });
});
