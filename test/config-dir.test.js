'use strict';
// test/config-dir.test.js - #116: where jiahao's own state lands, per host.
//
// The order under test, in src/shared/paths.js:
//   CLAUDE_CONFIG_DIR -> HOME -> the host's own config root -> os.homedir()
//
// Two halves, because the ticket asks for two different things:
//   1. A table of resolutions: the shape each host hands its hooks today, and
//      what those shapes must keep resolving to. "#116 says no host that sets
//      CLAUDE_CONFIG_DIR or HOME may move" is a claim about a table, not prose,
//      so every row of the table is a case here.
//   2. Spawned proof: the real bundled gate, run under Qoder's measured
//      environment (Qoder's two variables present, the two Claude ones absent),
//      writes its state inside QODER_CONFIG_DIR. A unit assertion on a helper
//      would not catch a vendored copy that resolves somewhere else.

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const paths = require(path.join(repoRoot, 'src', 'shared', 'paths'));
const { configDirFrom, HOST_CONFIG_DIR_ENV } = paths;

// Every variable the resolver may consult, taken from the resolver itself so
// the table cannot fall behind a host root added to HOST_CONFIG_DIR_ENV.
// USERPROFILE is listed because configDirFrom honours it when the caller hands
// over an environment; the process-level helpers below use PROCESS_ENV, which
// leaves it alone - deleting USERPROFILE from a real process is not something
// a test should do, and os.homedir() reads it anyway.
const RESOLUTION_ENV = ['CLAUDE_CONFIG_DIR', 'HOME', 'USERPROFILE'].concat(HOST_CONFIG_DIR_ENV);
const PROCESS_ENV = ['CLAUDE_CONFIG_DIR', 'HOME'].concat(HOST_CONFIG_DIR_ENV);

function envOf(values) {
  const env = {};
  for (const name of RESOLUTION_ENV) {
    env[name] = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : undefined;
  }
  return env;
}

// Run fn with exactly the given variables set, restoring the process
// environment afterwards. Every case states a whole environment rather than a
// diff against whatever this test process happens to carry.
function withEnv(values, fn) {
  const saved = {};
  for (const name of PROCESS_ENV) {
    saved[name] = process.env[name];
    if (Object.prototype.hasOwnProperty.call(values, name) && values[name] !== undefined) {
      process.env[name] = values[name];
    } else {
      delete process.env[name];
    }
  }
  try {
    return fn();
  } finally {
    for (const name of PROCESS_ENV) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}

// os.homedir() is the last resort; the table pins "the OS answer", whatever it
// is on the machine running the suite.
const OS_HOME = os.homedir();

describe('configDir resolution order', () => {
  // name, env, expected, and why the row exists.
  const rows = [
    {
      name: 'an explicit CLAUDE_CONFIG_DIR wins over everything else',
      env: { CLAUDE_CONFIG_DIR: 'C:/pinned', HOME: 'C:/home', QODER_CONFIG_DIR: 'C:/qoder' },
      expected: 'C:/pinned',
    },
    {
      name: 'a Claude-shaped host (CLAUDE_CONFIG_DIR only) resolves as it did',
      env: { CLAUDE_CONFIG_DIR: 'C:/claude-config' },
      expected: 'C:/claude-config',
    },
    {
      name: 'a host with HOME and no Claude variable resolves as it did',
      env: { HOME: 'C:/home' },
      expected: 'C:/home',
    },
    {
      // WorkBuddy's hook subprocess carries both a HOME and its own root (the
      // owner's 2026-11-01 run, written up in the #116 ticket comment - the
      // workbuddy probe records under docs/evidence/ do not log HOME). The
      // ticket keeps HOME ahead of the host root so no installation moves.
      name: 'WORKBUDDY_CONFIG_DIR does not outrank HOME',
      env: { HOME: 'C:/home', WORKBUDDY_CONFIG_DIR: 'C:/home/.workbuddy-ai' },
      expected: 'C:/home',
    },
    {
      name: 'CODEBUDDY_CONFIG_DIR does not outrank HOME',
      env: { HOME: 'C:/home', CODEBUDDY_CONFIG_DIR: 'C:/home/.codebuddy' },
      expected: 'C:/home',
    },
    {
      // The measured Qoder CN Desktop 0.4.11 shape (line 15 of
      // qoder-hook-calls.jsonl): QODER_CONFIG_DIR and USERPROFILE, no
      // CLAUDE_CONFIG_DIR, no HOME. Before #116 this fell to the last resort.
      name: 'a Qoder-shaped hook lands in QODER_CONFIG_DIR',
      env: { QODER_CONFIG_DIR: 'C:/Users/u/.qoder-cn' },
      expected: 'C:/Users/u/.qoder-cn',
    },
    {
      name: 'the host root is checked only after both Claude variables',
      env: { HOME: 'C:/home', QODER_CONFIG_DIR: 'C:/qoder', WORKBUDDY_CONFIG_DIR: 'C:/wb' },
      expected: 'C:/home',
    },
    {
      name: 'two host roots with no Claude variable: the first listed wins',
      env: { QODER_CONFIG_DIR: 'C:/qoder', WORKBUDDY_CONFIG_DIR: 'C:/wb' },
      expected: 'C:/qoder',
    },
    {
      name: 'no host marker at all falls to the OS home, never /tmp',
      env: {},
      expected: OS_HOME,
    },
    {
      // #116: "USERPROFILE is what the host actually hands over". An injected
      // environment that names one must be honoured; answering with the
      // process user's home instead made the injected value a lie.
      name: 'an injected USERPROFILE is honoured instead of the process home',
      env: { USERPROFILE: 'C:/injected/home' },
      expected: 'C:/injected/home',
    },
    {
      name: 'a host root still outranks an injected USERPROFILE',
      env: { USERPROFILE: 'C:/injected/home', QODER_CONFIG_DIR: 'C:/qoder' },
      expected: 'C:/qoder',
    },
  ];

  for (const row of rows) {
    test(row.name, () => {
      expect(configDirFrom(envOf(row.env))).toBe(row.expected);
    });
  }

  test('a bare /tmp is never the answer, on any row', () => {
    for (const row of rows) {
      expect(configDirFrom(envOf(row.env))).not.toBe('/tmp');
    }
  });
});

describe('every state file follows the same base', () => {
  // flagPath / evidencePath / evidenceKeysPath / profilePath are the four the
  // ticket names; each is built on configDir(), so pinning the base once is
  // what keeps a second resolution order from growing in one of them.
  test('the exported path helpers are rooted at configDir()', () => {
    const root = path.join(repoRoot, '.no-such-qoder-root');
    withEnv({ QODER_CONFIG_DIR: root }, () => {
      expect(paths.configDir()).toBe(root);
      for (const build of [paths.flagPath, paths.evidencePath,
        paths.evidenceKeysPath, paths.profilePath,
        paths.transcriptCheckOffPath, paths.transcriptCheckEnforcePath,
        paths.kappaBaselinePath]) {
        expect(path.dirname(build())).toBe(root);
      }
    });
  });
});

describe('capability and detector read the same order', () => {
  // These two used to spell the order themselves (`CLAUDE_CONFIG_DIR || HOME ||
  // null` and `|| '/tmp'`). A second copy is how a constant's semantics drift
  // apart (#76): the probe would look for the corpus in a directory the gate
  // does not use. Both are asserted through the behaviour a caller sees.
  test('the bench-corpus probe looks under the resolved config dir', () => {
    const capability = require(path.join(repoRoot, 'src', 'shared', 'capability'));
    const planted = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cap-'));
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-cap-root-'));
    try {
      fs.mkdirSync(path.join(planted, 'private', 'bench-corpus'), { recursive: true });
      fs.writeFileSync(path.join(planted, 'private', 'bench-corpus', 'probes.jsonl'), '{}\n', 'utf8');
      // A root with no planted corpus of its own, so the only way this probe
      // can answer true is by resolving the host root.
      expect(capability.probe('bench-corpus',
        { root: emptyRoot, env: envOf({ QODER_CONFIG_DIR: planted }) })).toBe(true);
      // The negative case pins the ORDER, not the absence of a corpus: env that
      // resolves elsewhere must not find the one planted under the host root.
      // (The developer's own OS home may legitimately hold a planted corpus, so
      // asserting "false" for an empty env would be a gate that goes red on a
      // machine that ran the installer.)
      expect(capability.probe('bench-corpus',
        { root: emptyRoot, env: envOf({ CLAUDE_CONFIG_DIR: emptyRoot }) })).toBe(false);
    } finally {
      fs.rmSync(planted, { recursive: true, force: true });
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  test('detector looks for phrases.json under the resolved config dir', () => {
    const detector = require(path.join(repoRoot, 'src', 'detector'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-detect-'));
    try {
      fs.mkdirSync(path.join(dir, 'private'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'private', 'phrases.json'), '{}', 'utf8');
      withEnv({ QODER_CONFIG_DIR: dir }, () => {
        const found = detector.resolvePhrasesPath();
        expect(found.source).toBe('config-private');
        expect(found.path).toBe(path.join(dir, 'private', 'phrases.json'));
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('spawned gate under a Qoder-shaped environment', () => {
  // The acceptance asks for the real gate, spawned as the host spawns it, with
  // the environment the #109 probe recorded. Nothing of CLAUDE_CONFIG_DIR or
  // HOME is present, so the only place it can write is QODER_CONFIG_DIR - and
  // the assertion reads that directory back rather than parsing stdout.
  const { buildAdapters } = require(path.join(repoRoot, 'scripts', 'build-adapters'));
  const { materializeBundle } = require('./helpers/generated-bundle');
  const { spawnHook, expectExit } = require('./helpers/spawned-hook');
  const PLATFORM = 'qoder';
  let bundleDir;

  beforeAll(() => {
    bundleDir = materializeBundle(buildAdapters(), 'adapters/qoder/');
  });

  afterAll(() => {
    if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
  });

  // The measured shape, and nothing else: delete every variable the resolver
  // can read, then set exactly what Qoder sets.
  function qoderEnv(qoderConfigDir) {
    const env = Object.assign({}, process.env);
    for (const k of RESOLUTION_ENV.concat(['CLAUDE_PLUGIN_ROOT', 'QODER_SESSION_ID'])) {
      delete env[k];
    }
    env.QODER_CONFIG_DIR = qoderConfigDir;
    env.QODER_PROJECT_DIR = repoRoot;
    return env;
  }

  function tempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  }

  // A directory holding only the profile flag: the state the gate reads before
  // it decides anything.
  function dirWithProfile() {
    const dir = tempDir('jiahao-qoder-state-');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
    return dir;
  }

  test('a Stop gate blocks out of the flag file it finds under QODER_CONFIG_DIR', () => {
    const dir = dirWithProfile();
    try {
      fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-verdict-gate.js'), {
        stdin: JSON.stringify({ session_id: 'issue-116', stop_hook_active: false }),
        args: [PLATFORM],
        env: qoderEnv(dir),
      });
      // The gate only arms when it sees .jiahao-active; a resolver that still
      // fell to the OS home would exit 0 with no output here. exit 2 + the
      // decision field is the Qoder channel #109 watched blocking.
      expectExit(res, 2);
      const out = JSON.parse(String(res.stdout).trim());
      expect(out.decision).toBe('block');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test('SessionStart creates the flag inside QODER_CONFIG_DIR', () => {
    // No pre-seeded flag: the file that appears is the one this hook wrote, so
    // its location is the resolver's answer rather than the fixture's.
    const dir = dirWithProfile();
    try {
      expect(fs.existsSync(path.join(dir, '.jiahao-active'))).toBe(false);
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-activate.js'), {
        stdin: '{}',
        args: [PLATFORM],
        env: qoderEnv(dir),
      });
      expectExit(res, 0);
      expect(fs.existsSync(path.join(dir, '.jiahao-active'))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test('a reconciled sentinel writes its evidence record inside QODER_CONFIG_DIR', () => {
    // A killed hook leaves a sentinel; the next hook start reconciles it into a
    // timeout record. That append is the write the ticket is about - it must
    // land in the host root, not wherever the old fallback pointed.
    const dir = dirWithProfile();
    try {
      fs.writeFileSync(path.join(dir, '.jiahao-sentinel.jiahao-orphan'), JSON.stringify({
        hook: 'jiahao-orphan', turn: 't-116', started_at: '2026-08-28T00:00:00.000Z',
        phase: 'verify', phase_at: '2026-08-28T00:00:01.000Z',
      }), 'utf8');
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-sweep.js'), {
        stdin: '{}',
        args: [PLATFORM],
        env: qoderEnv(dir),
      });
      expectExit(res, 0);
      expect(fs.existsSync(path.join(dir, '.jiahao-sentinel.jiahao-orphan'))).toBe(false);
      const evidenceDir = path.join(dir, '.jiahao-evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);
      const records = fs.readdirSync(evidenceDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => fs.readFileSync(path.join(evidenceDir, f), 'utf8'))
        .join('');
      expect(records).toContain('sentinel-reconcile');
      expect(records).toContain('jiahao-orphan');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test('a hook that also gets HOME keeps writing under HOME, not the host root', () => {
    // #116 accepts the host root only *after* HOME. The spawned proof: a
    // session carrying both variables must put its flag in HOME. This is the
    // "no host that sets HOME may move" claim, measured rather than asserted
    // against a table.
    const homeDir = tempDir('jiahao-fake-home-');
    const qoderDir = dirWithProfile();
    try {
      const env = qoderEnv(qoderDir);
      env.HOME = homeDir;
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-activate.js'), {
        stdin: '{}',
        args: [PLATFORM],
        env: env,
      });
      expectExit(res, 0);
      expect(fs.existsSync(path.join(homeDir, '.jiahao-active'))).toBe(true);
      expect(fs.existsSync(path.join(qoderDir, '.jiahao-active'))).toBe(false);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
      fs.rmSync(qoderDir, { recursive: true, force: true });
    }
  }, 20000);
});

describe('the README recipes resolve the same directory as the hooks', () => {
  // CodeRabbit #127: every adapter README tells the operator how to find the
  // config dir, and those recipes spelled only the first two steps while the
  // prose right above them described four. A recipe that finds a different
  // directory than paths.js is the #116 failure all over again, so the two are
  // compared mechanically instead of by reading.
  const { HOSTS, POSIX_CONFIG_SNIPPET, POWERSHELL_CONFIG_SNIPPET } = require(
    path.join(repoRoot, 'scripts', 'build-adapters'));
  const generated = require(path.join(repoRoot, 'scripts', 'build-adapters')).buildAdapters();

  test('every README that ships a recipe names every host root, in the resolver order', () => {
    const readmes = Object.keys(generated)
      .filter((rel) => rel.endsWith('/README.md') && rel.startsWith('adapters/'));
    expect(readmes.length).toBeGreaterThanOrEqual(HOSTS.length);
    let withRecipe = 0;
    for (const rel of readmes) {
      const text = generated[rel];
      if (!text.includes(POSIX_CONFIG_SNIPPET)) continue;
      withRecipe++;
      // Order matters: a recipe that checked the host roots in another order
      // would answer differently from the resolver on a host that sets two.
      let cursor = -1;
      for (const name of HOST_CONFIG_DIR_ENV) {
        const at = POSIX_CONFIG_SNIPPET.indexOf(name);
        expect(at).toBeGreaterThan(cursor);
        cursor = at;
      }
      // And the same list must appear in the prose, so a reader skimming the
      // sentence is told the same thing the command does.
      for (const name of HOST_CONFIG_DIR_ENV) expect(text).toContain(name);
    }
    expect(withRecipe).toBeGreaterThan(0);
  });

  test('no README still ships the two-step recipe that stops at HOME', () => {
    for (const rel of Object.keys(generated)) {
      if (!rel.endsWith('/README.md')) continue;
      expect(generated[rel]).not.toContain('CLAUDE_CONFIG_DIR:-$HOME}');
    }
  });

  test('the PowerShell recipe checks the same variables in the same order', () => {
    // Positional assertion, not containment: the previous version only asked
    // whether each name appeared, so a snippet that read PowerShell's `$HOME`
    // (an automatic variable, always set) instead of the HOME *environment
    // variable* passed while resolving to the OS home on a host that sets only
    // QODER_CONFIG_DIR (CodeRabbit #127, measured on PS 5.1).
    //
    // The resolver order is CLAUDE_CONFIG_DIR, HOME, then the host roots, then
    // the OS home. In PowerShell the first three of the command are the env
    // vars ($env:HOME is what Node reads as HOME); `$HOME` may only appear
    // after every host root.
    const positions = ['$env:CLAUDE_CONFIG_DIR', '$env:HOME']
      .concat(HOST_CONFIG_DIR_ENV.map((name) => '$env:' + name));
    let cursor = -1;
    for (const token of positions) {
      const at = POWERSHELL_CONFIG_SNIPPET.indexOf(token);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    // The automatic variable is the fallback, never the HOME step.
    const autoHome = POWERSHELL_CONFIG_SNIPPET.indexOf('$HOME');
    expect(autoHome).toBeGreaterThan(cursor);
    // And it must not sneak in earlier as a substring of `$env:HOME`.
    expect(POWERSHELL_CONFIG_SNIPPET.indexOf('$HOME')).toBe(
      POWERSHELL_CONFIG_SNIPPET.lastIndexOf('$HOME'));
  });
});

describe('the POSIX recipe is executable, not just readable', () => {
  // Reading the snippet and nodding is how a stray brace survived a round of
  // review (#127): the string looked right and the shell answered with a
  // trailing `}`. Run it and compare against the resolver instead.
  const { POSIX_CONFIG_SNIPPET } = require(path.join(repoRoot, 'scripts', 'build-adapters'));
  const { spawnSync } = require('child_process');
  const { skipTest } = require('./helpers/skip');

  // A Windows box without Git Bash on PATH has no `bash` to run. The recipe
  // itself is POSIX-only prose in that case, so the case is skipped with a
  // reason instead of failing the suite (#127) - but the recipe test still runs
  // wherever the shell exists, which is every CI image this repo uses.
  const bashDir = findBash();
  const recipeTest = (name, fn) => {
    if (!bashDir) {
      return skipTest(BASH_PROBE_HINT, name, fn);
    }
    return test(name, fn);
  };

  // A shell that merely exits 0 is not enough: the cases below depend on POSIX
  // parameter expansion (`${A:-${B:-...}}`), on running a script file by path,
  // on `unset` actually removing the variable, and on the snippet's `mkdir -p`.
  // cmd.exe and a bare PowerShell both exit 0 and would make every case fail for
  // the wrong reason. So the probe runs the real snippet against a scratch
  // directory and demands the real answer; anything else means "no compatible
  // shell", which skips with a reason (#127).
  const BASH_PROBE_HINT = 'no POSIX shell that runs the profile recipe: this suite executes it through bash';

  function findBash() {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-bash-probe-'));
    const expectedFs = path.join(scratch, 'created-by-recipe');
    // The shell prints the path the way the recipe wrote it (forward slashes on
    // Git Bash), so compare in that spelling and check existence with the OS
    // spelling.
    const expectedShell = expectedFs.replace(/\\/g, '/');
    const probePath = path.join(scratch, 'probe.sh');
    try {
      fs.writeFileSync(probePath,
        'unset HOME CLAUDE_CONFIG_DIR CODEBUDDY_CONFIG_DIR WORKBUDDY_CONFIG_DIR USERPROFILE\n' +
        'QODER_CONFIG_DIR="' + expectedShell + '"\n' +
        POSIX_CONFIG_SNIPPET + '\nprintf "%s" "$CONFIG"\n', 'utf8');
      const res = spawnSync('bash', [probePath], {
        env: { PATH: process.env.PATH }, encoding: 'utf8',
      });
      if (res.error || res.status !== 0) return null;
      if (String(res.stdout) !== expectedShell) return null;
      // The snippet's `mkdir -p` must have run: without it every write below
      // fails on a fresh machine, which is the defect this probe guards.
      return fs.existsSync(expectedFs) ? 'bash' : null;
    } finally {
      try { fs.rmSync(scratch, { recursive: true, force: true }); } catch (e) { /* best effort */ }
    }
  }

  // `sh -c` is not enough, and neither is an absent HOME in the env: Git Bash
  // re-derives HOME from USERPROFILE before the script runs, so the host-root
  // branch could never be reached and the first version of this case answered
  // with the OS home for every input. `unset` inside the script is the only way
  // to hand the recipe the environment a host actually hands a hook.
  const scriptPath = path.join(os.tmpdir(), 'jiahao-recipe-' + process.pid + '.sh');
  beforeAll(() => {
    fs.writeFileSync(scriptPath, POSIX_CONFIG_SNIPPET + '\nprintf "%s" "$CONFIG"\n', 'utf8');
  });
  afterAll(() => {
    try { fs.unlinkSync(scriptPath); } catch (e) { /* already gone */ }
  });

  function resolvedByRecipe(env) {
    // Start from a clean environment, then unset every variable the case does
    // not name - so the shell's own HOME derivation cannot answer for one.
    const raw = { PATH: process.env.PATH };
    for (const name of RESOLUTION_ENV) {
      if (Object.prototype.hasOwnProperty.call(env, name)) raw[name] = env[name];
    }
    const unset = RESOLUTION_ENV
      .filter((name) => !Object.prototype.hasOwnProperty.call(env, name))
      .map((name) => 'unset ' + name + ' 2>/dev/null')
      .join('\n');
    const wrapper = path.join(os.tmpdir(), 'jiahao-recipe-run-' + process.pid + '.sh');
    fs.writeFileSync(wrapper, unset + '\n. "' + scriptPath.replace(/\\/g, '/') + '"\n', 'utf8');
    try {
      const res = spawnSync('bash', [wrapper], { env: raw, encoding: 'utf8' });
      if (res.error) throw res.error;
      if (res.status !== 0) throw new Error('recipe failed: ' + res.stderr);
      return String(res.stdout);
    } finally {
      try { fs.unlinkSync(wrapper); } catch (e) { /* already gone */ }
    }
  }

  const cases = [
    { name: 'Qoder shape', env: { QODER_CONFIG_DIR: '/q/.qoder-cn' }, want: '/q/.qoder-cn' },
    { name: 'WorkBuddy root only', env: { WORKBUDDY_CONFIG_DIR: '/wb' }, want: '/wb' },
    { name: 'CodeBuddy root only', env: { CODEBUDDY_CONFIG_DIR: '/cb' }, want: '/cb' },
    { name: 'HOME outranks host roots', env: { HOME: '/home/u', QODER_CONFIG_DIR: '/q' }, want: '/home/u' },
    { name: 'CLAUDE_CONFIG_DIR wins', env: { CLAUDE_CONFIG_DIR: '/pinned', HOME: '/home/u' }, want: '/pinned' },
    {
      // The resolver's step 4 with an injected env. Node's os.homedir() reads
      // HOME and then the passwd entry on POSIX, never USERPROFILE, so without
      // this step the recipe answered with the shell's home while the resolver
      // answered with USERPROFILE.
      name: 'an injected USERPROFILE is the fourth step',
      env: { USERPROFILE: '/injected/home' },
      want: '/injected/home',
    },
    {
      name: 'a host root still outranks USERPROFILE',
      env: { USERPROFILE: '/injected/home', QODER_CONFIG_DIR: '/q' },
      want: '/q',
    },
  ];

  for (const c of cases) {
    recipeTest(c.name + ': the recipe prints exactly the resolved dir', () => {
      expect(resolvedByRecipe(c.env)).toBe(c.want);
    });
  }

  recipeTest('the recipe output has no trailing brace or whitespace', () => {
    const out = resolvedByRecipe({ QODER_CONFIG_DIR: '/q/.qoder-cn' });
    expect(out).toBe(out.trim());
    expect(out.endsWith('}')).toBe(false);
  });
});

describe('both recipes create the directory they resolved', () => {
  // CodeRabbit #127: `Set-Content` into a directory that does not exist fails
  // with "Could not find a part of the path" (measured on PS 5.1), and only
  // some of the recipes remembered `mkdir -p`. Both snippets now create it, so
  // a fresh machine - where a pin like ~/.jiahao has never been made - works
  // from the first line.
  const { POSIX_CONFIG_SNIPPET, POWERSHELL_CONFIG_SNIPPET } = require(
    path.join(repoRoot, 'scripts', 'build-adapters'));

  test('the POSIX snippet runs mkdir -p on the resolved dir', () => {
    expect(POSIX_CONFIG_SNIPPET).toContain('mkdir -p "$CONFIG"');
    // And it runs after CONFIG is assigned, never before.
    expect(POSIX_CONFIG_SNIPPET.indexOf('mkdir -p'))
      .toBeGreaterThan(POSIX_CONFIG_SNIPPET.indexOf('CONFIG='));
  });

  test('the PowerShell snippet creates the selected dir with New-Item', () => {
    expect(POWERSHELL_CONFIG_SNIPPET).toMatch(/New-Item -ItemType Directory -Force -Path \$c/);
    expect(POWERSHELL_CONFIG_SNIPPET.indexOf('New-Item'))
      .toBeGreaterThan(POWERSHELL_CONFIG_SNIPPET.indexOf('$c = @('));
  });

  test('every recipe that writes a flag creates its directory first', () => {
    // The snippets own the creation now. A row that writes a flag path without
    // ever creating it fails on a fresh machine; that was true of three rows
    // before this fix. WorkBuddy's pinned path sets CONFIG itself and carries
    // its own mkdir - the check is that no row is left without one, not that
    // each row has exactly one.
    const generated = require(path.join(repoRoot, 'scripts', 'build-adapters')).buildAdapters();
    for (const [rel, text] of Object.entries(generated)) {
      if (!rel.endsWith('/README.md')) continue;
      const writesPosixFlags = text.includes('.jiahao-active"') && text.includes('Set-Content') === false;
      if (!writesPosixFlags) continue;
      const creates = text.includes('mkdir -p "$CONFIG"');
      expect({ rel, creates }).toEqual({ rel, creates: true });
    }
  });
});
