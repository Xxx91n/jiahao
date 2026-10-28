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
// `.claude-plugin/` at the repo root is the marketplace manifest: the repo is
// the marketplace, so it ships with the same generated-and-audited guarantee
// as the plugin dirs it points at.
const GENERATED_DIRS = ['adapters/', 'skills/', '.claude-plugin/'];

function readRepoFile(rel) {
  return fs.readFileSync(path.join(root, rel.split('/').join(path.sep)), 'utf8');
}

// The non-JS tail every self-contained bundle carries: the require() closure,
// the SKILL body, and the identity pin calibration.js loads at require() time.
// One helper, so a file added here cannot reach one bundle and miss the other
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

// the adapter map is a pure function of src/SKILL.md so the
// --check golden layer regenerates it in memory and byte-compares against
// the committed files (regen-and-diff; no lock file, no snapshots).
function buildAdapters() {
  const skillPath = path.join(root, 'src', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  const profiles = splitByProfile(skill);

  // gsr rule headers are the structural latch for the generator
  // profile; fail the build (and the --check golden layer) on malformed rules.
  const gsrErrors = validateGsrHeaders(profiles.generator);
  if (gsrErrors.length > 0) {
    throw new Error('gsr header validation failed:' + String.fromCharCode(10) + gsrErrors.map(e => '  - ' + e).join(String.fromCharCode(10)));
  }

  // Adapter definitions: host -> { path, content }
  // Instruction-tier adapters: generate both profiles
  const adapters = {
    // Codex: .codex/hooks.json
    'adapters/codex/hooks.json': JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-activate.js', timeout: 5 }] }],
        SubagentStart: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-subagent.js', timeout: 5 }] }],
        UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-mode-tracker.js', timeout: 5 }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-verdict-gate.js', timeout: 10 }] }],
        SessionEnd: [{ hooks: [{ type: 'command', command: 'node .codex/hooks/jiahao-sweep.js', timeout: 3 }] }],
      },
    }, null, 2),

    // Cursor: .cursor/rules/jiahao.mdc — verifier profile (default for instruction-tier)
    'adapters/cursor/jiahao.mdc': '---\ndescription: Jiahao verifier discipline\nglobs:\n  - "**/*"\n---\n' + profiles.verifier,

    // Cursor generator profile
    'adapters/cursor/jiahao-generator.mdc': '---\ndescription: Jiahao generator discipline (surface signals)\nglobs:\n  - "**/*"\n---\n' + profiles.generator,

    // Windsurf: .windsurf/rules/jiahao.md — verifier profile
    'adapters/windsurf/jiahao.md': profiles.verifier,
    'adapters/windsurf/jiahao-generator.md': profiles.generator,

    // Cline: .clinerules/jiahao.md — verifier profile
    'adapters/cline/jiahao.md': profiles.verifier,
    'adapters/cline/jiahao-generator.md': profiles.generator,

    // Instruction-tier fallback: AGENTS.md fragment — verifier profile
    'adapters/instruction-tier/AGENTS.md': '# Jiahao Verifier Discipline\n\n' + profiles.verifier,
    'adapters/instruction-tier/AGENTS-generator.md': '# Jiahao Generator Discipline\n\n' + profiles.generator,

    // Copilot CLI: repo-level .github/hooks/jiahao.json, flat {version,hooks}
    // schema. agentStop is the verdict-gate mapping; userPromptSubmitted is the
    // attested injection path (repo-level sessionStart has known non-firing
    // bugs: copilot-cli #1730 open, #2415; additionalContext fixed in 1.0.11 per
    // #2142). Verified against docs.github.com/en/copilot hooks docs, 2026-08.
    'adapters/copilot/hooks.json': JSON.stringify({
      version: 1,
      hooks: {
        sessionStart: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-activate.js', timeoutSec: 10 }],
        userPromptSubmitted: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-mode-tracker.js', timeoutSec: 10 }],
        subagentStart: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-subagent.js', timeoutSec: 10 }],
        agentStop: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-verdict-gate.js', timeoutSec: 30 }],
        sessionEnd: [{ type: 'command', command: 'node .github/jiahao/hooks/jiahao-sweep.js', timeoutSec: 10 }],
      },
    }, null, 2) + '\n',

    'adapters/copilot/README.md': '# GitHub Copilot CLI Adapter\n\nRepo-level hook config for GitHub Copilot CLI: copy hooks.json to\n`.github/hooks/jiahao.json` and the hook scripts (hooks/*.js from this\npackage) to `.github/jiahao/hooks/`. Flat schema `{version: 1, hooks:\n{event: [entry]}}` per the official hooks reference.\n\nEvent mapping:\n- sessionStart -> jiahao-activate.js (additionalContext injection)\n- userPromptSubmitted -> jiahao-mode-tracker.js (mode commands + reminder;\n  attested injection path)\n- subagentStart -> jiahao-subagent.js\n- agentStop -> jiahao-verdict-gate.js (block forces continuation; the CLI\n  force-ends after 8 consecutive blocks)\n- sessionEnd -> jiahao-sweep.js (sentinel sweep)\n\nKnown degradations (verified against copilot-cli issues, 2026-08):\n- #1730 (open): repo-level `.github/hooks/` sessionStart may not fire;\n  userPromptSubmitted is the attested injection path.\n- #2142: sessionStart additionalContext was dropped until CLI 1.0.11.\n- Copilot exit codes default to warn/fail-open outside\n  preToolUse/permissionRequest; the agentStop block follows the CLI\'s own\n  continuation semantics, not Claude\'s exit-2 stderr convention (\n  R6: differences are recorded, not shimmed).\n',

    // Qoder (international CLI): project-level .qoder/settings.json fragment.
    // Contract homologous to Claude Code: hookSpecificOutput.hookEventName,
    // exit 2 blocks on Stop/UserPromptSubmit (docs.qoder.com/cli/hooks and
    // hooks-reference, verified 2026-08). SessionStart exists (matcher
    // startup|resume|clear, non-blocking). SessionEnd is NOT registered: not
    // verified in the official event list at research time.
    'adapters/qoder/settings.json': JSON.stringify({
      hooks: {
        SessionStart: [{ matcher: 'startup|resume|clear', hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-activate.js', timeout: 10 }] }],
        SubagentStart: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-subagent.js', timeout: 10 }] }],
        UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-mode-tracker.js', timeout: 10 }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-verdict-gate.js', timeout: 30 }] }],
        SubagentStop: [{ hooks: [{ type: 'command', command: 'node .qoder/hooks/jiahao-verdict-gate.js', timeout: 30 }] }],
      },
    }, null, 2) + '\n',

    'adapters/qoder/README.md': '# Qoder Adapter (international CLI)\n\nMerge settings.json into your project `.qoder/settings.json` (or install\nuser-level at `~/.qoder/settings.json`) and copy the hook scripts\n(hooks/*.js of this package) to `.qoder/hooks/`. The contract is homologous\nto Claude Code: `hookSpecificOutput.hookEventName` + `additionalContext`,\nexit 2 blocks on Stop/UserPromptSubmit (docs.qoder.com/cli/hooks and\ncli/hooks-reference, verified 2026-08).\n\nEvent mapping: SessionStart (matcher startup|resume|clear; non-blocking) ->\njiahao-activate.js; SubagentStart -> jiahao-subagent.js; UserPromptSubmit ->\njiahao-mode-tracker.js; Stop/SubagentStop -> jiahao-verdict-gate.js\n(exit-2 blocking verifier gate).\n\nHonest notes:\n- SessionStart IS supported (matcher startup/resume/clear); the old runtime\n  comment "Qoder has no SessionStart" was wrong and has been corrected.\n- SessionEnd is not registered because it was not verified in the official\n  event list at research time; the next session\'s first hook reconcile\n  remains the sweep baseline.\n- CN fork (Lingma / Qoder CN): 5 events only, no SessionStart, Stop cannot\n  block, config under `~/.lingma/` — this adapter targets the international\n  CLI. Do not assume parity.\n',

    // opencode: instruction tier, advisory-only. No lifecycle hooks and no
    // exit-2 contract exist (opencode#12472 open; #14551 closed not-planned).
    // Primary channel: AGENTS.md (project root + ~/.config/opencode/AGENTS.md,
    // merged). opencode.json instructions field is V1-only (accepted but not
    // loaded in V2 beta) — shipped as a supplementary channel, documented.
    'adapters/opencode/jiahao-verifier.md': '# Jiahao Verifier Discipline\n\n' + profiles.verifier,
    'adapters/opencode/jiahao-generator.md': '# Jiahao Generator Discipline\n\n' + profiles.generator,
    'adapters/opencode/opencode.json': JSON.stringify({
      instructions: ['jiahao-verifier.md'],
    }, null, 2) + '\n',
    'adapters/opencode/README.md': '# opencode Adapter (instruction tier, advisory-only)\n\nopencode has no lifecycle hooks and no exit-2 contract (issue #12472 open;\n#14551 closed as not-planned), so jiahao runs advisory-only here.\n\nTwo injection channels:\n1. AGENTS.md (primary; V1 and V2): paste the profile content into your\n   project-root AGENTS.md or `~/.config/opencode/AGENTS.md` (both are\n   merged by opencode).\n2. opencode.json `instructions` (V1 only; accepted but NOT loaded in the V2\n   beta): place jiahao-verifier.md next to the provided opencode.json, which\n   references it via `"instructions": ["jiahao-verifier.md"]`.\n\nClaude Code compatibility paths (~/.claude/skills) also work.\n',

    // aider: instruction tier, advisory-only. No hooks (issue #2557 closed
    // stale). Loader is explicit configuration, not discovery: read: list in
    // .aider.conf.yml (search order git root, cwd, home). Default installs do
    // NOT inject anything — the opt-in is the honest contract.
    'adapters/aider/CONVENTIONS.md': profiles.verifier,
    'adapters/aider/CONVENTIONS-generator.md': profiles.generator,
    'adapters/aider/.aider.conf.yml': '# Jiahao discipline injection (advisory-only; aider has no hooks)\n# Loader is explicit configuration, not discovery\n# (aider.chat/docs/config/aider_conf.html; conventions guide recommends\n# read: over the stale read-only: spelling).\nread:\n  - CONVENTIONS.md\n',
    'adapters/aider/README.md': '# aider Adapter (instruction tier, advisory-only)\n\naider has no hooks (issue #2557 closed by stale bot, never implemented), so\njiahao is advisory-only plain-text injection here. The loader is explicit\nconfiguration, not discovery: nothing is injected unless you opt in.\n\nInstall: copy CONVENTIONS.md and .aider.conf.yml to your project git root\n(config search order: git root, cwd, home). The `read:` key takes a list;\nswap in CONVENTIONS-generator.md for the generator profile.\n',

    // MCP server (future): package.json for ponytail-mcp equivalent
    'adapters/mcp/README.md': '# MCP Adapter\n\njiahao-mcp/ is a stdio MCP server exposing jiahao verifier discipline\nvia registerPrompt + registerTool for MCP-only agent hosts.\n\nSee jiahao-mcp/index.js for the server implementation.\nDependencies: @modelcontextprotocol/sdk, zod.\n',
  };

  // ---- CodeBuddy: first Claude-Code-compatible path host ----
  // The bundle is SELF-CONTAINED: CodeBuddy recognizes .claude-plugin/ +
  // `${CLAUDE_PLUGIN_ROOT}` verbatim (official compat chapter; the name is
  // kept unchanged to maximize single-source distribution). Hook scripts +
  // their static require() closure + src/SKILL.md + jiahao-mcp are vendored
  // byte-verbatim so the plugin dir loads standalone. Regen-diff keeps the
  // vendored copies honest - drift fails --check.
  const CB = 'adapters/codebuddy/';
  const CB_SEEDS = [
    'hooks/jiahao-activate.js', 'hooks/jiahao-mode-tracker.js',
    'hooks/jiahao-subagent.js', 'hooks/jiahao-sweep.js',
    'hooks/jiahao-verdict-gate.js', 'hooks/jiahao-runtime.js',
    'hooks/jiahao-profile.js', 'hooks/jiahao-instructions-assert.js',
    'hooks/jiahao-pretool-guard.js', 'jiahao-mcp/index.js',
  ];
  emitBundle(adapters, CB, CB_SEEDS, skill, ['jiahao-mcp/package.json']);

  adapters[CB + '.claude-plugin/plugin.json'] = JSON.stringify({
    name: 'jiahao',
    version: PKG.version,
    description: 'Dual-profile verification discipline (generator advisory + verifier iron laws) - Claude-Code-compatible plugin surface for CodeBuddy.',
    // CodeBuddy's documented compat path reads these two keys from the
    // manifest, so they stay here. Claude Code auto-discovers the same files
    // and would load a repeated manifest entry in addition, which is why the
    // Claude bundle below leaves them out.
    hooks: 'hooks/hooks.json',
    mcpServers: '.mcp.json',
    defaultEnabled: false, // conservative: opt-in enable; hooks execute on enable and bypass the untrusted-frontmatter gate
    license: PKG.license,
    repository: PKG_REPOSITORY,
  }, null, 2) + '\n';

  // Full event map: the migrated five-event set plus the InstructionsLoaded
  // integrity assertion and the PreToolUse enforcement-surface deny wiring.
  // Every assertion/enforcement line lives here (plugin hooks.json is exempt
  // from the allowUntrustedFrontmatterHooks gate and effective on enable) -
  // never in skill/agent frontmatter (silently skipped by default).
  // Commands are Git-Bash-compatible `node` invocations; matchers are
  // case-sensitive; the 60s default timeout budget is never exceeded.
  adapters[CB + 'hooks/hooks.json'] = JSON.stringify({
    description: 'jiahao verifier discipline - CodeBuddy plugin hook map',
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-activate.js"', timeout: 5 }] }],
      SubagentStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-subagent.js"', timeout: 5 }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-mode-tracker.js"', timeout: 5 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js"', timeout: 10 }] }],
      SessionEnd: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-sweep.js"', timeout: 3 }] }],
      InstructionsLoaded: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-instructions-assert.js"', timeout: 5 }] }],
      PreToolUse: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-pretool-guard.js"', timeout: 5 }] }],
    },
  }, null, 2) + '\n';

  // .mcp.json bundles the existing jiahao-mcp stdio server - vendored
  // verbatim under jiahao-mcp/ inside the bundle; deps install per README.
  adapters[CB + '.mcp.json'] = JSON.stringify({
    mcpServers: {
      'jiahao-mcp': {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js'],
        cwd: '${CLAUDE_PLUGIN_ROOT}/jiahao-mcp',
      },
    },
  }, null, 2) + '\n';

  // rules/ dual profile - installed as .codebuddy/rules/*.md (or auto-loaded
  // on the plugin rules path). alwaysApply: true pins both profiles on;
  // non-alwaysApply load priority is a declared-unverified item (README).
  const ruleFm = (desc) => '---\ndescription: ' + desc + '\nalwaysApply: true\n---\n';
  adapters[CB + 'rules/jiahao-verifier.md'] = ruleFm('Jiahao verifier discipline (blocking)') + profiles.verifier;
  adapters[CB + 'rules/jiahao-generator.md'] = ruleFm('Jiahao generator discipline (surface signals)') + profiles.generator;

  adapters[CB + 'README.md'] = codebuddyReadme();

  // ---- Claude Code: self-contained plugin bundle ----
  // The closure is exactly the parent spec's: hooks, their require()
  // dependencies, the src/ copy, and the SKILL body. Two CodeBuddy components
  // are deliberately absent:
  // - InstructionsLoaded: it hashes rules/jiahao-*.md, and a Claude Code
  //   plugin has no plugin-level rules/ directory for the host to load.
  // - jiahao-mcp + .mcp.json: #59 keeps the MCP server in the repo but not as
  //   an install-and-work exit; auto-discovered .mcp.json would register a
  //   server whose SDK deps are not vendored, breaking the self-contained
  //   claim on enable.
  // With those two gone the bundle has no third-party runtime dependency.
  const CC_DIR = 'adapters/claude-code';
  const CC = CC_DIR + '/';
  const CC_SEEDS = [
    'hooks/jiahao-activate.js', 'hooks/jiahao-mode-tracker.js',
    'hooks/jiahao-subagent.js', 'hooks/jiahao-sweep.js',
    'hooks/jiahao-verdict-gate.js', 'hooks/jiahao-runtime.js',
    'hooks/jiahao-profile.js', 'hooks/jiahao-pretool-guard.js',
  ];
  emitBundle(adapters, CC, CC_SEEDS, skill);

  // Only `name` is required by the host (code.claude.com/docs/en/plugins/
  // manifest-reference). The manifest does not repeat `hooks`: hooks/hooks.json
  // is auto-discovered at the plugin root, and the manifest field loads *in
  // addition* to that file. `version` is the package version (see PKG);
  // `defaultEnabled` is a documented manifest field, not a CodeBuddy extra.
  adapters[CC + '.claude-plugin/plugin.json'] = JSON.stringify({
    name: 'jiahao',
    version: PKG.version,
    description: 'Dual-profile verification discipline: verifier gate on Stop, profile injection on SessionStart. Self-contained Claude Code plugin.',
    author: { name: 'Xxx91n' },
    license: PKG.license,
    repository: PKG_REPOSITORY,
    defaultEnabled: false, // opt-in: installing does not enable the gate by itself
  }, null, 2) + '\n';

  // Host event names and Stop semantics are the Claude Code contract
  // (code.claude.com/docs/en/hooks): Stop/SubagentStop exit 2 or
  // {decision:"block"} sends Claude back to work, SessionStart/SubagentStart
  // take additionalContext, SessionEnd is side-effect only. PreToolUse guards
  // the enforcement surface. Every command resolves through
  // ${CLAUDE_PLUGIN_ROOT} so nothing points at the repo root.
  adapters[CC + 'hooks/hooks.json'] = JSON.stringify({
    description: 'jiahao verifier discipline - Claude Code plugin hook map',
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-activate.js"', timeout: 5 }] }],
      SubagentStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-subagent.js"', timeout: 5 }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-mode-tracker.js"', timeout: 5 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js"', timeout: 10 }] }],
      SubagentStop: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-verdict-gate.js"', timeout: 10 }] }],
      SessionEnd: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-sweep.js"', timeout: 5 }] }],
      PreToolUse: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/jiahao-pretool-guard.js"', timeout: 5 }] }],
    },
  }, null, 2) + '\n';

  adapters[CC + 'README.md'] = claudeCodeReadme();

  // ---- marketplace manifest: the repo root is the marketplace ----
  // source is a path from the marketplace root, so it points at the plugin
  // directory ("./adapters/claude-code"), never at the repo root. The entry
  // carries no version: plugin.json is the authority and the host's validator
  // warns when both set it, so the one version lives in plugin.json (= PKG).
  adapters['.claude-plugin/marketplace.json'] = JSON.stringify({
    name: 'jiahao',
    description: 'Prompt-as-mental-model verification discipline (rules version + plugin version)',
    owner: { name: 'Xxx91n' },
    plugins: [
      {
        name: 'jiahao',
        source: './' + CC_DIR,
        description: 'Anti-false-completion verification discipline: verifier gate on Stop, profile injection on SessionStart.',
      },
    ],
  }, null, 2) + '\n';

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
3. Activate the jiahao profile flag, same as every host:
   \`echo full > "$CLAUDE_CONFIG_DIR/.jiahao-active"\` (or
   \`$HOME/.jiahao-active\` when the env var is unset) and
   \`echo verifier > "$CLAUDE_CONFIG_DIR/.jiahao-profile"\` for the blocking
   profile (\`generator\` for advisory-only). Both files live in the config
   dir, never in the project directory.
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
   removes the flag, which disarms the Stop gate and the reminder; the
   SubagentStart injection is not flag-gated.
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

Pinned offline by \`test/claude-code-plugin.test.js\`: both manifests parse,
the plugin version and license come from \`package.json\`, the marketplace
\`source\` resolves to this directory, every referenced file is emitted by the
generator (\`--check\` pins the emitted set to disk), every hook command stays
inside \`\${CLAUDE_PLUGIN_ROOT}\`, and no vendored relative \`require()\` escapes
the bundle. The bundled Stop gate is spawned by that suite and blocks
(exit 2) when the evidence chain is empty.

**Not yet live-probed**: install through \`claude plugin\`, SessionStart
injection, and a real blocked false-completion are owner actions in #64. This
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

function writeAll() {
  const adapters = buildAdapters();
  let count = 0;
  for (const [rel, content] of Object.entries(adapters)) {
    const full = path.join(root, rel);
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
  const count = writeAll();
  console.log('Generated ' + count + ' files from src/SKILL.md');
}

if (require.main === module) main();

module.exports = {
  buildAdapters, unifiedDiff, checkAll, writeAll, auditTrackedSet, SKILL_DIR, SOURCE_NAME,
};
