// gen-docs.template.cjs - the per-round doc-generator header template
// (grill-t17 D-003 template layer). New rounds copy this file to
// .scratch/grill-tNN/gen-docs.cjs and fill the grill-t18 slot plus the
// round's document payloads.
//
// The ROOT derivation is FROZEN: it must stay __dirname-derived. Absolute
// path literals are banned - the adr-0076-wiring invariant pin hard-fails
// any committed .scratch/grill-t*/gen-docs.cjs whose ROOT is not derived
// (the t14/t16 hardcoded-ROOT class died at this template; no whole-script
// shared module - per-round bodies legitimately diverge).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SCRATCH = path.join(ROOT, '.scratch', 'grill-t18');

const w = (rel, s) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  console.log('wrote', rel, s.length, 'B');
};

module.exports = { w, ROOT, SCRATCH };
if (require.main === module) { console.log('template only - fill grill-t18 and the round payloads in the copied file'); }
