// test/adr-0076-wiring.test.js — ADR-0076 + ADR-0077 wiring (grill-t15..t17 doc/fix rounds).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0076-round-edit-surface-taxonomy-and-governance-carve-out.md');
const TAX = path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json');
const tax = require('../scripts/surface-taxonomy');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
const NL = String.fromCharCode(10);
function tracked() { return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(NL).filter(Boolean); }

describe('ADR-0076 doc surface (grill-t15 disposition + mechanism round)', () => {
  test('title, status, date, ledger anchor', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0076:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-18');
    expect(a).toContain('decision-ledger-t15');
  });

  test('decision clauses D-A..D-E land', () => {
    const a = read(ADR);
    for (const s of ['D-A - The three-surface', 'D-B - The governance carve-out', 'D-C - The sunset counter durable home', 'D-D - Spec-code bidirectional pinning', 'D-E - Round surface']) {
      expect(a).toContain(s);
    }
  });

  test('CONTEXT.md carries the two new terms + the amended Sunset Trigger', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('Round Edit Surface');
    expect(c).toContain('Governance Carve-Out');
    expect(c).toContain('absence');
  });

  test('README index rebuilt: 80 records incl. ADR-0076', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('80 architecture decision records');
    expect(r).toContain('0076-round-edit-surface-taxonomy-and-governance-carve-out.md');
  });

  test('AGENTS.md carries the single pointer line', () => {
    const ag = read(path.join(ROOT, 'AGENTS.md'));
    expect(ag).toContain('ADR-0076');
  });

  test('anchors.json lists decision-ledger-t15.md under ADR-0076, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t15.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0076');
    expect(e.origin).toBe('.scratch/grill-t15/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t15.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t15', 'decision-ledger.md')));
  });
});

describe('surface taxonomy artifact (ADR-0076 D-A)', () => {
  test('the R1 set is exactly the computed require-closure (authority is the scan, not the list)', () => {
    const t = readJson(TAX);
    expect(t.schema_version).toBe(1);
    const closure = tax.computeRuntimeClosure(ROOT);
    expect(t.surfaces.R1.files.slice().sort()).toEqual(closure.slice().sort());
    for (const must of ['scripts/install.js', 'scripts/resolve.js', 'src/shared/paths.js', 'src/evidence-log.js', 'package.json']) {
      expect(closure).toContain(must);
    }
  });

  test('every git-tracked file classifies into exactly one surface', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    const counts = { R1: 0, R2: 0, R3: 0 };
    for (const f of tracked()) counts[tax.classifyPath(f, closure)] += 1;
    expect(counts.R1).toBe(closure.size);
    expect(counts.R1 + counts.R2 + counts.R3).toBe(tracked().length);
  });

  test('the surface rules pin representative paths to their class', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    const cases = [
      ['docs/adr/0075-promotion-review-preregistration-nm-sufficiency-intent-taxonomy-sunset-trigger.md', 'R3'],
      ['CONTEXT.md', 'R3'],
      ['README.md', 'R3'],
      ['AGENTS.md', 'R3'],
      ['.scratch/grill-t15/decision-ledger.md', 'R3'],
      ['test/adr-0075-wiring.test.js', 'R3'],
      ['.github/workflows/ci.yml', 'R2'],
      ['scripts/check-ci-jobs.js', 'R2'],
      ['scripts/build-rewrite-map.js', 'R2'],
      ['hooks/jiahao-verdict-gate.js', 'R2'],
      ['scripts/install.js', 'R1'],
      ['src/shared/paths.js', 'R1'],
    ];
    for (const pair of cases) expect(tax.classifyPath(pair[0], closure)).toBe(pair[1]);
  });
});

describe('registry dispositions (ADR-0076 D-E)', () => {
  const reg = () => readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));

  test('defer-0026 actioned with the limitation field', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0026'; });
    expect(d.status).toBe('actioned');
    expect(d.actioned_at).toBe('2026-09-18');
    expect(d.limitation).toContain('403');
    expect(d.limitation).toContain('environmental');
    expect(d.limitation).toContain('defer-0060');
  });

  test('defer-0060 is the sole live 403 tracker: external-event, pending-evaluation, no verified_by', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0060'; });
    expect(d).toBeDefined();
    expect(d.unfreeze_if.type).toBe('external-event');
    expect(d.status).toBe('pending-evaluation');
    expect(d.cadence_tier).toBe('quarterly');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.verified_by).toBeUndefined();
    expect(d.rationale).toContain('R10/R13');
    expect(d.rationale).toContain('sole live tracker');
    expect(d.rationale).toContain('rejected D-002 sunset-row placeholder');
  });

  test('defer-0055 sunset pointer is pure (audit F-3): pointer only, no clause restatement', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0055'; });
    expect(d.sunset_trigger_pointer).toContain('ADR-0075 D-C');
    expect(d.sunset_trigger_pointer).toContain('only the pointer');
    expect(d.sunset_trigger_pointer).not.toContain('dual-or-path');
  });

  test('defer-0061 tally row registered for the +1 round', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0061'; });
    expect(d).toBeDefined();
    expect(d.source_adr).toContain('0076-round-edit-surface-taxonomy');
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('same-commit ledger note');
  });
});

describe('owner asks frozen, never bundled (ADR-0076 D-E)', () => {
  test('both ask packets are frozen verbatim with their types', () => {
    const a = read(ADR);
    expect(a).toContain('Ask A packet (frozen)');
    expect(a).toContain('seq-24');
    expect(a).toContain('Ask B packet (frozen)');
    expect(a).toContain('defer-0051-evidence-packet.json');
    expect(a).toContain('rejection reopens');
  });
});

describe('ADR-0077 amendments (grill-t16 fix + mechanism round, data-surface assertions)', () => {
  const ADR77 = path.join(ROOT, 'docs', 'adr', '0077-verifier-exit-convention-mechanism-outputs-and-facts-canon.md');
  const trend = () => readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));

  test('ADR-0077 exists with live status, date, amends line, and ledger anchor', () => {
    const a = read(ADR77);
    expect(a).toContain('# ADR-0077:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-18');
    expect(a).toContain('- Amends: ADR-0076 D-B(2)');
    expect(a).toContain('decision-ledger.md');
    expect(a).toContain('currently consuming');
    expect(a).toContain('the report is narrative, never the home of numbers');
  });

  test('ADR-0076 carries the Amended-by pointer and the D-B(2) superseded-phrase annotation', () => {
    const a = read(ADR);
    expect(a).toContain('- Amended-by: ADR-0077');
    expect(a).toContain('Amended by ADR-0077 D-B');
    expect(a).toContain('machinery-SOURCE hand-edits');
  });

  test('mechanism_outputs is a closed enumeration: every entry classifies R2 and names an existing generator', () => {
    const t = readJson(TAX);
    const mo = t.mechanism_outputs;
    expect(mo).toBeDefined();
    expect(Array.isArray(mo.entries)).toBe(true);
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    for (const e of mo.entries) {
      expect(Object.keys(e).sort()).toEqual(['file', 'generator', 'replay_verified']);
      expect(tax.classifyPath(e.file, closure)).toBe('R2');
      expect(fs.existsSync(path.join(ROOT, e.generator))).toBe(true);
      expect(typeof e.replay_verified).toBe('boolean');
    }
  });

  test('the two F-D artifacts are the enumeration members', () => {
    const files = readJson(TAX).mechanism_outputs.entries.map(function (e) { return e.file; }).sort();
    expect(files).toEqual(['bench/research/out/g6-publish-replay.json', 'src/instrument-state.json']);
  });

  test('diff_semantics reworded: machinery-source hand-edits + faithful regeneration + mechanism_output_diff entry', () => {
    const ds = readJson(TAX).diff_semantics;
    expect(ds.governance_tooling_diff).toContain('machinery-SOURCE hand-edits');
    expect(ds.governance_tooling_diff).toContain('faithful regeneration');
    expect(ds.governance_tooling_diff).not.toContain('recording which R2 files the round touched');
    expect(ds.mechanism_output_diff).toContain('never feeds burn-rate');
    expect(ds.mechanism_output_diff).toContain('hard-fails');
  });

  test('t15 trend row annotation is additive-only: historical booleans untouched', () => {
    const r = trend().rounds.find(function (x) { return x.round === 'grill-t15-doc-round'; });
    expect(r.carve_out_used).toBe(1);
    expect(r.zero_product_diff).toBe(true);
    expect(r.governance_tooling_diff.files).toContain('scripts/check-ci-jobs.js');
    expect(r.mechanism_output_diff.files.sort()).toEqual(['bench/research/out/g6-publish-replay.json', 'src/instrument-state.json']);
    expect(r.mechanism_output_diff.reason.length).toBeGreaterThanOrEqual(10);
  });

  test('t16 row: +1 ADR-0077, zero product diff, carve-out not invoked (streak resets)', () => {
    const r = trend().rounds.find(function (x) { return x.round === 'grill-t16-doc-round'; });
    expect(r).toBeDefined();
    expect(r.adr_added).toEqual(['0077']);
    expect(r.net_additions).toBe(1);
    expect(r.zero_product_diff).toBe(true);
    expect(r.carve_out_used).toBe(0);
    expect(r.governance_tooling_diff).toBeUndefined();
    expect(r.mechanism_output_diff.files).toEqual(['bench/research/out/g6-publish-replay.json']);
    expect(r.deferred_entry).toBe('defer-0062');
    expect(r.advisory_fired).toBe(false);
  });

  test('no unlisted file claims the output exemption (mechanism_output_diff files are always inside the enumeration)', () => {
    const t = readJson(TAX);
    const members = t.mechanism_outputs.entries.map(function (e) { return e.file; });
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    for (const r of trend().rounds) {
      if (!r.mechanism_output_diff) continue;
      expect(Array.isArray(r.mechanism_output_diff.files)).toBe(true);
      expect(r.mechanism_output_diff.files.length).toBeGreaterThan(0);
      for (const f of r.mechanism_output_diff.files) {
        expect(members).toContain(f);
        expect(tax.classifyPath(f, closure)).toBe('R2');
      }
    }
  });

  test('CONTEXT.md carries the Consuming-Row Exit + Facts Canon terms and the carve-out gloss restored the inventory channel', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('Consuming-Row Exit');
    expect(c).toContain('Facts Canon');
    expect(c).toContain('trend-inventory governance_tooling_diff channel');
  });

  test('defer-0004 rationale cites ADR-0058 D-C explicitly (settles F-C)', () => {
    const d = readJson(path.join(ROOT, 'docs', 'deferred-registry.json')).entries.find(function (e) { return e.id === 'defer-0004'; });
    expect(d.rationale).toContain('ADR-0058 D-C');
  });

  test('defer-0062 tally row registered closed for the +1 round', () => {
    const d = readJson(path.join(ROOT, 'docs', 'deferred-registry.json')).entries.find(function (e) { return e.id === 'defer-0062'; });
    expect(d).toBeDefined();
    expect(d.source_adr).toContain('0077-verifier-exit-convention');
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('same-commit ledger note');
  });

  test('README index rebuilt: 80 records incl. ADR-0077', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('80 architecture decision records');
    expect(r).toContain('0077-verifier-exit-convention-mechanism-outputs-and-facts-canon.md');
  });

  test('the ledger carries the convention verbatim and the consent-sweep lines', () => {
    const l = read(path.join(ROOT, '.scratch', 'grill-t16', 'decision-ledger.md'));
    expect(l).toContain('currently consuming');
    expect(l).toContain('multi-row reporting is diagnostic, never exit-driving');
    expect(l).toContain('T-1 dispositions');
    expect(l).toContain('defer-0060');
    expect(l).toContain('consent-sweep');
    expect(l).toContain('never \"audit response\"');
  });

  test('mechanism_output_diff marker: checker accepts members, hard-fails bare markers and unlisted files', () => {
    const inv = require('../scripts/check-governance-inventory');
    const ti = readJson(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'));
    const mk = function (id, mod) {
      const probe = JSON.parse(JSON.stringify(ti));
      probe.rounds.push({ round: id, date: '2026-09-18', kind: 'documentation', adr_added: [], net_additions: 0, zero_product_diff: false, mechanism_output_diff: mod, carve_out_used: 0 });
      return inv.checkInventory(ROOT, { trend: probe }).errors.filter(function (e) { return e.indexOf(id) !== -1; });
    };
    expect(mk('probe-mod', { files: ['src/instrument-state.json'], reason: 'faithful regeneration via instrument.js append event' })).toEqual([]);
    expect(mk('probe-bare', { files: [], reason: 'x' }).join(' ')).toContain('bare marker hard-fails');
    expect(mk('probe-unlisted', { files: ['scripts/install.js'], reason: 'unlisted file claims the exemption' }).join(' ')).toContain('closed enumeration');
    expect(mk('probe-r3', { files: ['docs/rewrite-map.json'], reason: 'docs-surface output is not an enumeration member' }).join(' ')).toContain('closed enumeration');
  });

  test('anchors.json lists decision-ledger-t16.md under ADR-0077, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t16.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0077');
    const gov = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t16.md'));
    const scratch = read(path.join(ROOT, '.scratch', 'grill-t16', 'decision-ledger.md'));
    expect(gov).toBe(scratch);
  });

  test('facts canon: artifact schema + deterministic render pin (ADR-0077 D-C)', () => {
    const facts = readJson(path.join(ROOT, '.scratch', 'grill-t16', 'round-facts.json'));
    expect(Object.keys(facts).sort()).toEqual(['_doc', 'anchors_count', 'battery_as_of_commit', 'instrument_entries', 'not_run', 'pack_bytes', 'passed', 'registry_entries', 'report_commit', 'rewrite_map_citations', 'schema_version', 'skipped', 'suites']);
    expect(facts.report_commit).toBeNull();
    expect(Array.isArray(facts.not_run)).toBe(true);
    const brf = require('../scripts/build-round-facts');
    const report = read(path.join(ROOT, '.scratch', 'grill-t16', 'reports', '2026-09-18-report.md'));
    const i = report.indexOf(brf.SENTINEL_START), j = report.indexOf(brf.SENTINEL_END);
    expect(i !== -1 && j > i).toBe(true);
    expect(report.slice(i, j + brf.SENTINEL_END.length)).toBe(brf.renderRegion(facts));
    // The t16 report predates the D-E unconditional scan (authored under
    // the backtick-exemption convention): prose enforcement is
    // forward-binding from grill-t17 - pinned in the describe below.
  });
});

describe('grill-t17 dispositions (ADR-0077 D-E appendix + residue registrations)', () => {
  const brf = require('../scripts/build-round-facts');
  const ADR77 = path.join(ROOT, 'docs', 'adr', '0077-verifier-exit-convention-mechanism-outputs-and-facts-canon.md');
  const T17F = path.join(ROOT, '.scratch', 'grill-t17', 'round-facts.json');
  const T17R = path.join(ROOT, '.scratch', 'grill-t17', 'reports', '2026-09-18-report.md');

  test('proseScan export: unconditional - a quoted canon number is still a violation', () => {
    const facts = { suites: 73, passed: 1216, skipped: 0, pack_bytes: 333992, instrument_entries: 27, rewrite_map_citations: 1414, registry_entries: 57, anchors_count: 16 };
    const clean = '# r\n\n' + brf.SENTINEL_START + '\n- suites: 73\n' + brf.SENTINEL_END + '\n\nprose cites the evidence path only\n';
    expect(brf.proseScan(clean, facts)).toEqual([]);
    const quoted = '# r\n\n' + brf.SENTINEL_START + '\n- suites: 73\n' + brf.SENTINEL_END + '\n\nverbatim output `[test] OK: 73 suites, 1216 tests` carried inline\n';
    const v = brf.proseScan(quoted, facts).join(' ');
    expect(v).toContain('suites=73');
    expect(v).toContain('passed=1216');
  });

  test('a quoted-stale-number fixture MUST fail --check (ADR-0077 D-E)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-brf-'));
    try {
      const rep = path.join(dir, 'fixture-report.md');
      fs.writeFileSync(rep, '# fixture\n\n' + brf.SENTINEL_START + '\n- suites: 73\n' + brf.SENTINEL_END + '\n\nstale number inside backticks: `1216`\n');
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-round-facts.js'), '--round', 'grill-t16', '--check', '--report', rep], { cwd: ROOT, encoding: 'utf8' });
      expect(r.status).toBe(1);
      expect(String(r.stderr)).toContain('passed=1216');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the t17 report renders the canon region and carries no canon number in prose', () => {
    const facts = readJson(T17F);
    const report = read(T17R);
    const i = report.indexOf(brf.SENTINEL_START), j = report.indexOf(brf.SENTINEL_END);
    expect(i !== -1 && j > i).toBe(true);
    expect(report.slice(i, j + brf.SENTINEL_END.length)).toBe(brf.renderRegion(facts));
    expect(brf.proseScan(report, facts)).toEqual([]);
  });

  test('ADR-0077 D-E appendix registers the unconditional scan + the evidence-file convention', () => {
    const a = read(ADR77);
    expect(a).toContain('D-E - The unconditional-scan enforcement and the evidence-file convention');
    expect(a).toContain('proseScan');
    expect(a).toContain('.scratch/grill-tNN/evidence/');
    expect(a).toContain('defer-0063');
  });

  test('defer-0063 is the missing-convention smell ticket with the anti-rot quota', () => {
    const d = readJson(path.join(ROOT, 'docs', 'deferred-registry.json')).entries.find(function (e) { return e.id === 'defer-0063'; });
    expect(d).toBeDefined();
    // grill-t18: discharged - the written convention landed (ADR-0077 D-A.1)
    // and the fix bundle took this ticket first; the row closes with a
    // same-commit pointer rather than disappearing.
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('ADR-0077 D-A.1');
    expect(d.unfreeze_if.type).toBe('free-text');
    expect(d.rationale).toContain('gate criteria');
    expect(d.rationale).toContain('next fix bundle must take one smell ticket first');
    expect(d.source_adr).toContain('0077-verifier-exit-convention');
  });

  test('ERRATA E-7 registers the seq-27 classification + the literal-token convention', () => {
    const e = read(path.join(ROOT, 'docs', 'governance', 'ERRATA.md'));
    expect(e).toContain('E-7 seq-27');
    expect(e).toContain('substantively compliant');
    expect(e).toContain('literal defect');
    expect(e).toContain('expiry=任务耗竭');
    expect(e).toContain('`scope:`+`expiry:`');
  });

  test('CONTEXT carries the Re-Execution Prior snapshot v2 and the sharpened delegation convention', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('n=19');
    expect(c).toContain('supersedes the 2026-09-16 n=16 snapshot');
    expect(c).toContain('quality-not-claim');
    expect(c).toContain('`scope:`+`expiry:` tokens');
    expect(c).toContain('Scribed Approval');
    expect(c).toContain('Proxy Signature');
  });

  test('gen-docs invariant: every committed copy derives ROOT from __dirname (D-003 class-killer)', () => {
    const files = tracked().filter(function (f) { return /^\.scratch\/grill-t[^/]*\/gen-docs\.cjs$/.test(f); });
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const src = read(path.join(ROOT, f));
      expect({ f: f, ok: /const ROOT\s*=\s*path\.join\(\s*__dirname\s*,\s*'\.\.'\s*,\s*'\.\.'\s*\)/.test(src) }).toEqual({ f: f, ok: true });
      expect({ f: f, abs: /const ROOT\s*=\s*['"][A-Za-z]:[/\\]/.test(src) }).toEqual({ f: f, abs: false });
    }
  });

  test('the gen-docs template carries the frozen derived-ROOT header', () => {
    const tpl = read(path.join(ROOT, '.scratch', 'gen-docs.template.cjs'));
    expect(tpl).toContain('path.join(__dirname');
    expect(tpl).not.toMatch(/const ROOT\s*=\s*['"][A-Za-z]:[/\\]/);
    expect(tpl).toContain('{{ROUND_SLUG}}');
  });
});

describe('grill-t18 dispositions (ADR-0078 fix-round taxonomy + ADR-0077 appendix + doc hygiene)', () => {
  const cgi = require('../scripts/check-governance-inventory');
  const brf = require('../scripts/build-round-facts');
  const ADR78 = path.join(ROOT, 'docs', 'adr', '0078-fix-round-disclosure-taxonomy.md');
  const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
  function trendWith(rounds) {
    return { schema_version: 1, anchor: { adr_count_base: 63, K: 2 }, rounds: rounds };
  }
  function fixRow(over) {
    return Object.assign({
      round: 'grill-tNN-fix-round', date: '2026-09-19', kind: 'fix',
      adr_added: [], adr_superseded_or_closed: [], net_additions: 0,
      zero_product_diff: true,
      governance_tooling_diff: { files: ['scripts/build-round-facts.js'], reason: 'R2 machinery hand-edit disclosed per ADR-0078 D-A' },
      advisory_fired: false
    }, over || {});
  }
  function errsFor(rounds) {
    return cgi.checkInventory(ROOT, { trend: trendWith(rounds) }).errors;
  }

  test('ADR-0078 exists with live status, date, amends line, ledger + spec anchors', () => {
    const a = read(ADR78);
    expect(a).toContain('# ADR-0078:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-19');
    expect(a).toContain('Amends: ADR-0064 D-F');
    expect(a).toContain('decision-ledger-t18');
    expect(a).toContain('spec-h-disposition');
    expect(a).toContain('D-A - The fix-round row shape');
    expect(a).toContain('D-B - The disclosed corrective rewrite');
    const a64 = read(path.join(ROOT, 'docs', 'adr', '0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md'));
    expect(a64).toContain('Amended-by: ADR-0078');
  });

  test('kind enum: a fix row WITH governance_tooling_diff passes; WITHOUT it fails (ADR-0078 negative pin)', () => {
    expect(errsFor([fixRow()])).toEqual([]);
    const bare = fixRow(); delete bare.governance_tooling_diff;
    const errs = errsFor([bare]).join(' ');
    expect(errs).toContain('fix rounds must disclose');
    expect(errs).toContain('governance_tooling_diff');
  });

  test('fix rows are exempt from the D-F deferred-entry assert; documentation rows are not (control)', () => {
    const fix = fixRow({ adr_added: ['0078'], net_additions: 1 });
    expect(errsFor([fix])).toEqual([]);
    const doc = fixRow({ kind: 'documentation', adr_added: ['0078'], net_additions: 1 });
    expect(errsFor([doc]).join(' ')).toContain('deferred-registry entry');
  });

  test('fix-row gtd files still classify against the taxonomy (R3 listing is mislabeled)', () => {
    const bad = fixRow({ governance_tooling_diff: { files: ['AGENTS.md'], reason: 'R3 file mislabeled as machinery' } });
    expect(errsFor([bad]).join(' ')).toContain('classifies');
    const r1 = fixRow({ governance_tooling_diff: { files: ['scripts/install.js'], reason: 'R1 runtime file listed - hard error' } });
    expect(errsFor([r1]).join(' ')).toContain('R1');
  });

  test('carve_out_used may be omitted on fix rows and never feeds the burn-rate streak', () => {
    const row = fixRow(); delete row.carve_out_used;
    const out = cgi.checkInventory(ROOT, { trend: trendWith([row]) });
    expect(out.errors).toEqual([]);
    const streaky = cgi.checkInventory(ROOT, { trend: trendWith([fixRow({ carve_out_used: 1 }), fixRow({ carve_out_used: 1 })]) });
    expect(streaky.warnings.join(' ')).not.toContain('carve-out');
  });

  test('the grill-t17 row is corrected disclosed: kind fix + gtd backfill + retroactive first line, history untouched', () => {
    const ti = readJson(TREND);
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t17-fix-round'; });
    expect(r.kind).toBe('fix');
    expect(r.governance_tooling_diff.files.sort()).toEqual(['scripts/build-round-facts.js', 'scripts/check-governance-inventory.js']);
    expect(r.governance_tooling_diff.reason.slice(0, 22)).toBe('Retroactive correction');
    expect(r.carve_out_used).toBe(0);
    expect(r.mechanism_output_diff.files).toEqual(['bench/research/out/g6-publish-replay.json']);
    expect(r.net_additions).toBe(0);
    expect(errsFor([r])).toEqual([]);
  });

  test('the grill-t18 row is the first compliant kind:fix row (gtd + mechanism output disclosed, exempt D-F)', () => {
    const ti = readJson(TREND);
    const r = ti.rounds.find(function (x) { return x.round === 'grill-t18-fix-round'; });
    expect(r).toBeDefined();
    expect(r.kind).toBe('fix');
    expect(r.zero_product_diff).toBe(true);
    expect(r.governance_tooling_diff.files.sort()).toEqual(['scripts/build-governance-anchors.js', 'scripts/build-round-facts.js', 'scripts/check-governance-inventory.js']);
    expect(r.mechanism_output_diff.files).toEqual(['bench/research/out/g6-publish-replay.json']);
    expect(r.adr_added).toEqual(['0078']);
    expect(r.net_additions).toBe(1);
    expect(errsFor([r])).toEqual([]);
  });

  test('README index rebuilt: 80 records incl. ADR-0078', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('80 architecture decision records');
    expect(r).toContain('0078-fix-round-disclosure-taxonomy.md');
  });

  test('ADR-0077 grill-t18 amendments: D-A.1 appendix + floor registration + regen-boundary sentence', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0077-verifier-exit-convention-mechanism-outputs-and-facts-canon.md'));
    expect(a).toContain('D-A.1 - The guard/emit-exit structure contract');
    expect(a).toContain('one emit-exit boundary per phase');
    expect(a).toContain('Cause-summary clause');
    expect(a).toContain('defer-0063');
    expect(a).toContain('The bare-value floor, registered (grill-t18 amendment, ledger D-002)');
    expect(a).toContain('pattern-ambiguity function');
    expect(a).toContain('backstopped by the key-assign leg');
    expect(a).toContain('permanent declared gap');
    expect(a).toContain('all eleven schema keys');
    expect(a).toContain('may disagree on counts across the regen boundary');
  });

  test('CONTEXT terms verified pre-landed (D-005/D-007)', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('Consent Sweep (同意清理)');
    expect(c).toContain('named-id');
    expect(c).toContain('identifier-stripping');
    expect(c).toContain('Amend-Riding Discipline (搭便车修正纪律)');
    expect(c).toContain('never an amend');
    expect(c).toContain('verified-state lines cite evidence paths, never carry regenerable');
    expect(c).toContain('seq 3/5/6/8 pre-authorization-era events are historical background');
  });

  test('AGENTS.md authoring-path clause (D-006)', () => {
    const ag = read(path.join(ROOT, 'AGENTS.md'));
    expect(ag).toContain('fs.writeFileSync');
    expect(ag).toContain('escape-interpreting shell layers');
    expect(ag).toContain('byte-check');
  });

  // Doc-hygiene scanner (grill-t18 D-006): zero-dependency pin over committed
  // .scratch/*.md. Registered signature set (extensible via defer-registry on
  // newly demonstrated classes; not an exhaustive sanitizer):
  //   banned control bytes x00-x08/x0B/x0C/x0E-x1F (tab+LF exempt, CR allowed
  //   for CRLF files), lone CR not followed by LF, C1 octal-eaten chars,
  //   stripped paths (backtick spans exempt for verbatim citation), stripped
  //   $name bullets.
  function docHygiene(buf) {
    const hits = [];
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b < 9 || b === 11 || b === 12 || (b > 13 && b < 32)) hits.push('control byte 0x' + b.toString(16) + ' @' + i);
      if (b === 13 && buf[i + 1] !== 10) hits.push('lone CR @' + i);
    }
    const t = buf.toString('utf8');
    if (/[-]/.test(t)) hits.push('C1 control char (octal-eaten stray)');
    const noTicks = t.replace(/`[^`]*`/g, '');
    if (/[A-Za-z]:(?![\\\/])[A-Za-z0-9_.-]+\.[a-z]{2,5}/.test(noTicks)) hits.push('stripped-path signature (D:Aworker class)');
    if (/^- {2,}—/m.test(t) || /^- -[a-z]/m.test(t)) hits.push('stripped $name bullet');
    return hits;
  }

  test('doc-hygiene pin: every committed .scratch/*.md is free of corruption signatures', () => {
    const files = tracked().filter(function (f) { return /^\.scratch\/.+\.md$/.test(f); });
    expect(files.length).toBeGreaterThan(100);
    for (const f of files) {
      expect({ f: f, hits: docHygiene(fs.readFileSync(path.join(ROOT, f))) }).toEqual({ f: f, hits: [] });
    }
  });

  test('doc-hygiene negative fixtures: the two real corruption samples are flagged', () => {
    // Sample A: the corrupted authoritative-inputs block + stripped $name
    // bullets from the committed .scratch/grill-t17/handoffs/next-round.md
    // (pre-fix bytes) - stripped paths, a literal CR mid-path, octal-eaten
    // C1 strays, and eaten $skill names.
    const a = Buffer.concat([
      Buffer.from('- Audit being settled: D:Aworkerjiahao.scratchgrill-t16'),
      Buffer.from([0x0d]),
      Buffer.from('eports'),
      Buffer.from([0xc2, 0x82]),
      Buffer.from('6-09-18-audit.md\n- Ledger: D:Aworkerjiahao.scratchgrill-t17decision-ledger.md\n-  — G-bundle fix round\n- -review — before each commit\n')
    ]);
    const ha = docHygiene(a).join(' | ');
    expect(ha).toContain('lone CR');
    expect(ha).toContain('C1 control char');
    expect(ha).toContain('stripped-path');
    expect(ha).toContain('stripped $name bullet');
    // Sample B: the eaten \b pair in .scratch/grill-t6/reports/
    // 2026-09-14-audit-t1.md - "(?u)\bww+\b" written as two 0x08 backspace
    // bytes by an escape-interpreting layer (same corruption class).
    const b = Buffer.concat([
      Buffer.from('analyzer.token_spec (incl. (?u)'),
      Buffer.from([0x08]),
      Buffer.from('ww+'),
      Buffer.from([0x08]),
      Buffer.from(' for word kind)\n')
    ]);
    expect(docHygiene(b).join(' | ')).toContain('control byte 0x8');
  });

  test('the t17 next-round.md repair holds: restored paths + $names + zero signatures (H-1)', () => {
    const f = path.join(ROOT, '.scratch', 'grill-t17', 'handoffs', 'next-round.md');
    const buf = fs.readFileSync(f);
    const t = buf.toString('utf8');
    for (const s of [
      'D:\\Aworker\\jiahao\\.scratch\\grill-t17\\decision-ledger.md',
      'D:\\Aworker\\jiahao\\.scratch\\grill-t17\\spec-fix-disposition.md',
      'D:\\Aworker\\jiahao\\.scratch\\grill-t16\\reports\\2026-09-18-audit.md',
      'D:\\Aworker\\jiahao\\.scratch\\grill-t16\\handoffs\\2026-09-18-audit-passed-with-findings.md',
      '- $grill — G-bundle fix round',
      '- $tdd — quoted-stale fixture',
      '- $code-review — before each commit',
      '- $handoff — next checkpoint'
    ]) expect(t).toContain(s);
    expect(docHygiene(buf)).toEqual([]);
  });

  test('t17 ledger carries the appended disclosure note (D-005)', () => {
    const d = read(path.join(ROOT, '.scratch', 'grill-t17', 'decision-ledger.md'));
    expect(d).toContain('Disclosure note (appended by grill-t18');
    expect(d).toContain('defer-0055');
    expect(d).toContain('isolated lapse');
  });

  test('single-digit canon fixture: bare single-digit value walks free (declared floor gap), key-assign catches it (D-002)', () => {
    const facts = { suites: 5, passed: 1225, skipped: 0, pack_bytes: 335900, instrument_entries: 27, rewrite_map_citations: 1432, registry_entries: 57, anchors_count: 16 };
    const bare = '# r\n\nprose mentions 5 suites inline\n';
    expect(brf.proseScan(bare, facts)).toEqual([]);
    const assigned = '# r\n\nsuites: 5 written as a schema-key assign\n';
    expect(brf.proseScan(assigned, facts).join(' ')).toContain('schema key suites assigned');
    const quoted = '# r\n\nalso quoted `5` stays free under the registered floor\n';
    expect(brf.proseScan(quoted, facts)).toEqual([]);
  });

  test('key-assign fixture: every one of the eleven schema keys is enforced in prose (D-002)', () => {
    const facts = { suites: 73, passed: 1225, skipped: 0, pack_bytes: 335900, instrument_entries: 27, rewrite_map_citations: 1432, registry_entries: 57, anchors_count: 16, battery_as_of_commit: 'abc1234', report_commit: null, not_run: ['x'] };
    const prose = 'suites: 1\npassed: 2\nskipped: 3\npack_bytes: 4\ninstrument_entries: 5\nrewrite_map_citations: 6\nregistry_entries: 7\nanchors_count: 8\nbattery_as_of_commit: 9\nreport_commit: null\nnot_run: [a]\n';
    const v = brf.proseScan(prose, facts);
    for (const k of brf.SCHEMA_KEYS) expect(v.join(' ')).toContain('schema key ' + k + ' assigned');
    expect(brf.SCHEMA_KEYS.length).toBe(11);
    // skipped:3 also trips the dedicated skipped=0 pattern? No - =0 only:
    expect(brf.proseScan('skipped: 0\n', facts).join(' ')).toContain('skipped=0');
  });

  test('PROSE_KEYS single-source: derived from SCHEMA_KEYS, all numeric-canon, no drift (D-003)', () => {
    expect(brf.PROSE_KEYS.sort()).toEqual(['anchors_count', 'instrument_entries', 'pack_bytes', 'passed', 'registry_entries', 'rewrite_map_citations', 'suites']);
    for (const k of brf.PROSE_KEYS) expect(brf.SCHEMA_KEYS).toContain(k);
    const facts = { suites: 1, passed: 2, skipped: 3, pack_bytes: 4, instrument_entries: 5, rewrite_map_citations: 6, registry_entries: 7, anchors_count: 8, battery_as_of_commit: 'h', report_commit: null, not_run: ['z'] };
    const region = brf.renderRegion(facts);
    for (const k of brf.SCHEMA_KEYS) expect(region).toContain('- ' + k + ':');
    const src = read(path.join(ROOT, 'scripts', 'build-round-facts.js'));
    expect((src.match(/readFileSync\(reportPath/g) || []).length).toBe(1);
    expect((src.match(/emitExit\(/g) || []).length).toBe(3); // definition + both converged sites
  });

  test('emit-exit boundary: a multi-violation report exits 1 with every cause line (D-003/D-A.1)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jh-brf-'));
    try {
      const rep = path.join(dir, 'multi.md');
      fs.writeFileSync(rep, '# fixture\n\n' + brf.SENTINEL_START + '\n- suites: 73\n' + brf.SENTINEL_END + '\n\nsuites: 99 plus report_commit: 1 assigned\n');
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-round-facts.js'), '--round', 'grill-t16', '--check', '--report', rep], { cwd: ROOT, encoding: 'utf8' });
      expect(r.status).toBe(1);
      const fails = String(r.stderr).split('\n').filter(function (l) { return /^FAIL: /.test(l); });
      expect(fails.length).toBeGreaterThanOrEqual(2);
      expect(String(r.stderr)).toContain('schema key suites assigned');
      expect(String(r.stderr)).toContain('schema key report_commit assigned');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('grill-t19 dispositions (ADR-0077 missing-input clause + ADR-0078 streak/gtd semantics + A-3 re-capture)', () => {
  const cgi = require('../scripts/check-governance-inventory');
  const brf = require('../scripts/build-round-facts');
  const ADR78 = path.join(ROOT, 'docs', 'adr', '0078-fix-round-disclosure-taxonomy.md');
  const ADR77 = path.join(ROOT, 'docs', 'adr', '0077-verifier-exit-convention-mechanism-outputs-and-facts-canon.md');
  const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
  function trendWith(rounds) {
    return { schema_version: 1, anchor: { adr_count_base: 63, K: 2 }, rounds: rounds };
  }
  function fixRow(over) {
    return Object.assign({
      round: 'grill-tNN-fix-round', date: '2026-09-19', kind: 'fix',
      adr_added: [], adr_superseded_or_closed: [], net_additions: 0,
      zero_product_diff: true,
      governance_tooling_diff: { files: ['scripts/build-round-facts.js'], reason: 'R2 machinery hand-edit disclosed per ADR-0078 D-A' },
      advisory_fired: false
    }, over || {});
  }
  function docRow(over) {
    return Object.assign({
      round: 'grill-tNN-doc-round', date: '2026-09-19', kind: 'documentation',
      adr_added: [], adr_superseded_or_closed: [], net_additions: 0,
      zero_product_diff: true, carve_out_used: 0, advisory_fired: false
    }, over || {});
  }
  function outFor(rounds) { return cgi.checkInventory(ROOT, { trend: trendWith(rounds) }); }

  // .txt hygiene leg (grill-t19 D-006, audit A-3): the pin extends to
  // committed .scratch/**/*.txt carrying ONLY the evidence-shaped signature
  // - a path broken across LF (trailing-backslash/cross-line path class, the
  // invocation-layer corruption that voided the first capture). The md
  // control-byte set does NOT transfer: 0x1B ANSI is legitimate in verbatim
  // tool output - per-type signature granularity, extensible on demonstration.
  function txtHygiene(buf) {
    const t = buf.toString('utf8');
    const hits = [];
    if (/[A-Za-z]:(?:[\\\/][A-Za-z0-9_.-]+)*\\\r?\n[A-Za-z0-9_.-]+\.[A-Za-z]{2,5}/.test(t)) hits.push('path-LF-break signature (trailing-backslash cross-line path)');
    return hits;
  }

  test('txt hygiene pin: every committed .scratch/**/*.txt is free of the path-LF-break signature (D-006)', () => {
    const files = tracked().filter(function (f) { return /^\.scratch\/.+\.txt$/.test(f); });
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      expect({ f: f, hits: txtHygiene(fs.readFileSync(path.join(ROOT, f))) }).toEqual({ f: f, hits: [] });
    }
  });

  test('txt hygiene negative fixture: the voided A-3 capture bytes are flagged; the md control-byte set does not transfer', () => {
    // The voided first capture of .scratch/grill-t18/evidence/
    // check-ci-jobs-missing.txt (pre-re-capture bytes): the recorded command
    // reads `D:` + literal LF + `onexistent.yml` and the ENOENT path reads
    // `jiahao\` + literal LF + `onexistent.yml` - an escape-interpreting
    // invocation layer ate the backslash-n sequences into real newlines.
    const a = Buffer.concat([
      Buffer.from('$ node scripts/check-ci-jobs.js D:'),
      Buffer.from([0x0a]),
      Buffer.from('onexistent.yml\n\nEXIT 2\n\ncheck-ci-jobs: verifier broken - ENOENT: no such file or directory, open \'D:\\Aworker\\jiahao\\'),
      Buffer.from([0x0a]),
      Buffer.from('onexistent.yml\'\n')
    ]);
    expect(txtHygiene(a).join(' | ')).toContain('path-LF-break');
    // Control: ANSI 0x1B and a lone CR are legitimate in verbatim .txt
    // output - the md signature set must NOT flag them here.
    const b = Buffer.concat([
      Buffer.from('[test] '),
      Buffer.from([0x1b]),
      Buffer.from('[32mgreen'),
      Buffer.from([0x1b]),
      Buffer.from('[0m ok\rmid\nnext line\n')
    ]);
    expect(txtHygiene(b)).toEqual([]);
  });

  test('the t18 check-ci-jobs-missing evidence is the re-captured verbatim output (Disclosed Re-Capture, D-006)', () => {
    const f = path.join(ROOT, '.scratch', 'grill-t18', 'evidence', 'check-ci-jobs-missing.txt');
    const t = read(f);
    expect(t).toContain('$ node scripts/check-ci-jobs.js .scratch/grill-t18/evidence/no-such-ci.yml');
    expect(t).toContain('EXIT 2');
    expect(t).toContain('verifier broken - ENOENT');
    expect(t).toContain('D:\\Aworker\\jiahao\\.scratch\\grill-t18\\evidence\\no-such-ci.yml');
    expect(txtHygiene(fs.readFileSync(f))).toEqual([]);
  });

  test('CONTEXT carries the Disclosed Repair / Disclosed Re-Capture / Non-Interpolating Channel / Bilingual Mirror terms (D-002/D-006/D-007)', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('Disclosed Repair (披露式修复)');
    expect(c).toContain('reason+when+who triple');
    expect(c).toContain('Disclosed Re-Capture (披露式重捕获)');
    expect(c).toContain('Non-Interpolating Channel (非插值通道)');
    expect(c).toContain('escape-interpreting string layers');
    expect(c).toContain('Bilingual Mirror (双语镜像)');
  });

  test('CONTEXT clauses: trend-anchor streak populations + consuming-row missing-input (D-003/D-004)', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('kind:fix rows are outside both streak populations');
    expect(c).toContain('skip-not-reset');
    expect(c).toContain('condition recorded at the phase boundary, never an early exit');
    expect(c).toContain('three-value contract grows no fourth class');
  });

  test('ADR-0077 D-A.1 registers the missing-input clause (D-004)', () => {
    const a = read(ADR77);
    expect(a).toContain('Missing-input clause (grill-t19 amendment, ledger D-004)');
    expect(a).toContain('unsatisfied condition recorded at the phase boundary');
    expect(a).toContain('three-value contract grows no fourth class');
  });

  test('the t18 artifacts carry the restored defer-0060 named lines (A-1 Disclosed Repair)', () => {
    const l = read(path.join(ROOT, '.scratch', 'grill-t18', 'decision-ledger.md'));
    const r = read(path.join(ROOT, '.scratch', 'grill-t18', 'reports', '2026-09-19-report.md'));
    for (const t of [l, r]) {
      expect(t).toContain('defer-0060 (Disclosed Repair - restored by grill-t19, 2026-09-19)');
      expect(t).toContain('review_at 2026-12-15');
    }
    expect(l).toContain('task book\'s item 22');
  });

  test('the t18 report carries the export-misreport by-design note + the true green statement (A-2/A-5)', () => {
    const r = read(path.join(ROOT, '.scratch', 'grill-t18', 'reports', '2026-09-19-report.md'));
    expect(r).toContain('Export-misreport by-design note');
    expect(r).toContain('SCHEMA_KEYS/PROSE_KEYS');
    expect(r).toContain('NOT green throughout');
    expect(r).toContain('wrx commit');
    expect(r).toContain('wsl round-complete handoff');
    expect(r).not.toContain('Intermediate commits green throughout');
  });

  test('a corrupt facts artifact exits 2 verifier-broken - a crash never masquerades as unsatisfied (D-004/A-6)', () => {
    const dir = path.join(ROOT, '.scratch', 'tmp-t19-corrupt');
    fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(path.join(dir, 'round-facts.json'), '{corrupt json', 'utf8');
      const rep = path.join(dir, 'rep.md');
      fs.writeFileSync(rep, '# rep\n', 'utf8');
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-round-facts.js'), '--round', 'tmp-t19-corrupt', '--check', '--report', rep], { cwd: ROOT, encoding: 'utf8' });
      expect(r.status).toBe(2);
      expect(String(r.stderr)).toContain('verifier broken');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('missing factsFile routes to the drift channel: FAIL + boundary exit 1, report phase skipped (D-004/A-8)', () => {
    // Runtime verdict pinned over the committed capture (a jest-side spawn
    // would pay a full-jest collect recursively - the committed evidence
    // carries the re-runnable command instead): FAIL pair + EXIT 1, the
    // fixture report is never spliced.
    const cap = read(path.join(ROOT, '.scratch', 'grill-t19', 'evidence', 'round-facts-missing.txt'));
    expect(cap).toContain('$ node scripts/build-round-facts.js --round grill-t19-nofacts --check --report');
    expect(cap).toContain('EXIT 1');
    expect(cap).toContain('FAIL: .scratch/grill-t19-nofacts/round-facts.json missing');
    expect(cap).not.toContain('verifier broken');
    expect(read(path.join(ROOT, '.scratch', 'grill-t19', 'evidence', 'missing-facts.fixture.md'))).toBe('# fixture report\n');
  });

  test('the missing-facts branch is a boundary-route shape, not an early exit (D-004 structure pin)', () => {
    const src = read(path.join(ROOT, 'scripts', 'build-round-facts.js'));
    const i = src.indexOf("'/round-facts.json missing");
    expect(i).toBeGreaterThan(-1);
    const tail = src.slice(i);
    expect(tail.indexOf('drift = true')).toBeLessThan(tail.indexOf('process.exit'));
    expect(src).toContain('missing-input clause (grill-t19)');
  });

  test('kind:fix rows are transparent to the ADR streak - net_additions>0 on a fix row never feeds it (D-003 negative)', () => {
    const fix = fixRow({ adr_added: ['0078'], net_additions: 1 });
    const out = outFor([fix]);
    expect(out.errors).toEqual([]);
    const w = out.warnings.join(' ');
    expect(w).not.toContain('trend anchor');
    expect(w).not.toContain('advisory drift');
  });

  test('B-1 discriminating pin: [fix(+1), doc(+1)] stays silent - under feed-semantics this scenario fires the trend-anchor advisory (audit B-1)', () => {
    // Discriminating coverage: the single-row pin above is vacuous under the
    // pre-D-003 semantics (streak 1 < K either way). With [fix(+1), doc(+1)]
    // the OLD code counts the fix row into the doc streak (2 >= K=2 -> the
    // advisory fires); the skip-not-reset code treats the fix row as
    // transparent (streak 1 -> silent). This pin fails on the old semantics.
    const out = outFor([
      fixRow({ round: 'grill-tNN-fix-feed', adr_added: ['0078'], net_additions: 1 }),
      docRow({ round: 'grill-tNN-doc-feed', adr_added: ['0079'], net_additions: 1, deferred_entry: 'defer-0064' })
    ]);
    expect(out.errors).toEqual([]);
    const w = out.warnings.join(' ');
    expect(w).not.toContain('trend anchor');
    expect(w).not.toContain('advisory drift');
  });

  test('doc-fix-doc adjacency counts consecutive for both streaks (D-003 skip-not-reset positive)', () => {
    // ADR streak: doc(+1) + fix + doc(+1) -> the fix row is transparent,
    // streak 2 >= K -> the trend-anchor advisory fires.
    const w1 = outFor([
      docRow({ round: 'grill-tNN-doc-1', adr_added: ['0076'], net_additions: 1, deferred_entry: 'defer-0060' }),
      fixRow({ round: 'grill-tNN-fix-1' }),
      docRow({ round: 'grill-tNN-doc-2', adr_added: ['0077'], net_additions: 1, deferred_entry: 'defer-0060' })
    ]).warnings.join(' ');
    expect(w1).toContain('trend anchor');
    // carveStreak: doc(carve=1) + fix + doc(carve=1) -> the fix row is
    // transparent, carveStreak 2 -> the burn-rate advisory fires.
    const carve = { governance_tooling_diff: { files: ['scripts/check-ci-jobs.js'], reason: 'carve-out disclosure for the fixture round' }, carve_out_used: 1 };
    const w2 = outFor([
      docRow(Object.assign({ round: 'grill-tNN-doc-c1' }, carve)),
      fixRow({ round: 'grill-tNN-fix-c1' }),
      docRow(Object.assign({ round: 'grill-tNN-doc-c2' }, carve))
    ]).warnings.join(' ');
    expect(w2).toContain('carve-out burn-rate');
  });

  test('a fix row never resets a running streak - streak state is preserved across the row (D-003)', () => {
    // control: without the fix row the same doc pair fires identically
    const w3 = outFor([
      docRow({ round: 'grill-tNN-doc-3', adr_added: ['0076'], net_additions: 1, deferred_entry: 'defer-0060' }),
      docRow({ round: 'grill-tNN-doc-4', adr_added: ['0077'], net_additions: 1, deferred_entry: 'defer-0060' })
    ]).warnings.join(' ');
    expect(w3).toContain('trend anchor');
  });

  test('ADR-0078 D-A registers the streak-population sentence (D-003)', () => {
    const a = read(ADR78);
    expect(a).toContain('outside both advisory streak populations');
    expect(a).toContain('skip-not-reset');
    expect(a).toContain('doc-fix-doc sequence remains consecutive');
  });

  test('gtd presence implies non-empty files: kind:fix + {files:[]} hard-fails (D-005 negative)', () => {
    const bad = fixRow({ governance_tooling_diff: { files: [], reason: 'a bare marker with nothing disclosed' } });
    expect(outFor([bad]).errors.join(' ')).toContain('non-empty string[]');
  });

  test('documentation + {files:[]} hard-fails too - the escape channel is closed for both kinds (D-005)', () => {
    const bad = docRow({ governance_tooling_diff: { files: [], reason: 'a bare marker with nothing disclosed' }, carve_out_used: 0 });
    expect(outFor([bad]).errors.join(' ')).toContain('non-empty string[]');
  });

  test('ADR-0078 D-A registers the gtd escape-channel convention (D-005)', () => {
    const a = read(ADR78);
    expect(a).toContain('carve_out_used:0');
    expect(a).toContain('never an empty files list');
  });
});
