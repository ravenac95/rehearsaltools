# Build Progress

## Status: TASK_REVIEW

## Pipeline State
- BRAINSTORM: skipped
- DISCOVERY: complete (tasks/planning-questions.md)
- USER_Q&A: complete (D1 id-match, D2 drop regionId, D3 actions/ dir, D4 new RtClient class)
- GENERATE: complete (12 task files)
- TASK_REVIEW: in progress
- EXECUTE: pending
- VERIFY: pending
- PR: pending
- REVIEW: pending

## Task DAG

```
Wave 1 (no deps):
  01-lua-foundation
  02-web-remote-client
  03-osc-infra
  04-reaper-config-files
  05-spa-currentTake

Wave 2 (depends on Wave 1):
  06-lua-action-scripts         <- 01
  07-routes-regions             <- 02, 03
  08-routes-songform            <- 02, 03
  09-routes-project-mixdown     <- 03

Wave 3 (depends on Wave 2):
  10-index-wiring               <- 02, 03, 07, 08, 09

Wave 4 (cleanup, depends on Wave 3):
  11-cleanup-deletions          <- 06, 07, 08, 09, 10
  12-readme                     <- 04, 11
```

## Tasks

| # | File | Wave | Depends on |
|---|------|------|------------|
| 01 | 01-lua-foundation.md | 1 | — |
| 02 | 02-web-remote-client.md | 1 | — |
| 03 | 03-osc-infra.md | 1 | — |
| 04 | 04-reaper-config-files.md | 1 | — |
| 05 | 05-spa-currentTake.md | 1 | — |
| 06 | 06-lua-action-scripts.md | 2 | 01 |
| 07 | 07-routes-regions.md | 2 | 02, 03 |
| 08 | 08-routes-songform.md | 2 | 02, 03 |
| 09 | 09-routes-project-mixdown.md | 2 | 03 |
| 10 | 10-index-wiring.md | 3 | 02, 03, 07, 08, 09 |
| 11 | 11-cleanup-deletions.md | 4 | 06, 07, 08, 09, 10 |
| 12 | 12-readme.md | 4 | 04, 11 |

## Notes
- Branch: `claude/fix-reaper-osc-yMCYy`
- Auto-commit: enabled; one commit per task using the commit message in each
  task file.
- TDD mode enabled: every task with code writes failing tests first.
- Parallel-task-orchestrator will run wave 1 entirely in parallel, then wave
  2, etc.
