#!/usr/bin/env node
// check-orphan-registration.js - ADR-0089 D-E stage 3 (grill-t32): the
// orphan-registration gate leg. The escalation ladder:
//   stage 1 (silent)  : unreachable unregistered object under ORPHAN_AGE_DAYS
//   stage 2 (yellow)  : past the age threshold -> the map's warnings channel
//   stage 3 (red leg) : past age + grace, still unregistered -> this leg fails
//   stage 4 (hard red): absent AND unregistered -> 'unresolved' rows in --check
//
// Asserts over the committed map's qualifiers (reachable_via, object_mtime)
// plus the registry - deterministic from committed files, so the stage-3
// arithmetic is clone-computable. Object-store-dependent checks (entry
// snapshot re-verification, purge-mark obligations) run only where the
// old-side capability is present; on a public clone they are not derivable
// and are skipped (never silently red - ADR-0040 degrade model).
//
// Registered constants (ADR-0089 D-E): ORPHAN_AGE_DAYS=14,
// ORPHAN_REGISTER_GRACE_DAYS=7 in scripts/orphan-cites.js. Both this leg and
// the classifier accept an injected now() so the ladder is testable.
//
// Usage: node scripts/check-orphan-registration.js

'use strict';

const fs = require('fs');
const path = require('path');
const { requireCapabilities, probe } = require('../src/shared/capability');
const { forRoot } = require('./git-facade');
const oc = require('./orphan-cites');

const ROOT = path.join(__dirname, '..');
const MAP_REL = path.join('docs', 'rewrite-map.json');

// opts: { now: ISO string, root, git: injected facade } - D-006 seams.
function checkLeg(opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const gitx = o.git || forRoot(root);
  const now = o.now || new Date().toISOString();
  const nowTs = Date.parse(now) / 1000;
  const errors = [];
  const notes = [];

  const map = JSON.parse(fs.readFileSync(path.join(root, MAP_REL), 'utf8'));
  const loaded = oc.loadRegistry(root);
  const regErrors = oc.validateRegistry(loaded.reg);
  for (const e of regErrors) errors.push('registry: ' + e);
  const latest = oc.latestBySha(loaded.reg);

  const covers = function (token) {
    try { return oc.entryForToken(loaded.reg, token); } catch (e) { return null; }
  };

  // stage 3: present + unreachable + unregistered + past age+grace -> red.
  for (const d of map.doc_refs || []) {
    const q = d.qualifiers;
    if (!q) continue; // v1 maps carry no qualifiers - pre-cutover tree
    if (d['class'] !== 'local-only') continue; // only unadjudicated existence
    if (!Array.isArray(q.reachable_via) || q.reachable_via.length) continue; // still reachable
    if (covers(d.sha)) continue; // registered (any disposition)
    if (q.object_mtime === null || q.object_mtime === undefined) {
      // unagable -> conservatively past stage 1 (ADR-0089 D-E age basis)
      errors.push('stage3: ' + d.file + ':' + d.line + ' ' + d.sha + ' object has no determinable mtime and is unregistered - register while alive');
      continue;
    }
    const ageDays = (nowTs - q.object_mtime) / 86400;
    if (ageDays > oc.ORPHAN_AGE_DAYS + oc.ORPHAN_REGISTER_GRACE_DAYS) {
      errors.push('stage3: ' + d.file + ':' + d.line + ' ' + d.sha + ' unreachable ' + Math.floor(ageDays) + 'd, past ' + (oc.ORPHAN_AGE_DAYS + oc.ORPHAN_REGISTER_GRACE_DAYS) + 'd grace - register: node scripts/orphan-cites.js register ' + d.sha + ' --reason <text>');
    }
  }

  // Object-store portion (maintainer only): entries whose snapshot was taken
  // live must still be self-consistent against the object while it survives;
  // a registered-live object that vanished needs a purge observation appended
  // (backfill re-run) - unmarked purge is red, marked purge is quiet.
  const hasOldSide = o.hasOwnProperty('oldSide') ? o.oldSide : probe('old-side-refs', { root: root });
  let purgePending = 0;
  if (hasOldSide) {
    for (const e of loaded.reg.entries || []) {
      if (e.disposition !== 'orphaned' || !e.snapshot || e.object_purged_at) continue;
      const res = gitx.resolveToken(e.cited_sha);
      if (res.status === 'ok') {
        const t = gitx.objectType(res.sha);
        const s = gitx.objectSize(res.sha);
        if (e.object_type !== t || e.size !== s) {
          errors.push('registry tamper: ' + e.cited_sha + ' entry claims ' + e.object_type + '/' + e.size + ' but object is ' + t + '/' + s);
          continue;
        }
        if (t === 'commit' && e.snapshot && e.snapshot.subject) {
          const snap = gitx.objectSnapshot(res.sha);
          if (snap && snap.subject !== e.snapshot.subject) {
            errors.push('registry tamper: ' + e.cited_sha + ' snapshot.subject drift (' + JSON.stringify(e.snapshot.subject) + ' != ' + JSON.stringify(snap.subject) + ')');
          }
        }
      } else if (res.status === 'absent') {
        purgePending++;
      }
    }
  }
  if (purgePending) {
    errors.push(purgePending + ' registered live-snapshot object(s) absent from the object store without object_purged_at - append purge observations: node scripts/orphan-cites.js backfill');
  }
  return { errors: errors, notes: notes };
}

function main() {
  requireCapabilities('orphan-registration');
  const r = checkLeg({});
  if (r.errors.length) {
    console.error('[orphan-registration] FAIL:\n' + r.errors.join('\n'));
    process.exit(1);
  }
  console.log('[orphan-registration] OK: no over-grace unregistered orphans; registry consistent');
  process.exit(0);
}

if (require.main === module) main();
module.exports = { checkLeg };
