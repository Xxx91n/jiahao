// jiahao-profile.js — dual-profile section splitting (ADR-0010 Option C)
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
function readProfile() {
  const { profilePath } = require('../src/shared/paths');
  const p = profilePath();
  if (!fs.existsSync(p)) return 'verifier';
  const v = fs.readFileSync(p, 'utf8').trim().toLowerCase();
  return v === 'generator' ? 'generator' : 'verifier';
}

function getProfileRoot(profile) {
  return profile === 'generator' ? 'generator' : 'verifier';
}



// ADR-0032 D2/D5: parse inline gsr rule headers
// generator section of src/SKILL.md. Parser only - no renderer, no sibling
// manifest (ADR-0032 R2/R3). build-adapters.js validates at build time;
// runtime hooks never run this on the hot path.
const BS = String.fromCharCode(92); // backslash assembled at load: this file's write path strips literal backslashes
const GSR_SP = BS + 's*';
const GSR_BAR = GSR_SP + BS + '|' + GSR_SP;
const GSR_REASONS = ['not-in-scope', 'incorrect', 'not-practical', 'insufficient-impact', 'merged', 'covered-by']; // ADR-0032 D5 ASVS-style
const GSR_HEADER_RE = new RegExp(
  '<!--' + GSR_SP + 'gsr:([0-9]+)' + GSR_BAR +
  'signal-domain:' + GSR_SP + '([a-z0-9][a-z0-9-]*)' + GSR_BAR +
  'status:' + GSR_SP + '(active|superseded|deprecated|attested|informational)' +
  '(?:' + GSR_BAR + 'check:' + GSR_SP + '([A-Za-z0-9_.-]+))?' +
  '(?:' + GSR_BAR + 'superseded-by:' + GSR_SP + 'gsr:([0-9]+))?' +
  '(?:' + GSR_BAR + 'reason:' + GSR_SP + '(' + GSR_REASONS.join('|') + '))?' +
  GSR_SP + '-->', 'g');
const GSR_STATUSES = ['active', 'superseded', 'deprecated', 'attested', 'informational'];
const GSR_ACTIVE_CAP = 8; // ADR-0032 D5: enforced-active cap 6-8; attested/informational excluded

function parseGsrHeaders(generatorText) {
  const rules = [];
  const re = new RegExp(GSR_HEADER_RE.source, 'g');
  let m;
  while ((m = re.exec(generatorText)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; } // zero-length guard
    rules.push({ id: Number(m[1]), domain: m[2], status: m[3], check: m[4] || null, supersededBy: m[5] ? Number(m[5]) : null, reason: m[6] || null });
  }
  return rules;
}

// Returns errors[] (empty = valid). Pure - safe for tests and build-adapters.
function validateGsrHeaders(generatorText) {
  const errors = [];
  const headers = parseGsrHeaders(generatorText);
  if (headers.length === 0) {
    errors.push('no gsr rule headers found in generator section (ADR-0032 D2)');
    return errors;
  }
  const ids = new Set();
  for (const r of headers) {
    if (ids.has(r.id)) errors.push('duplicate gsr id: gsr:' + r.id);
    ids.add(r.id);
    if (r.status === 'superseded') {
      if (r.supersededBy === null) errors.push('gsr:' + r.id + ' superseded without superseded-by link (ADR-0032 D5)');
      else if (r.supersededBy === r.id) errors.push('gsr:' + r.id + ' supersedes itself');
    } else if (r.supersededBy !== null) {
      errors.push('gsr:' + r.id + ' carries superseded-by but status is ' + r.status);
    }
    const retired = r.status === 'superseded' || r.status === 'deprecated';
    if (retired && r.reason === null) errors.push('gsr:' + r.id + ' retired without reason tag (ADR-0032 D5)');
    if (!retired && r.reason !== null) errors.push('gsr:' + r.id + ' carries reason but status is ' + r.status);
  }
  for (const r of headers) {
    if (r.supersededBy !== null && !ids.has(r.supersededBy)) {
      errors.push('gsr:' + r.id + ' superseded-by gsr:' + r.supersededBy + ' does not resolve');
    }
  }
  const active = headers.filter(h => h.status === 'active').length;
  if (active > GSR_ACTIVE_CAP) errors.push('active rule cap exceeded: ' + active + ' > ' + GSR_ACTIVE_CAP + ' (ADR-0032 D5)');
  const sec = generatorText.split('### Surface Signal Rules')[1];
  if (sec) {
    const lines = sec.split(String.fromCharCode(10)).map(l => l.replace(new RegExp(String.fromCharCode(13) + '$'), ''));
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('- **')) continue;
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      if (j < 0 || !/^<!--[  ]*gsr:[0-9]+/.test(lines[j].trim())) {
        errors.push('rule bullet without gsr header: ' + lines[i].slice(0, 60));
      }
    }
  }
  return errors;
}
module.exports = { splitByProfile, loadProfileSections, readProfile, getProfileRoot, parseGsrHeaders, validateGsrHeaders, GSR_HEADER_RE, GSR_STATUSES, GSR_ACTIVE_CAP, GSR_REASONS };
