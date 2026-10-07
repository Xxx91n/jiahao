'use strict';
// scripts/shared/drift-declarations.js - ADR-0100 D-C (grill-t39 D-002): the
// Drift-Declaration Registry (漂移声明注册表) loader, validator and
// classifier-input surface.
//
// WHAT THIS IS. A registered line-level drift declaration (登记的行级漂移声明):
// a citation that a claim commit made at a line of a mutable file, where that
// line has since been overwritten. The registry is consumed by the rewrite-map
// classifier as a DECLARED FACT on the INPUT side - it materializes occurrence
// rows for the lost lines - and it is NEVER an exemption branch inside a
// judging leg. The distinction is the whole design: an input-side fact is
// append-only and auditable, a judging-side bypass is a standing escape hatch.
//
// WORDING LAW (ADR-0100 D-C / ADR-0093 D-4, machine-asserted): this artifact
// and its entries may not be described as 豁免 / waiver. The forbidden words are
// checked, not merely discouraged, because a channel that can be renamed can be
// widened.
//
// FORWARD-ONLY READING RULE. A governance input that postdates the tree being
// judged is not drift: the map and the registry land in the same atomic commit
// (D-E), so the commit that carried the map could not also carry the registry
// on the previously-published line. `loadDeclared` therefore reads tree-internal
// when the caller judges a historical revision and, when the file does not exist
// there, falls back to the worktree WITH a disclosed note (never silently). Once
// the lane lands, the tree-internal read answers and the fallback stops firing.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REGISTRY_REL = 'docs/governance/drift-declarations.json';
const SCHEMA_VERSION = 1;
const ID_RE = /^drift-[0-9]{4}$/;
const HEX_RE = /^[0-9a-f]{7,40}$/;
const HEX40_RE = /^[0-9a-f]{40}$/;
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
// ADR-0100 D-C statutory wording. Matching is on the lowercase forms.
const FORBIDDEN_WORDS = ['waiver', 'exemption valve', '豁免', '免除阀'];

const occKey = (o) => o.file + ':' + o.line + ':' + o.sha;

function gitAt(root, args, captureStderr) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    // A probe for a file that may not exist at a historical revision is a
    // capability question, not an error: git's own "exists on disk, but not in
    // <ref>" stderr would otherwise leak into the leg's output and read as a
    // finding. Callers that need it ask for it explicitly.
    stdio: captureStderr ? 'pipe' : ['ignore', 'pipe', 'ignore'],
    env: Object.assign({}, process.env, { GIT_NO_REPLACE_OBJECTS: '1' }),
  }).trim();
}

// The commit that ADDED the registry - the derived gate-close anchor. Same
// mechanism check-map-freshness.js uses for its own registration anchor, and
// for the same reason: an artifact cannot name its own commit, so the anchor is
// read off history rather than stored in the file (ADR-0100 D-D).
function registrationAddCommit(root) {
  let out = '';
  try { out = gitAt(root, ['log', '--diff-filter=A', '--format=%H', '--', REGISTRY_REL]); } catch (e) { return null; }
  const adds = out.split('\n').map((s) => s.trim()).filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

function parse(text) {
  const j = JSON.parse(text);
  if (!j || typeof j !== 'object') throw new Error(REGISTRY_REL + ' must be an object');
  if (!Array.isArray(j.entries)) throw new Error(REGISTRY_REL + ' entries must be an array');
  return j;
}

// Read the registry. opts = { root, ref?, commitBound?, fromWorktree? }.
// Returns { registry, source, absent, note }.
function loadDeclared(opts) {
  const o = opts || {};
  const root = o.root || process.cwd();
  const abs = path.join(root, REGISTRY_REL.split('/').join(path.sep));
  const readWorktree = () => {
    if (!fs.existsSync(abs)) return null;
    try { return fs.readFileSync(abs, 'utf8'); } catch (e) { return null; }
  };
  if (o.ref && o.commitBound && !o.fromWorktree) {
    let text = null;
    try { text = gitAt(root, ['show', o.ref + ':' + REGISTRY_REL]); } catch (e) { text = null; }
    if (text !== null) {
      try { return { registry: parse(text), source: o.ref + ':' + REGISTRY_REL, absent: false, note: null }; }
      catch (e) { return { registry: null, parseError: e.message, source: o.ref + ':' + REGISTRY_REL, absent: false, note: null }; }
    }
    // Forward-only fallback, disclosed.
    const wt = readWorktree();
    if (wt === null) return { registry: null, source: null, absent: true, note: null };
    try {
      return {
        registry: parse(wt), source: 'worktree:' + REGISTRY_REL, absent: false,
        note: 'drift registry not present at ' + String(o.ref).slice(0, 9) + ' - read from the worktree (forward-only: the map and the registry land in one atomic commit, ADR-0100 D-E)',
      };
    } catch (e) {
      return { registry: null, parseError: e.message, source: 'worktree:' + REGISTRY_REL, absent: false, note: null };
    }
  }
  const wt2 = readWorktree();
  if (wt2 === null) return { registry: null, source: null, absent: true, note: null };
  try { return { registry: parse(wt2), source: 'worktree:' + REGISTRY_REL, absent: false, note: null }; }
  catch (e) { return { registry: null, parseError: e.message, source: 'worktree:' + REGISTRY_REL, absent: false, note: null }; }
}

// The declared occurrence set, deduplicated by file:line:cited_sha and sorted
// for deterministic emission. Eight entries asserting two distinct line facts
// materialize two rows, never eight (ADR-0100 D-C deduplication rule).
function declaredOccurrences(registry) {
  if (!registry || !Array.isArray(registry.entries)) return [];
  const seen = {};
  const out = [];
  for (const e of registry.entries) {
    if (!e || typeof e.file !== 'string' || !Number.isInteger(e.line) || typeof e.cited_sha !== 'string') continue;
    const k = e.file + ':' + e.line + ':' + e.cited_sha;
    if (seen[k]) continue;
    seen[k] = 1;
    out.push({ file: e.file, line: e.line, sha: e.cited_sha, drift_id: e.id });
  }
  out.sort((a, b) => (a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line - b.line));
  return out;
}

// Latest registered_at adjudicates for a (file, line, cited_sha) key; older
// entries stay as history (append-only, never edited).
function entryFor(registry, file, line, sha) {
  if (!registry || !Array.isArray(registry.entries)) return null;
  let best = null;
  for (const e of registry.entries) {
    if (!e || e.file !== file || e.line !== line || e.cited_sha !== sha) continue;
    if (!best || String(e.registered_at) > String(best.registered_at)) best = e;
  }
  return best;
}

function validateShape(registry) {
  const errors = [];
  if (!registry) return [REGISTRY_REL + ': registry missing or unparseable'];
  if (registry.schema_version !== SCHEMA_VERSION) errors.push(REGISTRY_REL + ': schema_version must be ' + SCHEMA_VERSION);
  if (typeof registry._doc !== 'string' || registry._doc.length < 20) errors.push(REGISTRY_REL + ': _doc header missing or too short');
  if (typeof registry.source_adr !== 'string' || !/\.md$/.test(registry.source_adr)) errors.push(REGISTRY_REL + ': source_adr must name the carrier ADR');
  const words = FORBIDDEN_WORDS.concat((registry.entries || []).reduce((acc, e) => {
    for (const f of ['reason', 'declared_by', 'subject']) {
      const s = e && typeof e[f] === 'string' ? e[f].toLowerCase() : '';
      for (const w of FORBIDDEN_WORDS) if (s.indexOf(w) !== -1) acc.push(f + ':' + w);
    }
    return acc;
  }, []));
  if (words.length > FORBIDDEN_WORDS.length) {
    errors.push(REGISTRY_REL + ': forbidden wording (ADR-0100 D-C wording law) - the registry and its entries may not be described as 豁免/waiver: ' + words.slice(FORBIDDEN_WORDS.length).join(', '));
  }
  const ids = {};
  const keys = {};
  for (const e of registry.entries || []) {
    const tag = e && typeof e.id === 'string' ? e.id : '(no id)';
    if (!e || typeof e !== 'object') { errors.push(tag + ': entry must be an object'); continue; }
    if (!ID_RE.test(tag)) errors.push(tag + ': id must match drift-NNNN');
    if (ids[tag]) errors.push(tag + ': duplicate id (append-only surfaces never edit or delete, so a duplicate is a write-path bug)');
    ids[tag] = 1;
    const k = [e.file, e.line, e.cited_sha, e.cited_by].join('|');
    if (keys[k]) errors.push(tag + ': duplicate declaration of the same (file, line, cited_sha) by the same claiming commit');
    keys[k] = 1;
    if (typeof e.file !== 'string' || !e.file) errors.push(tag + ': file missing');
    if (!Number.isInteger(e.line) || e.line < 1) errors.push(tag + ': line must be a 1-based integer');
    if (typeof e.cited_sha !== 'string' || !HEX_RE.test(e.cited_sha)) errors.push(tag + ': cited_sha must be 7-40 hex');
    if (typeof e.cited_by !== 'string' || !HEX40_RE.test(e.cited_by)) errors.push(tag + ': cited_by must be a full sha (the claim commit that made the citation)');
    if (typeof e.overwritten_by !== 'string' || !HEX40_RE.test(e.overwritten_by)) errors.push(tag + ': overwritten_by must be a full sha (the commit that removed the line) - an entry naming only a gap is a claim, not evidence');
    if (!Array.isArray(e.cite_locations) || !e.cite_locations.length) errors.push(tag + ': cite_locations must carry at least one restored line record');
    else for (const loc of e.cite_locations) {
      if (!loc || typeof loc.text !== 'string' || !loc.text.length) errors.push(tag + ': cite_locations[].text must hold the restored line verbatim');
      if (!loc || typeof loc.file !== 'string' || !Number.isInteger(loc.line)) errors.push(tag + ': cite_locations[] must name file and line');
    }
    if (typeof e.registered_at !== 'string' || !ISO_DATE.test(e.registered_at)) errors.push(tag + ': registered_at must be an ISO date (there is no expires_at - a registered historical fact does not lapse)');
    if ('expires_at' in e) errors.push(tag + ': expires_at is forbidden on this surface (ADR-0100 D-C: no TTL, no auto-lapse)');
    if (typeof e.declared_by !== 'string' || e.declared_by.length < 5) errors.push(tag + ': declared_by missing');
    if (typeof e.reason !== 'string' || e.reason.length < 20) errors.push(tag + ': reason missing or too short');
  }
  return errors;
}

// ADR-0100 D-D - the gate-close condition. Without it the registry silently
// decays into a standing channel, which is why it is mechanical: any entry that
// does not exist at the registry's own add-commit is a red-level signal, because
// the append-only discipline (D-A) is what makes a later entry a violation
// rather than an update.
function gateCloseErrors(root, registry, opts) {
  const o = opts || {};
  const reg = registry || loadDeclared(Object.assign({ root: root }, o)).registry;
  if (!reg) return [];
  const anchor = o.anchor !== undefined ? o.anchor : registrationAddCommit(root);
  if (!anchor) {
    return [REGISTRY_REL + ': gate-close anchor not derivable (the registry has no add-commit on this line) - the closing condition cannot be asserted, fail-closed'];
  }
  let atAnchor = null;
  try { atAnchor = parse(gitAt(root, ['show', anchor + ':' + REGISTRY_REL])); }
  catch (e) {
    // The add-commit is the first commit carrying the file, so its tree always
    // has it; failing here means the anchor read itself is broken.
    return [REGISTRY_REL + ': cannot read the registry at its add-commit ' + anchor.slice(0, 9) + ' - ' + e.message];
  }
  const anchorIds = {};
  for (const e of atAnchor.entries || []) if (e && typeof e.id === 'string') anchorIds[e.id] = 1;
  const errors = [];
  for (const e of reg.entries || []) {
    if (!e || typeof e.id !== 'string') continue;
    if (!anchorIds[e.id]) {
      errors.push(REGISTRY_REL + ': entry ' + e.id + ' was added after the landing commit ' + anchor.slice(0, 9) +
        ' - append-only discipline (ADR-0100 D-A) violated; a registered line-level drift declaration may not be appended to a closed registry');
    }
  }
  return errors;
}

module.exports = {
  REGISTRY_REL, SCHEMA_VERSION, ID_RE, FORBIDDEN_WORDS, occKey,
  registrationAddCommit, loadDeclared, declaredOccurrences, entryFor,
  validateShape, gateCloseErrors,
};
