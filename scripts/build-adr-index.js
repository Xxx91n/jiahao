#!/usr/bin/env node
// build-adr-index.js - ADR-0043 cluster 1: the README ADR index is a derived
// artifact of docs/adr/ (fact source = file names + H1 titles). The generator
// owns the sentinel region <!-- adr-index:start --> / <!-- adr-index:end -->
// in README.md and rebuilds it wholesale; write mode and --check share one
// generation path (regen-and-diff, ADR-0028 D2 precedent). Zero-dependency,
// deterministic: filename sort, H1 verbatim, no timestamps.
//
// Usage: node scripts/build-adr-index.js [--check]
// Exit 0 = in sync (or written), exit 1 = drift / failure (fail-closed).

'use strict';

const fs = require('fs');
const path = require('path');
const { PREFIXES } = require('../src/shared/prefix-vocab');
const { requireCapabilities } = require('../src/shared/capability');

const ROOT = path.join(__dirname, '..');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const README = path.join(ROOT, 'README.md');
const SENTINEL_START = '<!-- adr-index:start -->';
const SENTINEL_END = '<!-- adr-index:end -->';

// Pure: directory listing -> [{file, title}]. Title = first H1 line with the
// "ADR-NNNN: " prefix stripped (the two fields that are 100% stable, D5).
function listAdrEntries(adrDir) {
  const files = fs.readdirSync(adrDir)
    .filter(function (f) { return /^\d{4}-.+\.md$/.test(f); })
    .sort();
  return files.map(function (f) {
    const lines = fs.readFileSync(path.join(adrDir, f), 'utf8').split(/\r?\n/);
    const h1 = lines.filter(function (l) { return l.indexOf('# ') === 0; })[0] || '';
    return { file: f, title: h1.slice(2).trim().replace(/^ADR-\d{4}:\s*/, '') };
  });
}

// Pure: entries -> sentinel region text (sentinel lines included).
function renderRegion(entries) {
  const lines = [SENTINEL_START, '- ' + entries.length + ' architecture decision records:'];
  entries.forEach(function (e) {
    lines.push('- [ADR-' + e.file.slice(0, 4) + '](docs/adr/' + e.file + ') — ' + e.title);
  });
  lines.push(SENTINEL_END);
  return lines.join('\n');
}

// Pure: splice a region into readme text between the sentinel lines.
function spliceRegion(readme, region) {
  const i = readme.indexOf(SENTINEL_START);
  const j = readme.indexOf(SENTINEL_END);
  if (i === -1 || j === -1 || j < i) throw new Error('adr-index sentinel region missing or inverted in README.md');
  if (readme.indexOf(SENTINEL_START, i + 1) !== -1 || readme.indexOf(SENTINEL_END, j + 1) !== -1) throw new Error('duplicate adr-index sentinel marker in README.md');
  return readme.slice(0, i) + region + readme.slice(j + SENTINEL_END.length);
}

function main(argv) {
  requireCapabilities('adr-index'); // ADR-0040 D2: docs/adr lives on the git-tree surface only (ADR-0039)
  const check = argv.indexOf('--check') !== -1;
  let region;
  let readme;
  let next;
  try {
    region = renderRegion(listAdrEntries(ADR_DIR));
    readme = fs.readFileSync(README, 'utf8');
    next = spliceRegion(readme, region);
  } catch (e) {
    console.error(PREFIXES.config + ' FAIL: ' + e.message);
    process.exit(1);
  }
  if (check) {
    if (next === readme) { console.log('README ADR index in sync with docs/adr'); process.exit(0); }
    const have = readme.slice(readme.indexOf(SENTINEL_START), readme.indexOf(SENTINEL_END) + SENTINEL_END.length).split('\n');
    const want = region.split('\n');
    for (let k = 0; k < Math.max(have.length, want.length); k++) {
      if (have[k] !== want[k]) {
        console.error('adr-index region line ' + (k + 1) + ':\n  have: ' + have[k] + '\n  want: ' + want[k]);
        break;
      }
    }
    console.error('\nDrift detected. Run: node scripts/build-adr-index.js');
    process.exit(1);
  }
  if (next !== readme) {
    fs.writeFileSync(README, next);
    console.log('README ADR index rebuilt (' + (region.split('\n').length - 3) + ' entries)');
  } else {
    console.log('README ADR index already in sync');
  }
  process.exit(0);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { listAdrEntries, renderRegion, spliceRegion, SENTINEL_START, SENTINEL_END };
