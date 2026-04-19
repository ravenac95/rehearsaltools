# Tasks — Structured Logging for RehearsalTools Lua Layer

These files are prompts for AI agents. Delete each file after the task is
completed. When all task files are deleted, the feature is complete.

---

## Feature Summary

Add a standalone `src/logger.lua` module to the RehearsalTools REAPER-side Lua
codebase. The logger writes formatted lines to REAPER's console via
`reaper.ShowConsoleMsg`, gates all output behind an ExtState flag togglable at
runtime by the SPA, and is loaded by all six handler modules and the dispatch
layer for full-verbose coverage.

---

## Tasks

| # | File | Scope | Depends on |
|---|------|-------|------------|
| 01 | `task-01-logger-module.md` | Create `src/logger.lua` + `tests/test_logger.lua` | — |
| 02 | `task-02-dispatch-logging.md` | Wire logger into `dispatch.lua`; add `set_log_enabled` command; update `tests/test_dispatch.lua` | 01 |
| 03 | `task-03-handler-logging.md` | Add log calls to all 6 handler files; update `tests/test_handlers.lua` | 01 |
| 04 | `task-04-set-log-enabled-command.md` | Add ExtState write tests + README documentation | 01, 02 |

---

## Dependency Graph

```
Task 01 (logger module)
  ├── Task 02 (dispatch logging)
  │     └── Task 04 (ExtState tests + README)
  └── Task 03 (handler logging)   [independent of Task 02]
```

Tasks 02 and 03 can run in parallel after Task 01 completes.
Task 04 must follow Task 02.

---

## TDD Mode

All tasks use TDD. For each task: write the failing tests first (RED), then
implement the production code (GREEN), then run the full suite before marking
done.

**Test command** (run from `reascripts/` directory):

```
cd reascripts && lua tests/test_runner.lua
```

All existing tests must continue to pass after every task.

---

## Open Questions / Decisions Already Made

All planning questions were answered before task generation. Key decisions:

- Logger reads `GetExtState("rehearsaltools", "log_enabled")` fresh on every call.
- `"1"` or `"true"` = enabled; anything else = disabled.
- `reaper.ShowConsoleMsg` called directly from logger with `if reaper and reaper.ShowConsoleMsg then` guard.
- Full payload body logged on error paths; key-list only on success paths.
- No timing/duration logging.
- Handlers load logger via `dofile` — no signature changes.
- `rehearsaltools.lua` is NOT modified.
