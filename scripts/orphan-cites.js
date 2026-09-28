#!/usr/bin/env node
// orphan-cites.js - ADR-0089 D-D (grill-t32): the explicit write verbs for
// docs/governance/orphan-cites.json. The classifier NEVER writes the
// registry; registration is a deliberate act reachable only through these
// verbs. Append-only: entries are never edited or deleted - supersession is
// a newer registered_at; adjudication is latest-entry-wins.
//
//   node scripts/orphan-cites.js register <sha> --reason <text>
//       [--successor <sha>] [--replace-ref] [--carried <text> ...]
//   node scripts/orphan-cites.js register <sha> --revive [--reason <text>]
//   node scripts/orphan-cites.js backfill [--dry-run] [--checkpoint <file>]
//       [--errata <E-xx>] [--reason <text>]
//   node scripts/orphan-cites.js check            (registry self-consistency)
//
// Entry shape (see ADR-0089 D-B/D-D):
//   {cited_sha, object_type, size, snapshot|null, last_reachable_via: [],
//    successor_sha|null, cite_locations: [{file,line}], registered_at,
//    reason, carried_log: [], object_purged_at?, errata_ref?,
//    disposition: 'orphaned'|'revived', replace_ref?}
//
// 'cited_sha' is the verbatim cited token when the object is absent (degraded
// backfill entries) - a purged object cannot resolve to its full name.

'use strict';

const fs = require('fs');
const path = require('path');
const { forRoot } = require('./git-facade');

const ROOT = path.join(__dirname, '..');
const REGISTRY_REL = path.join('docs', 'governance', 'orphan-cites.json');
const MAP_REL = path.join('docs', 'rewrite-map.json');
const DISPOSITIONS = ['orphaned', 'revived'];
const OBJECT_TYPES = ['commit', 'tag', 'tree', 'blob'];
// ADR-0089 D-E registered constants (named, adjustable; order-of-magnitude
// aligned with gc.pruneExpire ~= 2 weeks):
const ORPHAN_AGE_DAYS = 14;          // transient-tolerance window (stage1 -> 2)
const ORPHAN_REGISTER_GRACE_DAYS = 7; // grace past age threshold (stage2 -> 3)

// ---------- registry IO ----------

function loadRegistry(root, opts) {
  const o = opts || {};
  const file = path.join(root || ROOT, REGISTRY_REL);
  let text;
  try {
    text = o.readFile ? o.readFile(file) : fs.readFileSync(file, 'utf8');
  } catch (e) {
    const err = new Error('registry unreadable: ' + file + ': ' + e.message);
    err.name = 'RegistryIOError';
    throw err;
  }
  let reg;
  try { reg = JSON.parse(text); } catch (e) {
    const err = new Error('registry unparseable: ' + file + ': ' + e.message);
    err.name = 'RegistryIOError';
    throw err;
  }
  return { reg: reg, file: file, raw: text };
}

// Schema + append-only evidence: every field type closed, disposition in the
// enum, entries ordered by non-decreasing registered_at (an out-of-order or
// rewritten entry is detectable tampering, not a soft warning).
function validateRegistry(reg) {
  const errors = [];
  if (!reg || typeof reg !== 'object') return ['registry is not an object'];
  if (reg.schema_version !== 1) errors.push('schema_version must be 1');
  if (!Array.isArray(reg.entries)) { errors.push('entries must be an array'); return errors; }
  let prev = '';
  reg.entries.forEach(function (e, i) {
    const tag = 'entries[' + i + ']';
    if (!e || typeof e !== 'object') { errors.push(tag + ': not an object'); return; }
    if (typeof e.cited_sha !== 'string' || !/^[0-9a-f]{7,40}$/.test(e.cited_sha)) errors.push(tag + ': cited_sha must be a 7-40 lowercase hex token');
    if (e.object_type !== null && e.object_type !== undefined && OBJECT_TYPES.indexOf(e.object_type) === -1) errors.push(tag + ': object_type outside the git enum: ' + e.object_type);
    if (e.size !== null && e.size !== undefined && typeof e.size !== 'number') errors.push(tag + ': size must be number|null');
    if (e.snapshot !== null && e.snapshot !== undefined && typeof e.snapshot !== 'object') errors.push(tag + ': snapshot must be object|null');
    if (!Array.isArray(e.last_reachable_via)) errors.push(tag + ': last_reachable_via must be an array');
    if (e.successor_sha !== null && e.successor_sha !== undefined && !(typeof e.successor_sha === 'string' && /^[0-9a-f]{40}$/.test(e.successor_sha))) errors.push(tag + ': successor_sha must be a full sha or null');
    if (!Array.isArray(e.cite_locations)) errors.push(tag + ': cite_locations must be an array');
    else for (const l of e.cite_locations) {
      if (!l || typeof l.file !== 'string' || !Number.isInteger(l.line)) { errors.push(tag + ': cite_location malformed'); break; }
    }
    if (typeof e.registered_at !== 'string' || isNaN(Date.parse(e.registered_at))) errors.push(tag + ': registered_at must be an ISO-8601 string');
    if (typeof e.reason !== 'string' || !e.reason) errors.push(tag + ': reason missing');
    if (!Array.isArray(e.carried_log)) errors.push(tag + ': carried_log must be an array');
    if (DISPOSITIONS.indexOf(e.disposition) === -1) errors.push(tag + ': disposition outside enum ' + DISPOSITIONS.join('|'));
    if (e.object_purged_at !== undefined && (typeof e.object_purged_at !== 'string' || isNaN(Date.parse(e.object_purged_at)))) errors.push(tag + ': object_purged_at must be ISO-8601');
    if (e.errata_ref !== undefined && e.errata_ref !== null && typeof e.errata_ref !== 'string') errors.push(tag + ': errata_ref must be a string');
    if (e.replace_ref !== undefined && e.replace_ref !== true) errors.push(tag + ': replace_ref must be true when present');
    if (e.registered_at && prev && e.registered_at < prev) errors.push(tag + ': registered_at out of append order (' + e.registered_at + ' < ' + prev + ') - append-only evidence violated');
    if (e.registered_at) prev = e.registered_at;
  });
  return errors;
}

// cited_sha -> latest entry (registered_at wins; file order breaks ties).
function latestBySha(reg) {
  const m = new Map();
  for (const e of (reg && reg.entries) || []) {
    const cur = m.get(e.cited_sha);
    if (!cur || e.registered_at >= cur.registered_at) m.set(e.cited_sha, e);
  }
  return m;
}

// Resolve a cited TOKEN to its latest adjudicating entry.
//   1. exact cited_sha match wins first - a verbatim token entry is never
//      shadowed by a longer sha merely sharing its prefix;
//   2. else prefix expansion in both directions (abbreviated cites vs stored
//      full/verbatim shas);
//   3. multiple DISTINCT cited_shas matching: ambiguity only matters if it
//      could change the verdict - if every matched cited_sha's latest entry
//      adjudicates identically, the newest entry answers; genuinely mixed
//      verdicts throw (fail-closed, spec adversarial 3).
function entryForToken(reg, token) {
  const entries = (reg && reg.entries) || [];
  const exact = entries.filter(function (e) { return e.cited_sha === token; });
  const pool = exact.length ? exact : entries.filter(function (e) {
    return e.cited_sha.indexOf(token) === 0 || (token.length === 40 && token.indexOf(e.cited_sha) === 0);
  });
  if (!pool.length) return null;
  const latestByShaVal = {};
  for (const e of pool) {
    const cur = latestByShaVal[e.cited_sha];
    if (!cur || e.registered_at >= cur.registered_at) latestByShaVal[e.cited_sha] = e;
  }
  const latests = Object.keys(latestByShaVal).map(function (s) { return latestByShaVal[s]; });
  if (latests.length > 1) {
    const disps = {};
    for (const e of latests) disps[e.disposition] = true;
    if (Object.keys(disps).length !== 1) {
      const err = new Error('token ' + token + ' matches ' + latests.length + ' distinct registry cited_shas with mixed dispositions - ambiguous, fail-closed');
      err.name = 'AmbiguousToken';
      throw err;
    }
  }
  let winner = latests[0];
  for (const e of latests) if (e.registered_at >= winner.registered_at) winner = e;
  return winner;
}

// ---------- entry construction ----------

function dedupeLocations(rows) {
  const seen = new Set(); const out = [];
  for (const r of rows) {
    const k = r.file + ':' + r.line;
    if (seen.has(k)) continue;
    seen.add(k); out.push({ file: r.file, line: r.line });
  }
  return out;
}

// Live-object entry: snapshot materialized while the object exists.
function liveEntry(gitx, token, locations, opts) {
  const o = opts || {};
  const res = gitx.resolveToken(token);
  if (res.status !== 'ok') return { error: res.status, token: token };
  const sha = res.sha;
  const via = o.reachableVia !== undefined ? o.reachableVia : gitx.reachableVia(sha, gitx.displayRefs());
  if (via.length && !o.revive) return { error: 'reachable', token: token, sha: sha, via: via };
  return {
    entry: {
      cited_sha: sha,
      object_type: gitx.objectType(sha),
      size: gitx.objectSize(sha),
      snapshot: gitx.objectSnapshot(sha),
      last_reachable_via: via,
      successor_sha: o.successor || null,
      cite_locations: dedupeLocations(locations),
      registered_at: o.now || new Date().toISOString(),
      reason: o.reason || 'unspecified',
      carried_log: o.carried || [],
      disposition: o.revive ? 'revived' : 'orphaned',
      replace_ref: o.replaceRef ? true : undefined,
    },
    sha: sha,
  };
}

// Degraded entry: object is absent from the DB entirely. No snapshot can be
// taken - the verbatim token is the cited_sha and object_purged_at +
// errata_ref carry the disclosure (spec 4.4 dead-object form).
function degradedEntry(token, locations, opts) {
  const o = opts || {};
  const now = o.now || new Date().toISOString();
  return {
    cited_sha: token,
    object_type: null,
    size: null,
    snapshot: null,
    last_reachable_via: [],
    successor_sha: o.successor || null,
    cite_locations: dedupeLocations(locations),
    registered_at: now,
    reason: o.reason || 'object absent from the object store at registration (purge or never-here) - degraded entry',
    carried_log: o.carried || [],
    object_purged_at: now,
    errata_ref: o.errataRef || null,
    disposition: 'orphaned',
  };
}

// ---------- verbs ----------

// register <sha>: object must exist; reachable_via must be empty unless
// --revive (a revival entry is appended when the object regained refs).
function cmdRegister(root, argv, opts) {
  const o = opts || {};
  const gitx = o.git || forRoot(root);
  const shaArg = argv[0];
  if (!shaArg) return { code: 2, out: 'register: <sha> required' };
  const flags = { successor: null, replaceRef: false, revive: false, reason: null, carried: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--successor') flags.successor = argv[++i];
    else if (a === '--replace-ref') flags.replaceRef = true;
    else if (a === '--revive') flags.revive = true;
    else if (a === '--reason') flags.reason = argv[++i];
    else if (a === '--carried') flags.carried.push(argv[++i]);
    else return { code: 2, out: 'register: unknown flag ' + a };
  }
  if (flags.replaceRef && !flags.successor) return { code: 2, out: '--replace-ref requires --successor' };

  const loaded = loadRegistry(root);
  const reg = loaded.reg, file = loaded.file;
  const verr = validateRegistry(reg);
  if (verr.length) return { code: 1, out: 'registry corrupt, refusing to append:\n' + verr.join('\n') };

  const res = gitx.resolveToken(shaArg);
  if (res.status === 'ambiguous') return { code: 1, out: 'register: ambiguous short sha ' + shaArg + ' (fail-closed)' };
  if (res.status === 'absent') return { code: 1, out: 'register: object ' + shaArg + ' absent from the DB - live snapshot impossible; use backfill for degraded registration' };
  const sha = res.sha;

  // successor verification: exists, reachable on a display ref, and (when the
  // cited object is a commit) subject-equal - the same message-lineage
  // convention the map alignment uses.
  if (flags.successor) {
    const sr = gitx.resolveToken(flags.successor);
    if (sr.status !== 'ok') return { code: 1, out: 'register: successor ' + flags.successor + ' does not resolve (' + sr.status + ')' };
    const sVia = gitx.reachableVia(sr.sha, gitx.displayRefs());
    if (!sVia.length) return { code: 1, out: 'register: successor ' + sr.sha + ' is not reachable from any ref' };
    const citedType = gitx.objectType(sha);
    const succType = gitx.objectType(sr.sha);
    if (citedType === 'commit' && succType === 'commit') {
      const cs = gitx.objectSnapshot(sha); const ss = gitx.objectSnapshot(sr.sha);
      if (cs.subject !== ss.subject) return { code: 1, out: 'register: successor subject mismatch ("' + cs.subject + '" != "' + ss.subject + '") - snapshot/successor consistency failed' };
    }
    flags.successor = sr.sha;
  }

  const existing = entryForToken(reg, sha);
  const locations = o.locations || (o.cite ? [o.cite] : []);
  const built = liveEntry(gitx, sha, locations, {
    successor: flags.successor, replaceRef: flags.replaceRef,
    revive: flags.revive, reason: flags.reason || (flags.revive ? 'object regained ref reachability - revival adjudicated (latest registered_at wins)' : null),
    carried: flags.carried, now: o.now,
  });
  if (built.error === 'reachable') {
    return { code: 1, out: 'register: ' + sha + ' is still reachable via ' + built.via.join(', ') + ' - not an orphan. If this is a resurrection record, use --revive.' };
  }
  if (built.error) return { code: 1, out: 'register: ' + sha + ' ' + built.error };

  // Idempotent re-register: latest entry identical in disposition+successor -> no-op.
  if (existing && existing.disposition === built.entry.disposition && existing.successor_sha === built.entry.successor_sha) {
    return { code: 0, out: 'register: ' + sha.slice(0, 12) + ' already covered by latest entry (disposition=' + existing.disposition + ') - no-op' };
  }

  if (flags.replaceRef) {
    // Materialize refs/replace/<cited> -> successor. Object reads elsewhere
    // stay GIT_NO_REPLACE_OBJECTS=1 so classification never sees the alias.
    gitx.run(['update-ref', 'refs/replace/' + sha, flags.successor]);
  }

  reg.entries.push(built.entry);
  const text = JSON.stringify(reg, null, 2) + '\n';
  if (o.writeFile) o.writeFile(file, text); else fs.writeFileSync(file, text);
  return { code: 0, out: 'register: ' + sha.slice(0, 12) + ' appended (' + built.entry.disposition + ')' + (flags.replaceRef ? ' + refs/replace materialized' : '') };
}

// backfill: enumerate the committed map's dead/unreachable cites and register
// them. Live orphans get full snapshots; absent objects get degraded entries.
// Idempotent (registered shas skip), dry-run report-only, checkpointable.
function cmdBackfill(root, argv, opts) {
  const o = opts || {};
  const gitx = o.git || forRoot(root);
  let dryRun = false, checkpointFile = null, errataRef = null;
  let reason = 'grill-t32 cutover backfill (ADR-0089 D-G)';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--checkpoint') checkpointFile = argv[++i];
    else if (a === '--errata') errataRef = argv[++i];
    else if (a === '--reason') reason = argv[++i];
    else return { code: 2, out: 'backfill: unknown flag ' + a };
  }
  const loaded = loadRegistry(root);
  const reg = loaded.reg, file = loaded.file;
  const verr = validateRegistry(reg);
  if (verr.length) return { code: 1, out: 'registry corrupt:\n' + verr.join('\n') };

  const mapText = o.readFile ? o.readFile(path.join(root, MAP_REL)) : fs.readFileSync(path.join(root, MAP_REL), 'utf8');
  const map = JSON.parse(mapText);
  const byToken = new Map();
  for (const d of map.doc_refs || []) {
    if (!byToken.has(d.sha)) byToken.set(d.sha, []);
    byToken.get(d.sha).push({ file: d.file, line: d.line });
  }

  // resume cursor
  let prior = { processed_shas: [] };
  if (checkpointFile && fs.existsSync(checkpointFile)) {
    try { prior = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')); } catch (e) { prior = { processed_shas: [] }; }
  }
  const done = new Set(prior.processed_shas || []);
  const registered = latestBySha(reg);

  const refs = gitx.displayRefs();
  const report = { live: [], degraded: [], skipped_registered: [], skipped_reachable: [], skipped_done: [], errors: [] };
  const now = o.now || new Date().toISOString();

  for (const kv of byToken) {
    const token = kv[0], locs = kv[1];
    if (done.has(token)) { report.skipped_done.push(token); continue; }
    let covered = false, coveredSha = null;
    for (const s of registered.keys()) { if (s === token || s.indexOf(token) === 0 || (token.length === 40 && token.indexOf(s) === 0)) { covered = true; coveredSha = s; break; } }

    const res = gitx.resolveToken(token);
    if (covered) {
      // Purge observation (spec 6.2 registered-then-deleted): the latest entry
      // was taken live (snapshot present, no purge mark) and the object is now
      // absent - append a degraded purge entry; never rewrite the old one.
      const latest = registered.get(coveredSha);
      if (latest && latest.disposition === 'orphaned' && latest.snapshot && !latest.object_purged_at && res.status === 'absent') {
        report.degraded.push(degradedEntry(coveredSha, locs, {
          now: now, errataRef: errataRef,
          reason: 'purge observation: registered live object no longer in the object store - marked, not fresh damage',
        }));
        continue;
      }
      report.skipped_registered.push(token);
      continue;
    }

    if (res.status === 'ambiguous') { report.errors.push(token + ': ambiguous'); continue; }
    if (res.status === 'absent') {
      report.degraded.push(degradedEntry(token, locs, { now: now, errataRef: errataRef, reason: reason }));
      continue;
    }
    const via = gitx.reachableVia(res.sha, refs);
    if (via.length) { report.skipped_reachable.push(token); continue; }
    const built = liveEntry(gitx, res.sha, locs, { now: now, reason: reason, reachableVia: via });
    if (built.error) { report.errors.push(token + ': ' + built.error); continue; }
    report.live.push(built.entry);
  }

  if (dryRun) {
    return { code: report.errors.length ? 1 : 0, report: report, out: 'backfill --dry-run: ' + report.live.length + ' live + ' + report.degraded.length + ' degraded + ' + report.skipped_registered.length + ' already-registered + ' + report.skipped_reachable.length + ' still-reachable + ' + report.errors.length + ' errors' };
  }
  if (report.errors.length) return { code: 1, report: report, out: 'backfill aborted - ambiguous/error tokens present:\n' + report.errors.join('\n') };

  reg.entries = reg.entries.concat(report.live, report.degraded);
  const text = JSON.stringify(reg, null, 2) + '\n';
  if (o.writeFile) o.writeFile(file, text); else fs.writeFileSync(file, text);
  if (checkpointFile) {
    fs.writeFileSync(checkpointFile, JSON.stringify({ processed_shas: Array.from(byToken.keys()), done: true, at: now }, null, 2) + '\n');
  }
  return { code: 0, report: report, out: 'backfill: appended ' + (report.live.length + report.degraded.length) + ' entries (' + report.live.length + ' live, ' + report.degraded.length + ' degraded)' };
}

// check: registry self-consistency for the orphan-registration leg.
function cmdCheck(root, opts) {
  const loaded = loadRegistry(root);
  const errors = validateRegistry(loaded.reg);
  return { code: errors.length ? 1 : 0, errors: errors, entries: (loaded.reg.entries || []).length };
}

function main(argv) {
  const verb = argv[0];
  if (verb === 'register') { const r = cmdRegister(ROOT, argv.slice(1)); console.log(r.out); process.exit(r.code); }
  if (verb === 'backfill') { const r = cmdBackfill(ROOT, argv.slice(1)); console.log(r.out); process.exit(r.code); }
  if (verb === 'check') { const r = cmdCheck(ROOT); if (r.errors.length) console.error(r.errors.join('\n')); else console.log('orphan-cites registry OK (' + r.entries + ' entries)'); process.exit(r.code); }
  console.error('usage: orphan-cites.js register|backfill|check ...');
  process.exit(2);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { loadRegistry, validateRegistry, latestBySha, entryForToken, liveEntry, degradedEntry, cmdRegister, cmdBackfill, cmdCheck, REGISTRY_REL, DISPOSITIONS, OBJECT_TYPES, ORPHAN_AGE_DAYS, ORPHAN_REGISTER_GRACE_DAYS };
