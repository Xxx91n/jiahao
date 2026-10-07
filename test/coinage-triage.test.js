'use strict';
// test/coinage-triage.test.js - grill-t39 T-10 (ADR-0098 D-C/D-E/D-F, ledger
// D-004.3/.5 + D-005.1): the behavioral contract of the Unregistered-Coinage
// Triage Channel. Locks the legislative negatives: advisory-never-blocking
// exit codes, the five-surface enumeration, the CONTEXT.md registration
// filter, bilingual scanning, the explicit Chinese sentence-splitting rule,
// count-only sentence face (NO score/target/threshold field may exist), the
// footer format, and byte-for-byte determinism on the same tree.
// No git anywhere: the channel reads the working tree (no hermetic helper
// needed - there is no git write to route).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ct = require('../scripts/shared/coinage-triage.js');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'scripts', 'coinage-triage.js');
const tmpRoots = [];

function makeTree(filesMap) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coinage-triage-'));
  tmpRoots.push(root);
  for (const rel of Object.keys(filesMap).sort()) {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, filesMap[rel]);
  }
  return root;
}

function runCLI(args) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT });
}

afterAll(function () {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true });
});

// One shared fixture tree: 5 surfaces populated, registered + unregistered
// zh and en tokens, a fenced block whose token must never count.
const FIXTURE = {
  'CONTEXT.md':
    '# Jiahao (嘉豪)\n\n## Language\n\n' +
    '**已注册词 (登记词)**: 说明。\n\n' +
    '**Registered Anchor (锚定词)**: 说明。\n\n' +
    '**Wordlist Triage Layer (词表分诊层)**: 说明。\n',
  '.scratch/grill-t1/decision-ledger.md':
    '登记词 登记词 登记词\n' +
    '词表分诊层 词表分诊层 词表分诊层\n' +
    '幽灵词出现 幽灵词出现 幽灵词出现\n' +
    'treadmillghost treadmillghost treadmillghost\n' +
    '承重墙 承重墙 承重墙\n' +
    'anchor anchor anchor\n',
  '.scratch/grill-t1/reports/2026-01-01-report.md':
    '登记词。\n\nTreadmillGhost 幽灵词出现。\n\n承重墙 承重墙。\n\n```\nghostfenceword\n```\n',
  'docs/adr/0001-fixture.md':
    '承重墙 承重墙 承重墙 承重墙。\n\nTreadmillGhost。\n',
  'AGENTS.md': 'fixture agents text twiceghost twiceghost\n',
};

function findRow(rows, token) {
  return rows.filter(function (r) { return r.token === token; })[0] || null;
}

describe('coinage-triage: determinism (D-E registered transfer)', () => {
  const tree = makeTree(FIXTURE);

  test('two in-process scans serialize identically', () => {
    expect(JSON.stringify(ct.scanTree(tree))).toEqual(JSON.stringify(ct.scanTree(tree)));
  });

  test('two CLI spawns print byte-identical stdout, exit 0 both times', () => {
    const a = runCLI([CLI, '--root', tree]);
    const b = runCLI([CLI, '--root', tree]);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(a.stdout).toEqual(b.stdout);
    expect(a.stdout.length).toBeGreaterThan(0);
  });
});

describe('coinage-triage: the five surfaces (D-C exact)', () => {
  const tree = makeTree(FIXTURE);
  const report = ct.scanTree(tree);

  test('enumeration is exactly the five statutory surfaces, in order', () => {
    expect(report.surfaces.map((s) => s.id)).toEqual(['ledger', 'report', 'adr', 'agents', 'context']);
    expect(report.surfaces.map((s) => s.label)).toEqual([
      '.scratch/grill-*/decision-ledger.md',
      '.scratch/grill-*/reports/*.md',
      'docs/adr/*.md',
      'AGENTS.md',
      'CONTEXT.md',
    ]);
    expect(report.surfaces.map((s) => s.files)).toEqual([1, 1, 1, 1, 1]);
  });

  test('a tree with nothing present still enumerates five surfaces with 0 files and discloses the inert filter', () => {
    const empty = makeTree({});
    const r = ct.scanTree(empty);
    expect(r.surfaces.length).toBe(5);
    expect(r.surfaces.every((s) => s.files === 0)).toBe(true);
    expect(r.notes.join(' ')).toContain('CONTEXT.md absent');
    expect(r.wordFace.zh).toEqual([]);
    expect(r.wordFace.en).toEqual([]);
  });
});

describe('coinage-triage: registration filter + bilingual word face (D-B/D-C)', () => {
  const tree = makeTree(FIXTURE);
  const report = ct.scanTree(tree);

  test('registered headword terms are excluded (zh): the 登记词/词表分诊层 families never appear', () => {
    for (const t of ['登记词', '登记', '记词', '已注册词', '词表', '分诊', '词表分诊层']) {
      expect(findRow(report.wordFace.zh, t)).toBe(null);
    }
  });

  test('registered headword words are excluded (en): anchor is in the glossary, so it is not a candidate', () => {
    expect(findRow(report.wordFace.en, 'anchor')).toBe(null);
    expect(findRow(report.wordFace.en, 'ghostfenceword')).toBe(null); // fenced code never counts
  });

  test('the unregistered frequent zh token appears with count and breadth (lifecycle, not verdict)', () => {
    expect(findRow(report.wordFace.zh, '幽灵词')).toEqual({
      token: '幽灵词', lang: 'zh', count: 4, files: 2, surfaces: 2, lifecycle: 'unregistered',
    });
    expect(findRow(report.wordFace.zh, '承重墙')).toEqual({
      token: '承重墙', lang: 'zh', count: 9, files: 3, surfaces: 3, lifecycle: 'unregistered',
    });
  });

  test('the unregistered frequent en token appears (the treadmill class that escaped zh-only scans)', () => {
    expect(report.wordFace.en).toEqual([{
      token: 'treadmillghost', lang: 'en', count: 5, files: 3, surfaces: 3, lifecycle: 'unregistered',
    }]);
  });

  test('min-count is the only frequency knob: default 3 drops the twice-occurring token, 2 collects it', () => {
    expect(findRow(ct.scanTree(tree).wordFace.en, 'twiceghost')).toBe(null);
    const lowered = ct.scanTree(tree, { minCount: 2 });
    expect(findRow(lowered.wordFace.en, 'twiceghost').count).toBe(2);
  });
});

describe('coinage-triage: the legislated sentence splitter (D-E)', () => {
  test('splits on the full-width boundaries and newline; ，、： are non-boundaries', () => {
    expect(ct.splitSentences('甲。乙！丙？丁；戊…己，庚：辛\n壬')).toEqual(
      ['甲', '乙', '丙', '丁', '戊', '己，庚：辛', '壬']);
  });

  test('ASCII . ? ! split only at clause ends: e.g./Dr./3.14 stay inside the sentence (boundary marks are dropped)', () => {
    expect(ct.splitSentences('Done. Next one. e.g. tests keep going.')).toEqual(
      ['Done', 'Next one', 'e.g. tests keep going']);
    expect(ct.splitSentences('At version 3.14 it runs.')).toEqual(['At version 3.14 it runs']);
    expect(ct.splitSentences('Dr. Who said it? Yes!')).toEqual(['Dr. Who said it', 'Yes']);
  });

  test('counts the four sentence-face signals on the fixed string (pure counts, no model)', () => {
    const c = ct.proseDensityCounts('词面与句式面。它覆盖域与边界域。这属债务形与c形。定义 := X。箭头 → 出现。');
    expect({
      sentences: c.sentences, meanLen: c.meanLen, maxLen: c.maxLen, longShare: c.longShare,
      xFace: c.xFace, xDomain: c.xDomain, xShape: c.xShape, symbols: c.symbols,
    }).toEqual({ sentences: 5, meanLen: 7, maxLen: 8, longShare: 0, xFace: 2, xDomain: 2, xShape: 2, symbols: 2 });
    expect(c.lengthBuckets.map((b) => b.count)).toEqual([5, 0, 0, 0, 0, 0]);
  });

  test('longShare counts sentences over the disclosed gauge edge (longLen=100 code points)', () => {
    const c = ct.proseDensityCounts('字'.repeat(150) + '。短句。');
    expect({ s: c.sentences, m: c.meanLen, x: c.maxLen, l: c.longShare }).toEqual({ s: 2, m: 76, x: 150, l: 50 });
  });

  test('empty prose counts zero without division artifacts', () => {
    const c = ct.proseDensityCounts('');
    expect({ s: c.sentences, m: c.meanLen, x: c.maxLen, l: c.longShare }).toEqual({ s: 0, m: 0, x: 0, l: 0 });
  });

  test('fenced code never counts into the footer numbers', () => {
    const c = ct.proseCountsOfText('词面。\n```\n词面词面 := →\n```\n域。');
    expect({ s: c.sentences, f: c.xFace, sy: c.symbols }).toEqual({ s: 2, f: 1, sy: 0 });
  });
});

describe('coinage-triage: the prose-density footer line (D-F)', () => {
  test('renders exactly the mandated single line, with no target value anywhere', () => {
    const line = ct.renderFooterLine(ct.proseDensityCounts('词面与句式面。它覆盖域与边界域。这属债务形与c形。定义 := X。箭头 → 出现。'));
    expect(line).toBe('prose-density: sentences=5 meanLen=7 maxLen=8 longShare=0.0% xFace=2 xDomain=2 xShape=2 symbols=2');
  });

  test('CLI --footer prints one line, exit 0', () => {
    const tree = makeTree(FIXTURE);
    const r = runCLI([CLI, '--footer', path.join(tree, '.scratch', 'grill-t1', 'reports', '2026-01-01-report.md')]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^prose-density: sentences=\d+ meanLen=\d+ maxLen=\d+ longShare=\d+\.\d% xFace=\d+ xDomain=\d+ xShape=\d+ symbols=\d+$/);
    expect(r.stdout.trim().split('\n')).toHaveLength(1);
  });
});

describe('coinage-triage: no score, no target, no threshold anywhere in the output object', () => {
  function collectKeys(node, keys) {
    if (Array.isArray(node)) { node.forEach((n) => collectKeys(n, keys)); return; }
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) { keys.push(k); collectKeys(node[k], keys); }
    }
  }

  test('every field name in the JSON report is a count/breadth/lifecycle name', () => {
    const tree = makeTree(FIXTURE);
    const keys = [];
    collectKeys(ct.scanTree(tree), keys);
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) expect(k).not.toMatch(/score|target|threshold/i);
    // the forbidden field names are absent from the serialized form's KEY slots too
    const json = JSON.stringify(ct.scanTree(tree), null, 2);
    for (const k of keys) {
      const m = new RegExp('"' + k + '"\\s*:').exec(json);
      expect(m).not.toBe(null);
    }
    expect(json).not.toMatch(/"(score|target|threshold)[A-Za-z]*"\s*:/i);
  });
});

describe('coinage-triage: advisory, never blocking', () => {
  test('findings never move the exit code: full scan and json modes exit 0', () => {
    const tree = makeTree(FIXTURE);
    const a = runCLI([CLI, '--root', tree]);
    const b = runCLI([CLI, '--root', tree, '--json', '--min-count', '1']);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(a.stdout).toContain('treadmillghost');
    expect(JSON.parse(b.stdout).wordFace.en.length).toBeGreaterThan(0);
  });

  test('--help exits 0 with the usage text', () => {
    const r = runCLI([CLI, '--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^usage: /);
  });

  test('non-zero (2) is reserved for the tool\'s own usage/IO errors', () => {
    expect(runCLI([CLI, '--min-count', '0']).status).toBe(2);
    expect(runCLI([CLI, '--min-count', 'abc']).status).toBe(2);
    expect(runCLI([CLI, '--footer']).status).toBe(2);
    expect(runCLI([CLI, '--footer', path.join('does-not-exist', 'x.md')]).status).toBe(2);
    expect(runCLI([CLI, '--nope']).status).toBe(2);
  });

  test('the advisory status is legislative: the channel is absent from the gates registry', () => {
    const gates = fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8');
    expect(gates).not.toContain('coinage');
  });

  test('the rendered advisory list states frequency/breadth/lifecycle and no verdict', () => {
    const tree = makeTree(FIXTURE);
    const text = ct.renderAdvisory(ct.scanTree(tree));
    expect(text).toContain('收词分诊通道');
    expect(text).toContain('[en] treadmillghost');
    expect(text).toContain('never a gate leg');
    expect(text).toContain('prose-density: sentences=');
    expect(text).not.toMatch(/verdict[^\n]*:\s*(pass|fail|red)/i);
  });
});
