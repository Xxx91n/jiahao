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
const RESOLUTION_ENV = ['CLAUDE_CONFIG_DIR', 'HOME'].concat(HOST_CONFIG_DIR_ENV);

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
  for (const name of RESOLUTION_ENV) {
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
    for (const name of RESOLUTION_ENV) {
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
        paths.convictionLaneOffPath, paths.convictionLaneEnforcePath,
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
    const planted = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-'));
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jiahao-capa-root-'));
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
