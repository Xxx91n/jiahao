'use strict';

// src/change-scope.js -- reads the change-control rules from a JSON file.
//
// docs/change-scope.json maps each change scope to the required response and
// the attestation a reviewer must give. This module owns the shape checks, so a
// malformed file fails closed without the schema being copied around.

const fs = require('fs');
const path = require('path');

const CHANGE_SCOPE_REL = path.join('docs', 'change-scope.json');
const SCOPES = ['identity', 'corpus', 'threshold', 'schedule_gate'];
const RESPONSES = ['quarantine', 'rebaseline', 'criteria-change', 'record'];
const ATTESTATIONS = ['certify', 'approve'];
const SCOPE_ATTESTATIONS = {
  identity: ['certify'],
  corpus: ['approve', 'certify'],
  threshold: ['approve'],
  schedule_gate: ['approve'],
};
const VOCABULARY_START = '<!-- machine-anchored-vocabulary:start -->';
const VOCABULARY_END = '<!-- machine-anchored-vocabulary:end -->';
const VOCABULARY_TOKENS = SCOPES.concat(RESPONSES).concat(ATTESTATIONS);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWordContains(text, token) {
  const re = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(token) + '($|[^A-Za-z0-9_])', 'm');
  return re.test(String(text || ''));
}

function vocabularyBlock(adrText) {
  const start = String(adrText || '').indexOf(VOCABULARY_START);
  const end = String(adrText || '').indexOf(VOCABULARY_END);
  if (start === -1 || end === -1 || end <= start) return '';
  return String(adrText).slice(start + VOCABULARY_START.length, end);
}

function vocabularyProblems(adrText, tokens) {
  const list = tokens || VOCABULARY_TOKENS;
  if (!adrText) return ['source ADR text missing'];
  const block = vocabularyBlock(adrText);
  if (!block) return ['machine-anchored vocabulary block missing'];
  const missing = list.filter(token => !wholeWordContains(block, token));
  return missing.length ? missing.map(token => 'token not anchored: ' + token) : [];
}

function loadChangeScope(root, opts) {
  const o = opts || {};
  const readFile = o.readFile || fs.readFileSync;
  const file = path.join(root, CHANGE_SCOPE_REL);
  let cfg;
  try {
    cfg = JSON.parse(readFile(file, 'utf8'));
  } catch (e) {
    throw new Error('change scope invalid JSON: ' + e.message);
  }
  if (!cfg || cfg.schema_version !== 1 || !cfg.scopes || typeof cfg.scopes !== 'object') {
    throw new Error('change scope shape must contain schema_version 1 and scopes object');
  }
  if (!cfg.vocabulary || !Array.isArray(cfg.vocabulary.tokens)) {
    throw new Error('change scope vocabulary must contain a tokens array');
  }
  for (const token of VOCABULARY_TOKENS) {
    if (!cfg.vocabulary.tokens.includes(token)) throw new Error('change scope vocabulary missing token ' + token);
  }
  for (const scope of SCOPES) {
    const entry = cfg.scopes[scope];
    if (!entry || !RESPONSES.includes(entry.response)) {
      throw new Error('change scope ' + scope + ' must have a response in ' + RESPONSES.join('|'));
    }
    if (!Array.isArray(entry.attestations) || !entry.attestations.length ||
        entry.attestations.some(a => !SCOPE_ATTESTATIONS[scope].includes(a))) {
      throw new Error('change scope ' + scope + ' must have attestations from ' + SCOPE_ATTESTATIONS[scope].join('|'));
    }
  }
  if (typeof cfg.source_adr !== 'string' || !cfg.source_adr) throw new Error('change scope source_adr is required');
  return cfg;
}

function classify(scope, cfg) {
  if (!SCOPES.includes(scope)) throw new Error('unknown change scope: ' + scope);
  return Object.assign({ scope: scope }, cfg.scopes[scope]);
}

function attestationAllowed(scope, cfg, attestation) {
  if (!cfg || !cfg.scopes || !cfg.scopes[scope]) return false;
  return (cfg.scopes[scope].attestations || []).includes(attestation);
}

module.exports = {
  CHANGE_SCOPE_REL,
  SCOPES,
  RESPONSES,
  ATTESTATIONS,
  SCOPE_ATTESTATIONS,
  VOCABULARY_START,
  VOCABULARY_END,
  VOCABULARY_TOKENS,
  vocabularyBlock,
  vocabularyProblems,
  loadChangeScope,
  classify,
  attestationAllowed,
};
