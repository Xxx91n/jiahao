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
  const { profilePath } = require('./jiahao-paths');
  const p = profilePath();
  if (!fs.existsSync(p)) return 'verifier';
  const v = fs.readFileSync(p, 'utf8').trim().toLowerCase();
  return v === 'generator' ? 'generator' : 'verifier';
}

function getProfileRoot(profile) {
  return profile === 'generator' ? 'generator' : 'verifier';
}

module.exports = { splitByProfile, loadProfileSections, readProfile, getProfileRoot };
