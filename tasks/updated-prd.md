# Updated PRD — Structured Logging for rehearsaltools ReaScript

## Summary

Add a structured, enable-gated logging subsystem to the rehearsaltools REAPER
script. Logging writes to REAPER's console via `ShowConsoleMsg`, is togglable at
runtime by the SPA via the existing OSC/dispatch pipeline, and produces verbose
output suitable for debugging all handler code paths.

## What Already Exists

| Asset | Location | Notes |
|---|---|---|
| Entry point | `reascripts/rehearsaltools.lua` | Already uses `reaper.ShowConsoleMsg` for error output; preserve that call |
| Command dispatcher | `reascripts/src/dispatch.lua` | `dispatch.dispatch` + `dispatch.run`; only place that calls all six handler `M.new()` |
| Six handler modules | `reascripts/src/handlers/{project,regions,tempo,timesig,mixdown,songform}.lua` | Each resolves `script_dir` at top with the `reaper.get_action_context` guard pattern, then dofile-loads `validation.lua` |
| REAPER API adapter | `reascripts/src/reaper_api.lua` | `adapter.console(msg)` already wraps ShowConsoleMsg; `GetExtState`/`SetExtState` NOT yet called anywhere |
| JSON encode/decode | `reascripts/src/json.lua` | `json.encode(value)` available; used for payload serialization |
| Test harness | `reascripts/tests/test_runner.lua` | Pure-Lua 5.4, run from `reascripts/` dir: `lua tests/test_runner.lua` |
| Test files | `reascripts/tests/test_*.lua` | Cover adapter, handlers, dispatch, payload, validation; use `make_adapter()` stub |

## Design Decisions Baked In

### Logger module: `reascripts/src/logger.lua`

- Loaded by callers via `dofile(script_dir .. "src/logger.lua")`, exactly like `validation.lua` is loaded today.
- Module returns a logger instance (singleton-style) — the same module-level table is returned each time.
- **Enabled flag**: read from `reaper.GetExtState("rehearsaltools", "log_enabled")` each time a log function is called (fresh read, so SPA toggle takes effect immediately without reloading). String `"1"` or `"true"` = enabled; anything else including empty string or nil = disabled.
- **`log.set_enabled(bool)`**: calls `reaper.SetExtState("rehearsaltools", "log_enabled", bool and "1" or "0", true)` — persists across REAPER sessions. This is the server-side toggle handler the SPA calls.
- **`log.is_enabled()`**: returns current state without side effects.
- **No-op guarantee**: when disabled, every log function returns immediately before any string formatting or ShowConsoleMsg call.
- **`reaper.ShowConsoleMsg` call**: made directly from logger, guarded by `if reaper and reaper.ShowConsoleMsg then ... end`, same pattern as `payload.lua` lines 14-17.
- **Line format**: `[rehearsaltools] [LEVEL] <message>\n`

### Logger public API

```
log.info(fmt, ...)    -- string.format(fmt, ...) then emit at INFO level
log.debug(fmt, ...)   -- same, DEBUG level
log.error(fmt, ...)   -- same, ERROR level
log.is_enabled()      -- returns bool
log.set_enabled(bool) -- writes GetExtState, updates module-level cache
log.dump(label, val)  -- logs table contents; uses json.encode when available
```

### Injection pattern: handlers dofile the logger themselves

Handlers load the logger exactly as they load validation:

```lua
local logger = dofile(script_dir .. "src/logger.lua")
```

No handler signature changes (`M.new(adapter)` is unchanged). The logger is a
module-level table; multiple dofile calls return the same table because Lua
caches loaded chunks only when using `require` — to avoid stale state across
dofile calls within a single ReaScript run, the module keeps enabled state via
GetExtState (read-through) rather than a cached bool, so each dofile gets a
fresh table but reads live state from ExtState.

### Log verbosity: full verbose (Option C)

Log points required:

**In `dispatch.dispatch` (and `dispatch.run`):**

- Command received: `INFO  dispatch: command=%s`
- Payload key-list on success path: `DEBUG dispatch: payload keys={%s}`
- Full payload body on error: `ERROR dispatch: full payload=%s`
- Handler selected: `DEBUG dispatch: routing to handler`
- Result logged: `DEBUG dispatch: result ok` or `ERROR dispatch: error=%s`

**In each handler at entry/exit:**

- Entry: `DEBUG <handler>: enter, payload keys={%s}`
- Validation outcome (success or failure): `DEBUG` / `ERROR`
- Each significant adapter call: one DEBUG line, e.g., "setting tempo 140 bpm"
- Computed values (songform): row positions, QN values
- Exit success: `DEBUG <handler>: ok`
- Exit error: `ERROR <handler>: %s`

**Payload serialization helper:**

- Key-list on success: iterate `pairs(payload)`, collect keys, join with `,`
- Full body on error: `json.encode(payload)` (the same json.lua used in payload.lua)
- `log.dump(label, val)` uses json.encode for table values

### New dispatch command: `set_log_enabled`

A new command routed by `dispatch.dispatch`:

```
command = "set_log_enabled"
payload = { enabled: true|false }
```

Handler is inline in dispatch (no separate handler file needed). It calls
`logger.set_enabled(payload.enabled)` and returns `{ ok = true, enabled = bool }`.
The toggle itself is logged with `log.info(...)` before the state changes.

**Dispatch module change**: `dispatch.dispatch` and `dispatch.run` both need to
load the logger. `dispatch.run` uses `repo_root` to construct the path;
`dispatch.dispatch` will receive the logger as a module-level upvalue (loaded once
when dispatch.lua is dofile'd) or as a parameter. Given that handlers load the
logger themselves and dispatch.lua is also dofile'd with access to `script_dir`
via its own `reaper` guard, `dispatch.lua` should load the logger at module init
the same way handlers do.

### Preserve existing console call

`rehearsaltools.lua` line 15: `reaper.ShowConsoleMsg("[rehearsaltools] payload error: " .. err .. "\n")` — do not remove or modify.
`rehearsaltools.lua` line 20: the `if d_err then reaper.ShowConsoleMsg(...)` block — do not remove or modify.

### Tests

- All new tests under `reascripts/tests/`, following the `test_*.lua` naming convention.
- Test runner discovers them automatically.
- TDD mode: write failing tests first (RED), then implement (GREEN).
- Reaper stub in tests: add `GetExtState` and `SetExtState` to the existing stub tables used in test files that need them. The `test_handlers.lua` `make_adapter()` stub does NOT need `GetExtState`/`SetExtState` because handlers load the logger via dofile and the logger guards on `reaper and reaper.GetExtState`. In tests, `reaper` global is nil, so the guard prevents real ExtState calls; instead tests should inject a `reaper` stub table into the logger module where needed (or override the `reaper` global in a controlled way).
- For `test_logger.lua`: create a minimal `reaper` stub table with `GetExtState`, `SetExtState`, `ShowConsoleMsg` — inject it as the global `reaper` for the test scope.

## What Is Being Built (delta)

1. **New file**: `reascripts/src/logger.lua`
2. **Modified**: `reascripts/src/dispatch.lua` — add logger load, add `set_log_enabled` command, add log calls throughout `dispatch.dispatch`
3. **Modified**: `reascripts/src/handlers/project.lua` — add logger load + log calls
4. **Modified**: `reascripts/src/handlers/tempo.lua` — add logger load + log calls
5. **Modified**: `reascripts/src/handlers/timesig.lua` — add logger load + log calls
6. **Modified**: `reascripts/src/handlers/mixdown.lua` — add logger load + log calls
7. **Modified**: `reascripts/src/handlers/regions.lua` — add logger load + log calls
8. **Modified**: `reascripts/src/handlers/songform.lua` — add logger load + log calls
9. **New file**: `reascripts/tests/test_logger.lua`
10. **Modified**: `reascripts/tests/test_dispatch.lua` — add tests for `set_log_enabled` command and dispatch logging
11. **Modified**: `reascripts/tests/test_handlers.lua` — add log verification tests; ensure existing tests still pass

## Test Infrastructure

- **Framework**: custom pure-Lua 5.4 harness (`test_runner.lua`)
- **Run command**: `lua tests/test_runner.lua` (from `reascripts/` directory)
- **Test file convention**: `tests/test_*.lua`
- **TDD mode**: enabled — write RED tests before production code in each task

## Risks and Notes

- `dofile` in Lua does NOT cache — each call re-executes the file and returns a fresh table. The logger must NOT hold mutable enabled-flag state in a module-level local variable if multiple dofile calls are expected in the same run (currently one dispatch per ReaScript invocation, so this is not a practical concern, but using GetExtState as the source of truth is more correct and sidesteps the issue entirely).
- `reaper` global is nil in tests. All logger and dispatch code that uses `reaper.*` must be guarded.
- `dispatch.run` passes `repo_root` (the script directory path) to dispatch; the inline `set_log_enabled` handler needs `repo_root` to not be needed (it calls logger, which is already loaded by dispatch.lua).
- The six handler test assertions in `test_handlers.lua` test side-effects on the adapter (calls recorded). Adding verbose logging does not change those side-effects, so existing handler tests continue to pass without modification. Only NEW tests need to be written for log assertions.
