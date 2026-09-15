// fixture: append N distinctive records via commit() (ADR-0024 D2a concurrency test)
const log = require(process.argv[2]).createEvidenceLog(process.argv[3]);
const EL = require(process.argv[2]);
const id = process.argv[4], n = parseInt(process.argv[5], 10);
for (let i = 0; i < n; i++) {
  log.commit((chain, prev) => {
    const rec = EL.createRecord('conc-test', 'sentinel', 'suspect', 'w' + id + '-' + i, null, prev, {});
    rec._idem = id + '-' + i;
    rec.event_hash = EL.recordHash(rec);
    return [rec];
  });
}
