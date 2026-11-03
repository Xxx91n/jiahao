#!/usr/bin/env node
'use strict';
// check-skill-external.js - the two external assertions on the distribution
// face skills/jiahao/ (#67, on top of the #63 release gate).
//
// Until now "the shape is spec-legal" and "the standard CLI installs it and
// lands exactly SKILL.md" rested on one manual run recorded in #60/#67.
// Nothing re-ran them, so spec drift on our side (a forbidden frontmatter
// key, a second discoverable skill, a runtime file sneaking into
// skills/jiahao/) would not turn any check in this repo red. These two
// checks make both claims re-runnable:
//
//   spec     the official Agent Skills reference validator (skills-ref from
//            agentskills/agentskills) reports zero errors for skills/jiahao/
//   install  the standard `skills` CLI discovers exactly one skill (jiahao)
//            in this repo and a real project-level install into a temp dir
//            lands only .claude/skills/jiahao/SKILL.md (plus the CLI's own
//            skills-lock.json), byte-identical to the repo file
//
// Both tools are pinned below and fetched fresh into temp locations on every
// run: the gate must not depend on whatever a machine happens to have
// installed. Needing the network is the price, so both checks fail closed:
// no python, no pip, no network, an unparseable listing - every one of those
// is a red with the reason and the tool's own output attached, never a skip.
//
// Deliberately only skills/jiahao/ is validated. src/ and the adapter src/
// copies carry argument-hint and a directory name != skill name on purpose
// (they are not the distribution face; that mismatch is what keeps
// `--skill jiahao` from binding to them), so the validator is supposed to
// complain about them (#67 Notes).
//
// Usage: node scripts/check-skill-external.js [spec|install]
//        (no argument runs both; the release gate runs them one at a time)

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const SKILL_DIR_REL = 'skills/jiahao';
const SKILL_NAME = 'jiahao';

// The pins are the reproducibility contract: bump them in one place, on
// purpose, and let the tag gate re-prove the face against the new tool.
// skills-ref 0.1.1 is the latest PyPI release of agentskills/agentskills'
// reference validator; skills 1.7.4 is the CLI version the manual evidence
// in #67 was produced with.
const SKILLS_REF_VERSION = '0.1.1';
const SKILLS_CLI_VERSION = '1.7.4';
const SKILLS_CLI_PACKAGE = 'skills@' + SKILLS_CLI_VERSION;
// skills@1.7.4 declares engines node >=22.20.0 (it imports fs/promises
// glob), while this repo's own suite is proven on node 20. The install half
// therefore runs under a >=22.20 node: the current one when it qualifies,
// else the binary JIAHAO_SKILLS_NODE points at (CI installs node 22 first,
// records its path, then lets node 20 win PATH), else it fails closed.
const SKILLS_CLI_MIN_NODE = '22.20.0';

// A project-level `skills add --agent claude-code --copy` leaves exactly the
// skill file and the CLI's own lockfile (#67 evidence). Anything else in the
// temp project - a calibration.js, a second skill directory - is a red.
const INSTALLED_SKILL_REL = '.claude/skills/jiahao/SKILL.md';
const EXPECTED_INSTALL_FILES = [INSTALLED_SKILL_REL, 'skills-lock.json'];

// ---- pure helpers (unit-tested; the network halves are not) ---------------

function stripAnsi(text) {
  // Clack-style CLIs colourise and redraw; the parser below reads plain words.
  // eslint-disable-next-line no-control-regex
  return String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '\n');
}

// What the gate needs out of `skills add <repo> --list`: the discovered count
// and whether jiahao is among the names. count is null when the output does
// not carry the "Found N skill(s)" line at all - the caller fails closed on
// that instead of guessing, and prints the raw output so the new shape can
// be seen from the log alone.
function parseSkillsList(text) {
  const cleaned = stripAnsi(text);
  const m = /Found\s+(\d+)\s+skills?\b/i.exec(cleaned);
  return {
    count: m ? Number(m[1]) : null,
    hasJiahao: new RegExp('\\b' + SKILL_NAME + '\\b').test(cleaned),
    cleaned: cleaned,
  };
}

// Numeric x.y.z comparison for the node floor above. Unparseable input is
// "below" - the caller fails closed on a version it cannot read.
function versionGte(version, min) {
  const parse = (s) => {
    const parts = String(s).replace(/^v/, '').split('.').map(p => Number(p));
    return parts.length === 3 && parts.every(n => Number.isInteger(n) && n >= 0) ? parts : null;
  };
  const a = parse(version);
  const b = parse(min);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

// landed files (posix-relative, under the temp project) vs the contract.
function auditInstalledFiles(landed) {
  const problems = [];
  for (const rel of EXPECTED_INSTALL_FILES) {
    if (!landed.includes(rel)) problems.push('missing ' + rel);
  }
  for (const rel of landed) {
    if (!EXPECTED_INSTALL_FILES.includes(rel)) problems.push('unexpected ' + rel);
  }
  return problems;
}

// ---- process plumbing -------------------------------------------------------

function run(cmd, args, opts) {
  const options = Object.assign({
    cwd: root,
    encoding: 'utf8',
    timeout: 240000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  }, opts || {});
  const res = spawnSync(cmd, args, options);
  if (res.error) throw new Error(cmd + ' did not complete: ' + res.error.message);
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

// Same npm resolution as scripts/release-gate.js: node runs npm's own CLI
// file directly when npm_execpath names it, so no shell quoting is involved.
function resolveNpm() {
  const candidates = [];
  if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
  if (process.platform === 'win32') {
    candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return { cmd: process.execPath, args: [c] };
  }
  return { cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: [], shell: process.platform === 'win32' };
}

function npm(args, opts) {
  const npmCmd = resolveNpm();
  const spawnOpts = Object.assign({}, opts || {});
  if (npmCmd.shell) spawnOpts.shell = true;
  return run(npmCmd.cmd, npmCmd.args.concat(args), spawnOpts);
}

function tail(text) {
  return String(text).trim().split('\n').slice(-25).map(l => '  ' + l).join('\n');
}

function collectRel(absDir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? rel + '/' + entry.name : entry.name;
      const childAbs = path.join(abs, entry.name);
      if (entry.isDirectory()) walk(childAbs, childRel);
      else out.push(childRel);
    }
  };
  walk(absDir, '');
  return out.sort();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ---- spec: official reference validator, pinned ----------------------------

function findPython() {
  for (const cmd of ['python3', 'python']) {
    const res = spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    if (!res.error && res.status === 0) return cmd;
  }
  throw new Error('no python3/python on PATH, so the pinned skills-ref validator cannot run. ' +
    'Failing closed (#67: never skip silently) - install Python 3 (CI uses actions/setup-python) and re-run.');
}

// The validator runs as a library call and reports as JSON on the last
// stdout line, so the gate asserts on the error array itself, not on prose.
// validate() returns list[str]; empty means valid (agentskills validator.py).
const VALIDATE_SNIPPET = [
  'import json, sys',
  'from importlib.metadata import version',
  'from pathlib import Path',
  'from skills_ref import validate',
  'errors = validate(Path(sys.argv[1]))',
  'print(json.dumps({"version": version("skills-ref"), "errors": [str(e) for e in errors]}))',
].join('\n');

function checkSpec() {
  const python = findPython();
  const skillDir = path.join(root, SKILL_DIR_REL.split('/').join(path.sep));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-skills-ref-'));
  try {
    const pylibs = path.join(tmp, 'pylibs');
    const pip = run(python,
      ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', '--target', pylibs,
        'skills-ref==' + SKILLS_REF_VERSION],
      { timeout: 300000 });
    if (pip.status !== 0) {
      throw new Error('installing the pinned skills-ref==' + SKILLS_REF_VERSION + ' from PyPI failed ' +
        '(offline or PyPI unreachable?). Failing closed - the spec check does not skip.\n' +
        tail(pip.stderr || pip.stdout));
    }
    const env = Object.assign({}, process.env, {
      PYTHONPATH: pylibs + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
    });
    const res = run(python, ['-c', VALIDATE_SNIPPET, skillDir], { env: env, timeout: 120000 });
    if (res.status !== 0) {
      throw new Error('skills-ref ' + SKILLS_REF_VERSION + ' did not produce a verdict for ' +
        SKILL_DIR_REL + '/ (exit ' + res.status + '):\n' + tail(res.stderr || res.stdout));
    }
    const lastLine = res.stdout.trim().split('\n').pop();
    let verdict;
    try {
      verdict = JSON.parse(lastLine);
    } catch (e) {
      throw new Error('skills-ref output did not parse as JSON (' + e.message + '):\n' + tail(res.stdout));
    }
    if (verdict.version !== SKILLS_REF_VERSION) {
      throw new Error('skills-ref reports version ' + verdict.version + ' but the gate pins ' +
        SKILLS_REF_VERSION + '; a verdict from an unpinned validator does not count');
    }
    if (!Array.isArray(verdict.errors)) {
      throw new Error('skills-ref verdict carries no error array:\n' + tail(res.stdout));
    }
    if (verdict.errors.length !== 0) {
      throw new Error('skills-ref ' + SKILLS_REF_VERSION + ' rejects ' + SKILL_DIR_REL +
        '/ with ' + verdict.errors.length + ' error(s):\n' +
        verdict.errors.map(e => '  ' + e).join('\n'));
    }
    return 'skills-ref ' + SKILLS_REF_VERSION + ' (PyPI, pinned): ' + SKILL_DIR_REL + '/ errors == 0';
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- install: standard CLI discovery + real install, pinned ---------------

function skillsCli(args, cwd) {
  return npm(['exec', '--yes', '--package', SKILLS_CLI_PACKAGE, '--', 'skills'].concat(args),
    { cwd: cwd, timeout: 300000 });
}

// Re-run only the install half under the node binary JIAHAO_SKILLS_NODE
// names. The child's PATH starts with that binary's directory, so the
// skills bin's `env node` shebang resolves to the same >=22.20 node, not
// back to the outer one. The variable is cleared for the child: its node
// already satisfies the floor, and a stale value must not loop.
function rerunInstallUnderPinnedNode() {
  const alt = process.env.JIAHAO_SKILLS_NODE;
  if (!alt) {
    throw new Error(SKILLS_CLI_PACKAGE + ' needs node >= ' + SKILLS_CLI_MIN_NODE +
      ' (its engines; it imports fs/promises glob) but this check runs on node v' +
      process.versions.node + '. Re-run under node >= ' + SKILLS_CLI_MIN_NODE +
      ', or set JIAHAO_SKILLS_NODE to such a node binary and the install half re-runs under it. ' +
      'Failing closed (#67: never skip silently).');
  }
  const probe = spawnSync(alt, ['--version'], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (probe.error || probe.status !== 0) {
    throw new Error('JIAHAO_SKILLS_NODE=' + alt + ' did not answer --version (' +
      (probe.error ? probe.error.message : 'exit ' + probe.status) + '); failing closed.');
  }
  const altVersion = probe.stdout.trim().replace(/^v/, '');
  if (!versionGte(altVersion, SKILLS_CLI_MIN_NODE)) {
    throw new Error('JIAHAO_SKILLS_NODE=' + alt + ' is node v' + altVersion + ', below the >= ' +
      SKILLS_CLI_MIN_NODE + ' that ' + SKILLS_CLI_PACKAGE + ' needs; failing closed.');
  }
  const env = Object.assign({}, process.env, {
    PATH: path.dirname(alt) + path.delimiter + (process.env.PATH || ''),
  });
  delete env.JIAHAO_SKILLS_NODE;
  const res = run(alt, [__filename, 'install'], { env: env, timeout: 600000 });
  if (res.status !== 0) {
    throw new Error('install half under node v' + altVersion + ' (' + alt + ') failed:\n' +
      tail(res.stderr || res.stdout));
  }
  return res.stdout.trim();
}

function checkInstall() {
  if (!versionGte(process.versions.node, SKILLS_CLI_MIN_NODE)) {
    return rerunInstallUnderPinnedNode();
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-skills-install-'));
  try {
    const list = skillsCli(['add', root, '--list'], tmp);
    const listOut = list.stdout + '\n' + list.stderr;
    if (list.status !== 0) {
      throw new Error(SKILLS_CLI_PACKAGE + ' add <repo> --list exited ' + list.status +
        ' (offline or the npm registry unreachable?). Failing closed - the install check does not skip.\n' +
        tail(listOut));
    }
    const parsed = parseSkillsList(listOut);
    if (parsed.count === null) {
      throw new Error('cannot read a "Found N skill" discovery line out of ' + SKILLS_CLI_PACKAGE +
        ' --list output; failing closed on the unrecognised shape:\n' + tail(parsed.cleaned));
    }
    if (parsed.count !== 1 || !parsed.hasJiahao) {
      throw new Error(SKILLS_CLI_PACKAGE + ' must discover exactly 1 skill named ' + SKILL_NAME +
        ' in this repo; the listing says otherwise (count=' + parsed.count +
        ', names ' + SKILL_NAME + ': ' + (parsed.hasJiahao ? 'yes' : 'no') + '):\n' + tail(parsed.cleaned));
    }

    const add = skillsCli(['add', root, '--skill', SKILL_NAME, '--agent', 'claude-code', '--copy', '-y'], tmp);
    if (add.status !== 0) {
      throw new Error(SKILLS_CLI_PACKAGE + ' add --skill ' + SKILL_NAME + ' exited ' + add.status + ':\n' +
        tail(add.stdout + '\n' + add.stderr));
    }
    const landed = collectRel(tmp);
    const problems = auditInstalledFiles(landed);
    if (problems.length) {
      throw new Error('the installed file set is not exactly ' + EXPECTED_INSTALL_FILES.join(' + ') +
        ' (' + problems.join('; ') + '); everything the CLI left behind:\n' +
        landed.map(rel => '  ' + rel).join('\n'));
    }
    const installedBytes = fs.readFileSync(path.join(tmp, INSTALLED_SKILL_REL.split('/').join(path.sep)));
    const repoBytes = fs.readFileSync(path.join(root, SKILL_DIR_REL, 'SKILL.md'));
    if (!installedBytes.equals(repoBytes)) {
      throw new Error('installed SKILL.md differs from ' + SKILL_DIR_REL + '/SKILL.md: installed ' +
        installedBytes.length + ' B sha256 ' + sha256(installedBytes) + ' vs repo ' +
        repoBytes.length + ' B sha256 ' + sha256(repoBytes));
    }
    return SKILLS_CLI_PACKAGE + ' (npm, pinned): --list finds exactly 1 skill (' + SKILL_NAME +
      '); temp install lands only ' + INSTALLED_SKILL_REL + ' (+ skills-lock.json), ' +
      repoBytes.length + ' B byte-identical to ' + SKILL_DIR_REL + '/SKILL.md';
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- driver -----------------------------------------------------------------

const CHECKS = { spec: checkSpec, install: checkInstall };

function main() {
  const arg = process.argv[2] || null;
  if (arg !== null && !CHECKS[arg]) {
    console.error('usage: node scripts/check-skill-external.js [spec|install]');
    process.exit(2);
  }
  const names = arg ? [arg] : Object.keys(CHECKS);
  for (const name of names) {
    try {
      console.log(CHECKS[name]());
    } catch (e) {
      console.error('skill-' + name + ' FAILED: ' + e.message);
      process.exit(1);
    }
  }
}

if (require.main === module) main();

module.exports = {
  SKILL_DIR_REL,
  SKILLS_REF_VERSION,
  SKILLS_CLI_VERSION,
  SKILLS_CLI_PACKAGE,
  EXPECTED_INSTALL_FILES,
  SKILLS_CLI_MIN_NODE,
  versionGte,
  stripAnsi,
  parseSkillsList,
  auditInstalledFiles,
};
