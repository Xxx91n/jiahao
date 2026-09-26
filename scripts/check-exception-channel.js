#!/usr/bin/env node
// check-exception-channel.js - ADR-0086 leg 1: exception-field completeness.
// Every entry in a taxonomy field classified `exception-channel` carries the
// registered schema (field_governance.exception_channel.required_fields):
// status / requested_by / reason / expires_at / scope, plus the optional
// binding fields (path|sha|file|errata|for_commit). Fail-closed on:
//   - missing/invalid required fields (no expires_at, empty reason, ...)
//   - unknown status (closed enum)
//   - wildcard scope or wildcard binding path (no `*?%[]{}`)
//   - an effective-class entry (pending-confirmation|ratified) past expiry:
//     auto-lapse is a forcing function - adjudicate, renew, or remove.
// `revoked`/`lapsed` terminal records pass (they suppress nothing and are
// honest history). Usage: node scripts/check-exception-channel.js

'use strict';

const fs = require('fs');
const path = require('path');
const { requireCapabilities } = require('../src/shared/capability');
const fresh = require('./evidence-freshness');

const ROOT = path.join(__dirname, '..');
const TAX_REL = path.join('docs', 'governance', 'surface-taxonomy.json');
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const WILDCARD = /[*?%[\]{}]/;
const ALLOWED_BINDING = ['path', 'sha', 'file', 'errata', 'for_commit'];

// Walk the classification map; collect paths classed `exception-channel`.
function channelPaths(map, prefix, out) {
  for (const k of Object.keys(map || {})) {
    const v = map[k];
    const p = prefix ? prefix + '.' + k : k;
    if (typeof v === 'string') { if (v === 'exception-channel') out.push(p); continue; }
    if (v && typeof v === 'object' && !Array.isArray(v)) channelPaths(v, p, out);
  }
  return out;
}

function resolvePath(tax, dotted) {
  let node = tax;
  for (const seg of dotted.split('.')) {
    if (!node || typeof node !== 'object' || !(seg in node)) return undefined;
    node = node[seg];
  }
  return node;
}

function checkChannel(tax, today) {
  const fg = tax.field_governance;
  const errors = [];
  if (!fg || typeof fg !== 'object') { errors.push('taxonomy lacks the field_governance block (ADR-0086 registration missing)'); return errors; }
  const spec = fg.exception_channel || {};
  const required = Array.isArray(spec.required_fields) ? spec.required_fields : fresh.EXCEPTION_REQUIRED_FIELDS;
  const statuses = Array.isArray(spec.status_enum) ? spec.status_enum : fresh.EXCEPTION_STATUS_ENUM;
  const fields = channelPaths(fg.classification, '', []);
  if (!fields.length) errors.push('field_governance.classification registers no exception-channel fields');
  for (const fp of fields) {
    const entries = resolvePath(tax, fp);
    if (entries === undefined) { errors.push(fp + ': classified exception-channel but absent from the taxonomy'); continue; }
    if (!Array.isArray(entries)) { errors.push(fp + ': exception-channel field must be an array of entries'); continue; }
    entries.forEach((e, i) => {
      const tag = fp + '[' + i + ']';
      if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(tag + ': entry must be an object (ADR-0086 channel schema)'); return; }
      for (const f of required) {
        if (typeof e[f] !== 'string' || !e[f].trim()) errors.push(tag + ': required field ' + f + ' missing or empty');
      }
      if (typeof e.status === 'string' && statuses.indexOf(e.status) === -1) {
        errors.push(tag + ': status ' + JSON.stringify(e.status) + ' not in the closed enum ' + statuses.join('|'));
      }
      if (typeof e.expires_at === 'string' && e.expires_at && !ISO_DATE.test(e.expires_at)) {
        errors.push(tag + ': expires_at must be an ISO date YYYY-MM-DD');
      }
      if (spec.no_wildcard_scope) {
        if (typeof e.scope === 'string' && WILDCARD.test(e.scope)) errors.push(tag + ': scope carries a wildcard - the channel is literal-scope only');
        if (typeof e.path === 'string' && (WILDCARD.test(e.path) || e.path.indexOf('..') !== -1 || e.path.charAt(0) === '/')) {
          errors.push(tag + ': binding path must be a literal repo-relative path (no wildcards, no .., no leading /)');
        }
      }
      for (const k of Object.keys(e)) {
        if (required.indexOf(k) === -1 && ALLOWED_BINDING.indexOf(k) === -1) {
          errors.push(tag + ': unregistered field ' + JSON.stringify(k) + ' - extend the channel schema via an ADR');
        }
      }
      if (e.for_commit !== undefined && !/^[0-9a-f]{7,40}$/i.test(String(e.for_commit))) {
        errors.push(tag + ': for_commit must be a sha');
      }
      // Auto-lapse is loud: an effective-class entry past expiry is debt that
      // suppresses nothing but blocks the registry until adjudicated/renewed/removed.
      if ((e.status === 'pending-confirmation' || e.status === 'ratified') && ISO_DATE.test(String(e.expires_at)) && e.expires_at < today) {
        errors.push(tag + ': ' + e.status + ' entry lapsed at ' + e.expires_at + ' (today ' + today + ') - adjudicate, renew, or remove (auto-lapse never converts to permanent)');
      }
    });
  }
  return errors;
}

function main() {
  requireCapabilities('exception-channel');
  const tax = JSON.parse(fs.readFileSync(path.join(ROOT, TAX_REL), 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const errors = checkChannel(tax, today);
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  const fields = channelPaths(tax.field_governance.classification, '', []);
  const n = fields.reduce((acc, fp) => acc + (resolvePath(tax, fp) || []).length, 0);
  console.log('[exception-channel] OK: ' + fields.length + ' channel fields, ' + n + ' entries complete and in-force (ADR-0086)');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkChannel, channelPaths, resolvePath };
