# grill-t23 GOAL — GitHub front-face round under armed headroom watch

## Source
- User directive: continue improving the GitHub repository front face, using skills under C:\Users\Administrator\.agents\skills\git\ (beautify-github-readme, create-readme, readme-crafter, repo-logo, github-issues).
- Round-open context: D:/Aworker/jiahao/.scratch/grill-t22/handoffs/2026-09-22-audit-handoff.md (t22 second-party audit PASS WITH FINDINGS, 3 nits: T3-C-1/2/3) + authoritative report D:/Aworker/jiahao/.scratch/grill-t22/reports/2026-09-22-audit.md.

## Pain (invariant)
我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## Live constraint discovered at recon
- defer-0067 ARMED in-band: pack headroom 592B < 2048B trigger; ADR-0081 D-E forbids any surface-growing commit until the ADR-0062 D-A cap-amendment channel resolves or headroom is restored above the band.
- README.md (35,470B) IS packed; README-zh-CN.md (21,639B), assets/, .github/, docs/adr/ are NOT in the tarball whitelist = cap-free surfaces.

## Grill rules
- One question at a time; ledger append on each confirmed answer (D-001+) at D:/Aworker/jiahao/.scratch/grill-t23/decision-ledger.md.
- No source edits during grill; no other goals; plan-mode enumeration before asking.
- VCS via GitButler only.
