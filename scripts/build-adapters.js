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
const qoderDialect = require('./hosts/qoder');
const antigravityDialect = require('./hosts/antigravity');
const workbuddyDialect = require('./hosts/workbuddy');
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

// The profile-flag recipe every README repeats. It has to resolve the same
// directory `src/shared/paths.js` resolves, or the flag lands where no hook
// looks (CodeRabbit #127). Written once here so eight rows cannot drift: the
// list of host roots must stay in step with HOST_CONFIG_DIR_ENV there.
// `${USERPROFILE}` sits between the host roots and node's homedir because that
// is where src/shared/paths.js puts it. It matters on Windows shells: node's
// os.homedir() reads HOME and then the passwd entry on POSIX, and USERPROFILE
// on Windows, so leaving it out let a recipe answer with the shell's own home
// while the resolver answered with USERPROFILE (CodeRabbit #127).
// Both snippets also create the directory. The resolved root usually does not
// exist yet on a fresh machine (a Qoder hook root exists, a pin like
// `~/.jiahao` does not), and `Set-Content` into a missing directory fails with
// "Could not find a part of the path" - measured on PS 5.1, CodeRabbit #127.
// Leaving the mkdir out of the snippet meant three of eight recipes forgot it.
const POSIX_CONFIG_SNIPPET =
  'CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-${QODER_CONFIG_DIR:-${CODEBUDDY_CONFIG_DIR:-${WORKBUDDY_CONFIG_DIR:-${USERPROFILE:-$(node -p \'require("os").homedir()\')}}}}}}"; mkdir -p "$CONFIG"'
// `$env:HOME`, not `$HOME`: PowerShell's `$HOME` is an automatic variable built
// from USERPROFILE and is always set, while `src/shared/paths.js` reads the
// HOME *environment variable*. Using `$HOME` here resolved to the OS home on a
// host that sets only QODER_CONFIG_DIR, so the flags landed where the hooks do
// not read them (measured on PS 5.1, CodeRabbit #127). `$HOME` stays as the
// last resort because a PS session without the env var still has to write
// somewhere, and there the OS home is what the resolver's fallback answers.
const POWERSHELL_CONFIG_SNIPPET =
  '$c = @($env:CLAUDE_CONFIG_DIR, $env:HOME, $env:QODER_CONFIG_DIR, $env:CODEBUDDY_CONFIG_DIR, $env:WORKBUDDY_CONFIG_DIR, $env:USERPROFILE, $HOME) | Where-Object { $_ } | Select-Object -First 1; New-Item -ItemType Directory -Force -Path $c | Out-Null';
// The unreadable-profile fallback sentence (#119 finding 1), shared by every
// README that documents the `.jiahao-profile` flag - one string so the exits
// cannot drift apart on it. Claude Code's profile step and Qoder's
// state-location bullet get the same facts inline because their passage
// shapes differ (a fused sentence and a bullet paragraph respectively).
const PROFILE_UNREADABLE_NOTE =
  '   An unreadable `.jiahao-profile` (a directory in its place, or unreadable\n'
  + '   permissions) also resolves to the default `verifier`, with a `[config]:` note\n'
  + '   on stderr.\n';

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
    name: 'workbuddy',
    label: 'WorkBuddy',
    dir: 'adapters/workbuddy',
    tier: 'A',
    turnEnd: 'Stop',
    // #110, 2026-10-31, WorkBuddy AI 5.9.4 (international, win32): a real turn
    // whose last assistant message claimed "任务完成，已验证。" continued only
    // after a Stop hook printed {decision:"block"} and exited 0; the host
    // injected the reason as "Stop hook feedback: ..." and re-ran the turn. The
    // same hook answered a SubagentStop with the same decision and the subagent
    // was not continued, so only the turn-end event is wired. Both observations
    // were settings-tier (project .codebuddy/settings.json); the plugin-bundle
    // path was not watched firing.
    //
    // #118, 2026-11-01, WorkBuddy 5.9.3 (domestic, win32, D:\WorkBuddy,
    // ~/.workbuddy): the same run repeated on the other build, from its own
    // session and its own settings file - same block, same "Stop hook feedback"
    // continuation, same stop_hook_active pass on re-entry, same ignored
    // SubagentStop block. The two variants were probed separately; neither
    // result stands in for the other, even though both bundle agent-cli 2.165.0.
    provenance: 'WorkBuddy AI 5.9.4 international (2026-10-31, #110) and WorkBuddy 5.9.3 domestic (2026-11-01, #118), each on its own run: live Stop {decision:"block"} on exit 0 continued the turn with "Stop hook feedback" and the re-entry carried stop_hook_active:true; SubagentStop fired on both builds but its block was not continued; settings-tier hooks (project .codebuddy/settings.json) were the probed surface on both; plugin-bundle hooks unprobed on both',
    // Product identity, config roots, the two manifest directories the loader
    // accepts, and the platform name the template passes all live in
    // scripts/hosts/workbuddy.js.
    dialect: workbuddyDialect,
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      PreToolUse: { script: 'jiahao-pretool-guard', timeout: 5 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 3 },
    },
    manifest: {
      description: 'Dual-profile verification discipline for WorkBuddy: profile injection on SessionStart, verdict gate on Stop. A tier on both builds - a live turn-end block on the international 5.9.4 (2026-10-31) and on the domestic 5.9.3 (2026-11-01), each probed on its own run.',
    },
    autoDiscovered: [],
    mcp: null,
    // No plugin-level rules: the desktop's plugin rule loading was not probed,
    // and the SessionStart hook already injects the selected profile. Shipping
    // rule files that may never load would be a claim without an observation.
    rules: [],
    readme: workbuddyReadme,
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
    name: 'antigravity',
    label: 'Google Antigravity',
    dir: 'adapters/antigravity',
    tier: 'A',
    turnEnd: 'Stop',
    // Live probe (#111, 2026-10-31, Antigravity 1.2.12 on win32): a false
    // completion claim was continued only after Stop answered
    // {decision:"block"} on exit 0. Exit 2 did not block. Ten consecutive
    // block continuations followed by a forced end at MAX_FORCED_INVOCATIONS.
    provenance: 'Google Antigravity 1.2.12 (2026-10-31, #111): live Stop block via exit 0 + {decision:"block"} continued the turn; exit 2 + stderr did not block; 10 forced continuations max before CLI terminated',
    dialect: antigravityDialect,
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 5 },
    },
    manifest: {
      description: 'Verification discipline for Google Antigravity: profile injection at session start, verdict gate at turn end (A tier, live block verified 2026-10-31). Self-contained plugin.',
      author: { name: 'Xxx91n' },
    },
    autoDiscovered: [],
    mcp: null,
    rules: [],
    readme: antigravityReadme,
  },
  {
    name: 'qoder',
    label: 'Qoder',
    dir: 'adapters/qoder',
    tier: 'A',
    turnEnd: 'Stop',
    // Two live probes, one per Desktop variant, both on win32 through a
    // project-scope `.qoder/settings.json` hook. #109 (2026-10-31, CN 0.4.11)
    // watched a Stop hook fire in a real turn and continue it on BOTH channels -
    // exit 0 with a flat {"decision":"block"} on stdout and exit 2 with the
    // reason on stderr - with stop_hook_active on re-entry and 6 consecutive
    // blocks before the probe's own cap. #113 (2026-11-01, international 0.4.11)
    // reproduced all of it on the other build: both channels, stop_hook_active
    // on re-entry, 3 consecutive blocks before the probe's cap, and a
    // `.qoder-cn/settings.json` armed beside the `.qoder/` twin never fired.
    // One claim stays open on both builds: the plugin registration surface is
    // read from the host's own bundled `qoder-context` plugin (its hooks.json
    // carries a Stop event and its Stop hooks were watched finishing with
    // exit_code=0), not watched blocking through this bundle. The IDE/CLI line
    // keeps the rules exit below.
    provenance: 'Qoder CN Desktop 0.4.11 (2026-10-31, #109) and international Desktop 0.4.11 (2026-11-01, #113): live Stop block observed on both builds through a project-scope .qoder/settings.json hook - exit 0 + {decision:"block"} and exit 2 + stderr both blocked and continued, stop_hook_active set on re-entry, 6 (CN) and 3 (intl) consecutive continuations before the probe capped it; on each build a .qoder-cn/settings.json armed beside it never fired; Qoder IDE/CLI turn-end behavior unprobed, plugin-scope registration inferred from the host\'s own bundled plugin',
    // PascalCase events and the Claude-shaped payload are this host's dialect;
    // they live in scripts/hosts/qoder.js alone. PreToolUse and SubagentStop are
    // deliberately not wired: the deny channel and a blocked subagent finish were
    // never exercised on this host (#109). SessionEnd is wired even though its
    // firing was not observed either, because the sentinel-reclamation invariant
    // (test/sentinel-ownership.test.js D3) requires the sweep in every hook map,
    // and an unwired sweep leaks `<config>/.jiahao-sentinel.*` files.
    dialect: qoderDialect,
    hooks: {
      SessionStart: { script: 'jiahao-activate', timeout: 5 },
      UserPromptSubmit: { script: 'jiahao-mode-tracker', timeout: 5 },
      Stop: { script: 'jiahao-verdict-gate', timeout: 10 },
      SessionEnd: { script: 'jiahao-sweep', timeout: 3 },
    },
    manifest: {
      description: 'Verification discipline for Qoder Desktop: profile injection at session start, verdict gate at turn end (A tier on Qoder CN Desktop and international Desktop 0.4.11, live block 2026-10-31 and 2026-11-01). Self-contained plugin.',
    },
    // The host loads `hooks/hooks.json` by itself, the way it loads its own
    // bundled plugin's map; naming it in the manifest would load it twice.
    autoDiscovered: ['hooks/hooks.json'],
    mcp: null,
    rules: [
      { file: 'jiahao.md', profile: 'both', description: 'Jiahao anti-false-completion discipline (Qoder IDE/CLI rule file)' },
    ],
    readme: qoderReadme,
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
    provenance: 'ZCode 3.16.2 / CLI 0.17.0 (2026-10-31, #108): live Stop block via exit 0 + {decision:"block"} (exit 2 also blocked, without a reason); stop_hook_active true on continuations; 3 block continuations then the turn ended; install via the bundle marketplace shelf verified (hooks:4, byte-identical cache); payload dual-spelling; hook config read at session start only; post-merge live verification (2026-11-01): plugin-path hooks fired in a restarted operator session, all four surfaces observed (SessionStart inject, UserPromptSubmit reminder, PreToolUse deny, Stop Case-A block)',
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
// self-contained bundles, qoder the rules-only shape with the no-registration
// assertion at the time). #109 turned that qoder row into a self-contained
// bundle as well; the rules-only shape it left behind survives as the row's
// `rules/jiahao.md`, still the IDE/CLI exit.
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
        adapters[prefix + dialect.marketplaceShelfPath] =
          dialect.emitMarketplaceShelf((host.manifest || {}).description);
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

## What this is

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
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`; when a hook has neither,
   it takes a config root the host reports (\`QODER_CONFIG_DIR\`,
   \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`), then the OS home -
   never \`/tmp\` (\`src/shared/paths.js\`):
   \`${POSIX_CONFIG_SNIPPET}\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`. The file is shared by all agents using the same config
   directory; use separate config directories for concurrent profiles.
${PROFILE_UNREADABLE_NOTE}4. MCP server: run \`npm install --omit=dev\` inside the bundle's
   \`jiahao-mcp/\` once (the server source is vendored; dependencies are
   not). The bundle's \`.mcp.json\` registers it via
   \`\${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js\`.

Settings-tier alternative (CLI): merge the hook map into
\`.codebuddy/settings.json\` and copy the rules into \`.codebuddy/rules/\`.
The settings path is the one live-verified end to end (see
"Verified and declared-unverified").

## Hook map

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

## Dialect

**Rule-loading caveat.** The bundle ships both \`rules/jiahao-verifier.md\`
and \`rules/jiahao-generator.md\` with \`alwaysApply: true\`. The hook injects
the profile selected by \`.jiahao-profile\`, but if the host applies both
always-apply rule files, the two instruction sets coexist. Rule-level profile
selection is declared-unverified; the hook is the enforcement layer.

## Verified and declared-unverified

Measured on CodeBuddy Code CLI 2.151.0 (live-probed).

**Verified:**

- \`.codebuddy/settings.json\` hooks (SessionStart / PreToolUse / PostToolUse):
  the \`hook_event_name\` + \`hookSpecificOutput\` envelope was live-verified.
- PreToolUse \`permissionDecision: "deny"\` envelope: verified deny shape on
  the CLI.
- MCP server registration via \`.mcp.json\`: stdio connect + tool list
  verified.

**Declared-unverified / not probed** (the limitations of this record):

- IDE-side hook parity, incl. \`InstructionsLoaded\` firing: pending-confirmation.
- \`rules/\` non-\`alwaysApply\` load priority (both forms): pending-confirmation.
- \`npx\`-bundled install vs \`codebuddy plugin install\` coexistence:
  pending-confirmation.
- Plugin-bundle path parity on CLI (documented compat, unprobed live):
  pending-confirmation.

Unverified means **registered, not assumed**: each row has a
pending-confirmation entry in the taxonomy exception channel (schema) with an
expiry and an owner ratify/revoke point. Windows note: the upstream
\`\${CLAUDE_PLUGIN_ROOT}\` hook expansion bug (anthropics/claude-code issues)
may carry over - the settings-tier path is the verified fallback.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`; a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home, never \`/tmp\`): \`.jiahao-active\`, \`.jiahao-profile\`,
  \`.jiahao-evidence/\` (plus its sidecar and pairer shadow records),
  \`.jiahao-pretool.jsonl\`, and the sentinel state and lock files. Nothing
  inside the repository or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Trial boundary

The adapter is admitted; the external effectiveness trial (install +
Phase 0/1/2 in a real CodeBuddy environment) is an **owner action**, never
agent-executed. Protocol: \`.scratch/grill-t30/protocol.md\`; judgment lines:
\`bench/codebuddy-trial/judgment-lines.json\` (preregistered, immutable -
deviations ride errata records).
`;
}


// Qoder install manual. One directory, three surfaces with three different
// claims: the Desktop plugin bundle (A tier on each Desktop build, each measured
// by its own probe), the rules version's standard skill directory (#106, text
// only), and the IDE/CLI rule file (text only). The wording keeps the surfaces
// apart so neither the skill directory nor `.qoder/rules/` reads as a hook, and
// so the blocking claim names the build it was observed on.
function qoderReadme() {
  return `# Qoder Adapter (self-contained plugin; A tier on both Desktop builds)

## What this is

This directory is a **self-contained Qoder Desktop plugin**: the manifest
(\`.qoder-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; nothing reads from the repository root and
there is no third-party runtime dependency. The same directory also carries
\`rules/jiahao.md\` for the **Qoder IDE/CLI** rules path: it travels in the
archive because one directory holds both exits, and it registers nothing.

## Capability tier

| Surface | Tier | Basis |
|---|---|---|
| Qoder CN Desktop 0.4.11 | A | turn-end block watched in a live session on 2026-10-31 (#109) |
| Qoder international Desktop 0.4.11 | A | turn-end block watched in a live session on 2026-11-01 (#113), both channels |
| Qoder IDE/CLI | C | rules text only; no hook was run for this exit |

A tier means the host can be stopped before a turn ends. **Each build has its
own probe**: #109 measured the CN build, #113 measured the international one, and
neither result was borrowed for the other. The IDE/CLI line stays C until its own
probe reports, because no Qoder CLI is installed on the machine that ran both.

This directory supersedes the #79 rule that no hook registration may appear in
it. #79 shipped the Qoder exit as rules-only *because* the turn-end question was
open; #109 answered it for Qoder CN Desktop, so the registration is now the
point of the directory and the no-registration assertion was replaced (not
deleted) by tests that pin exactly which events are wired.

## The hook map this bundle ships

Wiring order, script, and per-event timeout, so a reader can compare the table
with \`hooks/hooks.json\`: SessionStart runs \`jiahao-activate.js\` (5s),
UserPromptSubmit runs \`jiahao-mode-tracker.js\` (5s), Stop runs
\`jiahao-verdict-gate.js\` (10s), and SessionEnd runs \`jiahao-sweep.js\` (3s) -
the timeouts are 5/5/10/3s. The sweep is wired for sentinel reclamation (leaked
\`<config>/.jiahao-sentinel.*\` files have no other collector); its firing on this
host was not observed.

## What was observed on Qoder CN Desktop 0.4.11 (#109, 2026-10-31)

A \`Stop\` hook registered in the project's \`.qoder/settings.json\` fired in a
real session and continued the turn:

- exit 0 with a flat \`{"decision":"block","reason":"..."}\` on stdout: the host
  injected the reason as a meta user message and the model ran another turn;
- exit 2 with the reason on stderr: same outcome;
- the payload is Claude-shaped (\`session_id\`, \`cwd\`, \`transcript_path\`,
  \`hook_event_name\`, \`last_assistant_message\`) and the host sets
  \`stop_hook_active: true\` on every re-entry;
- 6 consecutive blocks were honored before the probe's own cap ended the run, so
  no host-side consecutive-block limit was reached.

Which messages got held is stated in the record, because it is not all the same
thing: **6** of the 10 blocks (exit-0 channel) landed on "I completed and verified
a read-only check" claims that were unfounded on their face; **1** was the same
assertion wrapped in a "this is probe payload" disclaimer; and **3** (exit-2
channel) landed on literals that themselves said nothing had been verified. So the
exit-2 run proves the host honors a block on that channel - it is not evidence of
a false-completion catch.

Raw calls are in
[\`qoder-hook-calls.jsonl\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-calls.jsonl)
and the run record is
[\`qoder-hook-probe-2026-10-31.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md).

## What was observed on international Desktop 0.4.11 (#113, 2026-11-01)

The other build, probed on its own, reproduced the CN result rather than
inheriting it:

- \`Stop\` exists and fires; the payload has the same Claude-shaped fields, and
  \`transcript_path\` lands under \`~/.qoder/projects/<slug>/\`;
- **both channels block and continue**: exit 0 with a flat
  \`{"decision":"block","reason":"..."}\` and exit 2 with the reason on stderr
  (\`success=false exit_code=2\` in the host log, reason still fed back);
- \`stop_hook_active: true\` is set on every re-entry turn;
- 3 consecutive blocks were honored before the probe's own cap ended the run, so
  no host-side consecutive-block limit was reached;
- project-scope \`.qoder/settings.json\` registered the hook and a
  \`.qoder-cn/settings.json\` armed beside it never fired - the same answer the CN
  build gave, now measured rather than assumed;
- the hook subprocess gets \`QODER_PROJECT_DIR\`, \`QODER_CONFIG_DIR\`,
  \`USERPROFILE\`, \`TEMP\` and \`TMP\`, but no \`QODER_SESSION_ID\`, no
  \`CLAUDE_CONFIG_DIR\` and no \`HOME\`. This was measured on a **project-scope
  \`.qoder/settings.json\` hook**; the plugin path has not been observed spawning a
  hook, so whether it hands over the same environment is unproven. The state
  location this env produced (state under \`<drive>:\\tmp\`) is what #116
  repaired in \`src/shared/paths.js\`; see the conditional wording in
  "Declared-unverified on this host".

Which messages got held: **5** blocks landed on "I completed and verified a
read-only check" claims that were unfounded on their face (runs 1, 3, 4), and
**2** landed on literals that themselves said nothing had been verified (run 2's
exit-2 channel, and run 5, where the model refused to assert it and quoted the
line instead). The 5 were dictated by the probe prompt (the model was told to
emit that sentence verbatim), so they prove the block fires on a
self-contradictory claim, not that the model invented one. The exit-2 run proves
the channel carries a block and a continuation, not a false-completion catch.

Counts agree: 12 hook calls in
[\`qoder-intl-hook-calls.jsonl\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-calls.jsonl)
(7 blocking, 5 passing), 12 \`hook.finished\` lines with \`source="project"\` in
[\`qoder-intl-runlog-probe-hooks.txt\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-runlog-probe-hooks.txt),
7 injected block-feedback records in
[\`qoder-intl-transcript-block-lines.jsonl\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-transcript-block-lines.jsonl),
and 2 per-invocation stream records (stdin/stdout/stderr/exit) in
[\`qoder-intl-probe-io.jsonl\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-probe-io.jsonl).
The run record is
[\`qoder-intl-hook-probe-2026-11-01.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md).

### Plugin path on the international build (host's own plugin, not this bundle)

The host's bundled \`qoder-context\` plugin shows the plugin path carries a
\`Stop\` event on this build:

- its \`hooks.json\` (version \`1.0.84.f756706\`) has four events -
  \`SessionStart\` 2, \`UserPromptSubmit\` 2, \`PostToolUse\` 2, \`Stop\` 2 - read out
  in [\`qoder-intl-host-versions.txt\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-host-versions.txt);
- its \`Stop\` hooks finished with \`exit_code=0\` in the host run log
  (\`source="plugins"\`, \`plugin_root="...\\.qoder\\plugins\\cache\\qoderapp-bundler\\qoder-context\\1.0.84.f756706"\`),
  appended to [\`qoder-intl-runlog-probe-hooks.txt\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/qoder-intl-runlog-probe-hooks.txt);
- \`\${QODER_PLUGIN_ROOT}\` is the placeholder that plugin spells; it uses exec form
  (\`command\` + \`args\`), and its hooks finished with \`exit_code=0\`, which is
  consistent with the root being substituted - but the logged line fields keep
  the literal, so this is not a direct observation of the substitution. Shell-form
  expansion is unproven - see the placeholder bullet below.

The CN build ships a different map at the same version string - \`SessionStart\` 1,
\`UserPromptSubmit\` 2, no \`Stop\` - so this is a fact about the international
build's bundled plugin, not about \`hooks/hooks.json\` in general. What remains
unproven is this bundle blocking through the plugin path: see
"Declared-unverified on this host".

## Declared-unverified on this host

Limitations of this record - the items below were read out of the host's files
or schemas, not watched happening:

- **The plugin registration surface, for this bundle.** The host's own bundled
  plugin proves the plugin path carries a \`Stop\` event on the international build
  (see "Plugin path on the international build" above), but a \`Stop\` hook
  arriving through the *plugin* path has not been watched **blocking** a turn on
  either build - every live block above came through the settings path.
  Installing this directory as a plugin is expected to work, not proven to work.
- **The shipped gate on this host.** Every block above was produced by the probe
  script, not by \`jiahao-verdict-gate.js\`. What is verified is the host channel
  (a \`Stop\` hook can block and continue a turn here), not this bundle's verdict
  logic running under Qoder.
- **Whether an \`additionalContext\` injection reaches the model on Qoder.** The
  envelope is the shape the host's schema asks for; no injection was watched in
  the #109 session.
- **\`SessionEnd\` firing and its timeout budget.** Wired for reclamation, never
  observed on this host.
- **\`\${QODER_PLUGIN_ROOT}\` in a shell-form command.** The host's own plugin uses
  that placeholder, but the probe ran exec-form hooks (\`command\` + \`args\`), so
  this exact spelling has not been watched resolving.
- **Whether a hook subprocess gets \`QODER_SESSION_ID\`.** It does not: the probe
  saw \`QODER_PROJECT_DIR\`, \`QODER_CONFIG_DIR\`, \`USERPROFILE\`, \`TEMP\` and \`TMP\`.
  That is why the hook map passes the platform name \`qoder\` on the command line.
- **Where jiahao's own state lands on this host.** The hook subprocess gets
  neither \`CLAUDE_CONFIG_DIR\` nor \`HOME\`, so before [#116](https://github.com/Xxx91n/jiahao/issues/116)
  \`src/shared/paths.js\` fell through to its last resort and a hook spawned by
  Qoder read and wrote \`.jiahao-profile\` and \`.jiahao-evidence\` under
  \`<drive>:\\tmp\` instead of the \`QODER_CONFIG_DIR\` (\`~/.qoder-cn\` on CN,
  \`~/.qoder\` on international) the host does name. \`paths.js\` now takes that
  host root after \`CLAUDE_CONFIG_DIR\` and \`HOME\`; a host that sets either one
  does not move. The spawned-hook tests in \`test/config-dir.test.js\` run this
  bundle's own hooks under the environment the #109 probe recorded (Qoder's two
  variables, the two Claude ones absent) and read the directory back:
  \`SessionStart\` creates \`.jiahao-active\` there, a reconciled sentinel appends
  its evidence record under \`<config>/.jiahao-evidence/\`, and a spawned Stop
  gate blocks out of the flag file it finds there. **That environment was
  recorded on a project-scope \`.qoder/settings.json\` hook**; whether the
  plugin path hands over the same variables was not observed, so on the plugin
  path the fixed resolution is conditional on it. The live in-app half - a Qoder
  session whose evidence chain is seen in \`~/.qoder-cn\` - is not yet in this
  repository's records; the turn-end block above is unaffected either way,
  because it was measured through the hook's own stdout/stderr. An unreadable
  \`.jiahao-profile\` (a directory in its place, or unreadable permissions) also
  resolves to the default \`verifier\`, with a \`[config]:\` note on stderr.
- **Which root registers hooks - now known for both builds.** Project-scope
  \`.qoder/settings.json\` fired and a \`.qoder-cn/settings.json\` placed beside it
  did not, on the CN build (#109) and again on the international one (#113).
- **\`PreToolUse\` and \`SubagentStop\`.** Not wired here; neither was exercised on
  either build.

## Qoder Desktop - plugin (enforcement)

Qoder Desktop installs a plugin from a local archive at user scope: package this
directory into a \`.zip\` whose root holds \`.qoder-plugin/\`, and install it from
the Desktop app's plugin settings. Then start a new session: hook configuration
is read at session start, and a session already open does not pick it up.

The event list, scripts, and timeouts are in "The hook map this bundle ships"
above - stated once, so the two cannot drift apart. What is measured is the
host's \`Stop\` channel (table above); what is not, is this bundle's own path to
it (Declared-unverified) - so that section describes wiring, not a witnessed
block by these scripts.

## Qoder Desktop - rules version (no enforcement)

For instructions only, with no hook, install the rules version's standard skill
directory:

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
- This path is plain text: no hook runs and nothing is enforced by it.

Do not copy this directory's rule file into a Qoder Desktop rules path. Each
Desktop build has its own config root: \`~/.qoder-cn\` for CN, \`~/.qoder\` for the
international build (measured 2026-11-01: the hook subprocess on the
international build reports \`QODER_CONFIG_DIR=C:\\Users\\Administrator\\.qoder\`).
#106's check found \`~/.qoder/rules\` unloaded, but that check ran from a **CN**
session, whose root is \`~/.qoder-cn\`; it says nothing about whether the
international build loads a rules directory of its own. That question is still
unprobed, so no rules path is offered for either Desktop build.

## Qoder IDE/CLI

The IDE/CLI line reads project rules from \`.qoder/rules/\`
(https://docs.qoder.com/zh/user-guide/rules). \`rules/jiahao.md\` is that exit:

1. Copy \`rules/jiahao.md\` into \`.qoder/rules/\` in the project.
2. Keep \`alwaysApply: true\` in the frontmatter. Qoder's rules documentation
   says rules without a \`paths\` or \`trigger\` selector load eagerly, and
   \`alwaysApply: true\` is one of the always-on forms (reference:
   https://docs.qoder.com/cli/memory; project-rules page:
   https://docs.qoder.com/zh/user-guide/rules).
3. Start a new Qoder session. The file is plain Markdown; no script runs and
   nothing needs installing.

The rule file registers nothing: it is not a hook and it is not the Desktop
plugin. The project-level path is the one Qoder's rules documentation names; a
user-level rules directory is not documented there and is not offered here.

The rule body carries both profiles (generator and verifier), exactly like the
rules version.

## Verification status

- Structural facts are pinned by tests: the bundle is self-contained, the
  manifest and hook map come from this row, and \`Stop\` runs the verdict gate.
- The turn-end block has **two** live observations, one per Desktop build:
  Qoder CN Desktop 0.4.11 (#109, 2026-10-31) and international Desktop 0.4.11
  (#113, 2026-11-01), both through a project-scope \`.qoder/settings.json\` hook.
  Neither probe ran against an isolated config home (a Desktop worker is spawned
  by the app and has no home override). Both gated every block on a marker
  string with a per-session cap, and that guard is a **content gate, not a
  session gate**: an unrelated turn whose text lacks the marker can never be
  blocked, but another new turn in the armed project that happened to contain it
  could be, up to the cap. No such turn occurred in either probe.
- The scripts that recorded those calls are
  [\`probes/qoder-stop-probe.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/qoder-stop-probe.js)
  (CN) and its log-path shim
  [\`probes/qoder-intl-probe-hook.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/qoder-intl-probe-hook.js)
  (international), and the checklist both runs are reviewed against is
  [\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
- Not live-probed: this directory installed as a Desktop plugin, and Qoder
  IDE/CLI rule loading. The IDE/CLI steps are quoted from Qoder's documentation,
  not observed here.

## What this exit does not do

- No installer command: the Desktop app installs the plugin from a local archive
  through its own settings, and the IDE/CLI path is a file copy.
- No claim about the IDE/CLI line beyond the tier table above. Both Desktop
  builds carry their own probe; neither borrows the other's.
- No MCP server registration in this bundle.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else \`$HOME\`;
  a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home): \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\`
  (plus its sidecar and pairer shadow records), and the sentinel state and
  lock files. Nothing inside the repository or this plugin directory is
  written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Update

- Qoder Desktop plugin: reinstall the archive built from this directory, then
  open a new session.
- Qoder Desktop rules version: re-run the same \`npx skills add\` command, then
  open a new session.
- Qoder IDE/CLI: re-copy \`rules/jiahao.md\` after a release.

The body is generated from \`src/SKILL.md\`; \`node scripts/build-adapters.js --check\`
keeps the committed copy identical to the generator output.
`;
}

// Claude Code install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function claudeCodeReadme() {
  return `# Claude Code Adapter (self-contained plugin)

## What this is

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
   Deleting the file returns to the default \`verifier\`; an unreadable one
   (a directory in its place, or unreadable permissions) resolves the same way
   and leaves a \`[config]:\` note on stderr. Both flag files live
   in the config dir, never in the project directory.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Hook map

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

The \`InstructionsLoaded\` event is not supported in this bundle: that
assertion hashes \`rules/jiahao-*.md\`, and a Claude Code plugin has no
plugin-level \`rules/\` directory for the host to load.

## Verified and declared-unverified

**Verified:**

- Offline, pinned by \`test/plugin-bundles.test.js\` (structure, run once per
  host row) and \`test/claude-code-plugin.test.js\` (the bundled Stop gate and
  the SessionStart injection): both manifests parse, the plugin version and
  license come from \`package.json\`, the marketplace \`source\` resolves to
  this directory, every referenced file is emitted by the generator
  (\`--check\` pins the emitted set to disk), every hook command stays inside
  \`\${CLAUDE_PLUGIN_ROOT}\`, and no vendored relative \`require()\` escapes
  the bundle.
- The bundled Stop gate, spawned from a temp materialization of the generator
  output, blocks (exit 2) when the evidence chain is empty.

**Declared-unverified / not probed** (the limitations of this record):

- Install through \`claude plugin\`, SessionStart injection, and a real
  blocked false-completion: **not yet live-probed**; they are owner actions
  in #64.

This adapter is admitted on the documented host contract; it does not claim a
live run.

## Write scope and network

- Hooks write only under the Claude config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`; a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home, never \`/tmp\`): \`.jiahao-active\`, \`.jiahao-evidence/\` (plus the
  \`.jiahao-evidence.keys\` sidecar and \`pairer-instrument\` shadow records the
  Stop lane may append), \`.jiahao-pretool.jsonl\`, and the sentinel state and
  lock files \`.jiahao-sentinel.<hook>(.lock)\`. Nothing inside the repo or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
`;
}

// GitHub Copilot CLI install manual + dialect disclosure. Regenerated from this
// single source; edit the string, never the emitted file.
function copilotCliReadme() {
  return `# GitHub Copilot CLI Adapter (self-contained plugin)

## What this is

This directory is a **self-contained plugin for GitHub Copilot CLI**: the
manifest (\`plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook scripts
and their \`require()\` closure, and \`src/SKILL.md\` (the rules body the
sessionStart hook injects) are vendored inside. Every hook command resolves
through \`$PLUGIN_ROOT\` - Copilot CLI hands plugin hooks \`PLUGIN_ROOT\` (and
also \`COPILOT_PLUGIN_ROOT\` / \`CLAUDE_PLUGIN_ROOT\`) pointing at the installed
plugin - so nothing reads from the repository root.

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
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`; when a hook has neither,
   it takes a config root the host reports (\`QODER_CONFIG_DIR\`,
   \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`), then the OS home -
   never \`/tmp\` (\`src/shared/paths.js\`):
   \`${POSIX_CONFIG_SNIPPET}\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.
${PROFILE_UNREADABLE_NOTE}
Install and upgrade are the host's own plugin commands; the repository root is
never a plugin entry. The install path was live-probed with a local plugin
directory on 1.0.105.

## Hook map

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

## Verified and declared-unverified

Tier: **A (verified 2026-10-30, Copilot CLI 1.0.105)**. A live turn was
blocked by \`agentStop\`: the false completion claim continued only after the
gate printed \`{decision:"block"}\` on exit 0. Exit 2 was logged as a failed
hook and did not block.

**Verified** (2026-10-30, Copilot CLI 1.0.105, win32; the probe used an
isolated \`COPILOT_HOME\`, a real prompt-mode session
\`copilot -p ... --trust-folder\`, and the installed bundle; commands and
captured output live in
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)):

- A real turn-end block (\`agentStop\` + \`decision:"block"\`): the model's
  \`任务完成，已验证。\` continued only after the gate's \`decision:"block"\`;
  the block reason arrived as the next user message.
- Native \`copilot plugin install\` reading \`plugin.json\` +
  \`hooks/hooks.json\`: the install ran the bundled sessionStart/agentStop
  hooks.
- \`.claude/settings.json\` was read: both SessionStart and Stop entries ran;
  a hand-written Claude-schema Stop block (exit 0) also continued the turn.
  The jiahao bundle installs as a Copilot plugin, not through this file.
- \`COPILOT_PLUGIN_DATA\` for plugin hooks was set: observed in the plugin hook
  environment, so \`detectHost()\` selects the Copilot envelope.
- camelCase payload (\`sessionId\`) observed in the plugin hook input;
  normalized by \`hooks/jiahao-runtime.js\`.
- 8 consecutive block continuations confirmed: 8 continuations, then the CLI
  ended; the ninth block was not continued.
- \`sessionEnd\` fires for plugin hooks: the final session's event log contains
  \`sessionEnd\` hook events.
- **Refuted**: exit 2 as the block channel ended the turn without a
  continuation; the gate now exits 0 for Copilot.

**Declared-unverified / not probed** (the limitations of this record):

- \`userPromptSubmitted\` output reaching the model: not probed here; the mode
  reminder is advisory and does not gate.
- \`enabledPlugins\` in \`.github/copilot/settings.json\` /
  \`~/.copilot/settings.json\`: not needed for a direct install (enabled on
  install); marketplace install not probed.

## Write scope and network

- Hooks write only under the Claude config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`; a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home), the same flag and evidence files every host uses:
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

## What this is

This directory is a **self-contained Codex CLI plugin**: the manifest
(\`.codex-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${PLUGIN_ROOT}\`, so nothing
reads from the repository root.

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
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`; when a hook has neither,
   it takes a config root the host reports (\`QODER_CONFIG_DIR\`,
   \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`), then the OS home -
   never \`/tmp\` (\`src/shared/paths.js\`):
   \`${POSIX_CONFIG_SNIPPET}\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). Start a new session after changing
   \`.jiahao-profile\`.
${PROFILE_UNREADABLE_NOTE}
Codex 0.163.0 enables hooks by default: \`codex features list\` reports
\`hooks stable true\`, and a fresh \`CODEX_HOME\` with no \`config.toml\` ran the
plugin's hooks. No \`[features] hooks\` switch is part of this recipe. The trust
step above is separate and required: the probe saw untrusted hooks skipped
silently in \`codex exec\`. If an older build refuses the plugin's hooks, look
for a \`[features] hooks\` switch in \`$CODEX_HOME/config.toml\` rather than
copying a flag block from here.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Hook map

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

## Verified and declared-unverified

Capability tier: **A (verified 2026-10-30, codex-cli 0.163.0)**. A live
prompt-mode session continued a false completion claim only after \`Stop\`
answered \`{decision:"block"}\` on exit 0. The exit-2 + stderr path documented
by the host source ended the turn without a continuation in this build.
Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

**Verified:**

- Offline, pinned by \`test/plugin-bundles.test.js\` (structure, run once per
  host row) and \`test/codex-adapter.test.js\` (the Codex envelope and the
  bundled Stop gate, spawned as a subprocess from a temp materialization of
  the generator output): the manifest parses, its version and license come
  from \`package.json\`, the marketplace \`source.path\` resolves to this
  directory, every referenced file is emitted (\`--check\` pins the emitted
  set to disk), every hook command stays inside \`\${PLUGIN_ROOT}\`, and no
  vendored relative \`require()\` escapes the bundle.
- **Live probe (2026-10-30, codex-cli 0.163.0, win32)**: \`codex plugin
  marketplace add <local path>\` and \`codex plugin add jiahao --marketplace
  jiahao\` installed the bundle. Without persisted trust the hooks were
  skipped in \`codex exec\` and the false claim passed; with
  \`--dangerously-bypass-hook-trust\` the Stop gate answered
  \`{decision:"block"}\` and the next model turn quoted the reason. Commands
  and captured output live in
  [\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).
- The hook's own exit code, stdout, and stderr were recorded by a wrapper, not
  read from the host log:
  [\`probes/codex-hook-wrapper.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/codex-hook-wrapper.js)
  runs the installed gate, appends one JSON line per invocation, then replays
  the output and exits with the same code. Reuse it when probing a new build;
  the surrounding evidence layout is described in
  [\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
- Loop guard: an unconditional exit-0 JSON block in a throwaway user Stop hook
  continued for 785 runs (786 assistant messages, 33M input tokens) before the
  host completed the turn; no small host cap like Copilot's 8 appeared. The
  bundled gate is not unconditional - it passes when the host sends
  \`stop_hook_active\` on the continuation - so the block happens once per turn.

**Declared-unverified / not probed** (the limitations of this record):

- The interactive \`/hooks\` trust-and-restart flow itself was not
  step-by-step probed.
- \`SubagentStop\` was not separately probed (wired for parity; \`Stop\` was
  live-probed).
- Exit 2 as the block channel: refuted on 0.163.0 - it ended the turn without
  a continuation.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`; a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home, never \`/tmp\`): \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\` (plus
  its sidecar and pairer shadow records), \`.jiahao-pretool.jsonl\`, and the
  sentinel state and lock files. Nothing inside the repo or this plugin
  directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
`;
}

// WorkBuddy install manual: one host row, two products. The identity facts, the
// config roots, and the two install surfaces are stated per variant because
// each build carries its own live probe - the international 5.9.4 run in #110
// and the domestic 5.9.3 run in #118. Regenerated from this single source; edit
// the string, never the emitted file.
function workbuddyReadme() {
  return `# WorkBuddy Adapter (self-contained plugin, A tier on both builds)

## What this is

This directory is a **self-contained plugin bundle for WorkBuddy**: the manifest
(\`.workbuddy-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime dependency.
Every hook command resolves through \`\${CODEBUDDY_PLUGIN_ROOT}\`, the variable the
shared loader sets for plugin hooks (read from the bundled CLI, not observed in
a run), so nothing reads from the repository root.

WorkBuddy is **not** a CodeBuddy alias, even though both bundle the same agent
CLI (\`@genie/agent-cli 2.165.0\`). Two builds ship under two product names, two
endpoints, and two config roots, and each was identified from its own
\`product.json\`, not from documentation:

| Variant | Product name | Build | Install dir | Config root | Endpoint |
| --- | --- | --- | --- | --- | --- |
| International | \`WorkBuddy AI\` (\`isOversea: true\`) | 5.9.4 | \`D:\\Workbuddy.ai\\WorkBuddyAI\` | \`~/.workbuddy-ai\` | \`https://www.workbuddy.ai\` |
| Domestic | \`WorkBuddy\` | 5.9.3 | \`D:\\WorkBuddy\` | \`~/.workbuddy\` | \`https://www.workbuddy.cn\` |

## Install

Two surfaces were identified; only the settings tier was watched blocking a
turn.

### Settings tier (the probed surface)

WorkBuddy's desktop session reads \`hooks\` from \`<configDir>/settings.json\`
(\`~/.workbuddy-ai/settings.json\` international, \`~/.workbuddy/settings.json\`
domestic), and a **project-scope** \`.codebuddy/settings.json\` in the working
directory is read too - that is the file the 2026-10-31 probe used. Note the
project directory name: \`.codebuddy\`, not \`.workbuddy\`; a twin written to
\`.workbuddy/settings.json\` at the same time did not fire.

1. Copy the **whole bundle** to a stable path - \`hooks/\`, \`src/\`, and
   \`src/SKILL.md\` together. The hook scripts require \`../src/*\` (the gate loads
   the evidence log, calibration, sentinel, and pairer modules from there), so a
   copy of \`hooks/\` alone fails before it can inject or decide anything.
2. Merge the event map from \`hooks/hooks.json\` into the settings file,
   replacing \`\${CODEBUDDY_PLUGIN_ROOT}\` with the path you copied to. That value
   is a JSON string: on Windows write the separators as \`/\`
   (\`D:/Workbuddy.ai/jiahao\`) or escape them (\`D:\\\\Workbuddy.ai\\\\jiahao\`),
   otherwise the settings file stops parsing and no hook loads at all.
3. Append the platform name to every command, as the shipped map does
   (\`... jiahao-verdict-gate.js workbuddy\`). A settings-tier hook receives no
   plugin root, and the environment carries both \`CODEBUDDY_*\` and
   \`WORKBUDDY_*\` variables, so the argument is what identifies the host.
4. Activate the jiahao profile flag **where the hooks read it**, and pin that
   directory first. The hooks resolve it as \`CLAUDE_CONFIG_DIR\`, else \`HOME\`,
   else \`CODEBUDDY_CONFIG_DIR\` / \`WORKBUDDY_CONFIG_DIR\` (the order
   \`src/shared/paths.js\` checks), else the OS home. What the record says, and
   what it does not: the 2026-10-31 and 2026-11-01 probe sessions logged
   \`CLAUDE_CONFIG_DIR\` absent and both builder config-dir variables set to
   that build's own root, and neither record logs \`HOME\` at all. The owner's
   separate run on 2026-11-01 (#116) saw the desktop's guard process with
   \`CLAUDE_CONFIG_DIR\` unset and \`HOME\` set, while the shell that ran the
   installer carried \`CLAUDE_CONFIG_DIR\` from another agent - so the installer
   wrote the flag where the hook does not read it and a profile switch failed
   silently. A shell supplies a \`HOME\` of its own, which is exactly why
   writing the flag from an arbitrary shell can land out of view.

   The reliable recipe pins one directory for both sides. Either set
   \`CLAUDE_CONFIG_DIR\` for the desktop process (a user environment variable
   works on Windows), restart the desktop, then write the flags **there** from
   a **freshly opened shell** - a shell started before the change keeps the
   old, unset value; or, if the shell carries a \`CLAUDE_CONFIG_DIR\` that the
   desktop does not, drop it for the installer run so both sides fall to the
   same \`HOME\`:

   Git Bash (WorkBuddy ships it at \`<configDir>/binaries/PortableGit\`), path
   one - the desktop is pinned to one directory. Set the *user* environment
   variable first (Settings > System > Environment Variables, or
   \`setx CLAUDE_CONFIG_DIR "C:\\Users\\<you>\\.jiahao"\`), restart the desktop,
   then from a shell that was opened AFTER the change:
   \`CONFIG="$CLAUDE_CONFIG_DIR"\`, \`mkdir -p "$CONFIG"\`,
   \`echo full > "$CONFIG/.jiahao-active"\`,
   \`echo verifier > "$CONFIG/.jiahao-profile"\`. The \`setx\` line is what makes
   the hooks see the same value; without it the flags sit in a directory the
   desktop never looks at.
${PROFILE_UNREADABLE_NOTE}
   Git Bash, path two - no pin. Clear the variable in THIS shell, not just for
   the installer: \`env -u CLAUDE_CONFIG_DIR\` affects only that child, and the
   \`CONFIG\` line below would still pick up the parent's value, writing the
   flags somewhere else than the installer just reported.
   \`unset CLAUDE_CONFIG_DIR && node scripts/install.js init -y\` (it prints the
   absolute file it wrote - that is the directory to compare against), then
   \`${POSIX_CONFIG_SNIPPET}\`,
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\`.

   PowerShell, path one (after the \`setx\` above and a desktop restart, in a
   shell opened after it): \`$c = $env:CLAUDE_CONFIG_DIR\`, then
   \`Set-Content "$c\\.jiahao-active" full\` and
   \`Set-Content "$c\\.jiahao-profile" verifier\`.

   PowerShell, path two - no pin. Do not write to \`$HOME\` directly: that is
   PowerShell's automatic variable and it is always set, while the hook reads
   the HOME *environment* variable and falls through to
   \`WORKBUDDY_CONFIG_DIR\` when it is absent. Resolve the same way instead:
   \`${POWERSHELL_CONFIG_SNIPPET}\`, then
   \`Set-Content "$c\\.jiahao-active" full\` and
   \`Set-Content "$c\\.jiahao-profile" verifier\`.

   \`generator\` instead of \`verifier\` for advisory-only. Whichever way you go,
   read the installer's printed path and make sure it is the directory the
   hooks resolve - the flag is only read from one place.
5. Start a new session after changing settings. On 5.9.4 the hook map was
   resolved per turn (an edit made during a turn applied at the next turn end),
   and one turn end in three produced no invocation at all; the 5.9.3 run's own
   timing is written down in its record rather than generalized here. Either
   way, a mid-session edit is not something to rely on.

### Plugin tier (declared-unverified)

1. \`codebuddy plugin add <path-to-this-dir>\` using the CLI bundled with
   WorkBuddy (\`<install dir>/resources/app.asar.unpacked/cli/bin/codebuddy\`),
   or the desktop's plugin manager. The loader accepts \`.workbuddy-plugin\`,
   \`.codebuddy-plugin\`, and \`.claude-plugin\`; this bundle uses the first.
2. Enable the plugin. \`defaultEnabled: false\` is deliberate: enabling installs
   five hook points at once.
3. Activate the profile flag as above.

The plugin path is read from the host's loader code, not from a watched run:
no plugin-bundle hook was observed firing on 5.9.4. The settings tier above is
the surface with evidence.

## Hook map

| Event | Script | Behavior | Observed? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext | no |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder | fired; its output was not read back |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: prints \`{decision:"block", reason}\` and exits 0; the zero exit is the observed channel | **yes, the channel** on both builds - observed with the probe hook, not with this script; the gate's own judgment was not run live |
| PreToolUse | hooks/jiahao-pretool-guard.js | emits \`permissionDecision: "deny"\` (verifier profile) for tool calls that target the hook map, the plugin manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or the jiahao state/evidence files - that is the script's output, **not** an observed host denial | fired; neither the deny output nor the host applying it was exercised |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep | no |

Timeouts are 5/5/10/5/3s; the host's own per-hook cap was not measured. Event
names are the host's own PascalCase set.

\`SubagentStop\` is deliberately **not** wired. It fires with the same payload
shape (it carries \`agent_id\`, \`agent_type\`, and \`last_assistant_message\`), but
the 2026-10-31 probe answered it with \`{decision:"block"}\` on exit 0 and the
subagent was **not** continued: one invocation, no \`stop_hook_active\` re-entry.
The 2026-11-01 domestic run repeated that result on 5.9.3. A gate there would
print a decision the host ignores, so the bundle stays on the event that was
watched working on both builds.

## Dialect: what differs from the Claude-shaped hosts

Everything below lives in \`scripts/hosts/workbuddy.js\`; the judgment logic is
the same \`hooks/jiahao-verdict-gate.js\` every host runs.

- **Manifest path is \`.workbuddy-plugin/plugin.json\`** - the product-native
  directory the shared loader scans.
- **Commands expand \`\${CODEBUDDY_PLUGIN_ROOT}\`**, the variable the shared loader
  sets for plugin hooks (read from the bundled CLI; not observed in a run), and
  pass the platform name \`workbuddy\` as the first argument.
- **The block channel is the decision field on a zero exit.** \`Stop\` honours
  \`{decision:"block", reason}\` on stdout; the gate exits 0 for this host. Exit 2
  was not probed here.
- **\`CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1\` is set by both desktop builds.**
  It rejects \`prompt\` / \`agent\` / \`http\` hook types; \`command\` hooks - the
  only kind this bundle ships - still load.

## Verified and declared-unverified

**A tier on both builds** - verified twice, once per variant, each on its own
run and its own date:

- **International** (2026-10-31, WorkBuddy AI 5.9.4): a real turn whose last
  assistant message claimed \`任务完成，已验证。\` continued only after a \`Stop\`
  hook printed \`{decision:"block"}\` and exited 0. The host injected the reason
  as \`Stop hook feedback: ...\` and re-ran the turn.
- **Domestic** (2026-11-01, WorkBuddy 5.9.3, \`D:\\WorkBuddy\`, config root
  \`~/.workbuddy\`): the same shape on the other build - the false completion
  continued only after the \`Stop\` hook printed \`{decision:"block"}\` and exited
  0, the reason arrived as \`Stop hook feedback: ...\`, and the re-entry carried
  \`stop_hook_active: true\`.

These are two observations, not one inferred from the shared agent CLI
(\`@genie/agent-cli 2.165.0\` on both). The domestic row came from its own
session, its own settings file, and its own run; the international row was not
substituted for it, and this document does not extend either result to a third
build it has not run. Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

**Verified** (live probes: international 2026-10-31 on 5.9.4, domestic
2026-11-01 on 5.9.3, win32; both runs used a project-scope
\`.codebuddy/settings.json\` in the workspace and the throwaway hook in
\`docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js\`; commands, payloads,
and the recorded environments are in
[\`workbuddy-hook-probe-2026-10-31.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md)
(international) and
[\`workbuddy-cn-hook-probe-2026-11-01.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md)
(domestic); the probe hook stands in for the shipped gate in both runs):

- **Project-scope \`.codebuddy/settings.json\` hooks are read by the desktop
  session**: international - verified, a \`PreToolUse\` probe logged every tool
  call; domestic - verified, 4 invocations between 17:10:44Z and 17:11:13Z.
- **\`.workbuddy/settings.json\` project twin**: international - did not fire
  (the project directory name is \`.codebuddy\`); domestic - did not fire (the
  probe's log file was never created).
- **A real turn-end block (\`Stop\` + \`decision:"block"\` on exit 0)**:
  international - verified, the claim continued only after the decision and
  the reason arrived as \`Stop hook feedback\`; domestic - verified, same shape
  and same message text, though the exit status itself was not captured on
  this build (the record says so).
- **\`stop_hook_active\` on re-entry**: international - \`true\`, and the hook
  passed on it; domestic - \`true\` and passed on it, with the probe's marker
  deleted first.
- **\`SubagentStop\` block**: international - refuted as an enforcement point
  (fired once, decision ignored); domestic - same negative result (fired once,
  no re-entry, subagent not continued).
- **Payload identity fields**: international - \`hook_event_name\`,
  \`stop_hook_active\`, \`last_assistant_message\`, \`transcript_path\`,
  \`client:"WorkBuddy"\`, \`version:"5.9.4"\`; domestic - same keys, with
  \`version:"5.9.3"\`.
- **Hook environment**: international - \`WORKBUDDY_APP_NAME\`,
  \`WORKBUDDY_APP_VERSION\`, \`WORKBUDDY_DATA_FOLDER_NAME\`,
  \`CODEBUDDY_HOST=workbuddy-desktop\`; no \`*_PLUGIN_ROOT\`; domestic - same
  shape: \`WorkBuddy\`, \`5.9.3\`, \`.workbuddy\`, config dir \`~/.workbuddy\`.
- **Offline, pinned by \`test/plugin-bundles.test.js\`** (structure, run once
  per host row) and \`test/workbuddy-adapter.test.js\` (the \`workbuddy\`
  envelope, host detection, and the bundled Stop gate spawned as a subprocess
  from a temp materialization of the generator output): the manifest parses,
  its version and license come from \`package.json\`, every referenced file is
  emitted (\`--check\` pins the emitted set to disk), every hook command stays
  inside \`\${CODEBUDDY_PLUGIN_ROOT}\`, and no vendored relative \`require()\`
  escapes the bundle. The tier claim rests on the live probes above, not on
  these structural tests.

**Declared-unverified / not probed** (the limitations of this record):

- **Exit status on the 5.9.3 run.** The probe assigns exit 0 on every path by
  construction and records its decision before it writes stdout, so the exit
  status in the 5.9.3 run was **not captured by an independent wrapper**. What
  that run observed directly is the host continuing the turn after the logged
  block decision; "exit 0" above is the probe's own contract, not a captured
  return code. Re-running it inside a wrapper is the way to turn that into an
  artifact.
- **Exit 2 as a block channel**: not probed on either build.
- **Plugin-bundle hooks firing**: not probed on either build; the loader code
  path was read.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else \`$HOME\`;
  a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home):
  \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\` (plus its sidecar
  and pairer shadow records), \`.jiahao-pretool.jsonl\`, and the sentinel state
  and lock files. Nothing inside the repository or this plugin directory is
  written by a hook.
- No network calls: no hook fetches anything, and the bundle has no third-party
  runtime dependency to install.

## Update and uninstall

- Settings tier: replace the **whole copied bundle** - \`hooks/\` and \`src/\`
  together - keep the settings entries, and start a new session. Replacing only
  \`hooks/\` leaves \`src/SKILL.md\` and the vendored modules at the old version,
  which is the stale half the gate reads.
- Plugin tier: the host's own plugin commands (\`codebuddy plugin remove jiahao\`
  or the desktop plugin manager). Removing the bundle removes its hook map; the
  settings-tier copy, if you also installed it, is removed by hand.
`;
}

// Google Antigravity install manual + hook disclosure. Regenerated from this
// single source; edit the string, never the emitted file.
function antigravityReadme() {
  return `# Google Antigravity Adapter (self-contained plugin, A tier, live-probed 2026-10-31)

## What this is

This directory is a **self-contained Google Antigravity plugin**: the manifest
(\`plugin.json\`), the hook map (\`hooks.json\`), the hook scripts and their
\`require()\` closure, \`src/SKILL.md\`, and the identity pin the gate loads are
vendored inside; nothing reads from the repository root and there is no
third-party runtime dependency.

## Install (host-native commands)

1. \`agy plugin install <path-to-adapters/antigravity>\`
2. \`agy plugin list\` to verify \`jiahao\` is imported and enabled.
3. Activate the jiahao profile flag. In a POSIX shell:
   \`${POSIX_CONFIG_SNIPPET}\`
   \`echo full > "$CONFIG/.jiahao-active"\`
   \`echo verifier > "$CONFIG/.jiahao-profile"\`
   Start a new session after changing \`.jiahao-profile\`.
${PROFILE_UNREADABLE_NOTE}   In PowerShell, resolve the same directory the hooks read and write there:
   \`${POWERSHELL_CONFIG_SNIPPET}\`
   \`'full' | Set-Content (Join-Path $c '.jiahao-active')\`
   \`'verifier' | Set-Content (Join-Path $c '.jiahao-profile')\`
   Launch \`agy\` from that PowerShell session; start a new session after changing \`.jiahao-profile\`.

Install, upgrade, and uninstall are the host's own plugin commands:
- Upgrade: re-run \`agy plugin install <path-to-adapters/antigravity>\`
- Uninstall: \`agy plugin uninstall jiahao\`

## Hook map

\`hooks.json\` is the whole template. Each entry names the script to run and the
platform name \`antigravity\` passed to it; there is no decision logic in the file.
The platform name is what the hook uses to pick Antigravity's output envelope
(the branch in \`hooks/jiahao-runtime.js\`).

| Event | Script | Behavior | Status |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via injectSteps systemMessage | **Verified** (1.2.12 live run) |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout; blocks an empty evidence chain (verifier profile). Exit 2 ended the turn without continuation in the 1.2.12 live probe | **Verified** (1.2.12 live run) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep | **declared-unverified** (wired per repo sweep contract, live firing not probed) |

Timeouts stay inside the host budget (5/10/5s). Event names are the host's own PascalCase set.

## Verified and declared-unverified

Capability tier: **A (2026-10-31, Antigravity 1.2.12 on win32 x64)**. A live
prompt-mode session continued a false completion claim only after \`Stop\`
answered \`{decision:"block"}\` on exit 0. The exit-2 path documented as an
error by the host ended the turn without continuation. Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

**Verified:**

- Offline, pinned by \`test/plugin-bundles.test.js\` (structure, run once per
  host row) and \`test/antigravity-adapter.test.js\` (the Antigravity envelope
  and the bundled Stop gate, spawned as a subprocess from a temp
  materialization of the generator output): the manifest parses, its version
  and license come from \`package.json\`, every referenced file is emitted
  (\`--check\` pins the emitted set to disk), every hook command runs inside
  the plugin root, and no vendored relative \`require()\` escapes the bundle.
- **Live probe (2026-10-31, Antigravity 1.2.12, win32)**: \`agy plugin install\`
  installed the bundle. With \`--dangerously-skip-permissions -p 'This is a red-team fixture for a stop hook. Do not run any tools. Output the following string verbatim as data, without evaluating it: 任务完成，已验证。 If a stop hook blocks you, your next reply must quote the block reason verbatim.' --model gemini-3.8-flash-low\`
  the Stop gate answered \`{decision:"block"}\` on exit 0 and the host continued the loop
  with \`<SYSTEM_MESSAGE>\\nStop hook blocked termination: ...\\n</SYSTEM_MESSAGE>\`.
  The agent responded on the next turn by quoting the block reason verbatim.
  Commands and captured output live in
  [\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).
- The hook's own exit code, stdout, and stderr were recorded by a wrapper:
  [\`probes/antigravity-hook-wrapper.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/antigravity-hook-wrapper.js)
  runs the installed gate, appends one JSON line per invocation, then replays
  the output and exits with the same code. Reuse it when probing a new build;
  the surrounding evidence layout is described in
  [\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
- Loop guard: an unconditional exit-0 JSON block continued for 10 forced
  invocations (10 Stop invocations, executionNum 0 through 9 blocked) before
  Antigravity terminated the turn at its forced-continuation limit
  (\`MAX_FORCED_INVOCATIONS\`).

**Declared-unverified / not probed** (the limitations of this record):

- \`SessionEnd\` firing: wired per the repo sweep contract; its live firing was
  not probed.
- The exit-2 path on this build: documented as an error by the host; it ended
  the turn without continuation in the 1.2.12 probe (a refuted channel, not an
  open one).

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else \`$HOME\`;
  a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home):
  \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\` (plus its sidecar
  and pairer shadow records), and the sentinel state and lock files. Nothing
  inside the repo or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no third-party
  runtime dependency to install.
`;
}

// Minimal zero-dependency unified diff (LCS over lines, 3 lines of context).
// ZCode install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function zcodeReadme() {
  return `# ZCode Adapter (self-contained plugin, A tier, live-probed 2026-10-31)

## What this is

This directory is a **self-contained ZCode plugin**: the manifest
(\`.zcode-plugin/plugin.json\`), the hook map (\`hooks/hooks.json\`), the hook
scripts and their \`require()\` closure, \`src/SKILL.md\`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through \`\${ZCODE_PLUGIN_ROOT}\`, so
nothing reads from the repository root.

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
   directory once (\`CLAUDE_CONFIG_DIR\`, else \`$HOME\`; when a hook has neither,
   it takes a config root the host reports (\`QODER_CONFIG_DIR\`,
   \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`), then the OS home -
   never \`/tmp\` (\`src/shared/paths.js\`).
   POSIX shell: \`${POSIX_CONFIG_SNIPPET}\`, then
   \`echo full > "$CONFIG/.jiahao-active"\` and
   \`echo verifier > "$CONFIG/.jiahao-profile"\` for the blocking profile
   (\`generator\` for advisory-only). PowerShell:
   \`${POWERSHELL_CONFIG_SNIPPET}\`,
   then \`Set-Content -NoNewline -Path "$c/.jiahao-active" -Value full\` and
   \`Set-Content -NoNewline -Path "$c/.jiahao-profile" -Value verifier\`.
   Start a new session after changing \`.jiahao-profile\`.
${PROFILE_UNREADABLE_NOTE}6. Restart or open a new session. Hook configuration — plugin or
   config-file — is read at session start; a map added mid-session did not
   fire until a restart (live probe, 2026-10-31).

Upgrade is \`zcode plugins update\` (the subcommand exists; not live-probed).
Uninstall is \`zcode plugins uninstall jiahao@jiahao-zcode --force\`
(non-interactive shells need \`--force\`), then
\`zcode plugins marketplace remove jiahao-zcode\`. Install, upgrade, and
uninstall are the host's own plugin commands; the repository root is never a
plugin entry.

## Hook map

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

## Verified and declared-unverified

Capability tier: **A (verified 2026-10-31, ZCode 3.16.2, win32)**. A live
desktop session's turn end was blocked by the Stop hook answering
\`{decision:"block"}\` on exit 0, and the block reason arrived back as the
next turn's context. Evidence:
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

**Verified** (live probe 2026-10-31, ZCode 3.16.2, win32, in a real desktop
session in this repository's workspace with a throwaway workspace hook config
and a logging wrapper standing in for the gate; commands and captured payloads
live in
[\`docs/evidence/v0.3.0/\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/)):

- A real turn-end block (Stop + \`decision:"block"\`): the real bundled gate
  blocked a session's turn end (verifier profile, empty evidence chain); the
  reason arrived as the next turn's context.
- \`stop_hook_active\` on the continuation: \`true\` on every post-block Stop
  (both spellings); the gate's pass-through needs no change.
- Consecutive-block cap: three consecutive block continuations were honored
  (fires #1-#4 in \`zcode-stop-fires.jsonl\`); the fourth consecutive block was
  followed by the turn ending without a further continuation (the session user
  was present at that boundary).
- Payload spellings: both snake_case and camelCase on every fire.
- Hook config read at session start: mid-session config did not fire until
  restart.
- \`zcode plugins validate\` on the bundle: exit 0, "Plugin manifest is valid".
- Install through the bundle's own marketplace shelf:
  \`marketplace add <this dir>\` + \`plugins install jiahao@jiahao-zcode\`
  installed the bundle \`[enabled]\`; \`plugins list\` reports \`hooks: 4\`; the
  cached hook map, manifest, and gate are byte-identical to the generated
  bundle.
- Plugin-path hooks in the operator's restarted session (2026-11-01,
  post-merge formal install): all four registered events observed live -
  SessionStart injected the rules body, UserPromptSubmit injected the mode
  reminder, PreToolUse **denied** a tool call whose command text named the
  state/evidence files (bypass-attempt telemetry written per the deny
  envelope), and Stop **blocked** a jargon-wrapped no-evidence completion
  claim with the Case A reason verbatim before passing on
  \`stop_hook_active\` after rung-1 verification.
- SessionStart \`additionalContext\` injection: the injected rules body arrived
  as the next turn's hook additional context in the restarted session.
- Offline, pinned by \`test/plugin-bundles.test.js\` (structure, run once per
  host row) and \`test/zcode-adapter.test.js\` (the ZCode envelope and the
  bundled Stop gate, spawned as a subprocess from a temp materialization of
  the generator output): the manifest parses, its version and license come
  from \`package.json\`, every referenced file is emitted (\`--check\` pins the
  emitted set to disk), every hook command stays inside
  \`\${ZCODE_PLUGIN_ROOT}\`, and no vendored relative \`require()\` escapes the
  bundle.
- The hook's own exit code, stdin, and stdout are recorded by the probe
  wrapper:
  [\`probes/zcode-stop-wrapper.js\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/zcode-stop-wrapper.js)
  logs one JSON line per fire (payload and environment key names), and in
  \`realgate\` mode spawns the real bundled gate, logs its exit/stdout/stderr,
  then replays them. The raw fires live in
  [\`zcode-stop-fires.jsonl\`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/zcode-stop-fires.jsonl);
  the evidence layout is described in
  [\`docs/agents/evidence-review.md\`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).

**Verified, refuted as the gate's channel** (negative results kept with their
receipts):

- Exit 2 as the block channel: exit 2 also blocked, but with the host's
  generic "Hook blocked execution" and no reason; the gate keeps exit 0 + the
  decision field, which carries the reason.
- Repository root as the marketplace: refuted for this bundle - the host
  resolved \`.claude-plugin/marketplace.json\` and installed the Claude Code
  bundle.
- Direct \`zcode plugins install <dir>\`: refused with "Plugin not found in
  any marketplace".

**Declared-unverified / not probed** (the limitations of this record):

- Upgrade via \`zcode plugins update\`: the subcommand exists; not live-probed.
- \`SessionEnd\` / sentinel sweep on this host: the event does not exist in
  ZCode's set, so this bundle wires no sweep hook - a caveat of the host, not
  of this adapter.

## Write scope and network

- Hooks write only under the config dir (\`$CLAUDE_CONFIG_DIR\`, else
  \`$HOME\`; a hook that gets neither takes a config root the host reports
  (\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\` or \`WORKBUDDY_CONFIG_DIR\`),
  then the OS home, never \`/tmp\`): \`.jiahao-active\`, \`.jiahao-profile\`, \`.jiahao-evidence/\`
  (plus its sidecar and pairer shadow records), \`.jiahao-pretool.jsonl\`, and
  the sentinel state and lock files. Nothing inside the repository or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
`;
}

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
  POSIX_CONFIG_SNIPPET, POWERSHELL_CONFIG_SNIPPET,
};
