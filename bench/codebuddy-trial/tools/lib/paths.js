// bench/codebuddy-trial/tools/lib/paths.js — residence layout (D-006).
// Tier-2 committed: runs/ manifests + runs/deviations.jsonl + registry files.
// Tier-1 never-commit (nc-010): captures/, claims/. Tools create Tier-1 dirs
// lazily; they are never tracked inputs.
//
// --trial-root <dir> re-roots the whole surface (fixture harnesses and the
// synthetic acceptance battery run against scratch copies, never the real
// bench tree).
'use strict';
const path = require('path');
const TRIAL = path.join(__dirname, '..', '..');           // bench/codebuddy-trial
const REPO = path.join(TRIAL, '..', '..');                // repo root

function resolve(trialRoot) {
  const ROOT = trialRoot ? path.resolve(trialRoot) : TRIAL;
  return {
    ROOT, REPO,
    RUNS: path.join(ROOT, 'runs'),
    CAPTURES: path.join(ROOT, 'captures'),
    CLAIMS: path.join(ROOT, 'claims'),
    VOLUMES: path.join(ROOT, 'volumes'),
    WORKBENCHES: path.join(ROOT, 'workbenches'),
    JUDGMENT_LINES: path.join(ROOT, 'judgment-lines.json'),
    EVAL_MAP: path.join(ROOT, 'eval-map.json'),
    FROZEN_PINS: path.join(ROOT, 'frozen-sha256.json'),
    DEVIATIONS_JSONL: path.join(ROOT, 'runs', 'deviations.jsonl'),
    DEVIATIONS_CURSOR: path.join(ROOT, 'runs', 'deviations-cursor.json'),
    manifestPath: (runId) => path.join(ROOT, 'runs', runId + '.json'),
    captureStore: (runId) => path.join(ROOT, 'captures', runId + '.jsonl'),
    claimFile: (runId, taskId) => path.join(ROOT, 'claims', runId, taskId + '.txt'),
  };
}

module.exports = Object.assign(resolve(), { resolve });
