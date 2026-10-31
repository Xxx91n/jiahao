'use strict';
// test/protected-path.test.js — #75: the enforcement-surface decision pinned
// against BOTH path implementations.
//
// A subprocess test can only ever exercise the host it runs on, which is how
// the absolute-containment check stayed broken on POSIX after shipping: the
// separators were rewritten before resolve(), so an absolute POSIX path lost
// its leading root and stopped being recognised as inside the plugin at all.
// Injecting path.posix / path.win32 runs the same table on either host.

const path = require('path');
const { isProtected } = require('../src/shared/protected-path');

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
        'rm ' + inRoot('plugin.json'),
      ];
      for (const text of shapes) expect(check(plat, text)).toBe(true);
    });

    // #71 item 2: the rule text and the vendored runtime copies sat outside the
    // protection surface entirely.
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
  });
}

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
});
