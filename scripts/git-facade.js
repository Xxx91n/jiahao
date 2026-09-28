#!/usr/bin/env node
// git-facade.js - ADR-0089 (grill-t32): the single injectable seam for every
// git child-process call on the classifier/registry path. Zero-dependency.
//
// D-006 harness shape: only low-level call failures are mocked through here
// (cat-file non-zero, rev-list crash, registry IO) - the callers never spawn
// git directly, so tests substitute `exec` and nothing else. Everything above
// this line is real git.
//
// Replace-ref discipline (ADR-0089 D-D): every object-read op (resolve /
// cat-file / rev-list / log) runs under GIT_NO_REPLACE_OBJECTS=1
// unconditionally - deterministic when no replace refs exist, mandatory when
// scripts/orphan-cites.js --replace-ref has materialized refs/replace/*.
// Ref-mutation and ref-listing calls go through run/ok with the ambient env.
//
// Usage:
//   const gitx = require('./git-facade').forRoot(root);           // real git
//   const gitx = require('./git-facade').forRoot(root, { exec }); // injected

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const NO_REPLACE_ENV = Object.assign({}, process.env, { GIT_NO_REPLACE_OBJECTS: '1' });

function forRoot(root, opts) {
  const o = opts || {};
  const exec = o.exec || function (args, env) {
    const r = spawnSync('git', args, {
      cwd: root, encoding: 'utf8',
      env: env || process.env,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { status: r.status === null ? 1 : r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
  };

  // run: args -> stdout (trimmed); throws GitError on non-zero.
  function run(args, env) {
    const r = exec(args, env);
    if (r.status !== 0) {
      const e = new Error('git ' + args.join(' ') + ' failed (exit ' + r.status + '): ' + String(r.stderr || '').trim());
      e.name = 'GitError';
      e.code = r.status;
      e.stderr = String(r.stderr || '');
      throw e;
    }
    return String(r.stdout).trim();
  }
  function ok(args, env) { return exec(args, env).status === 0; }
  // nr = no-replace object-read forms.
  const nr = (args) => run(args, NO_REPLACE_ENV);
  const nrOk = (args) => ok(args, NO_REPLACE_ENV);

  return {
    root: root,
    _objCache: new Map(),
    exec: exec,
    run: run,
    ok: ok,
    nr: nr,
    nrOk: nrOk,

    // ---- object reads (always no-replace) ----

    // token -> full object name. 'ambiguous' and 'absent' are distinguished
    // so callers can fail closed on the first and classify the second.
    // Returns { status: 'ok', sha } | { status: 'ambiguous' } | { status: 'absent' }
    resolveToken(token) {
      try {
        const sha = nr(['rev-parse', '--verify', '--quiet', token + '^{object}']);
        return { status: 'ok', sha: sha };
      } catch (e) {
        if (/ambiguous/i.test(e.stderr || '')) return { status: 'ambiguous' };
        return { status: 'absent' };
      }
    },
    exists(sha) { return nrOk(['cat-file', '-e', sha]); },
    objectType(sha) { return nr(['cat-file', '-t', sha]); },
    objectSize(sha) { return parseInt(nr(['cat-file', '-s', sha]), 10); },

    // Object's own time: committer/tagger timestamp for commit/tag (intrinsic),
    // loose-file mtime for loose blob/tree, null when undeterminable (packed
    // non-commit objects carry no per-object mtime - ADR-0089 D-E age basis).
    objectMtime(sha) {
      const type = this.objectType(sha);
      if (type === 'commit' || type === 'tag') {
        const text = nr(['cat-file', type, sha]);
        const m = /(?:committer|tagger)\s.*>\s+(\d+)/.exec(text);
        return m ? parseInt(m[1], 10) : null;
      }
      const loose = path.join(root, '.git', 'objects', sha.slice(0, 2), sha.slice(2));
      try { return Math.floor(fs.statSync(loose).mtimeMs / 1000); } catch (e) { return null; }
    },

    // Commit snapshot for the registry (null for non-commit types).
    objectSnapshot(sha) {
      const type = this.objectType(sha);
      if (type !== 'commit' && type !== 'tag') return null;
      const text = nr(['cat-file', type, sha]);
      const head = text.split('\n\n')[0].split('\n');
      const f = (k) => head.filter((l) => l.indexOf(k + ' ') === 0).map((l) => l.slice(k.length + 1));
      const cts = />(\s*)(\d+)(?:\s|$)/.exec(f('committer')[0] || f('tagger')[0] || '');
      return {
        subject: text.split('\n\n').slice(1).join('\n\n').split('\n')[0] || null,
        author: f('author')[0] || f('tagger')[0] || null,
        committer_ts: cts ? parseInt(cts[2], 10) : null,
        parents: f('parent'),
      };
    },

    revListObjects(ref) {
      return nr(['rev-list', '--objects', ref]).split('\n')
        .map((s) => s.split(' ')[0].trim()).filter(Boolean);
    },
    revListCommits(ref) {
      return nr(['rev-list', ref]).split('\n').map((s) => s.trim()).filter(Boolean);
    },
    revParse(ref) { return run(['rev-parse', ref]); },

    // Display refs for the reachable_via qualifier: every real ref minus
    // gitbutler internals and refs/replace/* (replace refs are the mutation
    // channel, never a reachability display source).
    displayRefs() {
      return run(['for-each-ref', '--format=%(refname)']).split('\n')
        .map((s) => s.trim()).filter(Boolean)
        .filter((r) => r.indexOf('gitbutler') === -1 && r.indexOf('refs/replace/') !== 0);
    },

    // sha -> [refname] over display refs. Per-ref object sets are cached on
    // the facade instance (one rev-list --objects per ref per process, not
    // per cited sha - the reachable_via qualifier must stay cheap).
    objectSet(ref) {
      if (!this._objCache.has(ref)) this._objCache.set(ref, new Set(this.revListObjects(ref)));
      return this._objCache.get(ref);
    },
    reachableVia(sha, refs) {
      const via = [];
      for (const r of refs) {
        try {
          if (this.objectSet(r).has(sha)) via.push(r);
        } catch (e) { /* a ref that fails enumeration is not reachability */ }
      }
      return via;
    },
  };
}

module.exports = { forRoot, NO_REPLACE_ENV };
