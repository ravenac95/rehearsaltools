# Task 03: Add Verbose Logging Inside All Six Handler Files

## Objective

Add structured log calls at entry, exit, and key decision points inside every
handler module: project, tempo, timesig, mixdown, regions, and songform. Extend
`test_handlers.lua` with new test cases that verify log output. All existing
handler tests must continue to pass without modification.

---

## Context

After Tasks 01 and 02, `src/logger.lua` exists and all dispatch tests pass.

All six handler files live in `reascripts/src/handlers/`. Each one already uses
the `script_dir` + `dofile` pattern to load `validation.lua`:

```lua
local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
```

`project.lua` does NOT currently have this pattern (it has no `script_dir` at
all). You will need to add the `script_dir` block to `project.lua` before loading
the logger.

### How tests currently work

`test_handlers.lua` loads each handler with `dofile("src/handlers/project.lua")`
etc. At that point, `reaper` is nil in the test environment. The `script_dir`
guard resolves to `""`, so `dofile(script_dir .. "src/logger.lua")` becomes
`dofile("src/logger.lua")` — which works because tests run from the `reascripts/`
directory.

However, inside `logger.lua`, every operation that calls `reaper.*` is guarded, so
when `reaper` is nil the logger is a valid (no-op) table. Existing handler tests
will therefore continue to pass exactly as written, because log calls are no-ops.

### Adding log-verification tests

New tests need to control the enabled state. The approach is:

1. Set `reaper` global to a stub with `GetExtState` returning `"1"` before loading
   the handler module under test.
2. Call the handler function.
3. Inspect the stub's `ShowConsoleMsg` call log.
4. Restore `reaper = nil` after each test.

Because handler modules load the logger at module-load time (via `dofile`), and
`dofile` re-executes the file each time, re-dofile-ing the handler with `reaper`
set to the stub will give the handler a logger that reads from that stub's
`GetExtState`.

---

## Files

| Path | Action |
|------|--------|
| `reascripts/src/handlers/project.lua` | MODIFY — add `script_dir` block + logger |
| `reascripts/src/handlers/tempo.lua` | MODIFY — add logger |
| `reascripts/src/handlers/timesig.lua` | MODIFY — add logger |
| `reascripts/src/handlers/mixdown.lua` | MODIFY — add logger |
| `reascripts/src/handlers/regions.lua` | MODIFY — add logger |
| `reascripts/src/handlers/songform.lua` | MODIFY — add logger |
| `reascripts/tests/test_handlers.lua` | MODIFY — add log-verification tests |

---

## Dependencies

- Depends on: Task 01 (logger module)
- Depends on: Task 02 is NOT a hard dependency — this task is independent of dispatch changes
- Blocks: nothing (Task 04 is also independent)

---

## Requirements

### Shared pattern for all handlers

After the existing `script_dir` block (or adding one to `project.lua`), load the
logger:

```lua
local logger = dofile(script_dir .. "src/logger.lua")
```

Use `pcall` only if you want to be extra safe, but since `script_dir` resolves
to `""` in tests and `logger.lua` is at `src/logger.lua` relative to `reascripts/`,
a plain `dofile` works for both production and test contexts.

### `reascripts/src/handlers/project.lua`

Add `script_dir` block (it has none today). Then add logger load. Log calls:

```lua
function M.new(adapter)
  return function(_payload)
    logger.debug("project: enter")
    logger.debug("project: calling new_project")
    adapter.new_project()
    logger.debug("project: ok")
    return {ok = true}
  end
end
```

### `reascripts/src/handlers/tempo.lua`

```lua
function M.new(adapter)
  return function(payload)
    logger.debug("tempo: enter, bpm=%s", tostring(payload.bpm))
    local ok, data = validation.validate_tempo(payload)
    if not ok then
      logger.error("tempo: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("tempo: validation ok, bpm=%.4g", data.bpm)
    logger.debug("tempo: calling set_tempo bpm=%.4g", data.bpm)
    adapter.set_tempo(data.bpm)
    logger.debug("tempo: calling update_timeline")
    adapter.update_timeline()
    logger.debug("tempo: ok")
    return {bpm = data.bpm}
  end
end
```

### `reascripts/src/handlers/timesig.lua`

```lua
function M.new(adapter)
  return function(payload)
    logger.debug("timesig: enter, num=%s denom=%s measure=%s",
      tostring(payload.numerator), tostring(payload.denominator), tostring(payload.measure))
    local ok, data = validation.validate_timesig(payload)
    if not ok then
      logger.error("timesig: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("timesig: validation ok, %d/%d measure=%s",
      data.numerator, data.denominator, tostring(data.measure))
    if data.measure then
      logger.debug("timesig: inserting at measure %d", data.measure)
      adapter.set_timesig_at_measure(data.numerator, data.denominator, data.measure)
    else
      local t = adapter.get_cursor_position()
      logger.debug("timesig: inserting at playhead t=%.4g", t)
      adapter.set_marker_at_time(t, -1, data.numerator, data.denominator)
    end
    logger.debug("timesig: calling update_timeline")
    adapter.update_timeline()
    logger.debug("timesig: ok")
    return {
      numerator   = data.numerator,
      denominator = data.denominator,
      measure     = data.measure,
    }
  end
end
```

### `reascripts/src/handlers/mixdown.lua`

```lua
function M.new(adapter)
  return function(payload)
    logger.debug("mixdown: enter, output_dir=%s", tostring(payload.output_dir))
    local ok, data = validation.validate_mixdown(payload)
    if not ok then
      logger.error("mixdown: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("mixdown: validation ok, output_dir=%s", tostring(data.output_dir))
    logger.debug("mixdown: calling configure_render_regions")
    adapter.configure_render_regions(data.output_dir)
    logger.debug("mixdown: calling render_project")
    adapter.render_project()
    local region_count = #adapter.list_regions()
    logger.debug("mixdown: ok, region_count=%d", region_count)
    return {
      output_dir   = data.output_dir,
      region_count = region_count,
    }
  end
end
```

### `reascripts/src/handlers/regions.lua`

Add logger to each sub-handler inside the `M.new` return table. Log points:

**`new`**: entry with name, validation outcome, start_t + sentinel end_t, add_region call, ok.

**`rename`**: entry with id + name, validation outcome, region lookup result (found id or not found), set_region call, ok.

**`list`**: entry, region count, ok.

**`play`**: entry with id, validation outcome, region lookup, set_edit_cursor call, action_play call, ok.

**`seek_to_end`**: entry, computed `end_t` value, set_edit_cursor call, ok.

Also log in `item_end_max` if desired, but at minimum log the final computed value
before `set_edit_cursor` is called in `seek_to_end`.

Example for `new`:

```lua
new = function(payload)
  logger.debug("regions.new: enter, name=%s", tostring(payload.name))
  local ok, data = validation.validate_region_new(payload)
  if not ok then
    logger.error("regions.new: validation error=%s", tostring(data))
    return nil, data
  end
  local start_t = adapter.get_cursor_position()
  local end_t   = start_t + LARGE_OFFSET
  logger.debug("regions.new: add_region name=%q start=%.4g end=%.4g",
    data.name, start_t, end_t)
  adapter.add_region(start_t, end_t, data.name)
  adapter.update_arrange()
  logger.debug("regions.new: ok")
end,
```

### `reascripts/src/handlers/songform.lua`

Log points inside the handler closure returned by `M.new`:

1. Entry: row count and startTime.
2. Validation outcome.
3. `barOffset` check (rows[1].barOffset != 0 error path).
4. startTime type check error path.
5. `playhead_qn` value.
6. Each marker write in the loop: `"songform: marker %d/%d t=%.4g bpm=%.4g num=%d denom=%d"`.
7. Region creation: name, start, end.
8. Exit: `regionId`.

---

## Changes to `reascripts/tests/test_handlers.lua`

### Shared reaper stub helper

Add near the top of the test file (after the existing `make_adapter` factory):

```lua
-- ── Reaper stub for log-verification tests ──────────────────────────────────
-- Sets the global `reaper` to a stub that:
--   - returns ext_state_value from GetExtState (controls log enabled flag)
--   - records ShowConsoleMsg calls in a list
-- Returns (stub, console_calls), and a cleanup function to restore reaper=nil.
local function with_reaper_stub(ext_state_value, fn)
  local console_calls = {}
  local old_reaper = reaper  -- will be nil in test context
  reaper = {
    get_action_context = function()
      return nil, "./", nil, nil, nil, nil, nil
    end,
    GetExtState = function(section, key)
      if section == "rehearsaltools" and key == "log_enabled" then
        return ext_state_value
      end
      return ""
    end,
    SetExtState = function() end,
    ShowConsoleMsg = function(s)
      table.insert(console_calls, s)
    end,
  }
  local ok, err = pcall(fn, console_calls)
  reaper = old_reaper  -- restore
  if not ok then error(err, 2) end
  return console_calls
end
```

### New test blocks — one per handler

Add these AFTER the existing handler tests. Each new `describe` block tests that
log calls appear when enabled. Keep the existing tests untouched.

**Pattern for a new log-verification test:**

```lua
describe("project handler logging", function()
  it("emits DEBUG log lines when logging is enabled", function()
    local calls = with_reaper_stub("1", function(console_calls)
      -- Re-dofile the handler with reaper set to stub
      local ph = dofile("src/handlers/project.lua")
      local a = make_adapter()
      local h = ph.new(a)
      h({})
      -- At least one ShowConsoleMsg call should contain "[DEBUG]"
      local found = false
      for _, s in ipairs(console_calls) do
        if s:find("%[DEBUG%]") then found = true end
      end
      assert_true(found, "expected at least one DEBUG log line from project handler")
    end)
  end)

  it("emits no log lines when logging is disabled", function()
    with_reaper_stub("", function(console_calls)
      local ph = dofile("src/handlers/project.lua")
      local a = make_adapter()
      ph.new(a)({})
      assert_eq(#console_calls, 0)
    end)
  end)
end)
```

Repeat this pattern for: tempo, timesig, mixdown, regions (test each sub-handler),
and songform. For error paths, verify that an ERROR log line appears:

```lua
it("emits ERROR log on validation failure", function()
  with_reaper_stub("1", function(console_calls)
    local th = dofile("src/handlers/tempo.lua")
    local a = make_adapter()
    local h = th.new(a)
    h({})  -- missing bpm → validation error
    local found_error = false
    for _, s in ipairs(console_calls) do
      if s:find("%[ERROR%]") then found_error = true end
    end
    assert_true(found_error, "expected ERROR log line for tempo validation failure")
  end)
end)
```

---

## Acceptance Criteria

- [ ] `cd reascripts && lua tests/test_runner.lua` passes with 0 failures
- [ ] All pre-existing handler tests pass unchanged (they run with `reaper=nil`, so logger is no-op)
- [ ] Each handler emits at least one `[DEBUG]` line when `GetExtState` returns `"1"`
- [ ] Error paths emit at least one `[ERROR]` line when logging is enabled
- [ ] No log output when `GetExtState` returns `""`
- [ ] Existing handler side-effect assertions are unaffected (adapter `_calls` contents unchanged)
- [ ] `project.lua` now has the `script_dir` guard block (required to load logger)
- [ ] Log lines follow the format `[rehearsaltools] [LEVEL] <message>\n`

---

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file**: `reascripts/tests/test_handlers.lua` (modify existing)
- **Test framework**: `test_runner.lua` harness
- **Test command**: `cd reascripts && lua tests/test_runner.lua`

### Tests to Write (write these FIRST, before editing any handler)

For each of the six handlers, write at minimum:

1. **`<handler> logging: emits DEBUG log when enabled`** — fails until handler loads logger and calls it
2. **`<handler> logging: no log output when disabled`** — should pass immediately (logger is a no-op with `reaper=nil`), but adding it documents intent

For handlers with validation, also write:

3. **`<handler> logging: emits ERROR log on validation failure when enabled`**

Write all of these before touching any handler file. The "emits DEBUG log" tests will
fail (RED) because the handlers have no log calls yet. The "no output when disabled"
tests will pass even before (no regression).

### TDD Process

1. Add the new `describe` blocks to `test_handlers.lua` — the "emits DEBUG" tests FAIL (RED)
2. Edit each handler file to add `script_dir` (if missing) + `logger` + log calls (GREEN)
3. Run `cd reascripts && lua tests/test_runner.lua` — all tests pass
4. Refactor log message wording if needed while keeping tests green
