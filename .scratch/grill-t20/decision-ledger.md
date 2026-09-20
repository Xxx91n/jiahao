# grill-t20 decision ledger

Authority for this round. Append-only; every owner-confirmed substantive conclusion lands here on the spot.

## D-001 — 轮拓扑：t20 单轮纯文档轮吸收全部 B-1..B-7 处置

- Original question: B-1..B-7 处置去向 — a. t20 纯文档轮全吸收（R3 项直接处置，B-4/B-5 defer-register，B-6 Disclosed Repair）/ b. 连 B-4/B-5 也修（carve_out_used:1+gtd）/ c. 独立 fix 轮先行
- User answer (verbatim): A
- Normalized requirement: t20 is a single kind:documentation round absorbing all seven B-finding dispositions. In-round disposition (all R3 documentation-surface, free in a doc round): B-1 feed-leg pin strengthened to a discriminating scenario in test/adr-0076-wiring.test.js; B-2 convention line + capture-battery.cjs $-label fidelity fix; B-3 harness slop removed (duplicate round-facts leg + unused WIN); B-7 battery gains a committed git-status/clean-tree leg; B-6 handled via Disclosed Repair on the t19 round-complete handoff '18 evidence files' wording. Defer-registered: B-4 (collect() red-suite -> exit-2 conflation; standing residual per audit, precision clause when the exit contract next opens) and B-5 (--report bare-arg exit asymmetry; cosmetic). Result: t20 touches zero R2 files — carve_out_used absent, governance_tooling_diff absent; trend row = kind:documentation + adr_added:["0079"] + net_additions:1 + zero_product_diff:true, which triggers ADR-0076 D-F clause-3 (the row requires a deferred_entry — satisfied by the B-4/B-5 registrations).
- Constraints / negatives: no machinery edits inside t20 (the R2 surface stays closed — carve-out reserved for genuine need, not cosmetics); no renumbering (t20 stays the README round per t19 D-001/D-010 — a separate fix round would have forced a revision); defer-register IS the disposition for B-4/B-5, not silent deferral (named registry rows with reopen conditions); B-6 repair uses Disclosed Repair with the declaration triple, never a byte patch.
- Status: current

## D-002 — 散文处理深度：深度重写派

- Original question: 非钉散文(~12.9K)处理深度 — a. 深度重写(crafter concise high-signal + beautify remove-internal-detail;per-host→表行/threat model→短句/develop/usage 最短路径;不外迁) / b. 最小编辑只重排 / c. 细节外迁 docs/
- User answer (verbatim): a
- Normalized requirement: unpinned README prose gets a deep rewrite for user-facing tidiness — per-host paragraphs condense into the protection-tier table rows, threat model compresses to a short mandatory note, Develop/Usage keep only the shortest path, repeated promises and internal-implementation detail removed; no content is migrated out to docs/ (README stays self-complete within the D-008 skeleton). The rewrite boundary is the wiring tests: every pinned block stays byte-identical and pinned phrases ('agreement is not accuracy' class) keep their wording; sentence-level choices inside unpinned prose are execution-surface, this decision sets only the depth policy.
- Constraints / negatives: pinned blocks byte-untouched is the precondition, not negotiable; no docs/ migration (no new maintenance surface, README self-completeness convention preserved); minimal-edit-only rejected as half-treatment of the stated 'mess' symptom.
- Status: current

## D-003 — 徽章选型 + Mermaid 纳入

- Original question: 徽章选型+Mermaid — 徽章 a. license:MIT + profiles:generator|verifier + channel:npx github: / b. 两枚 / c. 零徽章; Mermaid a. 纳入 Architecture / b. 不纳入
- User answer (verbatim): 采纳推荐
- Normalized requirement: three static non-numeric badges on the README.md first screen — 'license: MIT' (authorization), 'profiles: generator | verifier' (the dual-profile architectural differentiator), 'channel: npx github:' (the Name-Independent Channel distribution statement). One Mermaid flowchart lands in the Architecture section: generator (advisory 3-rules) -> claim -> independent verifier -> 6-rung ladder -> four verdict states; git-diff reviewable, zero asset files; the zh-CN mirror may translate diagram labels (fenced-code text is unpinned). zh-CN mirror is likewise pure text.
- Constraints / negatives: no numeric/dynamic badges (no test-count or coverage counters — a second drifting declaration surface, per t19 D-008); badge rendering mechanics (shields.io static URL vs inline) are execution-surface; if Mermaid render-verification fails at implementation, fall back to prose — non-blocking; no GIF/ImageGen (t19 D-009 stands).
- Status: current

## D-004 — zh-CN 镜像同步纪律 + drift 机械执法

- Original question: 镜像同步纪律形态 — a. 同提交同步纪律+ADR-0079 D6+wiring 钉全套(含 drift 钉) / b. 仅惯例无 drift 钉 / c. best-effort 无纪律
- User answer (verbatim): a
- Normalized requirement: ADR-0079 gains D6 — any commit touching README.md MUST update README.zh-CN.md in the same commit and advance the baseline comment to that commit's sha; test/adr-0079-wiring.test.js (R3 surface, no carve-out) pins: mirror exists; the language-switch line pair present on both files; the baseline comment carries a 40-hex sha that exists in git history; the two files share the same top-level ## heading skeleton; the mirror is absent from package files; and the drift pin — 'git log -1 README.md' sha must equal the baseline sha recorded in the mirror (README moved without the mirror = red).
- Constraints / negatives: strict form — the baseline sha advances only on real sync (trivial README edits still pay the sync tax; that tax is what keeps the mirror alive — the translation-drift-to-zero evidence is the registered reason); if the tax proves too heavy later, revision goes through ADR supersede, never a broken pin; all pins live in the R3 test surface so D-001's zero-R2 purity holds.
- Status: current

## D-005 — t20 收尾形态：全套轻收尾 + B 项处置细节

- Original question: 收尾形态 — a. 全套轻收尾+六细节(setup 吸收 pz+kv/B-1 判别场景/B-2 惯例句/B-4+B-5 defer 行/B-6 Disclosed Repair/电池重跑+git-status leg+sweep+trend 行全套) / b. 简化收尾 / c. B 项外包
- User answer (verbatim): a
- Normalized requirement: (1) setup commit absorbs pz + kv (t19 audit report + audit handoff) with a disclosed absorption line; (2) B-1 discriminating scenario = [fix(+1), doc(+1)] (old semantics feed+push fires the advisory, new semantics transparent = silent — covers feed-leg and adjacency); (3) B-2 convention sentence lands in AGENTS.md working agreement beside the authoring-path clause: a captured-evidence '$' line names the verbatim argv or is explicitly marked display-form; (4) B-4 and B-5 become deferred-registry rows — B-4 trigger 'when the exit contract next opens, add the precision clause' (pending-evaluation), B-5 trigger 'when an arg-validation convention next forms' (pending-evaluation); one of the new rows serves as the t20 trend row's deferred_entry satisfying ADR-0076 D-F clause-3 (zero-product-diff + new ADR); (5) B-6 repaired via Disclosed Repair on the t19 round-complete handoff '18 evidence files' wording with the declaration triple; (6) closeout = section-6 battery verbatim re-run '--round grill-t20' + a new committed git-status clean-tree leg (clean-tree.txt, B-7) + consent-sweep named lines (defer-0060 standing, new B-4/B-5 rows, sunset counter, never-commit set) + trend row 'kind:documentation, adr_added:["0079"], net_additions:1, zero_product_diff:true, deferred_entry' + facts-canon report with zero canon numbers in prose + report_commit null.
- Constraints / negatives: every piece reuses an established convention (no new invention); battery leg order/args and which defer row serves as deferred_entry are execution-surface; no battery-skip simplification (the doc-round light-close triad precedent stands); B-items are not spun into a further round (consistent with D-001).
- Status: current

