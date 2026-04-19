# Updated PRD — Structured Logging for RehearsalTools Lua Layer

## Status

Design decisions baked in from user answers. Ready for sequential task execution.

---

## Background

The RehearsalTools REAPER-side codebase (`reascripts/`) currently has no structured
logging. The only console output is two bare `reaper.ShowConsoleMsg` calls in the
entry point (`rehearsaltools.lua`). Debugging handler behaviour requires either a
connected REAPER session or reading test output — there is no observability at
runtime.

---

## What Already Exists

| Asset | Location | Notes |
|---|---|---|
| Entry point | `reascripts/rehearsaltools.lua` | Two `reaper.ShowConsoleMsg` error-path calls; preserve both unchanged |
| Command dispatcher | `reascripts/src/dispatch.lua` | `dispatch.dispatch` + `dispatch.run`; loads six handlers via `dofile` |
| Six handler modules | `reascripts/src/handlers/*.lua` | project, regions, tempo, timesig, mixdown, songform |
| REAPER API adapter | `reascripts/src/reaper_api.lua` | `adapter.console(msg)` wraps ShowConsoleMsg; no `GetExtState`/`SetExtState` today |
| JSON encode/decode | `reascripts/src/json.lua` | `json.encode(value)` and `json.decode(str)` |
| Validation helpers | `reascripts/src/validation.lua` | Loaded by handlers via `dofile(script_dir .. "src/validation.lua")` |
| Test harness | `reascripts/tests/test_runner.lua` | Pure Lua 5.4; run with `cd reascripts && lua tests/test_runner.lua` |
| Existing test files | `reascripts/tests/test_*.lua` | Cover adapter, handlers, dispatch, payload, validation |

---

## Design Decisions (from user answers)

### Q1 — Enabled flag

Use `reaper.GetExtState("rehearsaltools", "log_enabled")` / `reaper.SetExtState(...)`.
Read fresh on every log emission. `"1"` or `"true"` = enabled; anything else
(including empty string) = disabled. `log.set_enabled(bool)` writes the ExtState
so the SPA server-side handler can toggle it.

### Q2 — Injection pattern

Handlers load the logger themselves via `dofile(script_dir .. "src/logger.lua")`,
mirroring the existing `validation.lua` pattern. No handler signature changes.
`dispatch.lua` loads it the same way using its `repo_root` path.

### Q3 — Verbosity

Full verbose (Option C). Log in dispatch AND inside every handler at entry/exit
AND at intra-handler decision points: validation outcomes, adapter calls,
computed values.

### Q4 — Payload content

Log full payload body on error paths (`json.encode`); log key-list only on success
paths. A simple key-list helper iterates `pairs(payload)` and joins key names.

### Q5 — Timing

No timing / duration logging.

### Q6 — ShowConsoleMsg routing

Call `reaper.ShowConsoleMsg` directly from the logger module, guarded by
`if reaper and reaper.ShowConsoleMsg then ... end`. Tests add a minimal `reaper`
stub with `GetExtState`, `SetExtState`, and `ShowConsoleMsg`.

### Q7 — TDD

Enabled. Write failing tests first (RED) before implementation code (GREEN).

---

## New and Modified Files (complete list)

### New: `reascripts/src/logger.lua`

Standalone module returning a logger table. Loaded via `dofile`. Public API:

```
log.info(fmt, ...)      -- format + emit at INFO level (no-op when disabled)
log.debug(fmt, ...)     -- format + emit at DEBUG level
log.error(fmt, ...)     -- format + emit at ERROR level
log.dump(label, value)  -- emit table using json.encode; falls back to tostring
log.is_enabled()        -- returns bool (reads GetExtState)
log.set_enabled(bool)   -- writes SetExtState("rehearsaltools","log_enabled","1"|"",true)
```

**Line format**: `[rehearsaltools] [LEVEL] <message>\n`

**No-op guarantee**: check enabled first, before any `string.format` call.

**GetExtState guard**: `if reaper and reaper.GetExtState then ... end`; return `""` when absent.

### Modified: `reascripts/src/dispatch.lua`

1. Load logger: at module top via `dofile(script_dir .. "src/logger.lua")` with the same `reaper` guard that other modules use. Because `dispatch.lua` is loaded by `M.run` with `repo_root`, the top-level `script_dir` resolution needs that guard. Alternatively, store the logger as an upvalue set during `M.run` call. **Chosen approach**: load in `M.run` once using `repo_root`, store as a module-level upvalue, pass as a parameter to `M.dispatch`.
2. `M.dispatch` signature becomes `M.dispatch(adapter, payload, handlers, logger)`. `logger` is optional (defaults to a no-op stub) so all existing `test_dispatch.lua` tests pass without modification (they pass no logger).
3. Add `set_log_enabled` routing: inline in `M.dispatch` before the `unknown command` fallback.
4. Log points in `M.dispatch`:
   - Entry: `log.info("dispatch: command=%s", command)`
   - Payload key-list: `log.debug("dispatch: payload keys={%s}", keys_list(args))`
   - Success result: `log.debug("dispatch: result keys={%s}", keys_list(result))`
   - Error from handler: `log.error("dispatch: handler error=%s | payload=%s", err, json.encode(payload))`
   - Unknown command error: `log.error("dispatch: unknown command=%s | payload=%s", command, json.encode(payload))`
   - `set_log_enabled` toggle: `log.info("dispatch: logging %s", bool and "enabled" or "disabled")` (logged BEFORE state changes)

### Modified: `reascripts/src/handlers/project.lua`

```lua
local logger = dofile(script_dir .. "src/logger.lua")
```
Log: entry (`DEBUG project: enter`), adapter call (`DEBUG project: calling new_project`), exit (`DEBUG project: ok`).

### Modified: `reascripts/src/handlers/tempo.lua`

Load logger. Log: entry with bpm value, validation outcome, `set_tempo` call, `update_timeline` call, exit.

### Modified: `reascripts/src/handlers/timesig.lua`

Load logger. Log: entry, validation outcome, branch taken (playhead vs. measure), adapter call details, exit.

### Modified: `reascripts/src/handlers/mixdown.lua`

Load logger. Log: entry with output_dir, validation outcome, configure and render calls, region_count, exit.

### Modified: `reascripts/src/handlers/regions.lua`

Load logger. Log: entry/exit for each sub-handler (new, rename, list, play, seek_to_end); validation outcomes; region lookups (found/not found); computed `end_t` (24h sentinel); max-item-end value.

### Modified: `reascripts/src/handlers/songform.lua`

Load logger. Log: entry with row count, validation outcome, `startTime`, `playhead_qn`, each marker write (time, bpm, num, denom), region creation (name, start), exit with `regionId`.

### New: `reascripts/tests/test_logger.lua`

Tests for every public function in `logger.lua`. Injects a `reaper` stub global.

### Modified: `reascripts/tests/test_dispatch.lua`

Add:
- A `make_logger()` stub that records calls.
- Tests for `set_log_enabled` command routing.
- Tests that `dispatch.dispatch` emits log calls when a logger stub is passed.
- All existing tests continue to pass (logger parameter is optional).

### Modified: `reascripts/tests/test_handlers.lua`

Add:
- A `make_reaper_stub(enabled)` helper that injects a `reaper` global with `GetExtState` returning `"1"` (enabled) or `""` (disabled).
- New `describe` blocks verifying log calls appear in the `ShowConsoleMsg` stub when enabled.
- All existing tests continue to pass (they run with `reaper` nil, so logger is a no-op).

---

## Invariants

1. `rehearsaltools.lua` must not be modified at all.
2. When `log.is_enabled()` returns false, no `string.format` or `ShowConsoleMsg` is called.
3. `reaper.GetExtState` guard: treat missing/nil `reaper` global as disabled.
4. All existing `test_*.lua` assertions pass without modification.
5. New command `set_log_enabled` is documented in `README.md`.

---

## Test Infrastructure

- **Framework**: `test_runner.lua` with globals `describe`, `it`, `assert_eq`, `assert_true`, `assert_false`, `assert_nil`, `assert_not_nil`, `assert_error`
- **Test command**: `cd reascripts && lua tests/test_runner.lua`
- **Convention**: `reascripts/tests/test_*.lua` (auto-discovered)
- **TDD mode**: ON — RED before GREEN in every task

---

## README Addition

Add a new section to `README.md` documenting the `set_log_enabled` OSC command.
Place it under a new "OSC commands" heading or near the "Running tests" section.

| Command | Payload | Returns |
|---------|---------|---------|
| `set_log_enabled` | `{"command":"set_log_enabled","enabled":true}` | `{"ok":true,"enabled":true}` |
