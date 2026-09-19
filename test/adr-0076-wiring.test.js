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

  test('README index rebuilt: 76 records incl. ADR-0076', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('77 architecture decision records');
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

  test('README index rebuilt: 77 records incl. ADR-0077', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('77 architecture decision records');
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
    expect(d.status).toBe('pending-evaluation');
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

  test('README index rebuilt: 78 records incl. ADR-0078', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('78 architecture decision records');
    expect(r).toContain('0078-fix-round-disclosure-taxonomy.md');
  });
});
