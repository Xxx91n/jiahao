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
const { configDirFrom } = require(path.join(repoRoot, 'src', 'shared', 'paths'));

// Every variable the resolver may consult. A case sets the ones it means and
// deletes the rest, so the table states a whole environment rather than a
// diff against whatever this test process happens to carry.
const RESOLUTION_ENV = ['CLAUDE_CONFIG_DIR', 'HOME', 'QODER_CONFIG_DIR',
  'CODEBUDDY_CONFIG_DIR', 'WORKBUDDY_CONFIG_DIR'];

function envOf(values) {
  const env = {};
  for (const name of RESOLUTION_ENV) {
    env[name] = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : undefined;
  }
  return env;
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
      // WorkBuddy's hook subprocess carries both a HOME and its own root
      // (docs/evidence/v0.3.0/workbuddy-*-probe-*.md). The ticket keeps HOME
      // ahead of the host root so that installation does not move.
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
    const paths = require(path.join(repoRoot, 'src', 'shared', 'paths'));
    const saved = {};
    for (const k of RESOLUTION_ENV) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    process.env.QODER_CONFIG_DIR = path.join(repoRoot, '.no-such-qoder-root');
    try {
      const base = process.env.QODER_CONFIG_DIR;
      expect(paths.configDir()).toBe(base);
      for (const build of [paths.flagPath, paths.evidencePath,
        paths.evidenceKeysPath, paths.profilePath,
        paths.convictionLaneOffPath, paths.convictionLaneEnforcePath,
        paths.kappaBaselinePath]) {
        expect(path.dirname(build())).toBe(base);
      }
    } finally {
      for (const k of RESOLUTION_ENV) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });
});

describe('capability and detector read the same order', () => {
  // These two used to spell the order themselves (`CLAUDE_CONFIG_DIR || HOME ||
  // null` and `|| '/tmp'`). A second copy is how a constant's semantics drift
  // apart (#76): the probe would look for the corpus in a directory the gate
  // does not use. Both are asserted through the behaviour a caller sees.
  test('the bench-corpus probe looks under the resolved config dir', () => {
    const capability = require(path.join(repoRoot, 'src', 'shared', 'capability'));
    const planted = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-'));
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-root-'));
    try {
      fs.mkdirSync(path.join(planted, 'private', 'bench-corpus'), { recursive: true });
      fs.writeFileSync(path.join(planted, 'private', 'bench-corpus', 'probes.jsonl'), '{}\n', 'utf8');
      // A root with no planted corpus of its own, so the only way this probe
      // can answer true is by resolving the host root.
      expect(capability.probe('bench-corpus',
        { root: emptyRoot, env: envOf({ QODER_CONFIG_DIR: planted }) })).toBe(true);
      expect(capability.probe('bench-corpus',
        { root: emptyRoot, env: envOf({}) })).toBe(false);
    } finally {
      fs.rmSync(planted, { recursive: true, force: true });
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  test('detector looks for phrases.json under the resolved config dir', () => {
    const detector = require(path.join(repoRoot, 'src', 'detector'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-detect-'));
    const saved = {};
    for (const k of RESOLUTION_ENV) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    try {
      fs.mkdirSync(path.join(dir, 'private'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'private', 'phrases.json'), '{}', 'utf8');
      process.env.QODER_CONFIG_DIR = dir;
      const found = detector.resolvePhrasesPath();
      expect(found.source).toBe('config-private');
      expect(found.path).toBe(path.join(dir, 'private', 'phrases.json'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      for (const k of RESOLUTION_ENV) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
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

  function qoderConfigDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-qoder-state-'));
    fs.writeFileSync(path.join(dir, '.jiahao-active'), 'full', 'utf8');
    fs.writeFileSync(path.join(dir, '.jiahao-profile'), 'verifier', 'utf8');
    return dir;
  }

  test('a Stop gate blocks out of the flag file it finds under QODER_CONFIG_DIR', () => {
    const dir = qoderConfigDir();
    try {
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

  test('the state the gate writes stays inside QODER_CONFIG_DIR', () => {
    const dir = qoderConfigDir();
    const homeBefore = fs.existsSync(path.join(OS_HOME, '.jiahao-evidence'))
      ? fs.readdirSync(path.join(OS_HOME, '.jiahao-evidence')).length
      : 0;
    try {
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-activate.js'), {
        stdin: '{}',
        args: [PLATFORM],
        env: qoderEnv(dir),
      });
      expectExit(res, 0);
      // SessionStart plants the flag and reconciles sentinels; both are writes
      // under the config dir. The flag is the one it creates when missing.
      expect(fs.existsSync(path.join(dir, '.jiahao-active'))).toBe(true);
      // No sentinel is left behind by a hook that ran to completion.
      const leaked = fs.readdirSync(dir).filter((f) => f.startsWith('.jiahao-sentinel.'));
      expect(leaked).toEqual([]);
      // And nothing new appeared in the OS home, which is where the pre-#116
      // resolution would have put it on this machine.
      const homeAfter = fs.existsSync(path.join(OS_HOME, '.jiahao-evidence'))
        ? fs.readdirSync(path.join(OS_HOME, '.jiahao-evidence')).length
        : 0;
      expect(homeAfter).toBe(homeBefore);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test('the sweep hook reconciles inside QODER_CONFIG_DIR, not the OS home', () => {
    const dir = qoderConfigDir();
    try {
      const res = spawnHook(path.join(bundleDir, 'hooks', 'jiahao-sweep.js'), {
        stdin: '{}',
        args: [PLATFORM],
        env: qoderEnv(dir),
      });
      expectExit(res, 0);
      // The sweep is best-effort by contract; what it must not do is create a
      // bucket somewhere else. Its own directory is empty of sentinels, so the
      // check is that the run left the directory unchanged.
      expect(fs.readdirSync(dir).sort()).toEqual(['.jiahao-active', '.jiahao-profile']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);
});
