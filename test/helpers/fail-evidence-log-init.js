'use strict';
// Preload for the #71 item 12 regression test (verdict-gate init failure).
// The hook is spawned as its own process, so the only point that can make
// createEvidenceLog() throw without touching the real filesystem is the module
// loader: hand the gate's require of '../src/evidence-log' a view whose
// createEvidenceLog always throws. Every other require of the module (the
// pairer lane's './evidence-log', sentinel's lazy one) keeps the real factory.
const Module = require('module');
const origLoad = Module._load;

Module._load = function (request, parent, isMain) {
  const exp = origLoad.apply(this, arguments);
  if (request === '../src/evidence-log' && exp && typeof exp.createEvidenceLog === 'function') {
    const view = Object.create(exp);
    view.createEvidenceLog = function () {
      throw new Error('injected evidence-log init failure');
    };
    return view;
  }
  return exp;
};
