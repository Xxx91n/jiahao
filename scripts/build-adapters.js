#!/usr/bin/env node
// build-adapters.js — generate per-host adapter files from src/SKILL.md
// Mirrors ponytail's single-source + per-host adapter pattern.
// Also emits the rules-version skill directory (skills/jiahao/SKILL.md).
// Run: node scripts/build-adapters.js
// Supports dual-profile ( Option C): SKILL.md has tagged sections
// ## Generator Profile / ## Verifier Profile / ## Boundaries (shared).

const fs = require('fs');
const path = require('path');
const { splitByProfile, validateGsrHeaders } = require('../hooks/jiahao-profile');
const { listTrackedPaths } = require('../src/shared/tracked-surface');
const copilotDialect = require('./hosts/copilot');
const codexDialect = require('./hosts/codex');
const zcodeDialect = require('./hosts/zcode');
const { PLATFORMS } = require('../hooks/jiahao-runtime');

const root = path.join(__dirname, '..');

// The standard skill directory the rules version ships as, and the source's own
// skill name - see toShippedSkill for why the two differ.
const SKILL_NAME = 'jiahao';
const SKILL_DIR = 'skills/' + SKILL_NAME;
const SOURCE_NAME = 'jiahao-source';

// Plugin manifests carry the package version, not a copy of it: a second
// hardcoded number is a version assertion that can rot (spec: one version).
const PKG = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// Both plugin manifests read the repo identity from the package, so the two
// bundles cannot disagree about which repository they came from.
const PKG_REPOSITORY = PKG.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

// The directories the generator owns. A file tracked under them that this
// script does not emit is an orphan; a file this script emits that is not
// tracked never ships. Both halves are compared in --check.
// `.claude-plugin/` and `.agents/plugins/` at the repo root are the two
// marketplaces: the repo is the marketplace for both Claude Code and Codex, so
// they ship with the same generated-and-audited guarantee as the plugin dirs
// they point at.
const GENERATED_DIRS = ['adapters/', 'skills/', '.claude-plugin/', '.agents/'];

// ---- host table: the one place a plugin host is described ----
//
// A row says what a bundle is called, which capability tier it claims, where it
// ships, and which host events it wires. The generator emits from this table,
// both gates read it, and the structure tests iterate it - adding a host is one
// row, not a copy of claude-code's assertions plus edits to check-drift and
// release-gate. A C-tier row sets `manifest: null`: that is the rules-only
// shape (rule text + README, no plugin manifest, no src/ copy, no hooks).
//
// tier is spec #74 D2's vocabulary: A can block before the turn ends, B can
// only block a tool call, C is rules-only and registers no hooks at all.
// `turnEnd` names the host's own end-of-turn event and must run the verdict
// gate; only an A row may declare it. `provenance` is the evidence behind the
// tier (host build + what was actually observed): a tier is a release-period
// conclusion, not a permanent property. "A 档候选" is only for a
// documented-but-unwatched block; Codex and Copilot each had a live turn
// blocked on 2026-10-30 (#80).
const HOSTS = [
  {
    name: 'claude-code',
    label: 'Claude Code',
    dir: 'adapters/claude-code',
    tier: 'A',
    turnEnd: 'Stop',
    // v0.2.0 live acceptance: the plugin installed and SessionStart ran in the
    // host, but the Stop gate blocked (exit 2) only when the installed copy was
    // spawned directly - the model endpoint returned 401, so no live turn-end
    // block was observed.
    provenance: 'Claude Code 2.1.251 (docs/release-notes-v0.2.0.md): installed, SessionStart ran in-host; Stop gate exit 2 verified at script level only, no live turn-end block observed',
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      SubagentStart: { script: 'jiahao-subagent', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SubagentStop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 5 },
      PreToolUse: { script: 'jiahao-pretool-guard', timeout: 5 },
    },
    // Only `name` is required by the host (code.claude.com/docs/en/plugins/
    // manifest-reference). `version` is added by the emitter from the package;
    // `author` is a documented manifest field, not a CodeBuddy extra.
    manifest: {
      description: 'Dual-profile verification discipline: verifier gate on Stop, profile injection on SessionStart. Self-contained Claude Code plugin.',
      author: { name: 'Xxx91n' },
    },
    // The host loads these files by itself at the plugin root; naming one in
    // the manifest loads it a second time (the manifest field is additive).
    autoDiscovered: ['hooks/hooks.json', '.mcp.json'],
    // Deliberately absent from this bundle: InstructionsLoaded (it hashes
    // rules/jiahao-*.md, and a Claude Code plugin has no plugin-level rules/
    // directory for the host to load) and jiahao-mcp + .mcp.json (#59 keeps the
    // server in the repo but not as an install-and-work exit; auto-discovery
    // would register a server whose SDK deps are not vendored). With those two
    // gone the bundle has no third-party runtime dependency.
    mcp: null,
    rules: [],
    readme: claudeCodeReadme,
  },
  {
    name: 'codebuddy',
    label: 'CodeBuddy',
    dir: 'adapters/codebuddy',
    tier: 'A',
    turnEnd: 'Stop',
    // Settings-tier hooks were probed live; the plugin-bundle path (and its
    // Stop hook) is documented compat that nobody has watched fire in a real
    // turn.
    provenance: 'CodeBuddy Code CLI 2.151.0 (adapters/codebuddy/README.md): settings-tier SessionStart/PreToolUse/PostToolUse live-probed; plugin Stop gate pinned at script level only, no live turn-end block observed',
    // Full event map: the migrated five-event set plus the InstructionsLoaded
    // integrity assertion and the PreToolUse enforcement-surface deny wiring.
    // Plugin hook maps are exempt from the allowUntrustedFrontmatterHooks gate
    // and effective on enable, so assertion/enforcement lines live here, never
    // in skill/agent frontmatter (silently skipped by default). Timeouts stay
    // within the host's 60s budget.
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      SubagentStart: { script: 'jiahao-subagent', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 3 },
      InstructionsLoaded: { script: 'jiahao-instructions-assert', timeout: 5 },
      PreToolUse: { script: 'jiahao-pretool-guard', timeout: 5 },
    },
    manifest: {
      description: 'Dual-profile verification discipline (generator advisory + verifier iron laws) - Claude-Code-compatible plugin surface for CodeBuddy.',
      // CodeBuddy's documented compat path reads these two keys from the
      // manifest and does not auto-discover the files, so here they belong.
      hooks: 'hooks/hooks.json',
      mcpServers: '.mcp.json',
    },
    autoDiscovered: [],
    mcp: { entry: 'jiahao-mcp/index.js', files: ['jiahao-mcp/package.json'] },
    // alwaysApply: true pins both profiles on; non-alwaysApply load priority is
    // a declared-unverified item (README).
    rules: [
      { file: 'jiahao-verifier.md', profile: 'verifier', description: 'Jiahao verifier discipline (blocking)' },
      { file: 'jiahao-generator.md', profile: 'generator', description: 'Jiahao generator discipline (surface signals)' },
    ],
    readme: codebuddyReadme,
  },
  {
    name: 'copilot',
    label: 'GitHub Copilot CLI',
    dir: 'adapters/copilot',
    tier: 'A',
    turnEnd: 'agentStop',
    // Live probe (#80, 2026-10-30, Copilot CLI 1.0.105 on win32): a false
    // completion claim was continued only after agentStop answered
    // {decision:"block"} on exit 0. Exit 2 did not block. Eight consecutive
    // block continuations followed by a forced end matched the documented cap.
    provenance: 'GitHub Copilot CLI 1.0.105 (2026-10-30, #80): live agentStop {decision:"block"} on exit 0 continued the turn; exit 2 did not block; 8 consecutive continuations then the CLI ended; .claude/settings.json SessionStart/Stop hooks observed; COPILOT_PLUGIN_DATA set for plugin hooks',
    // camelCase event names and the bash/powershell pair are this host's
    // dialect; they live in scripts/hosts/copilot.js alone, never in the hook
    // scripts. subagentStop is deliberately not wired: the ticket asks for the
    // turn-end event, and a blocked subagent finish is an unprobed surface (#80).
    dialect: copilotDialect,
    hooks: {
      sessionStart: { script: 'jiahao-activate', timeout: 10 },
      subagentStart: { script: 'jiahao-subagent', timeout: 10 },
      userPromptSubmitted: { script: 'jiahao-mode-tracker', timeout: 10 },
      agentStop: { script: 'jiahao-verdict-gate', timeout: 30 },
      sessionEnd: { script: 'jiahao-sweep', timeout: 10 },
    },
    manifest: {
      description: 'Dual-profile verification discipline for GitHub Copilot CLI: verifier gate on agentStop, profile injection on sessionStart.',
    },
    autoDiscovered: [],
    mcp: null,
    rules: [],
    readme: copilotCliReadme,
  },
  {
    name: 'codex',
    label: 'Codex CLI',
    dir: 'adapters/codex',
    tier: 'A',
    turnEnd: 'Stop',
    // Live probe (#80, 2026-10-30, codex-cli 0.163.0 on win32): a false
    // completion claim was continued only after Stop answered
    // {decision:"block"} on exit 0. Exit 2 + stderr ended the turn without a
    // continuation. Untrusted plugin hooks were skipped in codex exec.
    provenance: 'Codex CLI 0.163.0 (2026-10-30, #80): live Stop block via exit 0 + {decision:"block"} continued the turn; exit 2 + stderr did not block; untrusted plugin hooks skipped in codex exec; hooks on by default',
    // Codex event vocabulary is PascalCase and includes Stop. SessionEnd has a
    // 3s hard cap in the host, so the sweep is budgeted inside it.
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      SubagentStart: { script: 'jiahao-subagent', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SubagentStop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 3 },
    },
    // Codex's manifest, hook-map path, ${PLUGIN_ROOT} spelling, './' component
    // paths, and the platform name the template passes all live in
    // scripts/hosts/codex.js.
    dialect: codexDialect,
    manifest: {
      description: 'Verification discipline for Codex CLI: profile injection at session start, verdict gate at turn end (A tier, live block verified 2026-10-30). Self-contained plugin.',
      author: { name: 'Xxx91n' },
    },
    autoDiscovered: [],
    mcp: null,
    rules: [],
    readme: codexReadme,
  },
  {
    name: 'zcode',
    label: 'ZCode',
    dir: 'adapters/zcode',
    tier: 'A',
    turnEnd: 'Stop',
    // Live probe (#108, 2026-10-31, ZCode 3.16.2 desktop on win32): a real
    // session's turn end was blocked by the Stop hook answering
    // {decision:"block"} on exit 0, and the block reason arrived back as the
    // next turn's context. Payloads carry both snake_case and camelCase
    // spellings; hook configuration is read at session start only.
    provenance: 'ZCode 3.16.2 / CLI 0.17.0 (2026-10-31, #108): live Stop block via exit 0 + {decision:"block"} (exit 2 also blocked, without a reason); stop_hook_active true on continuations; 3 block continuations then the turn ended; install via the bundle marketplace shelf verified (hooks:4, byte-identical cache); payload dual-spelling; hook config read at session start only',
    // ZCode's event vocabulary is PascalCase but holds exactly seven events;
    // SubagentStart/SubagentStop/SessionEnd do not exist, so no sweep hook is
    // wired (scripts/hosts/zcode.js sets sessionEndEvent: null).
    dialect: zcodeDialect,
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      PreToolUse: { script: 'jiahao-pretool-guard', timeout: 5 },
    },
    // ZCode's manifest path, the ${ZCODE_PLUGIN_ROOT} spelling, the platform
    // name the template passes, and the absent-by-rule defaultEnabled key all
    // live in scripts/hosts/zcode.js.
    manifest: {
      description: 'Verification discipline for ZCode: profile injection at session start, verdict gate at turn end (A tier, live block verified 2026-10-31). Self-contained plugin.',
      author: { name: 'Xxx91n' },
    },
    autoDiscovered: ['hooks/hooks.json'],
    mcp: null,
    rules: [],
    readme: zcodeReadme,
  },
  {
    name: 'qoder',
    label: 'Qoder',
    dir: 'adapters/qoder',
    tier: 'C',
    turnEnd: null,
    // This rules-only row is the IDE/CLI exit: Qoder IDE/CLI reads project
    // `.qoder/rules/`. Qoder Desktop (the 0.x workbench, including Qoder CN)
    // does not load it; Desktop installs the rules version's standard skill
    // directory instead (#106). That Desktop check is recorded in the adapter
    // README and the evidence file; it is not this row's tier evidence. Spec
    // #74's probe list still owns Qoder's turn-end question, and this exit
    // registers no hook that could be mistaken for enforcement.
    provenance: 'Qoder IDE/CLI (host build not recorded; spec #74 probe list): project .qoder/rules loading unprobed; turn-end behavior unprobed; C tier (rules only) is the spec-assigned ceiling',
    // A manifest-less row IS the rules-only exit: no plugin manifest, no
    // vendored scripts, no src/ copy. The one rule file carries the same body
    // as the rules version; see qoderReadme for both install surfaces.
    hooks: {},
    manifest: null,
    autoDiscovered: [],
    mcp: null,
    rules: [
      { file: 'jiahao.md', profile: 'both', description: 'Jiahao anti-false-completion discipline (rules only)' },
    ],
    readme: qoderReadme,
  },
];

// The marketplace is the repository root, and its single entry is the plugin a
// `claude plugin install jiahao@jiahao` lands on. Kept as the row itself so the
// generator and the test read its dir instead of repeating a name lookup.
const MARKETPLACE_HOST = HOSTS.find(host => host.name === 'claude-code');


// Retired, and not to be re-added without a self-contained directory and tests:
// aider, cline, cursor, instruction-tier, opencode, and windsurf were
// instruction-only copies, replaced by the standard rules directory
// (skills/jiahao/); codex and mcp registered hooks or notes without shipping
// the scripts next to them, so a copied directory could not run. The MCP server
// itself stays at jiahao-mcp/. check-drift refuses a directory for any of these
// names, so #62's convergence cannot quietly come back.
//
// codex left this list in #77, copilot in #78, and qoder in #79, each because it
// now has a host table row and a generated directory (codex and copilot
// self-contained bundles, qoder the rules-only shape with the
// no-registration assertion).
const RETIRED_HOSTS = ['aider', 'cline', 'cursor',
  'instruction-tier', 'mcp', 'opencode', 'windsurf'];

// A host row may name a dialect module (scripts/hosts/<name>.js) when its
// config schema differs from the Claude-shaped default. The dialect owns the
// manifest and hook-map paths, the command spelling, the timeout key, and any
// extra generated files; vendoring, tier checks, and regen-diff stay shared, so
// a second copy of the judgment logic cannot grow per host.
const CLAUDE_DIALECT = {
  manifestPath: '.claude-plugin/plugin.json',
  hookMapPath: 'hooks/hooks.json',
  sessionEndEvent: 'SessionEnd',
  timeoutField: 'timeout',
  // Claude-shaped manifests carry the conservative opt-in flag; a host that
  // does not document the field must not be given a key it never reads.
  defaultEnabledFlag: true,
  commandFields: ['command'],
  commandPatterns: {
    command: /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)"$/,
  },
};

function dialectOf(host) {
  return Object.assign({}, CLAUDE_DIALECT, host.dialect || {});
}

// Codex reads its own marketplace file (`.agents/plugins/marketplace.json`);
// the entry points at the same bundle the row describes. Exactly one row may
// own that file: two Codex-dialect rows would otherwise leave one silently
// unshelved, and the build catches it instead.
const CODEX_DIALECT_HOSTS = HOSTS.filter(host => (host.dialect || {}).marketplace === 'codex');
const CODEX_MARKETPLACE_HOST = CODEX_DIALECT_HOSTS.length === 1 ? CODEX_DIALECT_HOSTS[0] : null;

// Claude-shaped maps nest their commands under `hooks`; a flat dialect's entry
// IS the command. One reader, so the gate and the suites cannot disagree about
// the shape, and a new flat host does not copy the branch into three files.
function hookEntryCommands(entry) {
  if (!entry || typeof entry !== 'object') return [];
  return Array.isArray(entry.hooks) ? entry.hooks : [entry];
}

function readRepoFile(rel) {
  return fs.readFileSync(path.join(root, rel.split('/').join(path.sep)), 'utf8');
}

// The files a bundle must ship: every wired script plus the MCP entry. The
// require() closure those reach is added by vendorClosure; one definition, so a
// test cannot disagree with the generator about what "wired" means.
function bundleSeeds(host) {
  return Array.from(new Set(
    Object.values(host.hooks || {}).map(hook => 'hooks/' + hook.script + '.js')
      .concat(host.mcp ? [host.mcp.entry] : [])
  ));
}

// The non-JS tail every self-contained bundle carries: the require() closure,
// the SKILL body, and the identity pin calibration.js loads at require() time.
// One helper, so a file added here cannot reach one bundle and miss another
// (both were missing the pin before this ticket). `extraFiles` are the
// host-specific runtime data files a bundle also ships.
function emitBundle(adapters, prefix, seeds, skill, extraFiles) {
  for (const [rel, text] of vendorClosure(seeds)) adapters[prefix + rel] = text;
  adapters[prefix + 'src/SKILL.md'] = skill;
  adapters[prefix + 'src/instrument-identity.json'] = readRepoFile('src/instrument-identity.json');
  for (const rel of extraFiles || []) adapters[prefix + rel] = readRepoFile(rel);
}

// Vendored runtime closure for the self-contained plugin bundles: the seed
// files plus every relative require() they reach, byte-verbatim, keyed by
// repo-relative path. Both bundles share it so a new hook dependency cannot
// land in one and silently go missing from the other.
function vendorClosure(seeds) {
  const files = new Map();
  const seen = new Set();
  const queue = seeds.slice();
  const REQ = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const resolveReq = (spec, fromRel) => {
    if (!spec.startsWith('.')) return null;
    const base = path.join(root, path.dirname(fromRel), spec);
    for (const c of [base, base + '.js', base + '.json', path.join(base, 'index.js')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return path.relative(root, c).split(path.sep).join('/');
      }
    }
    return null;
  };
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const text = readRepoFile(rel);
    files.set(rel, text);
    if (!/\.js$/.test(rel)) continue;
    REQ.lastIndex = 0;
    let m;
    while ((m = REQ.exec(text))) {
      const r = resolveReq(m[1], rel);
      if (r && !seen.has(r)) queue.push(r);
    }
  }
  return files;
}

// Every way a row can contradict the tier contract or itself. Kept as a pure
// function of the rows so the build fails closed on a bad table and a test can
// prove each rule red without a real host shipping the mistake.
const VERDICT_GATE = 'jiahao-verdict-gate';

// Keys the emitter pins from package.json / the contract. A row that sets one
// would be silently overridden, so it is a table error instead.
const RESERVED_MANIFEST_KEYS = ['name', 'version', 'license', 'repository', 'defaultEnabled'];

// A rules-only directory is the manifest-less shape: rule text + README, no
// plugin scaffold. One predicate, so the generator, both gates, and the tests
// cannot disagree about which rows have a plugin scaffold.
function isRulesOnlyDirectory(host) {
  return host.manifest === null;
}

function hostShapeProblems(hosts) {
  const problems = [];
  const names = new Set();
  for (const host of hosts || []) {
    const label = host && host.name ? host.name : '(unnamed row)';
    if (!host || typeof host !== 'object') { problems.push('a host row is not an object'); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(host.name || '')) problems.push(label + ': name must be lowercase-kebab');
    if (names.has(host.name)) problems.push(label + ': duplicate host name');
    names.add(host.name);
    if (host.dir !== 'adapters/' + host.name) problems.push(label + ': dir must be adapters/<name>, got ' + host.dir);
    if (!['A', 'B', 'C'].includes(host.tier)) problems.push(label + ': unknown tier ' + host.tier);
    if (!host.provenance || !String(host.provenance).trim()) problems.push(label + ': the tier needs provenance (host build + what was observed)');

    const events = Object.keys(host.hooks || {});
    if (!host.hooks || typeof host.hooks !== 'object' || Array.isArray(host.hooks)) {
      problems.push(label + ': hooks must be an object (empty for a rules-only host)');
    }
    if (host.tier === 'A') {
      if (!host.turnEnd) problems.push(label + ': an A-tier host must name its turn-end event (turnEnd)');
      else if (!events.includes(host.turnEnd)) problems.push(label + ': turnEnd ' + host.turnEnd + ' is not a registered event');
      else if (host.hooks[host.turnEnd].script !== VERDICT_GATE) problems.push(label + ': turnEnd must run ' + VERDICT_GATE);
    } else if (host.turnEnd) {
      problems.push(label + ': only an A-tier host may declare turnEnd');
    }
    if (host.tier === 'C' && events.length) problems.push(label + ': a C-tier host is rules-only and must not register hooks');
    if (host.tier !== 'C' && events.length === 0) problems.push(label + ': a tier-' + host.tier + ' host registers no hooks');
    for (const [event, hook] of Object.entries(host.hooks || {})) {
      if (!/^[a-z0-9-]+$/.test(hook.script || '')) problems.push(label + ': ' + event + ' names no script');
      if (!(hook.timeout > 0 && hook.timeout <= 60)) problems.push(label + ': ' + event + ' timeout must be 1-60s');
    }
    const autoDiscovered = Array.isArray(host.autoDiscovered) ? host.autoDiscovered : [];
    if (!Array.isArray(host.autoDiscovered)) problems.push(label + ': autoDiscovered must be an array');
    for (const rel of autoDiscovered) {
      if (Object.values(host.manifest || {}).includes(rel)) problems.push(label + ': the manifest repeats auto-discovered ' + rel);
    }
    const rules = Array.isArray(host.rules) ? host.rules : [];
    if (!Array.isArray(host.rules)) problems.push(label + ': rules must be an array (empty when the bundle ships none)');
    for (const rule of rules) {
      if (!['generator', 'verifier', 'both'].includes(rule.profile)) problems.push(label + ': rule ' + rule.file + ' has unknown profile ' + rule.profile);
    }
    // A C-tier host exists to carry rules; an empty one is not an exit.
    if (host.tier === 'C' && rules.length === 0) problems.push(label + ': a C-tier host is rules-only and must ship at least one rule');
    // manifest: null is the rules-only shape: no plugin manifest, no src/ copy,
    // no hooks. It must be C tier and register nothing the host could load as a
    // component.
    const rulesOnly = isRulesOnlyDirectory(host);
    if (host.manifest === undefined || (!rulesOnly && (typeof host.manifest !== 'object' || Array.isArray(host.manifest)))) {
      problems.push(label + ': manifest must be an object, or null for a rules-only exit');
    }
    if (rulesOnly) {
      if (host.tier !== 'C') problems.push(label + ': a manifest-less exit is rules-only (tier C)');
      if (autoDiscovered.length) problems.push(label + ': a rules-only exit auto-discovers nothing');
      if (host.mcp) problems.push(label + ': a rules-only exit has no MCP registration');
    }
    for (const key of RESERVED_MANIFEST_KEYS) {
      if (Object.prototype.hasOwnProperty.call(host.manifest || {}, key)) {
        problems.push(label + ': the manifest must not set ' + key + ' (the emitter pins it)');
      }
    }
    if (host.mcp) {
      if (!host.mcp.entry) problems.push(label + ': the MCP server needs an entry file');
      if (!Array.isArray(host.mcp.files)) problems.push(label + ': the MCP server needs a files array (what else ships beside it)');
    }
    if (host.dialect) {
      if (host.dialect.platform !== undefined && !PLATFORMS.includes(host.dialect.platform)) {
        // A config template may only pass a name the hook layer has a shape for;
        // a typo would silently fall back to the Claude branch at runtime.
        problems.push(label + ': dialect platform "' + host.dialect.platform + '" is not one of ' + PLATFORMS.join('/'));
      }
      if (host.dialect.manifestPathPrefix !== undefined && !['', './'].includes(host.dialect.manifestPathPrefix)) {
        problems.push(label + ': dialect manifestPathPrefix must be "" or "./"');
      }
      for (const key of ['manifestPath', 'hookMapPath']) {
        const rel = host.dialect[key];
        if (typeof rel !== 'string' || !rel.endsWith('.json') ||
            rel.startsWith('/') || rel.split('/').includes('..')) {
          problems.push(label + ': dialect ' + key + ' must be a relative .json path inside the bundle');
        }
      }
      for (const fn of ['emitManifest', 'emitHookMap']) {
        if (host.dialect[fn] !== undefined && typeof host.dialect[fn] !== 'function') {
          problems.push(label + ': dialect ' + fn + ' must be a function when present');
        }
      }
      if (!Array.isArray(host.dialect.commandFields) || host.dialect.commandFields.length === 0) {
        problems.push(label + ': dialect must name its command fields');
      }
      for (const field of host.dialect.commandFields || []) {
        const pattern = (host.dialect.commandPatterns || {})[field];
        if (!(pattern instanceof RegExp)) {
          problems.push(label + ': dialect needs a command pattern for ' + field);
        }
      }
      // The shared emitter writes exactly the default `command` + `timeout`
      // keys; a row that renames the command shape without its own emitter
      // would ship a Claude-shaped map the host silently skips, so the shape and
      // the emitter must change together. Compared as a set, so reordering the
      // fields is not mistaken for a new shape.
      const fields = host.dialect.commandFields || [];
      const sameFields = fields.length === CLAUDE_DIALECT.commandFields.length &&
        fields.every((field) => CLAUDE_DIALECT.commandFields.includes(field));
      const customShape = !sameFields || host.dialect.timeoutField !== CLAUDE_DIALECT.timeoutField;
      if (customShape && typeof host.dialect.emitHookMap !== 'function') {
        problems.push(label + ': a non-default command shape needs its own emitHookMap');
      }
    }
    if (typeof host.readme !== 'function') problems.push(label + ': readme must be a function that returns the bundle README');
  }
  return problems;
}

// The manifest carries the package version and repository, not copies of them:
// a second hardcoded number is a version assertion that can rot (spec: one
// version), and the bundles cannot disagree about where they came from.
function emitPluginManifest(host) {
  return JSON.stringify(Object.assign(
    { name: 'jiahao', version: PKG.version },
    host.manifest,
    {
      license: PKG.license,
      repository: PKG_REPOSITORY,
      // conservative: opt-in enable; plugin hooks bypass the
      // untrusted-frontmatter gate and execute on enable
      defaultEnabled: false,
    }), null, 2) + '\n';
}

// Every command resolves through ${CLAUDE_PLUGIN_ROOT} so nothing points at the
// repo root, and every event/timeout pair comes from the host row. Matchers are
// case-sensitive and none are narrowed.
function emitHookMap(host) {
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/' + hook.script + '.js"',
        timeout: hook.timeout,
      }],
    }];
  }
  return JSON.stringify({
    description: 'jiahao verifier discipline - ' + host.label + ' plugin hook map',
    hooks: hooks,
  }, null, 2) + '\n';
}

// The MCP server's deps live in its own directory, so the registration runs
// node from there; the entry itself is vendored byte-verbatim.
function emitMcpJson(mcp) {
  return JSON.stringify({
    mcpServers: {
      'jiahao-mcp': {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/' + mcp.entry],
        cwd: '${CLAUDE_PLUGIN_ROOT}/' + path.posix.dirname(mcp.entry),
      },
    },
  }, null, 2) + '\n';
}

function emitRule(rule, profiles) {
  return '---\ndescription: ' + rule.description + '\nalwaysApply: true\n---\n' + profiles[rule.profile];
}

// The adapter map is a pure function of src/SKILL.md and HOSTS, so the --check
// golden layer regenerates it in memory and byte-compares against the committed
// files (regen-and-diff; no lock file, no snapshots).
function buildAdapters() {
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  const profiles = Object.assign(splitByProfile(skill), {
    // The `both` profile is the full body the rules version ships: a rules-only
    // host takes the same text in one file, with `alwaysApply: true` in front.
    both: skill.replace(/^---[\s\S]*?---\n/, ''),
  });

  // gsr rule headers are the structural latch for the generator
  // profile; fail the build (and the --check golden layer) on malformed rules.
  const gsrErrors = validateGsrHeaders(profiles.generator);
  if (gsrErrors.length > 0) {
    throw new Error('gsr header validation failed:' + String.fromCharCode(10) + gsrErrors.map(e => '  - ' + e).join(String.fromCharCode(10)));
  }

  const shapeProblems = hostShapeProblems(HOSTS);
  if (shapeProblems.length > 0) {
    throw new Error('host table is inconsistent:' + String.fromCharCode(10) + shapeProblems.map(p => '  - ' + p).join(String.fromCharCode(10)));
  }

  const adapters = {};

  // One pass per row. A plugin row is SELF-CONTAINED: the event scripts, their
  // static require() closure, src/SKILL.md, and the identity pin are vendored
  // byte-verbatim, so the plugin dir loads standalone and regen-diff keeps the
  // vendored copies honest. Seeds are the wired scripts (plus the MCP entry),
  // so a file cannot be wired without being shipped. A rules-only row
  // (manifest: null) emits the rule text and README only - no manifest, no
  // src/ copy, and by the shape check above, no hook map.
  for (const host of HOSTS) {
    const prefix = host.dir + '/';
    const dialect = dialectOf(host);
    // A rules-only row has no plugin scaffold at all; a plugin row takes its
    // manifest and hook-map paths (and command spelling) from its dialect.
    if (!isRulesOnlyDirectory(host)) {
      emitBundle(adapters, prefix, bundleSeeds(host), skill, host.mcp ? host.mcp.files : []);

      adapters[prefix + dialect.manifestPath] = dialect.emitManifest
        ? dialect.emitManifest({
          host: host,
          pkg: PKG,
          repository: PKG_REPOSITORY,
          description: (host.manifest || {}).description,
        })
        : emitPluginManifest(host);
      if (Object.keys(host.hooks).length) {
        adapters[prefix + dialect.hookMapPath] = dialect.emitHookMap
          ? dialect.emitHookMap(host)
          : emitHookMap(host);
      }
      if (dialect.marketplaceShelfPath) {
        // A bundle-local marketplace shelf (ZCode): the install command only
        // resolves plugin@marketplace names, and the shelf rides inside the
        // bundle so `marketplace add <this dir>` resolves exactly these bytes.
        adapters[prefix + dialect.marketplaceShelfPath] = dialect.emitMarketplaceShelf({
          host: host,
          pkg: PKG,
          repository: PKG_REPOSITORY,
          description: (host.manifest || {}).description,
        });
      }
      if (host.mcp) adapters[prefix + '.mcp.json'] = emitMcpJson(host.mcp);
    }
    for (const rule of host.rules) adapters[prefix + 'rules/' + rule.file] = emitRule(rule, profiles);
    adapters[prefix + 'README.md'] = host.readme();
  }

  // ---- marketplace manifest: the repo root is the marketplace ----
  // source is a path from the marketplace root, so it points at the plugin
  // directory ("./adapters/claude-code"), never at the repo root. The entry
  // carries no version: plugin.json is the authority and the host's validator
  // warns when both set it, so the one version lives in plugin.json (= PKG).
  if (!MARKETPLACE_HOST) throw new Error('the marketplace host is not a row in HOSTS');
  adapters['.claude-plugin/marketplace.json'] = JSON.stringify({
    name: 'jiahao',
    description: 'Prompt-as-mental-model verification discipline (rules version + plugin version)',
    owner: { name: 'Xxx91n' },
    plugins: [
      {
        name: 'jiahao',
        source: './' + MARKETPLACE_HOST.dir,
        description: 'Anti-false-completion verification discipline: verifier gate on Stop, profile injection on SessionStart.',
      },
    ],
  }, null, 2) + '\n';

  // ---- codex marketplace: the same repository, a second host's shelf ----
  // Codex reads `.agents/plugins/marketplace.json`, whose `source.path` resolves
  // from the marketplace root (the repo). The entry names the row's bundle and
  // carries no version: `.codex-plugin/plugin.json` is the authority.
  if (CODEX_DIALECT_HOSTS.length > 1) {
    throw new Error('at most one Codex-dialect host may own .agents/plugins/marketplace.json (found ' +
      CODEX_DIALECT_HOSTS.length + ')');
  }
  if (CODEX_MARKETPLACE_HOST) {
    adapters['.agents/plugins/marketplace.json'] = JSON.stringify({
      name: 'jiahao',
      plugins: [
        {
          name: 'jiahao',
          source: { source: 'local', path: './' + CODEX_MARKETPLACE_HOST.dir },
          category: 'Productivity',
          interface: { displayName: 'Jiahao' },
        },
      ],
    }, null, 2) + '\n';
  }

  // ---- rules version: the standard Agent Skills directory ----
  // The one output with no host-specific shape: `npx skills add <this repo>`
  // finds skills/<name>/SKILL.md on its own. A hand edit shows up as DRIFT in
  // --check.
  adapters[SKILL_DIR + '/SKILL.md'] = toShippedSkill(skill);

  return adapters;
}

// Two reasons, three source-only frontmatter pieces (the source keeps all three;
// AGENTS.md points here rather than repeating them).
//
// Discovery: src/SKILL.md is a SKILL.md in a directory the skills CLI scans, so
// the CLI can take the source for a shippable skill and install the runtime files
// lying next to it. `metadata.internal` hides it from discovery, and the source's
// `name` must not equal the shipped skill's, because asking for a skill BY NAME
// makes the CLI include internal skills anyway - measured on skills 1.7.4, where
// `add <repo> --skill jiahao` bound src/ while a plain `add <repo>` bound this
// generated twin. Neither trick survives shipping: a marker on the shipped file
// would hide the very file we mean to install.
//
// Spec shape: `argument-hint` is not a field the Agent Skills spec defines. The
// reference validator (agentskills/agentskills, skills-ref) allows only name /
// description / license / allowed-tools / metadata / compatibility and reported
// "Unexpected fields in frontmatter: argument-hint" against the shipped file; the
// looser skills CLI installed it regardless, so CLI leniency is not conformance.
function toShippedSkill(source) {
  return source
    .replace('name: ' + SOURCE_NAME + '\n', 'name: ' + SKILL_NAME + '\n')
    .replace('metadata:\n  internal: true\n', '')
    .replace('argument-hint: "[lite|full|ultra]"\n', '');
}

// CodeBuddy install manual + injection-surface ruling (spec
// section 5): the Verified / Declared-unverified tiering tables live here
// (disclosure surface - push discipline applies). Regenerated
// from this single source; edit the string, never the emitted file.
function codebuddyReadme() {
  return `# CodeBuddy Adapter (first Claude-Code-compatible path host)

This directory is a **self-contained plugin bundle**: CodeBuddy recognizes
\`.claude-plugin/\` and \`\${CLAUDE_PLUGIN_ROOT}\` verbatim (official
Claude-Code compatibility chapter; \`\${CODEBUDDY_PLUGIN_ROOT}\` takes
precedence when set). Copy the whole directory as the plugin root - the hook
scripts, their require() closure, \`src/SKILL.md\`, and the \`jiahao-mcp\`
server are vendored inside, so nothing resolves outside the bundle.

## Install (plugin path)

1. Copy this directory to the CodeBuddy plugin location, e.g.
   \`codebuddy plugin install <path-to-this-dir>\` (CLI) or the IDE plugin
   manager.
2. Enable the plugin explicitly - \`defaultEnabled: false\` is deliberate:
   plugin hooks bypass the \`allowUntrustedFrontmatterHooks\` gate and
   execute the moment the plugin is enabled.
3. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`, else \`/tmp\`):
   \`CONFIG="\${CLAUDE_CONFIG_DIR:-\${HOME:-/tmp}}"\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`. The file is shared by all agents using the same config
   directory; use separate config directories for concurrent profiles.
4. MCP server: run \`npm install --omit=dev\` inside the bundle's
   \`jiahao-mcp/\` once (the server source is vendored; dependencies are
   not). The bundle's \`.mcp.json\` registers it via
   \`\${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js\`.

Settings-tier alternative (CLI): merge the hook map into
\`.codebuddy/settings.json\` and copy the rules into \`.codebuddy/rules/\`.
The settings path is the one live-verified end to end (see tiering below).

## Hook behavior disclosure (read before enabling)

Plugin \`hooks/hooks.json\` entries are **exempt from the
\`allowUntrustedFrontmatterHooks\` gate** - unlike skill/agent frontmatter
(which is silently skipped unless trusted), plugin hooks execute as soon as
the plugin is enabled. Nothing load-bearing lives in frontmatter here by
design. Enabling this bundle installs seven hook points:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 + {decision:"block"} |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| InstructionsLoaded | hooks/jiahao-instructions-assert.js | integrity assertion: records both rules files' presence + sha256 to the telemetry log |
| PreToolUse | hooks/jiahao-pretool-guard.js | enforcement-surface guard: emits permissionDecision:"deny" (verifier profile) when a tool call targets injected rules / hook map / manifest / jiahao state-evidence files; every hit is a bypass-attempt record |

Timeouts stay within the 60s host budget (5/5/5/10/3/5/5s). Commands are
Git-Bash-compatible \`node\` invocations (cmd/PowerShell unsupported by the
host). Event matchers are case-sensitive - none are narrowed here.

**Rule-loading caveat.** The bundle ships both \`rules/jiahao-verifier.md\`
and \`rules/jiahao-generator.md\` with \`alwaysApply: true\`. The hook injects
the profile selected by \`.jiahao-profile\`, but if the host applies both
always-apply rule files, the two instruction sets coexist. Rule-level profile
selection is declared-unverified; the hook is the enforcement layer.

## Injection-surface ruling - Verified vs Declared-unverified

### Verified (CodeBuddy Code CLI 2.151.0, live-probed)

| Point | Evidence |
| --- | --- |
| \`.codebuddy/settings.json\` hooks: SessionStart / PreToolUse / PostToolUse | hook_event_name + hookSpecificOutput envelope live-verified |
| PreToolUse \`permissionDecision: "deny"\` envelope | verified deny shape on CLI |
| MCP server registration via \`.mcp.json\` | stdio connect + tool list verified |

### Declared-unverified (documented, not live-probed - pending-confirmation)

| Point | Status |
| --- | --- |
| IDE-side hook parity, incl. \`InstructionsLoaded\` firing | pending-confirmation |
| \`rules/\` non-\`alwaysApply\` load priority (both forms) | pending-confirmation |
| \`npx\`-bundled install vs \`codebuddy plugin install\` coexistence | pending-confirmation |
| Plugin-bundle path parity on CLI (documented compat, unprobed live) | pending-confirmation |

Unverified means **registered, not assumed**: each row has a
pending-confirmation entry in the taxonomy exception channel (
schema) with an expiry and an owner ratify/revoke point. Windows note: the
upstream \`\${CLAUDE_PLUGIN_ROOT}\` hook expansion bug
(anthropics/claude-code issues) may carry over - the settings-tier path is
the verified fallback.

## Trial boundary

The adapter is admitted; the external effectiveness trial (install +
Phase 0/1/2 in a real CodeBuddy environment) is an **owner action**, never
agent-executed. Protocol: \`.scratch/grill-t30/protocol.md\`; judgment lines:
\`bench/codebuddy-trial/judgment-lines.json\` (preregistered, immutable -
deviations ride errata records).
`;
}


// Qoder install manual. This directory is the C-tier IDE/CLI exit: the file is
// context, not a gate. Qoder Desktop (0.x workbench, incl. Qoder CN) reads the
// rules version's standard skill directory instead (#106); the two scopes are
// kept apart here so the rules path is not offered as a Desktop recipe again.
// The wording stays inside what was observed, and the test suite pins both the
// absence of hook registration and the absence of a blocking claim.
function qoderReadme() {
  return `# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit for Qoder IDE/CLI**. It carries one
rule file generated from \`src/SKILL.md\`, the same source as the rules version
(\`skills/jiahao/SKILL.md\`). It registers **no hooks**: there is no
\`hooks/hooks.json\`, no hook script, and no plugin manifest.

Qoder Desktop (the 0.x workbench) installs the standard skill directory from
the rules version, not this directory. The #106 check on Qoder CN Desktop
0.4.11 found \`~/.qoder/rules\` was not loaded; the international build was not
probed. See "Qoder Desktop" below.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). No Qoder hook was run for this exit; C tier is the spec-assigned
ceiling, not an observed result. A probe that answers the turn-end question is
a separate ticket.

## Qoder Desktop (0.x workbench, including Qoder CN)

Install the rules version into the host's standard skills directory:

\`\`\`bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN
npx skills add Xxx91n/jiahao -g -a qoder -y --copy      # international alias (not live-probed here)
\`\`\`

- Qoder CN lands \`~/.qoder-cn/skills/jiahao/SKILL.md\`. On 2026-10-31 the
  documented command exited 0 and the installed file's SHA-256 matched
  \`skills/jiahao/SKILL.md\` (Run A). A fresh session reported the skill visible
  in #106's Run B, a separate run not re-probed here. The run record is
  [qoder-desktop-install-2026-10-31.md](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md).
- The international alias writes \`~/.qoder/skills/jiahao/SKILL.md\` according to
  the skills CLI's host matrix; loading there was not live-probed here, so it
  stays declared-unverified.
- The install is plain text: no hook runs and nothing is enforced.

Do not copy this directory's rule file into a Qoder Desktop rules path. On
Qoder CN the config root is \`~/.qoder-cn\`; the \`~/.qoder\` tree belongs to the
other Qoder product line, and the #106 check found \`~/.qoder/rules\` unloaded
there. The international Desktop was not probed, so no rules path is offered
for it.

## Qoder IDE/CLI

The IDE/CLI line reads project rules from \`.qoder/rules/\`
(https://docs.qoder.com/zh/user-guide/rules). This directory is that exit:

1. Copy \`rules/jiahao.md\` into \`.qoder/rules/\` in the project.
2. Keep \`alwaysApply: true\` in the frontmatter. Qoder's rules documentation
   says rules without a \`paths\` or \`trigger\` selector load eagerly, and
   \`alwaysApply: true\` is one of the always-on forms (reference:
   https://docs.qoder.com/cli/memory; project-rules page:
   https://docs.qoder.com/zh/user-guide/rules).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The project-level path is the one Qoder's rules documentation names; a
user-level rules directory is not documented there and is not offered here.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no \`.jiahao-profile\`
switch here because no hook reads that file.

## Verification status

- Structural facts are pinned by tests: this directory contains only the rule
  file and this README, and no hook registration.
- Run A (2026-10-31) verified the install: exit 0, the file at
  \`~/.qoder-cn/skills/jiahao/SKILL.md\`, and a SHA-256 match with
  \`skills/jiahao/SKILL.md\`. That is the Desktop path, not this directory. The
  host version 0.4.11 and the fresh-session visibility are #106's Run B, a
  separate run not re-probed here. The install wrote to the operator's real
  \`~/.qoder-cn\` and overwrote an existing file with identical bytes, so no
  isolated config directory was used.
- Not live-probed: Qoder IDE/CLI rule loading. The behavior in the IDE/CLI
  steps is quoted from Qoder's documentation, not observed here.
- C tier is the probe list's open question, not a claim about what Qoder can do.

## What this exit does not do

- No hook registration, no subprocess, and no evidence file.
- No enforcement: the file is instructions only. This exit registers nothing
  that acts on a turn or a tool call.
- No installer for the IDE/CLI path: copy the file into Qoder's own rules
  directory. Qoder Desktop installs the rules version through the standard
  skills CLI instead.

## Update

- Qoder Desktop: re-run the same \`npx skills add\` command, then open a new
  session.
- Qoder IDE/CLI: re-copy \`rules/jiahao.md\` after a release.

The body is generated from \`src/SKILL.md\`; \`node scripts/build-adapters.js --check\`
keeps the committed copy identical to the generator output.
`;
}

// Claude Code install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function claudeCodeReadme() {
  return `# Claude Code Adapter (self-contained plugin)

This directory is a **self-contained Claude Code plugin**: the manifest
(\`.claude-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${CLAUDE_PLUGIN_ROOT}\`, so
nothing reads from the repository root.

The MCP server (\`jiahao-mcp/\` at the repo root) is deliberately not part of
this bundle: #59 keeps it in the repository but not as an install-and-work
adapter exit.

## Install

The repository root is the marketplace (\`.claude-plugin/marketplace.json\`,
whose single entry \`source\` points at \`./adapters/claude-code\`).

1. \`claude plugin marketplace add Xxx91n/jiahao\`
2. \`claude plugin install jiahao@jiahao\`
3. Enable the plugin. \`defaultEnabled: false\` asks the host not to enable on
   install; a host that does not read the field enables it anyway. Enabling
   is the opt-in. Once enabled, the bundled SessionStart hook writes
   \`.jiahao-active\` and the default profile is \`verifier\`, so the Stop gate
   arms from the first turn (hook code, not a live probe). \`/jiahao off\`
   removes the flag, which disarms the Stop gate, the reminder, and the
   PreToolUse guard; the SubagentStart injection is not flag-gated.
4. Switch profile if needed: \`echo generator > "$CLAUDE_CONFIG_DIR/.jiahao-profile"\`
   (or \`$HOME/.jiahao-profile\` when the env var is unset) for advisory-only.
   Deleting the file returns to the default \`verifier\`. Both flag files live
   in the config dir, never in the project directory.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Hook behavior disclosure (read before enabling)

Plugin \`hooks/hooks.json\` is auto-discovered at the plugin root, so these
hooks execute as soon as the plugin is enabled:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 is the host's block signal; the reason JSON goes to stdout |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (D5 parity) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map, the plugin manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or the jiahao state/evidence files; each hit is a bypass-attempt record |

Timeouts stay within the host's 60s per-hook budget (5/5/5/10/10/5/5s).
Commands are \`node\` invocations in shell form, the form the other hosts'
adapters already use.

There is no \`InstructionsLoaded\` hook here: that assertion hashes
\`rules/jiahao-*.md\`, and a Claude Code plugin has no plugin-level \`rules/\`
directory for the host to load.

## Write scope and network

- Hooks write only under the Claude config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`): \`.jiahao-active\`, \`.jiahao-evidence/\` (plus the
  \`.jiahao-evidence.keys\` sidecar and \`pairer-instrument\` shadow records the
  Stop lane may append), \`.jiahao-pretool.jsonl\`, and the sentinel state and
  lock files \`.jiahao-sentinel.<hook>(.lock)\`. Nothing inside the repo or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by \`test/plugin-bundles.test.js\` (structure, run once per host
row) and \`test/claude-code-plugin.test.js\` (the bundled Stop gate and the
SessionStart injection): both manifests parse, the plugin version and license
come from \`package.json\`, the marketplace \`source\` resolves to this directory,
every referenced file is emitted by the generator (\`--check\` pins the emitted
set to disk), every hook command stays inside \`\${CLAUDE_PLUGIN_ROOT}\`, and no
vendored relative \`require()\` escapes the bundle. The bundled Stop gate is
spawned from a temp materialization of the generator output and blocks (exit 2)
when the evidence chain is empty.

**Not yet live-probed**: install through \`claude plugin\`, SessionStart
injection, and a real blocked false-completion are owner actions in #64. This
adapter is admitted on the documented host contract; it does not claim a live
run.
`;
}

// GitHub Copilot CLI install manual + dialect disclosure. Regenerated from this
// single source; edit the string, never the emitted file.
function copilotCliReadme() {
  return `# GitHub Copilot CLI Adapter (self-contained plugin)

This directory is a **self-contained plugin for GitHub Copilot CLI**: the
manifest (\`plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook scripts
and their \`require()\` closure, and \`src/SKILL.md\` (the rules body the
sessionStart hook injects) are vendored inside. Every hook command resolves
through \`$PLUGIN_ROOT\` - Copilot CLI hands plugin hooks \`PLUGIN_ROOT\` (and
also \`COPILOT_PLUGIN_ROOT\` / \`CLAUDE_PLUGIN_ROOT\`) pointing at the installed
plugin - so nothing reads from the repository root.

Tier: **A (verified 2026-10-30, Copilot CLI 1.0.105)**. A live turn was
blocked by \`agentStop\`: the false completion claim continued only after the
gate printed \`{decision:"block"}\` on exit 0. Exit 2 was logged as a failed
hook and did not block. Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install

1. \`copilot plugin install <path-to-this-dir>\` (native command; the
   \`/plugin install\` slash command does the same inside a session). Live
   probe: the install ran the bundled hooks. The CLI warns that direct
   installs are deprecated in favour of marketplace installs.
2. The plugin is enabled on install (\`copilot plugin list --json\` reports
   \`enabled: true\`); a direct install needed no \`enabledPlugins\` entry.
   Project-level settings hooks need folder trust in prompt mode:
   \`--trust-folder\` (or \`COPILOT_ALLOW_ALL=true\`); the live probe used
   \`--trust-folder\`.
3. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`, else \`/tmp\`):
   \`CONFIG="\${CLAUDE_CONFIG_DIR:-\${HOME:-/tmp}}"\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.

Install and upgrade are the host's own plugin commands; the repository root is
never a plugin entry. The install path was live-probed with a local plugin
directory on 1.0.105.

## Hook behavior disclosure (read before enabling)

| Event | Script | Behavior |
| --- | --- | --- |
| sessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| subagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| userPromptSubmitted | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| agentStop | hooks/jiahao-verdict-gate.js | verifier gate: prints \`{decision:"block", reason}\` and exits 0; the zero exit is required for the decision to be honored (exit 2 is non-blocking; the host logs it as failed) |
| sessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay within the host's default 30s budget (10/10/10/30/10s).

## Dialect: what differs from the Claude-shaped hosts

Two config-side differences live in \`scripts/hosts/copilot.js\` and in this
config. The host's block channel is the decision field; the shared gate prints
it and exits 0 for this host (see the dialect bullets below). The camelCase
payload names (\`sessionId\`, \`agentName\`) are
folded into the shared shape by \`hooks/jiahao-runtime.js\`, the hook-side
adapter file that already owns \`detectHost()\` and the per-host envelopes. The
judgment logic is the same \`hooks/jiahao-verdict-gate.js\` every host runs.

- **Event names are camelCase** (\`sessionStart\`, \`agentStop\`), not
  \`SessionStart\` / \`Stop\`. A copied PascalCase map is a config this host
  ignores.
- **Each entry carries \`bash\` and \`powershell\` branches.** The host picks one
  by operating system; \`$PLUGIN_ROOT\` and \`$env:PLUGIN_ROOT\` expand to the
  installed plugin directory. There is no \`command\` key here.
- **The block channel is the decision field on a zero exit.** \`agentStop\` and
  \`subagentStop\` honor \`{decision:"block", reason}\` on stdout; this bundle
  wires \`agentStop\` only. The live probe showed exit 2 is logged as a failed
  hook and ends the turn without a continuation even when the decision field is
  on stdout, so the gate exits 0 for this host. Any other non-zero code is
  fail-open.
- **The cap is 8 consecutive block continuations** (live-probed: 9
  \`agentStop\` invocations and 9 assistant messages; the ninth block was not
  continued and the CLI ended). \`agentStop\` receives \`stop_hook_active\`; the
  gate lets that pass, so a normal block continues once and then finishes.

## Live probe (2026-10-30, Copilot CLI 1.0.105, win32)

The probe used an isolated \`COPILOT_HOME\`, a real prompt-mode session
(\`copilot -p ... --trust-folder\`), and the installed bundle. Commands and
captured output live in
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

| Point | Result |
| --- | --- |
| A real turn-end block (\`agentStop\` + \`decision:"block"\`) | **Verified**: the model's \`任务完成，已验证。\` continued only after the gate's \`decision:"block"\`; the block reason arrived as the next user message |
| Exit 2 as the block channel | **Refuted**: exit 2 ended the turn without a continuation; the gate now exits 0 for Copilot |
| Native \`copilot plugin install\` reading \`plugin.json\` + \`hooks/hooks.json\` | **Verified**: the install ran the bundled sessionStart/agentStop hooks |
| \`.claude/settings.json\` | **Read**: both SessionStart and Stop entries ran; a hand-written Claude-schema Stop block (exit 0) also continued the turn. The jiahao bundle installs as a Copilot plugin, not through this file |
| \`COPILOT_PLUGIN_DATA\` for plugin hooks | **Set**: observed in the plugin hook environment, so \`detectHost()\` selects the Copilot envelope |
| camelCase payload (\`sessionId\`) | **Observed** in the plugin hook input; normalized by \`hooks/jiahao-runtime.js\` |
| 8 consecutive block continuations | **Confirmed**: 8 continuations, then the CLI ended; the ninth block was not continued |
| \`userPromptSubmitted\` output reaches the model | Not probed here; the mode reminder is advisory and does not gate |
| \`enabledPlugins\` in \`.github/copilot/settings.json\` / \`~/.copilot/settings.json\` | Not needed for a direct install (enabled on install); marketplace install not probed |
| \`sessionEnd\` fires for plugin hooks | **Verified**: the final session's event log contains \`sessionEnd\` hook events |

## Write scope and network

- Hooks write only under the Claude config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`), the same flag and evidence files every host uses:
  \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\` (plus the
  \`.jiahao-evidence.keys\` sidecar and \`pairer-instrument\` shadow records),
  \`.jiahao-pretool.jsonl\`, and the sentinel state and lock files. Nothing
  inside the repository or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
`;
}

// Codex CLI install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function codexReadme() {
  return `# Codex CLI Adapter (self-contained plugin, A tier, live-probed 2026-10-30)

This directory is a **self-contained Codex CLI plugin**: the manifest
(\`.codex-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${PLUGIN_ROOT}\`, so nothing
reads from the repository root.

**Capability tier: A (verified 2026-10-30, codex-cli 0.163.0).** A live
prompt-mode session continued a false completion claim only after \`Stop\`
answered \`{decision:"block"}\` on exit 0. The exit-2 + stderr path documented
by the host source ended the turn without a continuation in this build.
Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install (host-native commands)

The repository root is also a Codex marketplace
(\`.agents/plugins/marketplace.json\`, whose single \`source.path\` points at
\`./adapters/codex\`).

1. \`codex plugin marketplace add Xxx91n/jiahao\`
2. \`codex plugin add jiahao --marketplace jiahao\`
3. Review and trust the plugin's hook commands once — Codex skips an untrusted
   hook silently (\`/hooks\`). Live probe: an untrusted plugin's hooks did not
   run in \`codex exec\`. Unattended automation either persists that trust (the
   \`/hooks\` flow; source-verified, not step-by-step probed) or passes
   \`--dangerously-bypass-hook-trust\` after vetting the source.
4. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`, else \`/tmp\`):
   \`CONFIG="\${CLAUDE_CONFIG_DIR:-\${HOME:-/tmp}}"\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.

Codex 0.163.0 enables hooks by default: \`codex features list\` reports
\`hooks stable true\`, and a fresh \`CODEX_HOME\` with no \`config.toml\` ran the
plugin's hooks. No \`[features] hooks\` switch is part of this recipe. The trust
step above is separate and required: the probe saw untrusted hooks skipped
silently in \`codex exec\`. If an older build refuses the plugin's hooks, look
for a \`[features] hooks\` switch in \`$CODEX_HOME/config.toml\` rather than
copying a flag block from here.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Configuration template

\`hooks/hooks.json\` is the whole template. Each entry names the script to run
and the platform name \`codex\` passed to it; there is no decision logic in the
file. The platform name is what the hook uses to pick Codex's output envelope
(the same branch \`hooks/jiahao-runtime.js\` already has), so the template does
not re-implement host detection.

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout, with the same reason on stderr for host logs; blocks an empty evidence chain (verifier profile). Exit 2 did not block in the 0.163.0 live probe |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (parity; Stop was live-probed, SubagentStop was not separately probed) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay inside the host budget (5/5/5/10/10/3s; Codex caps
\`SessionEnd\` at 3s). Event names are the host's own PascalCase set.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`): \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\` (plus
  its sidecar and pairer shadow records), \`.jiahao-pretool.jsonl\`, and the
  sentinel state and lock files. Nothing inside the repo or this plugin
  directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by \`test/plugin-bundles.test.js\` (structure, run once per host
row) and \`test/codex-adapter.test.js\` (the Codex envelope and the bundled Stop
gate, spawned as a subprocess from a temp materialization of the generator
output): the manifest parses, its version and license come from
\`package.json\`, the marketplace \`source.path\` resolves to this directory,
every referenced file is emitted (\`--check\` pins the emitted set to disk),
every hook command stays inside \`\${PLUGIN_ROOT}\`, and no vendored relative
\`require()\` escapes the bundle.

**Live probe (2026-10-30, codex-cli 0.163.0, win32)**: \`codex plugin
marketplace add <local path>\` and \`codex plugin add jiahao --marketplace
jiahao\` installed the bundle. Without persisted trust the hooks were skipped
in \`codex exec\` and the false claim passed; with
\`--dangerously-bypass-hook-trust\` the Stop gate answered
\`{decision:"block"}\` and the next model turn quoted the reason. The
interactive \`/hooks\` trust-and-restart flow itself was not step-by-step
probed. Commands and captured output live in
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

The hook's own exit code, stdout, and stderr were recorded by a wrapper, not
read from the host log: [\`probes/codex-hook-wrapper.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/codex-hook-wrapper.js)
runs the installed gate, appends one JSON line per invocation, then replays
the output and exits with the same code. Reuse it when probing a new build;
the surrounding evidence layout is described in
[\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).

Loop guard: an unconditional exit-0 JSON block in a throwaway user Stop hook
continued for 785 runs (786 assistant messages, 33M input tokens) before the
host completed the turn; no small host cap like Copilot's 8 appeared. The
bundled gate is not unconditional - it passes when the host sends
\`stop_hook_active\` on the continuation - so the block happens once per turn.
`;
}

// ZCode install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function zcodeReadme() {
  return `# ZCode Adapter (self-contained plugin, A tier, live-probed 2026-10-31)

This directory is a **self-contained ZCode plugin**: the manifest
(\`.zcode-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${ZCODE_PLUGIN_ROOT}\`, so
nothing reads from the repository root.

**Capability tier: A (verified 2026-10-31, ZCode 3.16.2, win32).** A live
desktop session's turn end was blocked by the Stop hook answering
\`{decision:"block"}\` on exit 0, and the block reason arrived back as the
next turn's context. Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install (host-native commands)

The bundle carries its own marketplace shelf (\`marketplace.json\`, with
\`source: "."\` pointing at itself), because ZCode's install command only
resolves \`plugin@marketplace\` names - a direct directory install is refused
("Plugin not found in any marketplace", CLI 0.17.0, probed 2026-10-31).

1. \`zcode plugins marketplace add <path-to-this-dir>\` - the shelf inside the
   bundle is the marketplace; exit 0 reports \`Added marketplace jiahao-zcode
   (1 plugins)\`.
2. \`zcode plugins install jiahao@jiahao-zcode\` - installs and enables in one
   step; \`zcode plugins list\` reports \`hooks: 4\` (the host parses
   \`hooks/hooks.json\` itself; the manifest carries no hooks pointer). The
   cached hook map, manifest, and gate script are byte-identical to this
   bundle (diff-verified 2026-10-31).
3. \`zcode plugins validate <path-to-this-dir>\` is the host's own manifest
   check; it accepts this bundle (exit 0).
4. Do NOT point \`marketplace add\` at the repository root: the host then
   resolves \`.claude-plugin/marketplace.json\` and installs the **Claude
   Code** bundle instead (probed 2026-10-31 - and its parser drops the
   unsupported events of a Claude-shaped map silently, 7 events down to
   \`hooks: 4\`).
5. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`, else \`/tmp\`):
   \`CONFIG="\${CLAUDE_CONFIG_DIR:-\${HOME:-/tmp}}"\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.
6. Restart or open a new session. Hook configuration — plugin or
   config-file — is read at session start; a map added mid-session did not
   fire until a restart (live probe, 2026-10-31).

Upgrade is \`zcode plugins update\` (the subcommand exists; not live-probed).
Uninstall is \`zcode plugins uninstall jiahao@jiahao-zcode --force\`
(non-interactive shells need \`--force\`), then
\`zcode plugins marketplace remove jiahao-zcode\`. Install, upgrade, and
uninstall are the host's own plugin commands; the repository root is never a
plugin entry.

## Hook behavior disclosure (read before enabling)

ZCode's event set is exactly seven (\`SessionStart\`, \`UserPromptSubmit\`,
\`PreToolUse\`, \`PermissionRequest\`, \`PostToolUse\`, \`PostToolUseFailure\`,
\`Stop\`). \`SubagentStart\`, \`SubagentStop\`, and \`SessionEnd\` do not exist,
so this bundle wires no sweep hook: the sentinel reconcile sweep does not run
on this host.

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via hookSpecificOutput.additionalContext |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout; blocks an empty evidence chain (verifier profile) |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map, the plugin manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or the jiahao state/evidence files; each hit is a bypass-attempt record |

Timeouts stay within the host's default 60s budget (5/5/10/5s). Commands are
\`node\` invocations in shell form; the platform name \`zcode\` is passed as the
script's first argument, which is what selects this host's envelope and exit
codes in \`hooks/jiahao-runtime.js\`.

## Dialect: what differs from the Claude-shaped hosts

- **\`\${ZCODE_PLUGIN_ROOT}\` is the plugin-root variable.** ZCode also
  expands \`\${CLAUDE_PLUGIN_ROOT}\` for plugin hooks; the template uses the
  native spelling so nothing depends on the compatibility name.
- **Payloads carry both spellings.** \`session_id\`/\`sessionId\`,
  \`hook_event_name\`/\`hookEventName\`, and
  \`stop_hook_active\`/\`stopHookActive\` were all present on live fires; the
  shared normalizer folds them into the Claude shape.
- **The block channel is the decision field on a zero exit.** A live turn
  continued only after Stop answered \`{decision:"block"}\` on exit 0. The
  gate exits 0 for this host.
- **Config-tier alternative.** Hooks can also be registered without a plugin
  in the \`hooks\` block of \`~/.zcode/cli/config.json\` (requires
  \`hooks.enabled: true\`) or a workspace \`.zcode/config.json\`.
  Configuration hooks have no trust gate. A config-tier install carries no
  argv, so \`detectHost()\` falls back to the \`ZCODE_SESSION_ID\` environment
  marker.

## Live probe (2026-10-31, ZCode 3.16.2, win32)

The probe ran in a real desktop session in this repository's workspace, with
a throwaway workspace hook config and a logging wrapper standing in for the
gate. Commands and captured payloads live in
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

| Point | Result |
| --- | --- |
| A real turn-end block (Stop + \`decision:"block"\`) | **Verified**: the real bundled gate blocked a session's turn end (verifier profile, empty evidence chain); the reason arrived as the next turn's context |
| Exit 2 as the block channel | **Verified, refuted as the gate's channel**: exit 2 also blocked, but with the host's generic "Hook blocked execution" and no reason; the gate keeps exit 0 + the decision field, which carries the reason |
| \`stop_hook_active\` on the continuation | **Verified**: \`true\` on every post-block Stop (both spellings); the gate's pass-through needs no change |
| Consecutive-block cap | **Verified**: three consecutive block continuations were honored (fires #1-#4 in \`zcode-stop-fires.jsonl\`); the fourth consecutive block was followed by the turn ending without a further continuation (the session user was present at that boundary) |
| Payload spellings | **Verified**: both snake_case and camelCase on every fire |
| Hook config read at session start | **Verified**: mid-session config did not fire until restart |
| \`zcode plugins validate\` on the bundle | **Verified**: exit 0, "Plugin manifest is valid" |
| Install through the bundle's own marketplace shelf | **Verified**: \`marketplace add <this dir>\` + \`plugins install jiahao@jiahao-zcode\` installed the bundle \`[enabled]\`; \`plugins list\` reports \`hooks: 4\`; the cached hook map, manifest, and gate are byte-identical to the generated bundle |
| Repository root as the marketplace | **Refuted for this bundle**: the host resolved \`.claude-plugin/marketplace.json\` and installed the Claude Code bundle |
| Direct \`zcode plugins install <dir>\` | **Refuted**: refused with "Plugin not found in any marketplace" |
| Plugin hooks firing in a live session (post-restart) | declared-unverified: the installed bytes are identical to the probed bundle and the block channel is host-level, but a plugin-spawned hook was not observed in a restarted session |
| SessionStart \`additionalContext\` injection | declared-unverified: the envelope follows the documented strict schema; the injection itself was not observed |

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`): \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\`
  (plus its sidecar and pairer shadow records), \`.jiahao-pretool.jsonl\`, and
  the sentinel state and lock files. Nothing inside the repository or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by \`test/plugin-bundles.test.js\` (structure, run once per host
row) and \`test/zcode-adapter.test.js\` (the ZCode envelope and the bundled
Stop gate, spawned as a subprocess from a temp materialization of the
generator output): the manifest parses, its version and license come from
\`package.json\`, every referenced file is emitted (\`--check\` pins the emitted
set to disk), every hook command stays inside \`\${ZCODE_PLUGIN_ROOT}\`, and no
vendored relative \`require()\` escapes the bundle.

The hook's own exit code, stdin, and stdout are recorded by the same wrapper
pattern the Codex probe used:
[\`probes/codex-hook-wrapper.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/codex-hook-wrapper.js)
runs the real hook, appends one JSON line per invocation, then replays the
output and exits with the same code. The evidence layout is described in
[\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
`;
}

// Minimal zero-dependency unified diff (LCS over lines, 3 lines of context).
function unifiedDiff(rel, oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length;
  const n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push(new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push([' ', a[i], i + 1, j + 1]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i], i + 1, 0]); i++; }
    else { ops.push(['+', b[j], 0, j + 1]); j++; }
  }
  while (i < m) { ops.push(['-', a[i], i + 1, 0]); i++; }
  while (j < n) { ops.push(['+', b[j], 0, j + 1]); j++; }

  const out = ['--- a/' + rel, '+++ b/' + rel];
  const CTX = 3;
  const ranges = [];
  for (let t = 0; t < ops.length; t++) {
    if (ops[t][0] === ' ') continue;
    const lo = Math.max(0, t - CTX);
    const hi = Math.min(ops.length - 1, t + CTX);
    if (ranges.length && lo <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], hi);
    } else {
      ranges.push([lo, hi]);
    }
  }
  for (const [lo, hi] of ranges) {
    let aStart = 0;
    let bStart = 0;
    let aCount = 0;
    let bCount = 0;
    for (let t = lo; t <= hi; t++) {
      const op = ops[t];
      if (aStart === 0 && op[2]) aStart = op[2];
      if (bStart === 0 && op[3]) bStart = op[3];
      if (op[0] !== '+') aCount++;
      if (op[0] !== '-') bCount++;
    }
    out.push('@@ -' + (aStart || 1) + ',' + aCount + ' +' + (bStart || 1) + ',' + bCount + ' @@');
    for (let t = lo; t <= hi; t++) out.push(ops[t][0] + ops[t][1]);
  }
  return out.join('\n');
}

// Tracked files in a generated directory that the generator does not produce
// on purpose. The value is the reason; an entry without one fails --check, and
// so does an entry that stops being tracked, so the list cannot rot into a
// hiding place.
const ORPHAN_ALLOWLIST = {
  // 'adapters/example/legacy.js': 'why this file has no generator source',
};

// The generator knows only what it produces; the tracked set is the other
// half of the comparison. Reuse the repo's index-only enumeration base
// (src/shared/tracked-surface.js) so this check and the gates cannot drift
// apart on what "tracked" means - and so untracked install artifacts inside
// the codebuddy bundle are never counted as generated files.
function listTrackedGeneratedFiles() {
  let all;
  try {
    all = listTrackedPaths(root);
  } catch (e) {
    const detail = e.stderr ? String(e.stderr).trim() : e.message;
    throw new Error('cannot list tracked files (git ls-files failed: ' + detail + ')');
  }
  return all.filter(rel => GENERATED_DIRS.some(dir => rel.startsWith(dir))).sort();
}

// Both directions of the invariant: every tracked file is generated or
// allowlisted, and every generated file is tracked. Either half alone can
// print an "accounted for" line that does not add up; an allowlisted path the
// generator also produces would double-count in that line.
function auditTrackedSet(generated, tracked, allowlist) {
  const generatedSet = new Set(Object.keys(generated));
  const allowSet = new Set(Object.keys(allowlist));
  const trackedSet = new Set(tracked);
  const problems = [];
  for (const rel of tracked) {
    if (!generatedSet.has(rel) && !allowSet.has(rel)) problems.push({ kind: 'orphan', rel: rel });
  }
  for (const rel of generatedSet) {
    if (!trackedSet.has(rel)) problems.push({ kind: 'untracked', rel: rel });
  }
  for (const rel of allowSet) {
    if (!trackedSet.has(rel)) problems.push({ kind: 'staleAllowlist', rel: rel });
    else if (generatedSet.has(rel)) problems.push({ kind: 'redundantAllowlist', rel: rel });
    else if (typeof allowlist[rel] !== 'string' || !allowlist[rel].trim()) {
      problems.push({ kind: 'allowlistReason', rel: rel });
    }
  }
  return problems;
}

// Regen-and-diff: regenerate in memory, byte-compare with committed files,
// then assert the tracked set is fully accounted for. kind: error = git
// enumeration failed - fail closed rather than skip the check.
function checkAll() {
  const generated = buildAdapters();
  const failures = [];
  for (const rel of Object.keys(generated)) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) { failures.push({ kind: 'missing', rel: rel }); continue; }
    const actual = fs.readFileSync(full, 'utf8');
    if (actual !== generated[rel]) {
      failures.push({ kind: 'diff', rel: rel, detail: unifiedDiff(rel, actual, generated[rel]) });
    }
  }

  let tracked = [];
  try {
    tracked = listTrackedGeneratedFiles();
    failures.push(...auditTrackedSet(generated, tracked, ORPHAN_ALLOWLIST));
  } catch (e) {
    failures.push({ kind: 'error', rel: GENERATED_DIRS.join(' + '), detail: e.message });
  }

  return {
    failures: failures,
    generated: Object.keys(generated).length,
    tracked: tracked.length,
    allowlisted: Object.keys(ORPHAN_ALLOWLIST).length,
  };
}

// The target root is required. The CLI passes the repo; a test passes a temp
// directory. Without the argument an in-test call would silently rewrite the
// workspace, which is what #66 removed - fail closed instead of guessing.
function writeAll(outRoot) {
  if (!outRoot) throw new Error('writeAll needs an output root; tests write a temp directory, never the workspace');
  const adapters = buildAdapters();
  let count = 0;
  for (const [rel, content] of Object.entries(adapters)) {
    const full = path.join(outRoot, rel.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, { encoding: 'utf8' });
    count++;
  }
  return count;
}

const FAILURE_REPORT = {
  error: { label: 'ERROR' },
  missing: { label: 'MISSING' },
  diff: { label: 'DRIFT' },
  orphan: {
    label: 'ORPHAN',
    hint: 'tracked in a generated directory (' + GENERATED_DIRS.join(' / ') + ') but not produced by the generator; delete it or declare it in ORPHAN_ALLOWLIST (scripts/build-adapters.js) with a reason',
  },
  untracked: { label: 'UNTRACKED', hint: 'produced by the generator but not tracked; git add it' },
  staleAllowlist: { label: 'STALE ALLOWLIST', hint: 'listed in ORPHAN_ALLOWLIST but not tracked in a generated directory' },
  redundantAllowlist: { label: 'REDUNDANT ALLOWLIST', hint: 'listed in ORPHAN_ALLOWLIST but the generator produces it; drop the entry' },
  allowlistReason: { label: 'ALLOWLIST REASON', hint: 'listed in ORPHAN_ALLOWLIST without a reason' },
};

function main() {
  if (process.argv.includes('--check')) {
    const result = checkAll();
    if (result.failures.length > 0) {
      for (const f of result.failures) {
        const report = FAILURE_REPORT[f.kind];
        console.error(report.label + ': ' + f.rel + (report.hint ? ' (' + report.hint + ')' : ''));
        if (f.detail) console.error(f.detail);
      }
      const regenDrift = result.failures.some(f => f.kind === 'missing' || f.kind === 'diff');
      if (regenDrift) {
        console.error('\nRun: node scripts/build-adapters.js to regenerate drifted files.');
      }
      process.exit(1);
    }
    console.log('All ' + result.tracked + ' tracked generated files accounted for: ' +
      result.generated + ' generated + ' + result.allowlisted + ' allowlisted (regen-diff clean)');
    process.exit(0);
  }
  const count = writeAll(root);
  console.log('Generated ' + count + ' files from src/SKILL.md');
}

if (require.main === module) main();

module.exports = {
  buildAdapters, unifiedDiff, checkAll, writeAll, auditTrackedSet, SKILL_DIR, SOURCE_NAME,
  HOSTS, RETIRED_HOSTS, MARKETPLACE_HOST, CODEX_MARKETPLACE_HOST, hostShapeProblems, bundleSeeds,
  dialectOf, hookEntryCommands, isRulesOnlyDirectory,
};
