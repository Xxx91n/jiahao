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
// The profile instructions every adapter README repeats, verbatim, so the
// eight copies cannot drift apart (#152).
const PROFILE_SECTION = `## Set the profile

The hooks get the profile from one file, \`.jiahao-profile\`, in the config
directory. Write \`verifier\` to block a completion claim when the turn has no
evidence. One limit: an older record with no session id counts for every
session, so it can let an unsupported claim through. Write \`generator\` to only
remind. If the file is missing, the hooks use \`verifier\`.

The config directory is the first one of these that the process has:
\`CLAUDE_CONFIG_DIR\`, then \`HOME\`, then a root the host reports
(\`QODER_CONFIG_DIR\`, \`CODEBUDDY_CONFIG_DIR\`, \`WORKBUDDY_CONFIG_DIR\`), then
\`USERPROFILE\`, then the OS home. It never falls back to \`/tmp\` on its own;
if you point one of those variables at \`/tmp\`, that is where the files go.

POSIX shell:

\`\`\`bash
${POSIX_CONFIG_SNIPPET}
echo full > "$CONFIG/.jiahao-active"
echo verifier > "$CONFIG/.jiahao-profile"
\`\`\`

PowerShell:

\`\`\`powershell
${POWERSHELL_CONFIG_SNIPPET}
Set-Content -NoNewline -Path "$c/.jiahao-active" -Value full
Set-Content -NoNewline -Path "$c/.jiahao-profile" -Value verifier
\`\`\`

Use \`generator\` in place of \`verifier\` for reminders only. Start a new session
after you change the file. All agents that use the same config directory share
this file; give each one its own directory when they need different profiles.

If \`.jiahao-profile\` cannot be read (a folder sits there, or the permissions
are wrong), the hooks use \`verifier\` and print a \`[config]:\` note on stderr.
`;

// The files a hook may write, and the network statement. One builder so a host
// with no PreToolUse hook does not claim a pretool log it never writes, and the
// one host with an MCP server states its extra packages instead of inheriting
// the hooks-only sentence.
function writeScope(options) {
  const guard = options && options.guard;
  const mcp = options && options.mcp;
  return `## Files the hooks write, and network

Hooks write only inside the config directory: \`.jiahao-active\`,
\`.jiahao-profile\`, \`.jiahao-evidence/\` (plus its \`.jiahao-evidence.keys\` file
and the extra records the hooks keep)${guard ? ', `.jiahao-pretool.jsonl`' : ''}, and the
state and lock files used for cleanup. Normally no hook writes inside the
repository or this plugin folder; if you point the config directory at one of
them, the files land there.

No hook calls the network. ${mcp
    ? 'The hooks have no third-party runtime dependency.\nThe MCP server has two: `@modelcontextprotocol/sdk` and `zod`; step 3 installs\nthem.'
    : 'The plugin has no third-party runtime dependency to\ninstall.'}
`;
}
const WRITE_SCOPE = writeScope();
const WRITE_SCOPE_WITH_GUARD = writeScope({ guard: true });
const WRITE_SCOPE_WITH_GUARD_AND_MCP = writeScope({ guard: true, mcp: true });

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
  return `# CodeBuddy plugin

## What this is

This folder is a complete plugin. CodeBuddy reads \`.claude-plugin/\` and
\`\${CLAUDE_PLUGIN_ROOT}\` as they are; \`\${CODEBUDDY_PLUGIN_ROOT}\` wins when it
is set. Copy the whole folder as the plugin root. The hook scripts, the files
they load, \`src/SKILL.md\`, and the \`jiahao-mcp\` server are all inside.

## Install

1. \`codebuddy plugin install <path-to-this-dir>\` (CLI), or use the IDE plugin
   manager.
2. Turn the plugin on. \`defaultEnabled: false\` is on purpose: plugin hooks
   skip the \`allowUntrustedFrontmatterHooks\` check and run as soon as the
   plugin is on.
3. Install the MCP server once: run \`npm install --omit=dev\` inside the
   folder's \`jiahao-mcp/\`. The server source is inside the folder; its
   packages are not. The folder's \`.mcp.json\` starts it at
   \`\${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js\`.

Another way, through the CLI settings file: merge the hook list into
\`.codebuddy/settings.json\` and copy the rules into \`.codebuddy/rules/\`.
SessionStart, PreToolUse, and PostToolUse were watched on the settings path.
The turn end was not watched on this host; see "What was tested" below.

${PROFILE_SECTION}

## Check it works

- The plugin shows as enabled in CodeBuddy's plugin manager.
- The \`.mcp.json\` server connects and lists its tools.
- The hooks in \`.codebuddy/settings.json\` run at session start and around
  tool calls.
- A turn-end block has not been tested on this host.

## Hooks

Plugin hooks in \`hooks/hooks.json\` skip the trust check that skill and agent
frontmatter go through: they run when the plugin is on. This plugin wires
seven events.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks (exit 2 + \`{"decision":"block"}\`) when there is no proof |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |
| InstructionsLoaded | hooks/jiahao-instructions-assert.js | records that both rule files are present, with their sha256, in the log |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/5/10/3/5/5s, inside the host's 60s per-hook limit. Commands are
\`node\` calls that work in Git Bash; cmd and PowerShell are not supported by
this host. Event names are case-sensitive.

## Two rule files load together

The folder ships \`rules/jiahao-verifier.md\` and \`rules/jiahao-generator.md\`,
both with \`alwaysApply: true\`. The hook injects the profile named in
\`.jiahao-profile\`, but if the host loads both rule files, both sets of
instructions are active. Which file wins at the rule level is not tested.

## What was tested

Tested on CodeBuddy Code CLI 2.151.0 in a real session:

- \`.codebuddy/settings.json\` hooks at SessionStart, PreToolUse, and
  PostToolUse ran; the \`hook_event_name\` + \`hookSpecificOutput\` JSON shape
  was seen.
- The PreToolUse \`permissionDecision: "deny"\` reply was seen.
- \`.mcp.json\` registration worked: the server connected over stdio and
  listed its tools.

Not tested yet:

- IDE-side hooks, including whether \`InstructionsLoaded\` fires.
- Which of the two \`alwaysApply\` rule files wins, in either form.
- An \`npx\` install next to a \`codebuddy plugin install\`.
- The plugin path on the CLI. The docs say it is compatible; no run was
  watched.
- A turn-end block on this host. The live checks above cover session start
  and tool calls, not the turn end.

Windows note: the upstream \`\${CLAUDE_PLUGIN_ROOT}\` expansion bug may also
appear here. The settings path above is the one with evidence.

${WRITE_SCOPE_WITH_GUARD_AND_MCP}

This host also writes \`.jiahao-instructions.jsonl\`: the log from the
InstructionsLoaded hook. It contains session IDs.

## Before trusting it as a product

The outside effectiveness trial (install + Phase 0/1/2 in a real CodeBuddy
environment) is an owner action, not something an agent runs. Protocol:
\`.scratch/grill-t30/protocol.md\`; judgment lines:
\`bench/codebuddy-trial/judgment-lines.json\` (fixed in advance; changes go in
errata records).
`;
}


// Qoder install manual. One directory, three surfaces with three different
// claims: the Desktop plugin bundle (A tier on each Desktop build, each measured
// by its own probe), the rules version's standard skill directory (#106, text
// only), and the IDE/CLI rule file (text only). The wording keeps the surfaces
// apart so neither the skill directory nor `.qoder/rules/` reads as a hook, and
// so the blocking claim names the build it was observed on.
function qoderReadme() {
  return `# Qoder plugin and rules

## What this is

This folder has two install paths:

- A Qoder Desktop plugin: \`.qoder-plugin/plugin.json\`, \`hooks/hooks.json\`,
  the hook scripts and the files they load, and \`src/SKILL.md\`. Everything it
  needs is inside the folder.
- \`rules/jiahao.md\` for the Qoder IDE/CLI rules path. It is a text file and
  registers nothing.

## Install the Desktop plugin

1. Zip this folder so that \`.qoder-plugin/\` is at the archive root.
2. In the Desktop app's plugin settings, install that archive at user scope.
3. Start a new session. Hook configuration is read at session start; an open
   session does not pick it up.

## Install the rules version (no hooks)

For instructions only:

\`\`\`bash
npx skills add Xxx91n/jiahao -g -a qoder-cn -y --copy   # Qoder CN
npx skills add Xxx91n/jiahao -g -a qoder -y --copy      # international alias (not tested here)
\`\`\`

- Qoder CN writes \`~/.qoder-cn/skills/jiahao/SKILL.md\`. On 2026-10-31 the
  command exited 0 and the installed file's SHA-256 matched
  \`skills/jiahao/SKILL.md\` (Run A). A fresh session showed the skill visible
  in #106's Run B, a separate run not repeated here. Record:
  \`docs/evidence/v0.3.0/qoder-desktop-install-2026-10-31.md\`.
- The international alias is expected to write
  \`~/.qoder/skills/jiahao/SKILL.md\` by the skills CLI's host table, but
  loading there was not tested.
- This path is plain text. No hook runs and nothing is blocked by it.

${PROFILE_SECTION}

## Check it works

- The Desktop plugin shows as installed and enabled in the app's plugin
  settings, and a new session starts without a hook error.
- On both Desktop builds, a Stop hook in \`.qoder/settings.json\` blocked a
  false "done" claim and continued the turn. That was the test hook, not this
  plugin's gate; the plugin path was not watched (see below).
- The rules version: \`~/.qoder-cn/skills/jiahao/SKILL.md\` exists after the
  \`npx skills add\` command.

## Qoder IDE/CLI rules

The IDE/CLI reads project rules from \`.qoder/rules/\`
(https://docs.qoder.com/zh/user-guide/rules). \`rules/jiahao.md\` is that exit:

1. Copy \`rules/jiahao.md\` into \`.qoder/rules/\` in the project.
2. Keep \`alwaysApply: true\` in the frontmatter. Qoder's rules docs say rules
   without a \`paths\` or \`trigger\` selector load eagerly, and
   \`alwaysApply: true\` is one of the always-on forms.
3. Start a new Qoder session. The file is plain Markdown; no script runs.

The rule file registers nothing: it is not a hook and it is not the Desktop
plugin. The project path is the one Qoder documents. A user-level rules
folder is not documented there and is not offered here.

Do not copy this folder's rule file into a Desktop rules path. Each Desktop
build has its own config root: \`~/.qoder-cn\` for CN and \`~/.qoder\` for the
international build (measured 2026-11-01: the international hook process
reports \`QODER_CONFIG_DIR=C:\\Users\\Administrator\\.qoder\`). #106 found
\`~/.qoder/rules\` unloaded, but that check ran from a CN session, whose root
is \`~/.qoder-cn\`; it says nothing about the international build. That
question is still not tested, so no rules path is offered for either Desktop
build.

## Hooks

\`hooks/hooks.json\` wires four events. The platform name \`qoder\` is passed to
each script; that tells the script which JSON shape to use.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn when there is no proof |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 5/5/10/3s.

## What a real session showed on Qoder CN Desktop 0.4.11 (#109, 2026-10-31)

A \`Stop\` hook in the project's \`.qoder/settings.json\` fired and continued the
turn:

- exit 0 with \`{"decision":"block","reason":"..."}\` on stdout: the host added
  the reason as a user message and the model ran another turn;
- exit 2 with the reason on stderr: same result;
- the input data is Claude-shaped (\`session_id\`, \`cwd\`, \`transcript_path\`,
  \`hook_event_name\`, \`last_assistant_message\`) and the host sets
  \`stop_hook_active: true\` on every re-entry;
- 6 blocks in a row were honored before the test's own cap ended the run. The
  test cap, not a host limit, ended it; whether the host has a limit above six
  is not known.

Which messages were held: 6 of the 10 blocks (exit-0 channel) were on
"completed and verified" claims with nothing behind them; 1 was the same
claim wrapped in a "this is test data" note; 3 (exit-2 channel) were literals
that said nothing had been verified. The exit-2 run shows the host honors a
block on that channel; it is not proof that a false claim was caught.

Raw calls: \`docs/evidence/v0.3.0/qoder-hook-calls.jsonl\`. Run record:
\`docs/evidence/v0.3.0/qoder-hook-probe-2026-10-31.md\`.

## What a real session showed on Qoder international Desktop 0.4.11 (#113, 2026-11-01)

The other build reproduced the CN result on its own run:

- \`Stop\` exists and fires; the input has the same Claude-shaped fields, and
  \`transcript_path\` lands under \`~/.qoder/projects/<slug>/\`;
- both channels block and continue: exit 0 with the flat decision and exit 2
  with the reason on stderr;
- \`stop_hook_active: true\` on every re-entry;
- 3 blocks in a row were honored before the test's cap ended the run;
- project-level \`.qoder/settings.json\` registered the hook, and a
  \`.qoder-cn/settings.json\` beside it never fired;
- the hook process gets \`QODER_PROJECT_DIR\`, \`QODER_CONFIG_DIR\`,
  \`USERPROFILE\`, \`TEMP\`, and \`TMP\`, but no \`QODER_SESSION_ID\`, no
  \`CLAUDE_CONFIG_DIR\`, and no \`HOME\`. This was measured on a project-level
  hook. The plugin path was not watched starting a hook, so whether it
  passes the same variables is not proven.

Messages held: 5 "completed and verified" claims with nothing behind them
(runs 1, 3, 4), and 2 literals that said nothing was verified (run 2's
exit-2 channel and run 5). The 5 were dictated by the test prompt, so they
show the host honors a block on that channel, not that the model wrote the
claim.

Counts agree: 12 hook calls in \`docs/evidence/v0.3.0/qoder-intl-hook-calls.jsonl\`,
12 \`hook.finished\` lines, 7 block-feedback records, and 2 per-call stream
records. Run record:
\`docs/evidence/v0.3.0/qoder-intl-hook-probe-2026-11-01.md\`.

## Not tested yet

- **Installing this folder as a Desktop plugin.** The host's own bundled
  plugin shows the international build carries a Stop event, but a Stop
  arriving through the plugin path was not watched blocking on either build.
  Every live block above came through \`.qoder/settings.json\`.
- **The shipped gate on this host.** Every block above came from the test
  script, not from \`jiahao-verdict-gate.js\`. What is proven is the host
  channel, not this plugin's judgment under Qoder.
- **\`additionalContext\` reaching the model.** The reply has the shape the
  host's schema asks for; no injection was watched in the #109 session.
- **\`SessionEnd\` firing and its timeout.** Wired for cleanup, never observed.
- **\`\${QODER_PLUGIN_ROOT}\` in a shell-form command.** The host's own plugin
  uses that name, but the test ran exec-form hooks, so this spelling was not
  watched resolving.
- **A \`QODER_SESSION_ID\` in the hook process.** It is absent, which is why
  the hook list passes the platform name \`qoder\` on the command line.
- **Where jiahao's state lands on this host.** The hook process gets neither
  \`CLAUDE_CONFIG_DIR\` nor \`HOME\`, so before #116 \`src/shared/paths.js\` fell
  to its last resort and a hook started by Qoder read and wrote
  \`.jiahao-profile\` and \`.jiahao-evidence\` under \`<drive>:\\tmp\` instead of
  the \`QODER_CONFIG_DIR\` (\`~/.qoder-cn\` on CN, \`~/.qoder\` on international)
  the host names. \`paths.js\` now takes that host root after
  \`CLAUDE_CONFIG_DIR\` and \`HOME\`. The spawned-hook tests in
  \`test/config-dir.test.js\` run the hooks under the environment the #109
  test recorded and read the directory back. **That environment was recorded
  on a project-level hook**; whether the plugin path passes the same
  variables was not observed. The live half (a Qoder session whose evidence
  chain is seen in \`~/.qoder-cn\`) is not in this repository's records.
- **\`PreToolUse\` and \`SubagentStop\`.** Not wired here; neither was exercised.

## Qoder Desktop plugin

Install from the local archive as above. Reinstall a new archive to upgrade,
then start a new session.

## What this folder does not do

- No installer command: the Desktop app installs the archive through its own
  settings, and the IDE/CLI path is a file copy.
- No claim about the IDE/CLI line beyond the text above. Both Desktop builds
  carry their own test; neither borrows the other's.
- No MCP server registration in this folder.

## What we tested

- The folder is complete and the hook list is generated from the same source;
  \`Stop\` runs the completion check. Pinned by tests.
- The turn-end block was watched twice in real sessions, one per Desktop
  build, both through a project-level \`.qoder/settings.json\` hook.
- The test scripts are \`docs/evidence/v0.3.0/probes/qoder-stop-probe.js\`
  (CN) and \`docs/evidence/v0.3.0/probes/qoder-intl-probe-hook.js\`
  (international). The checklist both runs are reviewed against is
  \`docs/agents/evidence-review.md\`.
- Not tested: this folder installed as a Desktop plugin, and Qoder IDE/CLI
  rule loading.

## Update

- Desktop plugin: reinstall the archive built from this folder, then start a
  new session.
- Rules version: run the same \`npx skills add\` command, then start a new
  session.
- IDE/CLI: copy \`rules/jiahao.md\` again after a release.

${WRITE_SCOPE}

The body is generated from \`src/SKILL.md\`; \`node scripts/build-adapters.js --check\`
keeps the committed copy identical to the generator output.
`;
}

// Claude Code install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function claudeCodeReadme() {
  return `# Claude Code plugin

## What this is

This folder is a complete plugin. It holds the plugin manifest
(\`.claude-plugin/plugin.json\`), the hook list (\`hooks/hooks.json\`), every file
the hooks load, \`src/SKILL.md\`, and the identity file the gate reads. Nothing
it needs lives outside this folder.

The MCP server (\`jiahao-mcp/\` at the repository root) is not part of this
plugin. It stays in the repository, but it does not install with this plugin.

## Install

The repository root is the marketplace: \`.claude-plugin/marketplace.json\`
points at \`./adapters/claude-code\`.

1. \`claude plugin marketplace add Xxx91n/jiahao\`
2. \`claude plugin install jiahao@jiahao\`
3. Turn the plugin on. \`defaultEnabled: false\` asks the host to leave it off
   after install. If your host ignores that field, it turns the plugin on
   anyway; turning it on is the approval step.
4. When the plugin is on, the bundled SessionStart hook writes
   \`.jiahao-active\`, and the default profile is \`verifier\`. The Stop hook is
   then armed from the first turn. This comes from the hook code, not from a
   real session test. \`/jiahao off\` deletes the flag and disarms the Stop
   hook, the reminder, and the tool guard. The SubagentStart injection does
   not use the flag.

${PROFILE_SECTION}

## Check it works

- \`claude plugin list\` shows \`jiahao\` as installed and enabled.
- After one real session, \`.jiahao-active\` exists in the config directory.
- With the \`verifier\` profile, start a session and claim a task is done
  without running anything. The Stop hook should stop the turn.

## Hooks

\`hooks/hooks.json\` sits at the plugin root, so the host finds it as soon as
the plugin is on.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn (exit 2) when there is no proof; the reason goes to stdout |
| SubagentStop | hooks/jiahao-verdict-gate.js | the same check when a subagent finishes |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/5/10/10/5/5s, inside the host's 60s per-hook limit.
\`InstructionsLoaded\` is not supported in this plugin: that check hashes
\`rules/jiahao-*.md\`, and a Claude Code plugin has no plugin-level \`rules/\`
folder for the host to load.

## What was tested

**Tested:**

- \`claude plugin marketplace add\`, \`claude plugin install\`,
  \`claude plugin enable\`, and \`claude plugin list\` all exited 0 on Claude
  Code 2.1.251 (\`docs/release-notes-v0.2.0.md\`).
- The SessionStart hook ran in a real session: \`.jiahao-active\` appeared
  (\`docs/release-notes-v0.2.0.md\`).
- The bundled Stop hook, run from a temporary copy of the generated files,
  exits 2 and blocks when the evidence log is empty.
- Offline checks in \`test/plugin-bundles.test.js\` and
  \`test/claude-code-plugin.test.js\`: the manifest parses, the version and
  license come from \`package.json\`, the marketplace \`source\` points at this
  folder, every referenced file is generated, every hook command stays inside
  \`\${CLAUDE_PLUGIN_ROOT}\`, and no relative \`require()\` points outside the
  plugin.

**Not tested yet:**

- The rules text from SessionStart reaching the model.
- A Stop block fired by the host at a real turn end. The 2026-02 model
  endpoint returned 401 before a full loop ran, and the empty-evidence block
  came from running the installed gate copy by itself, not from a host event.
  Owner actions: #64.

This plugin follows the host's documented contract. It does not claim a live
run.

${WRITE_SCOPE_WITH_GUARD}

## Update and uninstall

Use the host's own plugin commands. The repository root is not a plugin entry.
`;
}

// GitHub Copilot CLI install manual + dialect disclosure. Regenerated from this
// single source; edit the string, never the emitted file.
function copilotCliReadme() {
  return `# GitHub Copilot CLI plugin

## What this is

This folder is a complete plugin for GitHub Copilot CLI. It holds \`plugin.json\`,
\`hooks/hooks.json\`, every file the hooks load, and \`src/SKILL.md\` (the rules
text the sessionStart hook injects). Every hook command uses \`$PLUGIN_ROOT\`,
which Copilot CLI sets for plugin hooks (it also sets \`COPILOT_PLUGIN_ROOT\`
and \`CLAUDE_PLUGIN_ROOT\`). Nothing reads from the repository root.

## Install

1. \`copilot plugin install <path-to-this-dir>\` (native command; \`/plugin
   install\` inside a session does the same). The install ran the bundled
   hooks in a real test. The CLI warns that direct installs are deprecated in
   favor of marketplace installs.
2. The plugin is on after install (\`copilot plugin list --json\` reports
   \`enabled: true\`); a direct install needed no \`enabledPlugins\` entry.
   Project-level settings hooks need folder trust in prompt mode:
   \`--trust-folder\` (or \`COPILOT_ALLOW_ALL=true\`). The test used
   \`--trust-folder\`.

${PROFILE_SECTION}

## Check it works

- \`copilot plugin list --json\` reports \`enabled: true\`.
- With \`verifier\`, a claim of "done, verified" with nothing behind it gets
  blocked. Tested on Copilot CLI 1.0.105 on 2026-10-30.

## Hooks

| Event | Script | What it does |
| --- | --- | --- |
| sessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| subagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| userPromptSubmitted | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| agentStop | hooks/jiahao-verdict-gate.js | prints \`{"decision":"block","reason":"..."}\` and exits 0; the zero exit is required for the host to honor it |
| sessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 10/10/10/30/10s, inside the host's 30s limit.

## What is different on this host

- Event names are camelCase (\`sessionStart\`, \`agentStop\`), not
  \`SessionStart\`/\`Stop\`. A copied PascalCase list is ignored.
- Each entry has a \`bash\` branch and a \`powershell\` branch. The host picks
  one by OS; \`$PLUGIN_ROOT\` and \`$env:PLUGIN_ROOT\` expand to the installed
  folder. There is no \`command\` key.
- The block channel is the decision field on a zero exit. \`agentStop\` honors
  \`{"decision":"block","reason":"..."}\` on stdout. This folder wires
  \`agentStop\` only.
- Exit 2 is logged as a failed hook and ends the turn without a
  continuation, even when the decision field is on stdout. That is why the
  gate exits 0 for this host. Any other non-zero code does not block.
- The host allows 8 block continuations in a row. The test saw 9 \`agentStop\`
  calls and 9 assistant messages; the ninth block did not continue. The gate
  lets \`stop_hook_active\` pass, so a normal turn blocks once and then ends.

## What was tested

Tested on 2026-10-30 with Copilot CLI 1.0.105 on win32, in a real prompt-mode
session (\`copilot -p ... --trust-folder\`) with an isolated \`COPILOT_HOME\` and
the installed folder. Commands and output: \`docs/evidence/v0.3.0/\`.

- A real turn-end block (\`agentStop\` + decision on exit 0): the claim
  \`任务完成，已验证。\` continued only after the block; the reason arrived as
  the next user message.
- \`copilot plugin install\` read \`plugin.json\` and \`hooks/hooks.json\` and ran
  the bundled sessionStart and agentStop hooks.
- \`.claude/settings.json\` was read too: SessionStart and Stop entries ran; a
  hand-written Claude-schema Stop block (exit 0) also continued the turn. The
  jiahao plugin installs as a Copilot plugin, not through this file.
- \`COPILOT_PLUGIN_DATA\` was set for plugin hooks, so \`detectHost()\` picks the
  Copilot shape.
- camelCase input (\`sessionId\`) was seen in the plugin hook input and
  normalized by \`hooks/jiahao-runtime.js\`.
- 8 block continuations were honored, then the CLI ended; the ninth block
  did not continue.
- \`sessionEnd\` fires for plugin hooks: the last session's event log has
  \`sessionEnd\` entries.
- Exit 2 as the block channel: tested and it does not block. It ended the
  turn without a continuation, so the gate exits 0 for Copilot.

Not tested yet:

- \`userPromptSubmitted\` output reaching the model. The mode reminder is
  advisory and does not gate.
- \`enabledPlugins\` in \`.github/copilot/settings.json\` or
  \`~/.copilot/settings.json\`: not needed for a direct install (the plugin is
  on after install); marketplace install was not tested.

${WRITE_SCOPE}

## Update

Use the host's own plugin commands. The repository root is not a plugin entry.
`;
}

// Codex CLI install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function codexReadme() {
  return `# Codex CLI plugin

## What this is

This folder is a complete Codex CLI plugin. It holds
\`.codex-plugin/plugin.json\`, \`hooks/hooks.json\`, every file the hooks load,
\`src/SKILL.md\`, and the identity file the gate reads. It has no third-party
runtime dependency. Every hook command uses \`\${PLUGIN_ROOT}\`, so nothing
reads from the repository root.

## Install

The repository root is also a Codex marketplace:
\`.agents/plugins/marketplace.json\` points at \`./adapters/codex\`.

1. \`codex plugin marketplace add Xxx91n/jiahao\`
2. \`codex plugin add jiahao --marketplace jiahao\`
3. Trust the plugin's hook commands once, through \`/hooks\`. Codex skips an
   untrusted hook without a message. In the test, an untrusted plugin's hooks
   did not run in \`codex exec\`. For unattended automation, either keep that
   trust (the \`/hooks\` flow; checked in the host's source, not step by step) or pass
   \`--dangerously-bypass-hook-trust\` after checking the source.

${PROFILE_SECTION}

Codex 0.163.0 has hooks on by default: \`codex features list\` reports
\`hooks stable true\`, and a fresh \`CODEX_HOME\` with no \`config.toml\` ran the
plugin's hooks. This recipe needs no \`[features] hooks\` switch. The trust
step is separate and required. If an older build refuses the hooks, look for
that switch in \`$CODEX_HOME/config.toml\`; do not copy a flag block from here.

## Check it works

- \`codex plugin add\` exits 0, and the plugin's hooks run after you trust
  them in \`/hooks\`.
- With \`verifier\`, a false "done" claim gets blocked. Tested on
  codex-cli 0.163.0 on 2026-10-30.

## Hooks

\`hooks/hooks.json\` is the whole template. Each entry names the script and
passes the platform name \`codex\`; the script uses that name to pick the
host's JSON shape.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + \`{"decision":"block"}\` on stdout, and the same reason on stderr for host logs; blocks an empty evidence log (verifier profile) |
| SubagentStop | hooks/jiahao-verdict-gate.js | the same check when a subagent finishes (wired for parity; not separately tested) |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 5/5/5/10/10/3s (Codex caps \`SessionEnd\` at 3s).

## What was tested

Tested on 2026-10-30 with codex-cli 0.163.0 on win32. A real prompt-mode
session continued a false claim only after \`Stop\` answered
\`{"decision":"block"}\` on exit 0. The documented exit-2 + stderr path ended
the turn without a continuation on this build. Evidence:
\`docs/evidence/v0.3.0/\`.

- \`codex plugin marketplace add <local path>\` and
  \`codex plugin add jiahao --marketplace jiahao\` installed the folder.
- Without stored trust, hooks were skipped in \`codex exec\` and the false
  claim passed. With \`--dangerously-bypass-hook-trust\`, the Stop gate
  answered the block and the next model turn quoted the reason.
- The hook's exit code, stdout, and stderr were recorded by a wrapper, not
  read from the host log: \`docs/evidence/v0.3.0/probes/codex-hook-wrapper.js\`.
  It runs the installed gate, appends one JSON line per call, then replays
  the output and exits with the same code. Reuse it on a new build. The
  evidence layout is in \`docs/agents/evidence-review.md\`.
- A loop guard: an unconditional exit-0 block in a throwaway user Stop hook
  continued for 785 runs (786 assistant messages, 33M input tokens) before
  the host ended the turn. No small cap like Copilot's 8 appeared. The
  bundled gate is not unconditional: it passes when the host sends
  \`stop_hook_active\` on the continuation, so it blocks once per turn.
- Offline checks in \`test/plugin-bundles.test.js\` and
  \`test/codex-adapter.test.js\`: the manifest parses, the version and license
  come from \`package.json\`, the marketplace \`source.path\` points at this
  folder, every referenced file is generated, every hook command stays
  inside \`\${PLUGIN_ROOT}\`, and no relative \`require()\` points outside the
  folder.

Tested and did not work:

- Exit 2 as the block channel: on 0.163.0 it ended the turn without a
  continuation, so it does not block.

Not tested yet:

- The interactive \`/hooks\` trust-and-restart flow, step by step.
- \`SubagentStop\` on its own (wired for parity; \`Stop\` was tested).

${WRITE_SCOPE}

## Update and uninstall

Use the host's own plugin commands. The repository root is not a plugin entry.
`;
}

// WorkBuddy install manual: one host row, two products. The identity facts, the
// config roots, and the two install surfaces are stated per variant because
// each build carries its own live probe - the international 5.9.4 run in #110
// and the domestic 5.9.3 run in #118. Regenerated from this single source; edit
// the string, never the emitted file.
function workbuddyReadme() {
  return `# WorkBuddy plugin

## What this is

This folder is a complete plugin for WorkBuddy. It holds
\`.workbuddy-plugin/plugin.json\`, \`hooks/hooks.json\`, every file the hooks
load, \`src/SKILL.md\`, and the identity file the gate reads. It has no
third-party runtime dependency.

WorkBuddy is not a CodeBuddy alias, even though both use the same agent CLI
(\`@genie/agent-cli 2.165.0\`). Two builds ship under two names, two endpoints,
and two config roots. Each was identified from its own \`product.json\`, not
from docs.

| Variant | Product name | Build | Install folder | Config root | Endpoint |
| --- | --- | --- | --- | --- | --- |
| International | \`WorkBuddy AI\` (\`isOversea: true\`) | 5.9.4 | \`D:\\Workbuddy.ai\\WorkBuddyAI\` | \`~/.workbuddy-ai\` | \`https://www.workbuddy.ai\` |
| Domestic | \`WorkBuddy\` | 5.9.3 | \`D:\\WorkBuddy\` | \`~/.workbuddy\` | \`https://www.workbuddy.cn\` |

## Install: the settings file (the tested path)

WorkBuddy's desktop session reads \`hooks\` from
\`<configDir>/settings.json\` (\`~/.workbuddy-ai/settings.json\` on
international, \`~/.workbuddy/settings.json\` on domestic). It also reads a
**project-level** \`.codebuddy/settings.json\` in the working folder - that is
the file the 2026-10-31 test used. The folder name is \`.codebuddy\`, not \`.workbuddy\`;
a twin written to \`.workbuddy/settings.json\` at the same time did not fire.

1. Copy the **whole folder** to a stable path: \`hooks/\`, \`src/\`, and
   \`src/SKILL.md\` together. The hook scripts load \`../src/*\` (the gate reads
   its helper modules from there), so a copy of \`hooks/\` alone fails before
   it can inject or decide anything.
2. Merge the events from \`hooks/hooks.json\` into the settings file and
   replace \`\${CODEBUDDY_PLUGIN_ROOT}\` with the path you copied to. That value
   is a JSON string: on Windows use \`/\` (\`D:/Workbuddy.ai/jiahao\`) or escape
   the backslashes (\`D:\\\\Workbuddy.ai\\\\jiahao\`), or the settings file stops
   parsing and no hook loads.
3. Add the platform name to every command, as the shipped list does
   (\`... jiahao-verdict-gate.js workbuddy\`). A settings hook gets no plugin
   root, and the environment carries both \`CODEBUDDY_*\` and \`WORKBUDDY_*\`
   variables, so the argument is what identifies the host.
4. Start a new session after changing settings. On 5.9.4 the hook list was
   read per turn (an edit during a turn applied at the next turn end), and
   one turn end in three produced no call. The 5.9.3 timing is in its record,
   not generalized here. A mid-session edit is not something to rely on.

${PROFILE_SECTION}

### WorkBuddy: pin one directory

The desktop's hook process and the shell you install from can disagree about
the config directory. The 2026-10-31 and 2026-11-01 test sessions logged
\`CLAUDE_CONFIG_DIR\` absent and both builder config-dir variables set to that
build's own root; neither record logs \`HOME\`. The owner's 2026-11-01 run
(#116) saw the desktop's guard process with \`CLAUDE_CONFIG_DIR\` unset and
\`HOME\` set, while the shell that ran the installer carried
\`CLAUDE_CONFIG_DIR\` from another agent. The installer wrote the flag where
the hook does not read it, and a profile switch failed without a message.

Two reliable ways:

- **Pin one directory for both sides.** Set the user environment variable
  \`CLAUDE_CONFIG_DIR\` (Settings > System > Environment Variables, or
  \`setx CLAUDE_CONFIG_DIR "C:\\Users\\<you>\\.jiahao"\`), restart the desktop,
  then write the flags from a shell opened **after** the change:
  \`CONFIG="$CLAUDE_CONFIG_DIR"\`, \`mkdir -p "$CONFIG"\`,
  \`echo full > "$CONFIG/.jiahao-active"\`,
  \`echo verifier > "$CONFIG/.jiahao-profile"\`.
- **Pin nothing.** Clear the variable in this shell, not just for the
  installer: \`env -u CLAUDE_CONFIG_DIR\` affects only that child, and the
  \`CONFIG\` line would still pick up the parent's value.
  \`unset CLAUDE_CONFIG_DIR && node scripts/install.js init -y\` prints the
  absolute file it wrote - compare that with the directory the hooks resolve
  (see the profile section above). After that, run the profile recipe from
  that section in a clean shell.

WorkBuddy ships Git Bash at \`<configDir>/binaries/PortableGit\`, so the POSIX
recipe above works. In PowerShell, after the \`setx\` and a desktop restart,
use \`$c = $env:CLAUDE_CONFIG_DIR\` and \`Set-Content "$c\\.jiahao-active" full\`
/ \`Set-Content "$c\\.jiahao-profile" verifier\`. For the no-pin path, do not
write to \`$HOME\` directly: PowerShell always sets \`$HOME\`, while the hook
reads the HOME environment variable and falls to \`WORKBUDDY_CONFIG_DIR\` when
it is absent. Use the shared PowerShell recipe above.

\`generator\` instead of \`verifier\` gives reminders only. Whichever way you
go, compare the installer's printed path with the directory the hooks
resolve; the flag is read from one place.

## Check it works

- Start a new session after the settings change. On both builds, a \`Stop\`
  hook registered in \`.codebuddy/settings.json\` fired at the turn end.
- With \`verifier\`, a Stop hook in \`.codebuddy/settings.json\` blocked a false
  "done" claim and continued the turn. Both builds were tested on their own
  run; the hook was the test hook, not this plugin's gate.
- If nothing fires, check that the copied folder contains \`hooks/\` and \`src/\`
  and that the settings entries point at that path.

## Install: as a plugin (not tested)

1. \`codebuddy plugin add <path-to-this-dir>\` with the CLI bundled with
   WorkBuddy (\`<install dir>/resources/app.asar.unpacked/cli/bin/codebuddy\`),
   or use the desktop plugin manager. The loader accepts \`.workbuddy-plugin\`,
   \`.codebuddy-plugin\`, and \`.claude-plugin\`; this folder uses the first.
2. Turn the plugin on. \`defaultEnabled: false\` is on purpose: turning it on
   installs five hook points at once.
3. Set the profile as above.

This path was read from the host's loader code, not watched. No plugin hook
was seen firing on 5.9.4. The settings file above is the path with evidence.

## Hooks

| Event | Script | What it does | Watched? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text | no |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder | fired; output not read back |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with \`{"decision":"block"}\` and exit 0; the zero exit is the observed channel | **yes, the channel** on both builds - with the test hook, not this script; the gate's own judgment was not run live |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or jiahao state/evidence files - that is the script's output, **not** an observed host denial | fired; neither the deny output nor the host applying it was exercised |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files | no |

Timeouts: 5/5/10/5/3s. The host's own per-hook cap was not measured.

\`SubagentStop\` is deliberately **not** wired. It fires with the same input
shape (\`agent_id\`, \`agent_type\`, \`last_assistant_message\`), but the
2026-10-31 test answered it with \`{"decision":"block"}\` on exit 0 and the
subagent was **not** continued: one call, no \`stop_hook_active\` re-entry. The
2026-11-01 domestic run repeated that result on 5.9.3. A gate there would
print a decision the host ignores, so the folder stays on the event watched
working on both builds.

## What is different on this host

- The manifest is \`.workbuddy-plugin/plugin.json\`, the product-native folder
  the shared loader scans.
- Commands expand \`\${CODEBUDDY_PLUGIN_ROOT}\`, the variable the shared loader
  sets for plugin hooks (read from the bundled CLI; not seen in a run), and
  pass the platform name \`workbuddy\` as the first argument.
- The block channel is the decision field on a zero exit. \`Stop\` honors
  \`{"decision":"block","reason":"..."}\` on stdout; the gate exits 0. Exit 2
  was not tested here.
- Both desktop builds set \`CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1\`. It
  rejects \`prompt\`, \`agent\`, and \`http\` hook types; \`command\` hooks - the
  only kind this folder ships - still load.

## What was tested

**Both builds can block a turn before it ends.** Each build was tested on its
own run and date.

- **International** (2026-10-31, WorkBuddy AI 5.9.4): a real turn whose last
  assistant message said \`任务完成，已验证。\` continued only after a \`Stop\`
  hook printed \`{"decision":"block"}\` and exited 0. The host added the reason
  as \`Stop hook feedback: ...\` and ran the turn again.
- **Domestic** (2026-11-01, WorkBuddy 5.9.3, \`D:\\WorkBuddy\`, config root
  \`~/.workbuddy\`): the same shape on the other build - the false claim
  continued only after the \`Stop\` hook printed \`{"decision":"block"}\`; the
  test exits 0 by construction, so the exit status is inferred from how the
  test is written, not captured from the run. The reason arrived as
  \`Stop hook feedback: ...\`, and the re-entry carried
  \`stop_hook_active: true\`.

These are two observations, not one inferred from the shared agent CLI
(\`@genie/agent-cli 2.165.0\` on both). The domestic row came from its own
session, its own settings file, and its own run; the international row was
not used for it, and this document does not extend either result to a third
build it has not run. Evidence: \`docs/evidence/v0.3.0/\`.

- Two runs used a project-level \`.codebuddy/settings.json\` in the workspace
  and the throwaway hook in
  \`docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js\`.
- Project-scope \`.codebuddy/settings.json\` hooks are read by the desktop
  session: international - a \`PreToolUse\` test logged every tool call;
  domestic - 4 calls between 17:10:44Z and 17:11:13Z.
- \`.workbuddy/settings.json\` project twin: international - did not fire
  (the project folder name is \`.codebuddy\`); domestic - did not fire (the
  test's log file was never created).
- A real turn-end block (\`Stop\` + decision on exit 0): international -
  verified, the claim continued only after the decision and the reason
  arrived as \`Stop hook feedback\`; domestic - verified, same shape and same
  message text, though the exit status was not captured on this build (the
  record says so).
- \`stop_hook_active\` on re-entry: international - \`true\`, and the hook
  passed on it; domestic - \`true\` and passed on it, with the test's marker
  deleted first.
- \`SubagentStop\` block: international - fired once and the decision was
  ignored; domestic - same negative result (fired once, no re-entry,
  subagent not continued).
- Input identity fields: international - \`hook_event_name\`,
  \`stop_hook_active\`, \`last_assistant_message\`, \`transcript_path\`,
  \`client:"WorkBuddy"\`, \`version:"5.9.4"\`; domestic - same keys, with
  \`version:"5.9.3"\`.
- Hook environment: international - \`WORKBUDDY_APP_NAME\`,
  \`WORKBUDDY_APP_VERSION\`, \`WORKBUDDY_DATA_FOLDER_NAME\`,
  \`CODEBUDDY_HOST=workbuddy-desktop\`; no \`*_PLUGIN_ROOT\`; domestic - same
  shape: \`WorkBuddy\`, \`5.9.3\`, \`.workbuddy\`, config dir \`~/.workbuddy\`.
- Offline checks in \`test/plugin-bundles.test.js\` and
  \`test/workbuddy-adapter.test.js\`: the manifest parses, the version and
  license come from \`package.json\`, every referenced file is generated,
  every hook command stays inside \`\${CODEBUDDY_PLUGIN_ROOT}\`, and no
  relative \`require()\` points outside the folder.

Records:
\`docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md\` (international)
and \`docs/evidence/v0.3.0/workbuddy-cn-hook-probe-2026-11-01.md\` (domestic).
The test hook stands in for the shipped gate in both runs.

Not tested yet:

- **Exit status on the 5.9.3 run.** The test sets exit 0 on every path and
  records its decision before it writes stdout, so an independent wrapper did
  not capture the exit status. What that run saw is the host continuing after
  the logged decision; "exit 0" is the test's own behavior, not a captured
  return code. Run it inside a wrapper to turn that into an artifact.
- **Exit 2 as a block channel.** Not tested on either build.
- **Plugin hooks firing.** Not tested on either build; only the loader code
  path was read.

${WRITE_SCOPE_WITH_GUARD}

## Update and uninstall

- Settings file: replace the **whole copied bundle** - \`hooks/\` and \`src/\`
  together - keep the settings entries, and start a new session. Replacing
  only \`hooks/\` leaves \`src/SKILL.md\` and the loaded modules at the old
  version, which is the stale half the gate reads.
- As a plugin: use the host's own plugin commands (\`codebuddy plugin remove
  jiahao\` or the desktop plugin manager). Removing the folder removes its
  hook list; the settings-file copy, if you also installed it, is removed by
  hand.
`;
}

// Google Antigravity install manual + hook disclosure. Regenerated from this
// single source; edit the string, never the emitted file.
function antigravityReadme() {
  return `# Google Antigravity plugin

## What this is

This folder is a complete Google Antigravity plugin. It holds \`plugin.json\`,
\`hooks.json\`, every file the hooks load, \`src/SKILL.md\`, and the identity file
the gate reads. Nothing reads from the repository root and it has no
third-party runtime dependency.

## Install

1. \`agy plugin install <path-to-adapters/antigravity>\`
2. \`agy plugin list\` shows \`jiahao\` imported and enabled.

${PROFILE_SECTION}

## Check it works

- \`agy plugin list\` shows \`jiahao\`.
- With \`verifier\`, a false "done" claim gets blocked. Tested on Antigravity
  1.2.12 on 2026-10-31.

## Hooks

\`hooks.json\` is the whole template. Each entry names the script and passes
the platform name \`antigravity\`; the script uses that name to pick the JSON
shape.

| Event | Script | What it does | Watched? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text as a system message | yes, 1.2.12 |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + \`{"decision":"block"}\`; blocks an empty evidence log (verifier profile) | yes, 1.2.12 |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files | no |

Timeouts: 5/10/5s.

## What was tested

Tested on 2026-10-31 with Antigravity 1.2.12 on win32 x64. A real prompt-mode
session continued a false claim only after \`Stop\` answered
\`{"decision":"block"}\` on exit 0. The documented exit-2 path ended the turn
without a continuation. Evidence: \`docs/evidence/v0.3.0/\`.

- \`agy plugin install\` installed the folder. With
  \`--dangerously-skip-permissions -p '...' --model ...\`, the Stop hook
  answered the block on exit 0 and the host continued with
  \`<SYSTEM_MESSAGE>Stop hook blocked termination: ...</SYSTEM_MESSAGE>\`. The
  agent quoted the reason on the next turn.
- The hook's exit code, stdout, and stderr were recorded by a wrapper:
  \`docs/evidence/v0.3.0/probes/antigravity-hook-wrapper.js\`. It runs the
  installed gate, appends one JSON line per call, then replays the output and
  exits with the same code. Reuse it on a new build. The evidence layout is
  in \`docs/agents/evidence-review.md\`.
- Loop guard: an unconditional exit-0 block continued for 10 forced calls
  (executionNum 0 through 9 blocked) before the host stopped at its limit
  (\`MAX_FORCED_INVOCATIONS\`).
- Offline checks in \`test/plugin-bundles.test.js\` and
  \`test/antigravity-adapter.test.js\`: the manifest parses, the version and
  license come from \`package.json\`, every referenced file is generated,
  every hook command runs inside the plugin root, and no relative \`require()\`
  points outside the folder.

Tested and did not work:

- Exit 2 on this build: the host documents it as an error; in the 1.2.12 test
  it ended the turn without a continuation, so it is not a block channel.

Not tested yet:

- \`SessionEnd\` firing. It is wired for cleanup; its live firing was not
  watched.

${WRITE_SCOPE}

## Update and uninstall

- Upgrade: re-run \`agy plugin install <path-to-adapters/antigravity>\`.
- Uninstall: \`agy plugin uninstall jiahao\`.
`;
}

// Minimal zero-dependency unified diff (LCS over lines, 3 lines of context).
// ZCode install manual + hook disclosure. Regenerated from this single
// source; edit the string, never the emitted file.
function zcodeReadme() {
  return `# ZCode plugin

## What this is

This folder is a complete ZCode plugin. It holds \`.zcode-plugin/plugin.json\`,
\`hooks/hooks.json\`, every file the hooks load, \`src/SKILL.md\`, and the
identity file the gate reads. It has no third-party runtime dependency. Every
hook command uses \`\${ZCODE_PLUGIN_ROOT}\`, so nothing reads from the repository
root.

## Install

The folder carries its own marketplace shelf (\`marketplace.json\`, with
\`source: "."\` pointing at itself), because ZCode's install command only
resolves \`plugin@marketplace\` names. A direct folder install is refused
("Plugin not found in any marketplace", CLI 0.17.0, tested 2026-10-31).

1. \`zcode plugins marketplace add <path-to-this-dir>\` - the shelf inside the
   folder is the marketplace; exit 0 reports \`Added marketplace
   jiahao-zcode (1 plugins)\`.
2. \`zcode plugins install jiahao@jiahao-zcode\` - installs and turns it on in
   one step; \`zcode plugins list\` reports \`hooks: 4\` (the host parses
   \`hooks/hooks.json\` itself; the manifest has no hooks pointer). The cached
   hook list, manifest, and gate script are byte-identical to this folder
   (checked 2026-10-31).
3. \`zcode plugins validate <path-to-this-dir>\` is the host's own manifest
   check; it accepts this folder (exit 0).
4. Do NOT point \`marketplace add\` at the repository root: the host then
   resolves \`.claude-plugin/marketplace.json\` and installs the **Claude
   Code** folder instead (tested 2026-10-31 - and its parser silently drops
   unsupported events of a Claude-shaped list, 7 events down to \`hooks: 4\`).
5. Start a new session. Hook configuration - plugin or config file - is read
   at session start; a list added mid-session did not fire until a restart
   (tested 2026-10-31).

${PROFILE_SECTION}

## Check it works

- \`zcode plugins list\` reports \`hooks: 4\`.
- With \`verifier\`, a false "done" claim gets blocked. Tested on ZCode 3.16.2
  on 2026-10-31, and again on 2026-11-01 through the plugin path.

## Hooks

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + \`{"decision":"block"}\`; blocks an empty evidence log (verifier profile) |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, \`jiahao-*\` hook files, any \`.mcp.json\`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/10/5s, inside the host's 60s limit. The platform name \`zcode\`
is passed as the script's first argument; that picks this host's JSON shape
and exit codes.

ZCode has exactly seven events (\`SessionStart\`, \`UserPromptSubmit\`,
\`PreToolUse\`, \`PermissionRequest\`, \`PostToolUse\`, \`PostToolUseFailure\`,
\`Stop\`). \`SubagentStart\`, \`SubagentStop\`, and \`SessionEnd\` do not exist, so
this folder wires no cleanup hook; that cleanup does not run on this host.

## What is different on this host

- \`\${ZCODE_PLUGIN_ROOT}\` is the plugin-root variable. ZCode also expands
  \`\${CLAUDE_PLUGIN_ROOT}\` for plugin hooks; this template uses the native
  name so nothing depends on the compatibility name.
- Input data carries both spellings: \`session_id\`/\`sessionId\`,
  \`hook_event_name\`/\`hookEventName\`, and \`stop_hook_active\`/\`stopHookActive\`
  were all present in real runs. The shared normalizer folds them into the
  Claude shape.
- The block channel is the decision field on a zero exit. A live turn
  continued only after Stop answered \`{"decision":"block"}\` on exit 0. The
  gate exits 0 for this host.
- Config-file alternative: hooks can be registered without a plugin in the
  \`hooks\` block of \`~/.zcode/cli/config.json\` (requires \`hooks.enabled: true\`)
  or a workspace \`.zcode/config.json\`. Config hooks have no trust check. A
  config-file install passes no argv, so \`detectHost()\` falls back to the
  \`ZCODE_SESSION_ID\` environment marker.

## What was tested

Tested on 2026-10-31 with ZCode 3.16.2 on win32, in a real desktop session in
this repository's workspace, with a throwaway workspace hook config and a
logging wrapper that runs the real gate. Evidence:
\`docs/evidence/v0.3.0/\`.

- A real turn-end block (Stop + decision): the real bundled gate blocked a
  session's turn end (verifier profile, empty evidence log); the reason
  arrived as the next turn's context.
- \`stop_hook_active\` on the continuation: \`true\` on every post-block Stop
  (both spellings); the gate's pass-through needs no change.
- Consecutive-block cap: three consecutive blocks were honored (fires #1-#4
  in \`docs/evidence/v0.3.0/zcode-stop-fires.jsonl\`); the fourth block was
  followed by the turn ending without a further continuation (the session
  user was present at that boundary).
- Input spellings: both snake_case and camelCase on every fire.
- Hook config is read at session start: a mid-session config did not fire
  until restart.
- \`zcode plugins validate\` on the folder: exit 0, "Plugin manifest is valid".
- Install through the folder's own marketplace shelf: \`marketplace add
  <this dir>\` + \`plugins install jiahao@jiahao-zcode\` installed the folder
  \`[enabled]\`; \`plugins list\` reports \`hooks: 4\`; the cached hook list,
  manifest, and gate are byte-identical to the generated folder.
- Plugin-path hooks in the operator's restarted session (2026-11-01,
  post-merge formal install): all four events ran - SessionStart injected the
  rules body, UserPromptSubmit injected the mode reminder, PreToolUse
  **denied** a tool call whose command text named the state/evidence files
  (the deny was logged as a bypass attempt), and Stop **blocked** a completion
  claim with no evidence, quoting the reason; on the repeated turn it passed
  once \`stop_hook_active\` was set after the first real check.
- SessionStart \`additionalContext\` injection: the rules body arrived as the
  next turn's additional context in the restarted session.
- Offline checks in \`test/plugin-bundles.test.js\` and
  \`test/zcode-adapter.test.js\`: the manifest parses, the version and license
  come from \`package.json\`, every referenced file is generated, every hook
  command stays inside \`\${ZCODE_PLUGIN_ROOT}\`, and no relative \`require()\`
  points outside the folder.
- The hook's exit code, stdin, and stdout are recorded by the test wrapper:
  \`docs/evidence/v0.3.0/probes/zcode-stop-wrapper.js\`. It logs one JSON line
  per fire (input and environment key names), and in \`realgate\` mode runs the
  real bundled gate, logs its exit/stdout/stderr, then replays them. Raw
  fires: \`docs/evidence/v0.3.0/zcode-stop-fires.jsonl\`. The evidence layout
  is in \`docs/agents/evidence-review.md\`.

Tested and did not work as a channel (kept with the receipts):

- Exit 2 as the block channel: exit 2 also blocked, but with the host's
  generic "Hook blocked execution" and no reason; the gate keeps exit 0 + the
  decision field, which carries the reason.
- Repository root as the marketplace: the host resolved
  \`.claude-plugin/marketplace.json\` and installed the Claude Code folder.
- Direct \`zcode plugins install <dir>\`: refused with "Plugin not found in
  any marketplace".

Not tested yet:

- Upgrade through \`zcode plugins update\`: the subcommand exists; not tested.
- \`SessionEnd\` / cleanup on this host: the event does not exist in ZCode's
  list, so this folder wires no cleanup hook. That is a host limit, not a
  plugin one.

${WRITE_SCOPE_WITH_GUARD}

## Update and uninstall

- Upgrade: \`zcode plugins update\` (the subcommand exists; not tested).
- Uninstall: \`zcode plugins uninstall jiahao@jiahao-zcode --force\`
  (non-interactive shells need \`--force\`), then
  \`zcode plugins marketplace remove jiahao-zcode\`. Use the host's own
  commands; the repository root is never a plugin entry.
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
