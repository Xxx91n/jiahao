'use strict';
// Materialize a generated plugin bundle into a throwaway directory, so a
// spawned hook runs exactly the bytes the generator emits.
//
// The bytes come from the in-memory generator output, never from adapters/:
// a suite that reads a generated file while another suite rewrites it can land
// in writeFileSync's truncate window (#66 measured 38 partial reads in 51
// rebuilds). Nothing here writes the repository.

const fs = require('fs');
const os = require('os');
const path = require('path');

function materializeBundle(generated, dirPrefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-bundle-'));
  for (const [rel, text] of Object.entries(generated)) {
    if (!rel.startsWith(dirPrefix)) continue;
    const abs = path.join(dir, rel.slice(dirPrefix.length).split('/').join(path.sep));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
  }
  return dir;
}

module.exports = { materializeBundle };
