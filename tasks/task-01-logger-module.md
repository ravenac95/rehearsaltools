# Task 01: Create `reascripts/src/logger.lua` and `reascripts/tests/test_logger.lua`

## Objective

Create the standalone logger module (`src/logger.lua`) that all subsequent tasks
depend on, together with its full test suite. Follow TDD: write the tests first
so they fail, then implement the module to make them pass.

---

## Context

The codebase has no logging today. `reascripts/src/payload.lua` (lines 14-17) and
every handler file (`src/handlers/*.lua`) use this guard pattern to safely call REAPER
APIs in a context where `reaper` may be nil (e.g., during unit tests):

```lua
local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
```

The logger must use the same pattern. It must also call `reaper.ShowConsoleMsg`
directly, guarded by `if reaper and reaper.ShowConsoleMsg then ... end`.

`reascripts/src/json.lua` exports `json.encode(value)` used for `log.dump`. Load
it via `dofile(script_dir .. "src/json.lua")`.

Tests live in `reascripts/tests/`, are named `test_*.lua`, and are discovered
automatically by `tests/test_runner.lua`. Test globals (`describe`, `it`,
`assert_eq`, `assert_true`, etc.) are injected by the runner.

Run the test suite from the `reascripts/` directory:

```
cd reascripts && lua tests/test_runner.lua
```

---

## Files

| Path | Action |
|------|--------|
| `reascripts/tests/test_logger.lua` | CREATE (tests first — they must fail before implementation) |
| `reascripts/src/logger.lua` | CREATE (implementation — make the tests pass) |

Do not modify any other file in this task.

---

## Dependencies

- Depends on: None (first task)
- Blocks: Task 02, Task 03, Task 04

---

## Requirements

### `reascripts/src/logger.lua`

1. **Module shape**: the file returns a table (the logger). Every caller gets a
   fresh table per `dofile` call, but enabled state is sourced from ExtState so
   parallel dofile calls see consistent state.

2. **`script_dir` resolution** (needed to load `json.lua`):
   ```lua
   local script_dir = (reaper and reaper.get_action_context)
     and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
     or ""
   ```

3. **`json` load** (for `log.dump`):
   ```lua
   local ok, json = pcall(dofile, script_dir .. "src/json.lua")
   if not ok then json = nil end
   ```
   Use `pcall` so that if `json.lua` cannot be loaded (e.g., wrong path during
   tests), `log.dump` degrades gracefully to `tostring`.

4. **Enabled-flag helper** (private):
   ```lua
   local function is_enabled()
     if not (reaper and reaper.GetExtState) then return false end
     local v = reaper.GetExtState("rehearsaltools", "log_enabled")
     return v == "1" or v == "true"
   end
   ```

5. **Emit helper** (private):
   ```lua
   local function emit(level, msg)
     if not is_enabled() then return end
     if reaper and reaper.ShowConsoleMsg then
       reaper.ShowConsoleMsg("[rehearsaltools] [" .. level .. "] " .. msg .. "\n")
     end
   end
   ```

6. **Public API** (all on the returned table `M`):

   - `M.is_enabled()` — returns `is_enabled()` (bool, no side effects)
   - `M.set_enabled(bool)` — writes
     `reaper.SetExtState("rehearsaltools", "log_enabled", bool and "1" or "", true)`
     guarded by `if reaper and reaper.SetExtState then ... end`
   - `M.info(fmt, ...)` — calls `emit("INFO", string.format(fmt, ...))`; the
     `string.format` call must NOT happen when disabled (check `is_enabled()` first)
   - `M.debug(fmt, ...)` — same pattern, level `"DEBUG"`
   - `M.error(fmt, ...)` — same pattern, level `"ERROR"`
   - `M.dump(label, value)` — when enabled: serialize `value` with `json.encode`
     when `json` is available and `type(value) == "table"`, otherwise `tostring(value)`;
     emit at `"DEBUG"` level with format `"<label>: <serialized>"`

7. **No-op guarantee**: in every log function, check `is_enabled()` as the very
   first statement. Return immediately if false. Do not call `string.format` first.

### `reascripts/tests/test_logger.lua`

Write this file BEFORE implementing `src/logger.lua`. The tests must fail (error
or assertion failure) when run against a non-existent or empty logger.

The test file must inject a controlled `reaper` global before loading the logger.
Pattern: save the real `reaper` global (nil in tests), set a stub, `dofile` the
logger, restore. Since `reaper` is a global and dofile runs in the current
environment, setting `reaper = stub` before `dofile("src/logger.lua")` works.

#### Stub shape

```lua
local function make_reaper_stub(ext_state_value)
  local calls = {}
  local ext = { ["rehearsaltools:log_enabled"] = ext_state_value or "" }
  return {
    _calls = calls,
    get_action_context = function()
      return nil, "./", nil, nil, nil, nil, nil
    end,
    GetExtState = function(section, key)
      table.insert(calls, {fn="GetExtState", section=section, key=key})
      return ext[section .. ":" .. key] or ""
    end,
    SetExtState = function(section, key, value, persist)
      table.insert(calls, {fn="SetExtState", section=section, key=key, value=value, persist=persist})
      ext[section .. ":" .. key] = value
    end,
    ShowConsoleMsg = function(s)
      table.insert(calls, {fn="ShowConsoleMsg", s=s})
    end,
  }, calls, ext
end
```

#### Required test cases

Write one `describe` block per logical area:

**`describe("logger.is_enabled")`**

- `it("returns false when GetExtState returns empty string")`
- `it("returns true when GetExtState returns '1'")`
- `it("returns true when GetExtState returns 'true'")`
- `it("returns false when reaper global is nil")`

**`describe("logger.set_enabled")`**

- `it("calls SetExtState with '1' when passed true")`
- `it("calls SetExtState with '' when passed false")`
- `it("persist flag is true")`
- `it("is a no-op when reaper global is nil")` (no error raised)

**`describe("logger.info / debug / error")`**

- `it("calls ShowConsoleMsg with correct prefix and newline when enabled")`
- `it("message contains [INFO] tag for log.info")`
- `it("message contains [DEBUG] tag for log.debug")`
- `it("message contains [ERROR] tag for log.error")`
- `it("formats variadic args via string.format")`
- `it("is a no-op (no ShowConsoleMsg call) when disabled")`
- `it("does NOT call string.format when disabled")` — verify by using a format
  string with a bad arg type that would error if formatted; confirm no error raised

**`describe("logger.dump")`**

- `it("emits a DEBUG line containing the label")`
- `it("uses tostring for non-table values")`
- `it("is a no-op when disabled")`
- `it("does not error when json.lua cannot be loaded")` — test with a logger
  loaded when `script_dir` points somewhere without `src/json.lua`

---

## Implementation Details

### Loading pattern for handlers (reference for later tasks)

Once `src/logger.lua` exists, any handler or dispatch module loads it with:

```lua
local logger = dofile(script_dir .. "src/logger.lua")
```

where `script_dir` is already resolved at the top of that file.

### Test isolation

Each `it` block should construct a fresh stub and dofile the logger anew so
module-level state does not leak between tests. Example:

```lua
it("calls ShowConsoleMsg with correct prefix", function()
  local stub, calls = make_reaper_stub("1")  -- enabled
  reaper = stub  -- inject global
  local log = dofile("src/logger.lua")
  log.info("hello %s", "world")
  reaper = nil   -- restore
  assert_true(#calls > 0)
  local found = false
  for _, c in ipairs(calls) do
    if c.fn == "ShowConsoleMsg" then
      found = true
      assert_true(c.s:find("%[rehearsaltools%]") ~= nil)
      assert_true(c.s:find("%[INFO%]") ~= nil)
      assert_true(c.s:find("hello world") ~= nil)
      assert_true(c.s:sub(-1) == "\n")
    end
  end
  assert_true(found, "ShowConsoleMsg was never called")
end)
```

---

## Acceptance Criteria

- [ ] `reascripts/tests/test_logger.lua` exists and all its tests FAIL before `src/logger.lua` is created (RED phase verified)
- [ ] After creating `src/logger.lua`, all tests in `test_logger.lua` pass (GREEN phase)
- [ ] `cd reascripts && lua tests/test_runner.lua` passes with 0 failures (all existing tests plus new logger tests)
- [ ] `log.info` / `log.debug` / `log.error` are no-ops (no ShowConsoleMsg, no string.format) when `GetExtState` returns `""`
- [ ] Log lines match format `[rehearsaltools] [LEVEL] message\n`
- [ ] `log.set_enabled(true)` → `SetExtState` called with value `"1"`; `log.set_enabled(false)` → value `""`
- [ ] `log.dump` emits at DEBUG level; uses json.encode for tables when available
- [ ] No global state mutation beyond the `reaper` global (which is nil in tests)
- [ ] File does not call `require` — uses `dofile` only, consistent with the rest of the codebase

---

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file**: `reascripts/tests/test_logger.lua`
- **Test framework**: custom `test_runner.lua` harness (globals: `describe`, `it`, `assert_eq`, `assert_true`, `assert_false`, `assert_nil`, `assert_not_nil`, `assert_error`)
- **Test command**: `cd reascripts && lua tests/test_runner.lua`

### TDD Process

1. Create `reascripts/tests/test_logger.lua` with all test cases listed above — they should FAIL because `src/logger.lua` does not exist yet (RED)
2. Create `reascripts/src/logger.lua` with the full implementation (GREEN)
3. Run `cd reascripts && lua tests/test_runner.lua` — all tests must pass
4. Refactor if needed while keeping tests green
