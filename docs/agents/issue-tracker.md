# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in .scratch/ (git-tracked
since 2026-09-15; volatile tool workdirs stay ignored).

## Conventions

- **Create an issue**: create a new file under .scratch/<feature-slug>/ (creating
  the directory if needed).
- **Read an issue**: open the file.
- **List issues**: scan .scratch/ for open Status: lines.
- **Close**: append the answer under an ## Answer heading, set Status: resolved.

## When a skill says "publish to the issue tracker"

Create a new file under .scratch/<feature-slug>/ (creating the directory if
needed).

## When a skill says "fetch the relevant ticket"

Scan .scratch/ for files matching the feature slug.

## Wayfinding operations

- **Map**: .scratch/<effort>/map.md — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: .scratch/<effort>/issues/NN-<slug>.md, numbered from 01, with
  the question in the body. A Type: line records the ticket type
  (research/prototype/grilling/task); a Status: line records
  claimed/resolved.
- **Blocking**: a Blocked by: NN, NN line near the top. A ticket is unblocked when
  every file it lists is resolved.
- **Frontier**: scan .scratch/<effort>/issues/ for files that are open, unblocked,
  and unclaimed; first by number wins.
- **Claim**: set Status: claimed and save before any work.
- **Resolve**: append the answer under an ## Answer heading, set Status: resolved,
  then append a context pointer to the map's Decisions-so-far in map.md.
