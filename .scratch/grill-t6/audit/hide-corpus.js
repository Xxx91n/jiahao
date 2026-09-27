'use strict';
// Audit preload: simulate a public-tier host by hiding private/bench-corpus
// from fs.existsSync (the repo-private fallback in src/shared/paths.js).
const fs = require('fs');
const orig = fs.existsSync;
fs.existsSync = function (p) {
    if (String(p).replace(/\\/g, '/').includes('private/bench-corpus')) return false;
    return orig(p);
};
