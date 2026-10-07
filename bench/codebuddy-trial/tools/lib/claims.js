// bench/codebuddy-trial/tools/lib/claims.js — claim capture channel (D-004).
// claims/<run_id>/<task_id>.txt files are Tier-1 never-commit (nc-010).
// Header lines ("k: v") end at a '---' separator; the body is the VERBATIM
// claim text — no tidying, ever (a paraphrased claim measures the owner, not
// the agent).
'use strict';
const fs = require('fs');
const path = require('path');
const { sha256 } = require('./common');

const CHANNELS = { TRANSCRIPT: 'transcript-extract', PASTE: 'owner-paste' };

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const sep = raw.indexOf('\n---\n');
  if (sep < 0) return { file, channel: null, headers: {}, body: raw, body_sha256: sha256(raw), malformed: true };
  const head = raw.slice(0, sep), body = raw.slice(sep + 5);
  const headers = {};
  for (const line of head.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) headers[m[1]] = m[2];
  }
  return { file, channel: headers.channel || null, headers, body, body_sha256: sha256(body), malformed: false };
}

// Write a transcript-extracted claim. An existing owner-paste file is NEVER
// overwritten (owner artifact); when a paste exists we substring cross-check
// and report the result instead of touching it (D-004 v).
function writeExtracted(claimFile, meta, text) {
  fs.mkdirSync(path.dirname(claimFile), { recursive: true });
  if (fs.existsSync(claimFile)) {
    const cur = parse(claimFile);
    if (cur.channel === CHANNELS.PASTE) {
      const consistent = cur.body.indexOf(text) >= 0 || text.indexOf(cur.body.trim()) >= 0;
      return { wrote: false, channel: CHANNELS.PASTE, substring_check: consistent ? 'match' : 'mismatch' };
    }
    if (cur.channel === CHANNELS.TRANSCRIPT && cur.body_sha256 === sha256(text)) {
      return { wrote: false, channel: CHANNELS.TRANSCRIPT, substring_check: 'unchanged' };
    }
  }
  const head = [
    'channel: ' + CHANNELS.TRANSCRIPT,
    'session_id: ' + meta.session_id,
    'source_transcript: ' + meta.source_transcript,
    'source_sha256: ' + meta.source_sha256,
    'extract_rule: ' + meta.extract_rule,
    'claim_sha256: ' + sha256(text),
    '---',
  ].join('\n');
  fs.writeFileSync(claimFile, head + '\n' + text, 'utf8');
  return { wrote: true, channel: CHANNELS.TRANSCRIPT };
}

function listClaims(claimsRoot, runId) {
  const dir = path.join(claimsRoot, runId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.txt$/.test(f)).sort()
    .map((f) => parse(path.join(dir, f)));
}

module.exports = { CHANNELS, parse, writeExtracted, listClaims };
