'use strict';
// Preload for the stdin-guard regression test (#84, CodeRabbit on PR #93).
// Keeps the event loop alive past the 1s hang guard and prints only if it
// survived: if the guard were still armed after stdin ended, process.exit()
// would fire at 1s and this line would never be written.
setTimeout(() => { process.stdout.write('\nPRELOAD-ALIVE\n'); }, 1200);
