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

describe('protected path (separator spellings)', () => {
  const posix = PLATFORMS[0];
  const win32 = PLATFORMS[1];

  // A tool_input written on Windows can reach a POSIX host with backslashes
  // and vice versa; the host-native reading is what actually mutates a file,
  // so a foreign spelling of a path inside the plugin root must not slip past.
  test('a POSIX host still reads a backslash-spelled path inside the root', () => {
    expect(check(posix, 'rm ' + posix.root + '\\hooks\\hooks.json')).toBe(true);
    expect(check(posix, 'rm ' + posix.root + '\\src\\SKILL.md')).toBe(true);
    expect(check(posix, 'rm ' + posix.elsewhere + '\\hooks\\hooks.json')).toBe(false);
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
