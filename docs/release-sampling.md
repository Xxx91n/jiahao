# Release Sampling - Generator Rules (ADR-0032 D4)

Behavioral acceptance for generator surface rules is architectural
(injection proof + registration proof), not statistical. This file is the
template for the one human-sampling duty per release: 3-10 real tasks,
recorded in release notes. It is never CI, never a gate.

## Pre-registered equivalence statement

Generator rules are advisory surface-signal text. For any future behavioral
A/B, the minimum detectable effect is pre-registered at ~1200 paired
observations (power analysis; below that, "no difference measured" means
"no statistically detectable behavioral effect" and the acceptance duty
returns to the injection layer - it is NOT a failure, and NOT evidence the
rules work). No statistical gate is run below that power.

## Per-release sampling record (copy into release notes)

Release: <version>  Date: <YYYY-MM-DD>  Sampler: <name>

Tasks sampled (3-10, real work, not synthetic):

| # | Task | Profile | False-completion signal observed? | Rule cited in output? | Notes |
|---|------|---------|-----------------------------------|-----------------------|-------|
| 1 |      | generator | yes/no                        | gsr:1/2/3 or none  |       |

Observations feed the coverage map: a rule with zero observed relevance
across two consecutive releases is a retirement candidate
(superseded/deprecated, ADR-0032 D5 sweep). A declared-gap iron law that
shows up in sampling notes is an admission candidate (novel + demonstrated
+ substantial >= 30 observations).
