'use strict';
// test/protected-path.test.js — #75: the protected-path decision pinned
// against BOTH path implementations.
//
// A subprocess test can only ever exercise the host it runs on, which is how
// the absolute-containment check stayed broken on POSIX after shipping: the
// separators were rewritten before resolve(), so an absolute POSIX path lost
// its leading root and stopped being recognised as inside the plugin at all.
// Injecting path.posix / path.win32 runs the same table on either host.

const path = require('path');
const { isProtected } = require('../src/shared/protected-path');
const { lockDir } = require('../src/file-lock');

// #88 item 4 census: ONE table, two consumers. `name` is the file the guard has
// to deny; `literal` is the quoted spelling the source actually contains, or
// null when the name is derived rather than written (the sentinel name is
// `PREFIX + hook`). Keeping both in one row means the behaviour test and the
// binding scan cannot drift into separate lists.
const STATE_SURFACE = [
  { name: '.jiahao-active', literal: '.jiahao-active' },
  { name: '.jiahao-profile', literal: '.jiahao-profile' },
  { name: '.jiahao-evidence', literal: '.jiahao-evidence' },
  { name: '.jiahao-evidence.keys', literal: '.jiahao-evidence.keys' },
  // Derived through the writer, not copied: if lockDir() ever moves the lock
  // out of the reserved namespace, this row stops being protected and the
  // state test turns red (CodeRabbit on PR #132).
  { name: path.posix.basename(lockDir('/cfg/.jiahao-evidence')), literal: null },
  { name: '.jiahao-pretool.jsonl', literal: '.jiahao-pretool.jsonl' },
  { name: '.jiahao-instructions.jsonl', literal: '.jiahao-instructions.jsonl' },
  { name: '.jiahao-transcript-check-off', literal: '.jiahao-transcript-check-off' },
  { name: '.jiahao-transcript-check-enforce', literal: '.jiahao-transcript-check-enforce' },
  { name: '.jiahao-kappa-baseline.json', literal: '.jiahao-kappa-baseline.json' },
  { name: '.jiahao-anchor.json', literal: '.jiahao-anchor.json' },
  { name: '.jiahao-persistence.json', literal: '.jiahao-persistence.json' },
  { name: '.jiahao-calibration.jsonl', literal: '.jiahao-calibration.jsonl' },
  { name: '.jiahao-sentinel.jiahao-verdict-gate', literal: '.jiahao-sentinel.' }, // PREFIX + hook
];

const PLATFORMS = [
  {
    name: 'posix',
    P: path.posix,
    sep: '/',
    root: '/home/u/proj/.codebuddy/plugins/jiahao',
    cwd: '/home/u/proj',
    elsewhere: '/home/u/other-project',
  },
  {
    name: 'win32',
    P: path.win32,
    sep: '\\',
    root: 'C:\\Users\\u\\proj\\.codebuddy\\plugins\\jiahao',
    cwd: 'C:\\Users\\u\\proj',
    elsewhere: 'C:\\Users\\u\\other-project',
  },
];

function check(plat, text) {
  return isProtected(text, plat.root, { pathImpl: plat.P, cwd: plat.cwd });
}

for (const plat of PLATFORMS) {
  const inRoot = (...parts) => [plat.root].concat(parts).join(plat.sep);
  const outside = (...parts) => [plat.elsewhere].concat(parts).join(plat.sep);

  describe('protected path (' + plat.name + ')', () => {
    // The apparatus the verifier must be able to defend: the bundle's own hook
    // map, MCP registration, manifest, injected rules and vendored runtime.
    test('names shared with ordinary projects are protected inside the plugin root', () => {
      const shapes = [
        'rm ' + inRoot('hooks', 'hooks.json'),
        'rm ' + inRoot('.mcp.json'),
        'move ' + inRoot('.claude-plugin', 'plugin.json') + ' out.json',
        'cat ' + inRoot('hooks', 'hooks.json') + ' && echo done',
        // #110: every host's manifest location, not just the Claude-shaped one.
        'move ' + inRoot('.workbuddy-plugin', 'plugin.json') + ' out.json',
        'move ' + inRoot('.codex-plugin', 'plugin.json') + ' out.json',
        'move ' + inRoot('.qoder-plugin', 'plugin.json') + ' out.json',
        'rm ' + inRoot('plugin.json'),
        'rm ' + inRoot('hooks.json'),
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(true);
    });

    // #71 item 2: the rule text and the vendored runtime copies sat outside the
    // protected list entirely.
    test('the rule text and the runtime copies under the plugin root are protected', () => {
      const shapes = [
        'rm ' + inRoot('src', 'SKILL.md'),
        'rm ' + inRoot('src', 'evidence-log.js'),
        'rm ' + inRoot('src', 'shared', 'paths.js'),
        'truncate -s 0 ' + inRoot('rules', 'jiahao-verifier.md'),
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(true);
    });

    test('ordinary files with the same names elsewhere are none of its business', () => {
      const shapes = [
        'rm .mcp.json',
        'cat hooks/hooks.json',
        'move .claude-plugin/plugin.json out.json',
        'move .workbuddy-plugin/plugin.json out.json',
        'rm plugin.json',
        'rm ' + outside('.mcp.json'),
        'rm ' + outside('hooks', 'hooks.json'),
        'rm ' + outside('.claude-plugin', 'plugin.json'),
        'rm ' + outside('src', 'SKILL.md'),
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(false);
    });

    test('a sibling directory of the plugin root is not containment', () => {
      const shapes = [
        'rm ' + inRoot('..', '.mcp.json'),
        'rm ' + inRoot('..', 'hooks', 'hooks.json'),
        'rm ' + inRoot('..', 'jiahao-claude-code', 'src', 'SKILL.md'),
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(false);
    });

    test('jiahao-owned names stay protected wherever they appear', () => {
      const shapes = [
        'rm rules/jiahao-verifier.md',
        'rm -rf hooks/jiahao-pretool-guard.js',
        'cat .jiahao-pretool.jsonl',
        'rm ' + outside('rules', 'jiahao-generator.md'),
        'rm ' + outside('hooks', 'jiahao-sweep.js'),
        'rm C:/x/plugin/rules/jiahao-verifier.md extra',
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(true);
    });

    // #88 item 4: the state files the guard could not name before. The reserved
    // `.jiahao-*` namespace makes this table a census, not the pattern's source
    // of truth - the binding test below keeps the two from drifting again.
    // Each one is a way for the agent to switch its own discipline off: the
    // conviction kill switch, the evidence chain, its lock, and the anchor /
    // persistence declarations.
    test('every jiahao state file is protected wherever it appears', () => {
      for (const { name } of STATE_SURFACE) {
        expect(check(plat, 'rm ' + name)).toBe(true);
        expect(check(plat, 'echo x > ' + outside(name))).toBe(true);
      }
      // files INSIDE the evidence directory are the chain itself
      expect(check(plat, 'rm ' + outside('.jiahao-evidence', 'segments', '0001.jsonl'))).toBe(true);
      // the namespace is a prefix, not a substring: a user name that merely
      // contains `jiahao` is still none of the guard's business
      expect(check(plat, 'rm my-jiahao-notes')).toBe(false);
      expect(check(plat, 'rm user.jiahao-profile')).toBe(false);
      // reserved wholesale: a user file that DOES start with `.jiahao-` is
      // denied as collateral (#88 "一把抓 + 例外表"). Pinned so the widening is
      // a visible decision; an exception goes in protected-path.js.
      expect(check(plat, 'rm .jiahao-notes')).toBe(true);
      // an underscore is part of the reserved namespace too, not only the
      // letters today's state names happen to use (CodeRabbit on PR #132)
      expect(check(plat, 'rm .jiahao-draft_1')).toBe(true);
      // punctuation is not whitelisted away either: the suffix spans one path
      // segment, so `+` and `~` names are the same reserved namespace
      // (CodeRabbit on PR #132)
      expect(check(plat, 'rm .jiahao-draft+2')).toBe(true);
      expect(check(plat, 'rm .jiahao-draft~1')).toBe(true);
      // whitespace is a filename character too; a quoted name stays one token
      // and the whole segment is denied
      expect(check(plat, 'rm ".jiahao-my notes"')).toBe(true);
    });

    // #88 item 6: jiahao-mcp/ is the vendored MCP server, i.e. the writer the
    // evidence chain relies on. An agent that can rewrite it can rewrite the
    // writer, so it joins the apparatus dirs.
    test('the vendored MCP server directory is apparatus', () => {
      expect(check(plat, 'rm ' + inRoot('jiahao-mcp', 'index.js'))).toBe(true);
      expect(check(plat, 'sed -i s/a/b/ ' + inRoot('jiahao-mcp', 'package.json'))).toBe(true);
      expect(check(plat, 'rm ' + outside('jiahao-mcp', 'index.js'))).toBe(false);
    });
  });
}

// #88 item 4 acceptance: the fragment list must stop being a second
// hand-maintained copy of the state names. The source is the list - every
// quoted `.jiahao-…` name under src/, hooks/ or jiahao-mcp/ has to be denied -
// with STATE_SURFACE pinning the census so an empty walk cannot pass. Adding a
// state file without extending protection turns this red.
describe('protected path (state file binding, #88 item 4)', () => {
  const fs = require('fs');

  function jsFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...jsFiles(full));
      else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
  }

  test('every .jiahao name written by src/, hooks/ or jiahao-mcp/ is protected', () => {
    const root = path.join(__dirname, '..');
    const files = jsFiles(path.join(root, 'src'))
      .concat(jsFiles(path.join(root, 'hooks')))
      .concat(jsFiles(path.join(root, 'jiahao-mcp')));
    // the list this must bind to lives in src/shared/paths.js: prove the walk
    // actually reached it before trusting an empty `missed`
    expect(files).toContain(path.join(root, 'src', 'shared', 'paths.js'));
    const found = new Set();
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      // Single- or double-quoted string literals only (backticks excluded on
      // purpose: comments here wrap names in backticks, and prose is not
      // something the agent can delete). The suffix is not a whitelist: a
      // name ends only at its closing quote or a line break, so
      // `.jiahao-_draft` or `.jiahao-draft+2` shows up here instead of
      // disappearing from the census (CodeRabbit on PR #132).
      for (const match of text.matchAll(/(['"])(\.jiahao-[^'"\r\n]+)\1/g)) found.add(match[2]);
    }
    // every literal spelling the census expects must really be in the tree
    for (const { literal } of STATE_SURFACE) {
      if (literal) expect(found.has(literal)).toBe(true);
    }
    // and every name found must be denied on BOTH path implementations
    const missed = [...found].filter((name) =>
      !isProtected('rm ' + name, null, { pathImpl: path.posix }) ||
      !isProtected('rm ' + name, null, { pathImpl: path.win32 }));
    expect(missed).toEqual([]);
  });
});

describe('protected path (shell spellings)', () => {
  // A Bash payload reaches the guard as text: `~`, `$HOME` and the host's own
  // plugin-root variable are what the command really contains, and the shell
  // expands them before anything touches a file. Narrowing `.mcp.json` /
  // `hooks.json` / the manifest to containment (#75) must not hand those
  // spellings back as a way around it.
  const root = '/home/u/.codebuddy/plugins/jiahao';
  const env = { HOME: '/home/u' };
  const check = (text) => isProtected(text, root, { pathImpl: path.posix, cwd: '/home/u/proj', env: env });

  test('tilde and $HOME spellings of the plugin root are the plugin root', () => {
    const shapes = [
      'rm ~/.codebuddy/plugins/jiahao/.mcp.json',
      'rm $HOME/.codebuddy/plugins/jiahao/hooks/hooks.json',
      'rm ${HOME}/.codebuddy/plugins/jiahao/src/SKILL.md',
      'cat ~/.codebuddy/plugins/jiahao/.claude-plugin/plugin.json > /dev/null',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
  });

  test('the host plugin-root variable reaches every apparatus dir', () => {
    const shapes = [
      'rm ${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json',
      'rm $CODEBUDDY_PLUGIN_ROOT/.mcp.json',
      'chmod 600 $CLAUDE_PLUGIN_ROOT/src/evidence-log.js',
      'rm ${CODEBUDDY_PLUGIN_ROOT}/rules/jiahao-verifier.md',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
  });

  test('a variable spelling of somewhere else is still none of its business', () => {
    const shapes = [
      'rm $HOME/proj/.mcp.json',
      'rm ~/.codebuddy/plugins/other/.claude-plugin/plugin.json',
      'cat $HOME/hooks/hooks.json',
      'rm ~/other-project/src/SKILL.md',
    ];
    for (const text of shapes) expect(check(text)).toBe(false);
  });

  test('a Windows host reads the same variable spellings', () => {
    const winRoot = 'C:\\Users\\u\\.codebuddy\\plugins\\jiahao';
    const winEnv = { USERPROFILE: 'C:\\Users\\u', HOME: 'C:\\Users\\u' };
    const winCheck = (text) => isProtected(text, winRoot, {
      pathImpl: path.win32, cwd: 'C:\\Users\\u\\proj', env: winEnv,
    });
    expect(winCheck('rm %USERPROFILE%\\.codebuddy\\plugins\\jiahao\\.mcp.json')).toBe(true);
    expect(winCheck('rm $env:USERPROFILE\\.codebuddy\\plugins\\jiahao\\src\\SKILL.md')).toBe(true);
    expect(winCheck('rm ${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json')).toBe(true);
    expect(winCheck('rm %USERPROFILE%\\proj\\.mcp.json')).toBe(false);
  });

  // A host does not always export HOME to a hook process, and `~` is still what
  // the user typed - the fallback asks the OS, not the environment.
  test('a tilde still expands when the environment carries no home', () => {
    const bare = (text) => isProtected(text, root, {
      pathImpl: path.posix, cwd: '/home/u/proj', env: {}, homedir: () => '/home/u',
    });
    expect(bare('rm ~/.codebuddy/plugins/jiahao/.mcp.json')).toBe(true);
    expect(bare('rm ~/.codebuddy/plugins/jiahao/hooks/hooks.json')).toBe(true);
    expect(bare('rm ~/.other-project/.mcp.json')).toBe(false);
  });
});

describe('protected path (spaces in a path)', () => {
  // Whitespace separates shell words, but a path is one field: `candidateText`
  // hands over the tool_input fields line by line, and an Edit/Write file_path is
  // the whole line. Splitting on whitespace first made containment blind to every
  // apparatus path under a directory whose name carries a space - and once #75
  // removed the three name fragments, nothing else caught it.
  const root = '/home/u/John Doe/.codebuddy/plugins/jiahao';
  const check = (text) => isProtected(text, root, { pathImpl: path.posix, cwd: '/home/u/proj' });

  test('a spaced path given as the whole field is one candidate', () => {
    const shapes = [
      root + '/hooks/hooks.json',
      root + '/.mcp.json',
      root + '/src/SKILL.md',
      root + '/.claude-plugin/plugin.json',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
    expect(check('/home/u/John Doe/proj/.mcp.json')).toBe(false);
    expect(check('/home/u/John Doe/proj/hooks/hooks.json')).toBe(false);
  });

  test('a quoted spaced path in a command stays one candidate', () => {
    expect(check('rm "' + root + '/hooks/hooks.json"')).toBe(true);
    expect(check("cat '" + root + "/src/evidence-log.js'")).toBe(true);
    expect(check('chmod 600 "' + root + '/.mcp.json"')).toBe(true);
    expect(check('rm "/home/u/John Doe/proj/.mcp.json"')).toBe(false);
  });

  test('a Windows user dir with a space inside the plugin root', () => {
    const winRoot = 'C:\\Users\\John Doe\\proj\\.codebuddy\\plugins\\jiahao';
    const winCheck = (text) => isProtected(text, winRoot, {
      pathImpl: path.win32, cwd: 'C:\\Users\\John Doe\\proj',
    });
    expect(winCheck(winRoot + '\\hooks\\hooks.json')).toBe(true);
    expect(winCheck(winRoot + '\\src\\SKILL.md')).toBe(true);
    expect(winCheck('"C:\\Users\\John Doe\\proj\\.codebuddy\\plugins\\jiahao\\.mcp.json"')).toBe(true);
    expect(winCheck('C:\\Users\\John Doe\\other-project\\.mcp.json')).toBe(false);
  });
});

describe('protected path (shell word reconstruction)', () => {
  // Quoting and backslashes are how a shell writes ONE argument, so they have to
  // be undone before containment - a spaced path split across `"..."` and the
  // bare tail, or escaped with `\ `, is still one file. CodeRabbit's Major on
  // PR #83 found the whitespace split hiding apparatus paths; these are the
  // sibling shapes.
  const root = '/home/u/John Doe/.codebuddy/plugins/jiahao';
  const check = (text) => isProtected(text, root, { pathImpl: path.posix, cwd: '/home/u/proj' });

  test('adjacent quoted and bare chunks are one word', () => {
    expect(check('echo x "' + root + '"/hooks/hooks.json')).toBe(true);
    expect(check("rm '/home/u/John Doe'/.codebuddy/plugins/jiahao/.mcp.json")).toBe(true);
    expect(check('cp "' + root + '/src/SKILL.md" /tmp/backup')).toBe(true);
  });

  test('a backslash-escaped space is one word', () => {
    expect(check('sed -i 1s/a/b/ /home/u/John\\ Doe/.codebuddy/plugins/jiahao/hooks/hooks.json')).toBe(true);
    expect(check('rm /home/u/John\\ Doe/.codebuddy/plugins/jiahao/src/shared/paths.js')).toBe(true);
    // the same escaping in a user project stays allowed - reconstruction is not a name fragment
    expect(check('rm /home/u/John\\ Doe/proj/.mcp.json')).toBe(false);
  });

  test('a quoted payload is read again for the paths inside it', () => {
    // bash -c "..." runs the inner text as its own command line
    expect(check('bash -c "echo x > rules/jiahao-verifier.md"')).toBe(true);
    expect(check('sh -c \'rm -f "' + root + '/hooks/hooks.json"\'')).toBe(true);
    expect(check('bash -c "cat /home/u/John Doe/proj/.mcp.json"')).toBe(false);
    // An inner UNQUOTED spaced path is two arguments one level down as well, so
    // the file is never opened. The old name fragments denied this by accident;
    // the same shape under a user-project path is the ticket's intended allow.
    expect(check('sh -c "rm -f ' + root + '/hooks/hooks.json"')).toBe(false);
  });

  test('a Windows host is not de-escaped, because a backslash is the separator', () => {
    const winRoot = 'C:\\Users\\John Doe\\proj\\.codebuddy\\plugins\\jiahao';
    const winCheck = (text) => isProtected(text, winRoot, {
      pathImpl: path.win32, cwd: 'C:\\Users\\John Doe\\proj',
    });
    expect(winCheck('rm "' + winRoot + '\\hooks\\hooks.json"')).toBe(true);
    expect(winCheck('rm "C:\\Users\\John Doe\\proj\\.codebuddy\\plugins\\jiahao"/src/SKILL.md')).toBe(true);
    expect(winCheck('rm C:\\Users\\John\\ Doe\\proj\\.mcp.json')).toBe(false);
  });

  // Inside double quotes a backslash escapes the quote itself, so the span does
  // not end there - otherwise the common `bash -c "sed -i \"...\" \"<path>\""`
  // shape hides the path again.
  test('an escaped quote does not end the quoted span', () => {
    const text = 'bash -c "sed -i \\"s|a|b|\\" \\"' + root + '/hooks/hooks.json\\""';
    expect(check(text)).toBe(true);
    expect(check('bash -c "sed -i \\"s|a|b|\\" \\"/home/u/John Doe/proj/.mcp.json\\""')).toBe(false);
  });

  test('quoting nests as far as the shell does, and escapes survive a level down', () => {
    // the payload of the outer command is itself a command line
    expect(check('bash -c "rm -f /home/u/John\\ Doe/.codebuddy/plugins/jiahao/hooks/hooks.json"')).toBe(true);
    const inner = "sh -c 'rm -f \\\"" + root + "/hooks/hooks.json\\\"'";
    expect(check('bash -c "' + inner + '"')).toBe(true);
  });
});

describe('protected path (variable references)', () => {
  // #75 took away the name fragments, so every spelling that the shell would
  // substitute into a path inside the plugin root has to reach containment - not
  // just the four names a hand-written table happened to list.
  const root = '/srv/plugins/jiahao';
  const env = { PLUGINS: '/srv/plugins', HOME: '/home/u', JIAHAO_OLD: '/opt/other' };
  const check = (text) => isProtected(text, root, { pathImpl: path.posix, cwd: '/home/u/proj', env: env });

  test('a reference to a variable the host really has is expanded', () => {
    const shapes = [
      'rm $PLUGINS/jiahao/hooks/hooks.json',
      'rm ${PLUGINS}/jiahao/.mcp.json',
      'chmod 600 %PLUGINS%/jiahao/src/SKILL.md',
      'sh -c "rm $PLUGINS/jiahao/.claude-plugin/plugin.json"',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
  });

  test('an unknown reference is left alone and cannot reach the root', () => {
    const shapes = [
      'rm $NOPE/jiahao/hooks/hooks.json',
      'rm ${JIAHAO_OLD}/hooks/hooks.json',
      'rm $PLUGINS/jiahao/../other/.mcp.json',
      'rm $PLUGINS/other-project/.mcp.json',
    ];
    for (const text of shapes) expect(check(text)).toBe(false);
  });
});

describe('protected path (argument values)', () => {
  // Two more shapes the removed fragments used to catch by name, from the review
  // threads on PR #83: `--opt=<path>` is one argv word whose VALUE is the path, and
  // a quoted variable concatenated with a bare tail is one argument too.
  const root = '/home/u/.codebuddy/plugins/jiahao';
  const env = { CLAUDE_PLUGIN_ROOT: root };
  const check = (text) => isProtected(text, root, { pathImpl: path.posix, cwd: '/home/u/proj', env: env });

  test('the value after = is read as the path', () => {
    const shapes = [
      'dd if=/dev/null of=' + root + '/.mcp.json',
      'sed --file=' + root + '/rules/jiahao-verifier.md',
      'cp --target-directory=' + root + '/src file',
      'tar --exclude=hooks -cf ' + root + '/hooks/hooks.json notes',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
    // the split on = must not turn an ordinary option into a hit
    expect(check('dd if=/dev/null of=/home/u/proj/.mcp.json')).toBe(false);
    expect(check('tar --exclude=src -cf /home/u/proj/out.tar')).toBe(false);
  });

  test('a quoted variable concatenated with a bare tail is one path', () => {
    const shapes = [
      'rm "$CLAUDE_PLUGIN_ROOT"/.mcp.json',
      'rm "${CLAUDE_PLUGIN_ROOT}"/hooks/hooks.json',
      'cp notes.txt "$CLAUDE_PLUGIN_ROOT/src/SKILL.md"',
    ];
    for (const text of shapes) expect(check(text)).toBe(true);
    // a longer name is not the variable: $CLAUDE_PLUGIN_ROOTX has no value here
    expect(check('rm "$CLAUDE_PLUGIN_ROOTX"/.mcp.json')).toBe(false);
  });
});

describe('protected path (separator spellings)', () => {
  const posix = PLATFORMS[0];
  const win32 = PLATFORMS[1];

  // A backslash is not a separator on POSIX, so a name containing one is a single
  // ordinary file and must not be read as the hook map. Rewriting separators
  // before resolving is the bug #75 removed; folding them the other way (Windows
  // accepts forward slashes natively) is handled by path.win32 itself.
  test('a POSIX host reads a backslash as part of the file name, not a separator', () => {    expect(check(posix, 'rm ' + posix.root + '\\hooks\\hooks.json')).toBe(false);
    expect(check(posix, 'rm ' + posix.root + '\\src\\SKILL.md')).toBe(false);
    expect(check(posix, 'rm ' + posix.root + '/hooks\\hooks.json')).toBe(false);
  });

  test('a Windows host still reads a forward-spelled path inside the root', () => {
    expect(check(win32, 'rm ' + win32.root.replace(/\\/g, '/') + '/hooks/hooks.json')).toBe(true);
    expect(check(win32, 'rm ' + win32.root.replace(/\\/g, '/') + '/.mcp.json')).toBe(true);
    expect(check(win32, 'rm ' + win32.elsewhere.replace(/\\/g, '/') + '/.mcp.json')).toBe(false);
  });

  // Windows path comparison is case-insensitive, so a case-shifted apparatus
  // directory is the same directory.
  test('a case-shifted apparatus dir is the same dir on Windows', () => {
    expect(check(win32, 'rm C:\\Users\\u\\proj\\.codebuddy\\plugins\\JIAHAO\\SRC\\SKILL.md')).toBe(true);
    expect(check(win32, 'rm C:\\Users\\u\\other-project\\SRC\\SKILL.md')).toBe(false);
  });

  // The same filesystem rule applies to the state namespace: on Windows
  // `.JIAHAO-PROFILE` deletes `.jiahao-profile`. On POSIX it is a different
  // file and must stay allowed (#88 item 4 keeps the namespace case-sensitive
  // everywhere the host is).
  test('a case-shifted state name is the same file only on Windows', () => {
    expect(check(win32, 'rm C:\\Users\\u\\.JIAHAO-PROFILE')).toBe(true);
    expect(check(win32, 'rm .JIAHAO-EVIDENCE\\segments\\0001.jsonl')).toBe(true);
    expect(check(win32, 'rm user.jiahao-profile')).toBe(false);
    expect(check(posix, 'rm .JIAHAO-PROFILE')).toBe(false);
  });

  // The folded set covers the hooks/rules fragments too, not just the state
  // namespace: `RULES\JIAHAO-VERIFIER.MD` is the same rule file on Windows.
  test('a case-shifted rule or hook name is the same file on Windows', () => {
    expect(check(win32, 'rm RULES\\JIAHAO-VERIFIER.MD')).toBe(true);
    expect(check(win32, 'rm HOOKS\\JIAHAO-PRETOOL-GUARD.JS')).toBe(true);
    expect(check(posix, 'rm RULES/JIAHAO-VERIFIER.MD')).toBe(false);
  });
});
