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
const { PLATFORMS } = require('../hooks/jiahao-runtime');
const { listTrackedPaths } = require('../src/shared/tracked-surface');

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

// ---- per-host dialect ----
//
// Where a host puts the manifest, which variable expands to the plugin root, and
// whether its own config passes a platform name to the hook are all host facts,
// not decision logic. They live here as data so a bundle cannot grow a second
// flavour: the emitter writes one shape, and the tests read the row instead of
// hardcoding Claude's.
//
// `platformArg` is the name the host's config template appends to the hook
// command (e.g. `... jiahao-verdict-gate.js codex`). hooks/jiahao-runtime.js
// already knows every platform name; passing it lets the template say which host
// it is instead of making the hook guess from the environment. A host whose
// config cannot pass an argument leaves it null and keeps the env probe.
const CLAUDE_DIALECT = {
  manifestDir: '.claude-plugin',
  pluginRootVar: 'CLAUDE_PLUGIN_ROOT',
  // Codex requires manifest component paths to be './'-prefixed; the
  // Claude-compatible manifests write them bare.
  manifestPathPrefix: '',
  platformArg: null,
  defaultEnabled: true,
};

function dialectOf(host) {
  return Object.assign({}, CLAUDE_DIALECT, (host && host.dialect) || {});
}

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
// conclusion, not a permanent property, and the published wording stays
// "A 档候选" until a probe watches a real turn get blocked.
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
    name: 'codex',
    label: 'Codex CLI',
    dir: 'adapters/codex',
    tier: 'A',
    turnEnd: 'Stop',
    // Spec #74 reserves "会拦" for a watched live block. Codex documents a Stop
    // hook that receives stop_hook_active and answers with JSON on stdout, but
    // the sources disagree on whether Stop blocks the turn or only records it
    // (docs/research/hook-distribution-2026-10-29.md, probe list). Until #80
    // watches one, this row is an A-tier CANDIDATE.
    provenance: 'Codex CLI plugin hooks contract (openai/plugins .codex-plugin + hooks/hooks.json, read 2026-10-30): Stop registered; live turn-end block NOT observed - A 档候选 pending #80',
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
    // Codex's plugin manifest is `.codex-plugin/plugin.json`; the host expands
    // ${PLUGIN_ROOT} in hook commands and passes PLUGIN_DATA to the hook process
    // (the name hooks/jiahao-runtime.js already branches on).
    dialect: {
      manifestDir: '.codex-plugin',
      pluginRootVar: 'PLUGIN_ROOT',
      manifestPathPrefix: './',
      platformArg: 'codex',
      defaultEnabled: false,
    },
    manifest: {
      description: 'Verification discipline for Codex CLI: profile injection at session start, verdict gate at turn end (A 档候选, live probe pending). Self-contained plugin.',
      author: { name: 'Xxx91n' },
      // Codex does not auto-discover the hook map; the manifest names it (the
      // dialect adds the required './' prefix).
      hooks: 'hooks/hooks.json',
    },
    autoDiscovered: [],
    mcp: null,
    rules: [],
    readme: codexReadme,
  },
  {
    name: 'qoder',
    label: 'Qoder',
    dir: 'adapters/qoder',
    tier: 'C',
    turnEnd: null,
    // Spec #74's probe list still owns Qoder's turn-end question. Until a probe
    // answers it, the table records what was observed: nothing (no host build
    // was recorded for this row). The exit is rules only, so there is no hook
    // that could be mistaken for enforcement.
    provenance: 'Qoder (host build not recorded; spec #74 probe list, 2026-10-30): turn-end behavior unprobed, no live run observed; C tier (rules only) is the spec-assigned ceiling',
    // A manifest-less row IS the rules-only exit: no plugin manifest, no
    // vendored scripts, no src/ copy. The one rule file carries the same body
    // as the rules version; see qoderReadme for the install surface.
    hooks: {},
    manifest: null,
    autoDiscovered: [],
    mcp: null,
    rules: [
      { file: 'jiahao.md', profile: 'both', description: 'Jiahao anti-false-completion discipline (rules only)' },
    ],
    readme: qoderReadme,  },
];

// The marketplace is the repository root, and its single entry is the plugin a
// `claude plugin install jiahao@jiahao` lands on. Kept as the row itself so the
// generator and the test read its dir instead of repeating a name lookup.
const MARKETPLACE_HOST = HOSTS.find(host => host.name === 'claude-code');

// Codex reads its own marketplace file (`.agents/plugins/marketplace.json`);
// the entry points at the same bundle the row describes. Exactly one row may
// own that file: two Codex-dialect rows would otherwise leave one silently
// unshelved, and the build catches it instead.
const CODEX_DIALECT_HOSTS = HOSTS.filter(host => dialectOf(host).manifestDir === '.codex-plugin');
const CODEX_MARKETPLACE_HOST = CODEX_DIALECT_HOSTS.length === 1 ? CODEX_DIALECT_HOSTS[0] : null;

// Retired, and not to be re-added without a self-contained directory and tests:
// aider, cline, cursor, instruction-tier, opencode, and windsurf were
// instruction-only copies, replaced by the standard rules directory
// (skills/jiahao/); copilot and mcp registered hooks or notes without shipping
// the scripts next to them, so a copied directory could not run. The MCP server
// itself stays at jiahao-mcp/. check-drift refuses a directory for any of these
// names, so #62's convergence cannot quietly come back.
//
// codex left this list in #77: it is a self-contained plugin bundle again,
// generated from the host table and covered by the structure tests. qoder left
// it in #79: it ships a generated rules-only directory (manifest null, no
// hooks) with the no-registration assertion in the tests.
const RETIRED_HOSTS = ['aider', 'cline', 'copilot', 'cursor',
  'instruction-tier', 'mcp', 'opencode', 'windsurf'];

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

    // The dialect is data the emitter trusts, so a malformed one fails the
    // build instead of producing a bundle no host can read.
    const dialect = dialectOf(host);
    if (!/^\.[a-z0-9-]+-plugin$/.test(dialect.manifestDir || '')) {
      problems.push(label + ': dialect.manifestDir must be a dotted *-plugin directory');
    }
    if (!/^(?:[A-Z][A-Z0-9]*_)*PLUGIN_ROOT$/.test(dialect.pluginRootVar || '')) {
      problems.push(label + ': dialect.pluginRootVar must be an UPPER_SNAKE *_PLUGIN_ROOT variable');
    }
    if (dialect.platformArg !== null && !PLATFORMS.includes(dialect.platformArg)) {
      // A template may only pass a name the hook layer has a shape for; the
      // lowercase check alone let a typo fall back to the Claude branch.
      problems.push(label + ': dialect.platformArg "' + dialect.platformArg + '" is not one of ' + PLATFORMS.join('/'));
    }
    if (!['', './'].includes(dialect.manifestPathPrefix)) {
      problems.push(label + ': dialect.manifestPathPrefix must be "" or "./"');
    }
    // defaultEnabled is a Claude-compatible manifest field; a host whose
    // manifest lives elsewhere must not claim it.
    if (dialect.defaultEnabled && dialect.manifestDir !== '.claude-plugin') {
      problems.push(label + ': dialect.defaultEnabled belongs to the .claude-plugin manifest only');
    }
    // Manifest keys that name a component must resolve inside the bundle.
    for (const key of ['hooks', 'mcpServers']) {
      const rel = (host.manifest || {})[key];
      if (rel === undefined) continue;
      if (typeof rel !== 'string' || rel.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(rel)) {
        problems.push(label + ': manifest.' + key + ' must be a bundle-relative path');
      }
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
    if (typeof host.readme !== 'function') problems.push(label + ': readme must be a function that returns the bundle README');
  }
  return problems;
}

// The manifest carries the package version and repository, not copies of them:
// a second hardcoded number is a version assertion that can rot (spec: one
// version), and the bundles cannot disagree about where they came from.
// `defaultEnabled` is emitted only for the Claude-compatible manifest: it is
// that host family's opt-in enable field, not a portable one.
function emitPluginManifest(host) {
  const dialect = dialectOf(host);
  const manifest = Object.assign(
    { name: 'jiahao', version: PKG.version },
    host.manifest,
    {
      license: PKG.license,
      repository: PKG_REPOSITORY,
    });
  // Component paths follow the host's rule; the row writes them bundle-relative
  // and the dialect decides the prefix, so one host's './' cannot leak to
  // another's manifest.
  for (const key of ['hooks', 'mcpServers']) {
    if (typeof manifest[key] === 'string') {
      manifest[key] = dialect.manifestPathPrefix + manifest[key].replace(/^\.\//, '');
    }
  }
  if (dialect.defaultEnabled) {
    // conservative: opt-in enable; plugin hooks bypass the
    // untrusted-frontmatter gate and execute on enable
    manifest.defaultEnabled = false;
  }
  return JSON.stringify(manifest, null, 2) + '\n';
}

// Every command resolves through the host's own plugin-root variable so nothing
// points at the repo root, and every event/timeout pair comes from the host row.
// When the row names a platform, the command passes it after the script: the
// template then says which host it is, and the hook does not have to infer it
// from the environment. Matchers are case-sensitive and none are narrowed.
function emitHookMap(host) {
  const dialect = dialectOf(host);
  const hooks = {};
  for (const [event, hook] of Object.entries(host.hooks)) {
    hooks[event] = [{
      hooks: [{
        type: 'command',
        command: 'node "${' + dialect.pluginRootVar + '}/hooks/' + hook.script + '.js"' +
          (dialect.platformArg ? ' ' + dialect.platformArg : ''),
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
    if (!isRulesOnlyDirectory(host)) {
      emitBundle(adapters, prefix, bundleSeeds(host), skill, host.mcp ? host.mcp.files : []);

      adapters[prefix + dialect.manifestDir + '/plugin.json'] = emitPluginManifest(host);
      if (Object.keys(host.hooks).length) adapters[prefix + 'hooks/hooks.json'] = emitHookMap(host);
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


// Qoder install manual. C tier means rules only: the file is context, not a
// gate. The wording stays inside what was observed (nothing), and the test
// suite pins both the absence of hook registration and the absence of a
// blocking claim.
function qoderReadme() {
  return `# Qoder Adapter (C tier: rules only)

This directory is the **rules-only exit** for Qoder. It carries one rule file
generated from \`src/SKILL.md\`, the same source as the rules version
(\`skills/jiahao/SKILL.md\`). It registers **no hooks**: there is no
\`hooks/hooks.json\`, no hook script, and no plugin manifest.

## Capability tier

C tier: rules only. Qoder's turn-end hook behavior is still on the probe list
(spec #74). No Qoder session was run for this exit; C tier is the spec-assigned
ceiling, not an observed result. A probe that answers the turn-end question is
a separate ticket.

## Install

1. Copy \`rules/jiahao.md\` into \`.qoder/rules/\` in the project, or into
   \`~/.qoder/rules/\` for every project.
2. Keep \`alwaysApply: true\` in the frontmatter. Qoder's rules documentation
   says rules without a \`paths\` or \`trigger\` selector load eagerly, and
   \`alwaysApply: true\` is one of the always-on forms (declared-unverified
   here; reference: https://docs.qoder.com/cli/memory).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule body carries both profiles (generator and verifier), exactly like the
rules version. The host takes what it needs; there is no \`.jiahao-profile\`
switch here because no hook reads that file.

## Verification status

- Structural facts are pinned by tests: this directory contains only the rule
  file and this README, and no hook registration.
- Not live-probed: no Qoder session was run for this exit. The loading behavior
  in step 2 is quoted from Qoder's documentation, not observed here.
- C tier is the probe list's open question, not a claim about what Qoder can do.

## What this exit does not do

- No hook registration, no subprocess, and no evidence file.
- No enforcement: the file is instructions only. This exit registers nothing
  that acts on a turn or a tool call.
- No installer: copy the file into Qoder's own rules directory.

## Update

Re-copy \`rules/jiahao.md\` after a release. The body is generated from
\`src/SKILL.md\`; \`node scripts/build-adapters.js --check\` keeps the committed
copy identical to the generator output.
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

// Codex CLI install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function codexReadme() {
  return `# Codex CLI Adapter (self-contained plugin, A 档候选)

This directory is a **self-contained Codex CLI plugin**: the manifest
(\`.codex-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${PLUGIN_ROOT}\`, so nothing
reads from the repository root.

**Capability tier: A 档候选 (candidate).** The host documents a \`Stop\` hook
that reports \`stop_hook_active\` and answers with JSON on stdout, and this
bundle wires \`Stop\` to the verdict gate. No live turn-end block has been
observed yet (#80), so this adapter does not claim "会拦" — it claims
"registered and runnable", and the tier table stays a release-period
conclusion.

## Install (host-native commands)

The repository root is also a Codex marketplace
(\`.agents/plugins/marketplace.json\`, whose single \`source.path\` points at
\`./adapters/codex\`).

1. \`codex plugin marketplace add Xxx91n/jiahao\`
2. \`codex plugin add jiahao --marketplace jiahao\`
3. Review and trust the plugin's hook commands once — Codex skips an untrusted
   hook silently (\`/hooks\`).
4. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`, else \`/tmp\`):
   \`CONFIG="\${CLAUDE_CONFIG_DIR:-\${HOME:-/tmp}}"\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.

Current Codex builds enable hooks by default; no \`[features]\` flag is part of
this recipe. Whether a given build needs one switched on, and the trust step
above, are still the host contract rather than a live-probed recipe: #74 lists
both as open probes, and nobody has watched this install run in-host yet (#80).
If an older build refuses the plugin's hooks, look for a \`[features] hooks\`
switch in \`$CODEX_HOME/config.toml\` rather than copying a flag block from here.

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
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 2 + {decision:"block"} on stdout, with the same reason on stderr - the Codex exit-2 path reads stderr and ignores stdout; blocks an empty evidence chain (verifier profile) |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (parity) |
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

**Not yet live-probed**: install through \`codex plugin\`, the \`/hooks\` trust
step, and a real blocked false-completion are owner actions in #80. This
adapter is admitted on the documented host contract; it does not claim a live
run.
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
  dialectOf, isRulesOnlyDirectory,
};
