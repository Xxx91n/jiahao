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

function loadChangeSurface(root, opts) {
  const readFile = (opts && opts.readFile) || fs.readFileSync;
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
  loadChangeSurface,
  classify,
  attestationAllowed,
};
