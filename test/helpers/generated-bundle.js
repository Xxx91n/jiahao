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

// A plugin root handed to a spawned hook is a materialized ABSOLUTE directory.
// The generator's map is keyed by prefixes like 'adapters/codebuddy/', and
// path.join() onto such a key yields something that looks like a path but
// resolves against whatever cwd the test process happens to have. That is how
// #76 silently changed what an assertion measured without any merge conflict;
// the check lives here so each host wrapper (#77/#78 included) applies the same
// rule to the root its caller passes in.
function assertAbsolutePluginRoot(pluginRoot) {
  if (pluginRoot !== undefined && !path.isAbsolute(pluginRoot)) {
    throw new Error('pluginRoot must be an absolute directory (a materialized bundle), got ' +
      JSON.stringify(pluginRoot));
  }
}

function materializeBundle(generated, generatedPrefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-bundle-'));
  try {
    for (const [rel, text] of Object.entries(generated)) {
      if (!rel.startsWith(generatedPrefix)) continue;
      const abs = path.join(dir, rel.slice(generatedPrefix.length).split('/').join(path.sep));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, 'utf8');
    }
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  return dir;
}

module.exports = { materializeBundle, assertAbsolutePluginRoot };
