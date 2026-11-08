// jiahao-profile.js — dual-profile section splitting ( Option C)
// Shared between build-adapters.js and hooks.

const fs = require('fs');
const path = require('path');

function splitByProfile(skillContent) {
  const body = skillContent.replace(/^---[\s\S]*?---\n/, '');
  const genIdx = body.indexOf('## Generator Profile');
  const verIdx = body.indexOf('## Verifier Profile');
  const bndIdx = body.indexOf('## Boundaries');

  if (genIdx === -1 || verIdx === -1 || bndIdx === -1) {
    return { generator: body, verifier: body };
  }

  const preamble = body.substring(0, genIdx).trim();
  const genSection = body.substring(genIdx, verIdx).trim();
  const verSection = body.substring(verIdx, bndIdx).trim();
  const boundaries = body.substring(bndIdx).trim();

  return {
    generator: preamble + '\n\n' + genSection + '\n\n' + boundaries,
    verifier: preamble + '\n\n' + verSection + '\n\n' + boundaries,
  };
}

function loadProfileSections(root) {
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  return splitByProfile(content);
}

// Read agent profile from .jiahao-profile (default: verifier for backward compat).
// Single source of truth — used by jiahao-activate, jiahao-verdict-gate, MCP.
// Read the flag directly and treat only ENOENT as the documented absent-file
// default: existsSync() would silently swallow every other stat failure too
// (a symlink to an inaccessible target among them, CodeRabbit PR #129 round
// 1), and a throw here would kill the Stop check outright — every caller
// runs this at top level or on the decision path (CodeRabbit #115 round 2).
// The fallback is not silent — the failure payload lands on stderr so a
// defaulted profile is distinguishable from a read one (#119 finding 1,
// #84's fail-path convention).
function readProfile() {
  const { profilePath } = require('../src/shared/paths');
  const { PREFIXES } = require('../src/shared/prefix-vocab');
  let v = '';
  try { v = fs.readFileSync(profilePath(), 'utf8').trim().toLowerCase(); }
  catch (e) {
    if (e && e.code === 'ENOENT') return 'verifier';
    process.stderr.write(PREFIXES.config + ' [profile] .jiahao-profile unreadable ('
      + ((e && e.code) || e.message) + '); using the verifier default'
      + String.fromCharCode(10));
    return 'verifier';
  }
  return v === 'generator' ? 'generator' : 'verifier';
}

function getProfileRoot(profile) {
  return profile === 'generator' ? 'generator' : 'verifier';
}



// parse inline rule headers
// generator section of src/SKILL.md. Parser only - no renderer, no sibling
// manifest. build-adapters.js validates at build time;
// runtime hooks never run this on the hot path.
const BS = String.fromCharCode(92); // backslash assembled at load: this file's write path strips literal backslashes
const RULE_SPACE = BS + 's*';
const RULE_SEPARATOR = RULE_SPACE + BS + '|' + RULE_SPACE;
const RULE_REASONS = ['not-in-scope', 'incorrect', 'not-practical', 'insufficient-impact', 'merged', 'covered-by']; // ASVS-style
const RULE_HEADER_RE = new RegExp(
  '<!--' + RULE_SPACE + 'rule:([0-9]+)' + RULE_SEPARATOR +
  'signal-domain:' + RULE_SPACE + '([a-z0-9][a-z0-9-]*)' + RULE_SEPARATOR +
  'status:' + RULE_SPACE + '(active|superseded|deprecated|attested|informational)' +
  '(?:' + RULE_SEPARATOR + 'check:' + RULE_SPACE + '([A-Za-z0-9_.-]+))?' +
  '(?:' + RULE_SEPARATOR + 'superseded-by:' + RULE_SPACE + 'rule:([0-9]+))?' +
  '(?:' + RULE_SEPARATOR + 'reason:' + RULE_SPACE + '(' + RULE_REASONS.join('|') + '))?' +
  RULE_SPACE + '-->', 'g');
const RULE_STATUSES = ['active', 'superseded', 'deprecated', 'attested', 'informational'];
const RULE_ACTIVE_CAP = 8; // enforced-active cap 6-8; attested/informational excluded

function parseRuleHeaders(generatorText) {
  const rules = [];
  const re = new RegExp(RULE_HEADER_RE.source, 'g');
  let m;
  while ((m = re.exec(generatorText)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; } // zero-length guard
    rules.push({ id: Number(m[1]), domain: m[2], status: m[3], check: m[4] || null, supersededBy: m[5] ? Number(m[5]) : null, reason: m[6] || null });
  }
  return rules;
}

// Returns errors[] (empty = valid). Pure - safe for tests and build-adapters.
function validateRuleHeaders(generatorText) {
  const errors = [];
  const headers = parseRuleHeaders(generatorText);
  if (headers.length === 0) {
    errors.push('no rule headers found in generator section');
    return errors;
  }
  const ids = new Set();
  for (const r of headers) {
    if (ids.has(r.id)) errors.push('duplicate rule id: rule:' + r.id);
    ids.add(r.id);
    if (r.status === 'superseded') {
      if (r.supersededBy === null) errors.push('rule:' + r.id + ' superseded without superseded-by link');
      else if (r.supersededBy === r.id) errors.push('rule:' + r.id + ' supersedes itself');
    } else if (r.supersededBy !== null) {
      errors.push('rule:' + r.id + ' carries superseded-by but status is ' + r.status);
    }
    const retired = r.status === 'superseded' || r.status === 'deprecated';
    if (retired && r.reason === null) errors.push('rule:' + r.id + ' retired without reason tag');
    if (!retired && r.reason !== null) errors.push('rule:' + r.id + ' carries reason but status is ' + r.status);
  }
  for (const r of headers) {
    if (r.supersededBy !== null && !ids.has(r.supersededBy)) {
      errors.push('rule:' + r.id + ' superseded-by rule:' + r.supersededBy + ' does not resolve');
    }
  }
  const active = headers.filter(h => h.status === 'active').length;
  if (active > RULE_ACTIVE_CAP) errors.push('active rule cap exceeded: ' + active + ' > ' + RULE_ACTIVE_CAP + '');
  const sec = generatorText.split('### Surface Signal Rules')[1];
  if (sec) {
    const lines = sec.split(String.fromCharCode(10)).map(l => l.replace(new RegExp(String.fromCharCode(13) + '$'), ''));
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('- **')) continue;
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      if (j < 0 || !/^<!--[  ]*rule:[0-9]+/.test(lines[j].trim())) {
        errors.push('rule bullet without rule header: ' + lines[i].slice(0, 60));
      }
    }
  }
  return errors;
}
module.exports = { splitByProfile, loadProfileSections, readProfile, getProfileRoot, parseRuleHeaders, validateRuleHeaders, RULE_HEADER_RE, RULE_STATUSES, RULE_ACTIVE_CAP, RULE_REASONS };
