'use strict';

// src/change-surface.js -- ADR-0047 D-A machine fact-source reader.
//
// docs/change-surface.json maps each validated change surface to the tiered
// response and human attestation vocabulary. This module owns shape checks so
// scripts/instrument.js can fail closed on a malformed classifier without
// duplicating the schema.

const fs = require('fs');
const path = require('path');

const CHANGE_SURFACE_REL = path.join('docs', 'change-surface.json');
const SURFACES = ['identity', 'corpus', 'threshold', 'schedule_gate'];
const RESPONSES = ['quarantine', 'rebaseline', 'criteria-change', 'record'];
const ATTESTATIONS = ['certify', 'approve'];
const SURFACE_ATTESTATIONS = {
  identity: ['certify'],
  corpus: ['approve', 'certify'],
  threshold: ['approve'],
  schedule_gate: ['approve'],
};
const ANCHOR_START = '<!-- machine-anchored-vocabulary:start -->';
const ANCHOR_END = '<!-- machine-anchored-vocabulary:end -->';
const ANCHOR_TOKENS = SURFACES.concat(RESPONSES).concat(ATTESTATIONS);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWordContains(text, token) {
  const re = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(token) + '($|[^A-Za-z0-9_])', 'm');
  return re.test(String(text || ''));
}

function vocabularyBlock(adrText) {
  const start = String(adrText || '').indexOf(ANCHOR_START);
  const end = String(adrText || '').indexOf(ANCHOR_END);
  if (start === -1 || end === -1 || end <= start) return '';
  return String(adrText).slice(start + ANCHOR_START.length, end);
}

function vocabularyAnchorErrors(adrText, tokens) {
  const list = tokens || ANCHOR_TOKENS;
  if (!adrText) return ['source ADR text missing'];
  const block = vocabularyBlock(adrText);
  if (!block) return ['machine-anchored vocabulary block missing'];
  const missing = list.filter(token => !wholeWordContains(block, token));
  return missing.length ? missing.map(token => 'token not anchored: ' + token) : [];
}

function loadChangeSurface(root, opts) {
  const o = opts || {};
  const readFile = o.readFile || fs.readFileSync;
  const file = path.join(root, CHANGE_SURFACE_REL);
  let cfg;
  try {
    cfg = JSON.parse(readFile(file, 'utf8'));
  } catch (e) {
    throw new Error('change surface invalid JSON: ' + e.message);
  }
  if (!cfg || cfg.schema_version !== 1 || !cfg.surfaces || typeof cfg.surfaces !== 'object') {
    throw new Error('change surface shape must contain schema_version 1 and surfaces object');
  }
  if (!cfg.anchor || !Array.isArray(cfg.anchor.tokens)) {
    throw new Error('change surface anchor must contain a tokens array');
  }
  for (const token of ANCHOR_TOKENS) {
    if (!cfg.anchor.tokens.includes(token)) throw new Error('change surface anchor missing token ' + token);
  }
  for (const surface of SURFACES) {
    const entry = cfg.surfaces[surface];
    if (!entry || !RESPONSES.includes(entry.response)) {
      throw new Error('change surface ' + surface + ' must have a response in ' + RESPONSES.join('|'));
    }
    if (!Array.isArray(entry.attestations) || !entry.attestations.length ||
        entry.attestations.some(a => !SURFACE_ATTESTATIONS[surface].includes(a))) {
      throw new Error('change surface ' + surface + ' must have attestations from ' + SURFACE_ATTESTATIONS[surface].join('|'));
    }
  }
  if (typeof cfg.source_adr !== 'string' || !cfg.source_adr) throw new Error('change surface source_adr is required');
  return cfg;
}

function classify(surface, cfg) {
  if (!SURFACES.includes(surface)) throw new Error('unknown change surface: ' + surface);
  return Object.assign({ surface }, cfg.surfaces[surface]);
}

function attestationAllowed(surface, cfg, attestation) {
  if (!cfg || !cfg.surfaces || !cfg.surfaces[surface]) return false;
  return (cfg.surfaces[surface].attestations || []).includes(attestation);
}

module.exports = {
  CHANGE_SURFACE_REL,
  SURFACES,
  RESPONSES,
  ATTESTATIONS,
  SURFACE_ATTESTATIONS,
  ANCHOR_START,
  ANCHOR_END,
  ANCHOR_TOKENS,
  vocabularyBlock,
  vocabularyAnchorErrors,
  loadChangeSurface,
  classify,
  attestationAllowed,
};
