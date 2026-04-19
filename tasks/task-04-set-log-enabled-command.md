# Task 04: Finish `set_log_enabled` Command and Update README

## Objective

Complete end-to-end wiring of the `set_log_enabled` dispatch command: verify the
ExtState write happens via `logger.set_enabled`, confirm the toggle is logged
before the state changes, add a test covering the ExtState write side-effect, and
document the new command in `README.md`.

---

## Context

After Tasks 01–03:
- `src/logger.lua` exists with `log.set_enabled(bool)` that calls `reaper.SetExtState`.
- `src/dispatch.lua` routes `set_log_enabled` and calls `_module_logger.set_enabled(enabled)` (or direct `SetExtState` fallback).
- Tests in `test_dispatch.lua` verify the command returns `{ok=true, enabled=<bool>}`.

What is still missing:
1. A test that verifies `SetExtState` is actually called when `set_log_enabled` is dispatched via `dispatch.run` (the full stack, not just `dispatch.dispatch` with stubs).
2. A test for the logger's `set_enabled` → ExtState write path directly (this may already exist from Task 01 — confirm before adding duplicates).
3. Documentation in `README.md`.

This task focuses on the gaps above and adding the README section. It is deliberately
narrow. If the ExtState write is already thoroughly tested by Task 01's `test_logger.lua`,
the main new work here is the README and one integration-style dispatch test.

---

## Files

| Path | Action |
|------|--------|
| `reascripts/tests/test_dispatch.lua` | MODIFY — add ExtState write verification test |
| `README.md` | MODIFY — add `set_log_enabled` command documentation |

Do not modify any `src/` file in this task unless you discover a correctness gap
in the `set_log_enabled` routing from Task 02 that was not caught by earlier tests.

---

## Dependencies

- Depends on: Task 01 (logger module with `set_enabled`)
- Depends on: Task 02 (dispatch routes `set_log_enabled`)
- Blocks: nothing (final task)

---

## Requirements

### 1. ExtState write verification test in `test_dispatch.lua`

The existing dispatch tests stub the handlers but use an opaque `adapter = {}`.
The `set_log_enabled` command does NOT go through a handler — it uses
`_module_logger.set_enabled` which calls `reaper.SetExtState`. To verify the
ExtState side-effect, inject a `reaper` stub with `SetExtState` recording.

Add a new describe block:

```lua
describe("dispatch set_log_enabled ExtState side-effect", function()
  it("calls SetExtState('rehearsaltools','log_enabled','1',true) when enabled=true", function()
    local ext_calls = {}
    local old_reaper = reaper  -- nil in tests
    reaper = {
      get_action_context = function()
        return nil, "./", nil, nil, nil, nil, nil
      end,
      GetExtState = function() return "" end,
      SetExtState = function(section, key, value, persist)
        table.insert(ext_calls, {section=section, key=key, value=value, persist=persist})
      end,
      ShowConsoleMsg = function() end,
    }

    -- Re-dofile dispatch so it picks up the new reaper stub
    local d = dofile("src/dispatch.lua")
    local stubs = make_stubs()  -- uses make_stubs defined earlier in the file
    d.dispatch({}, {command="set_log_enabled", enabled=true}, stubs)

    reaper = old_reaper  -- restore

    local found = false
    for _, c in ipairs(ext_calls) do
      if c.section == "rehearsaltools" and c.key == "log_enabled"
         and c.value == "1" and c.persist == true then
        found = true
      end
    end
    assert_true(found, "expected SetExtState call with value='1'")
  end)

  it("calls SetExtState with value='' when enabled=false", function()
    local ext_calls = {}
    local old_reaper = reaper
    reaper = {
      get_action_context = function()
        return nil, "./", nil, nil, nil, nil, nil
      end,
      GetExtState = function() return "" end,
      SetExtState = function(section, key, value, persist)
        table.insert(ext_calls, {section=section, key=key, value=value, persist=persist})
      end,
      ShowConsoleMsg = function() end,
    }

    local d = dofile("src/dispatch.lua")
    local stubs = make_stubs()
    d.dispatch({}, {command="set_log_enabled", enabled=false}, stubs)

    reaper = old_reaper

    local found = false
    for _, c in ipairs(ext_calls) do
      if c.section == "rehearsaltools" and c.key == "log_enabled"
         and c.value == "" then
        found = true
      end
    end
    assert_true(found, "expected SetExtState call with value=''")
  end)
end)
```

Note: this test re-dofiles `dispatch.lua` with a `reaper` stub set. That causes
`dispatch.lua`'s module-level `dofile(script_dir .. "src/logger.lua")` to load the
logger with that stub, so `_module_logger.set_enabled` will call the stub's
`SetExtState`. This is the correct integration test.

### 2. Verify the "toggle is logged before state changes" invariant

In `dispatch.lua` (Task 02), the log call happens before `set_enabled`. Add a test
that confirms a `ShowConsoleMsg` call appears in the console_calls list AND appears
before the `SetExtState` call in the combined `calls` list. Use a single stub that
records both events in one ordered list:

```lua
it("logs the toggle BEFORE writing SetExtState", function()
  local event_order = {}
  local old_reaper = reaper
  reaper = {
    get_action_context = function()
      return nil, "./", nil, nil, nil, nil, nil
    end,
    GetExtState = function() return "1" end,  -- logging enabled going in
    SetExtState = function(section, key, value, persist)
      table.insert(event_order, "SetExtState:" .. tostring(value))
    end,
    ShowConsoleMsg = function(s)
      table.insert(event_order, "ShowConsoleMsg")
    end,
  }

  local d = dofile("src/dispatch.lua")
  local stubs = make_stubs()
  d.dispatch({}, {command="set_log_enabled", enabled=false}, stubs)

  reaper = old_reaper

  -- The ShowConsoleMsg (the toggle log line) should appear before SetExtState
  local msg_idx, set_idx
  for i, e in ipairs(event_order) do
    if e == "ShowConsoleMsg" and not msg_idx then msg_idx = i end
    if e:find("SetExtState") and not set_idx then set_idx = i end
  end
  assert_not_nil(msg_idx, "expected a ShowConsoleMsg call")
  assert_not_nil(set_idx, "expected a SetExtState call")
  assert_true(msg_idx < set_idx,
    string.format("ShowConsoleMsg (idx %s) should precede SetExtState (idx %s)",
      tostring(msg_idx), tostring(set_idx)))
end)
```

### 3. README.md — document `set_log_enabled`

Read `README.md` before editing. Add a new section. The best location is after the
"Running tests" section and before "Repository layout". Title it
`## OSC commands — ReaScript dispatch` or similar.

Content to add:

```markdown
## OSC commands — `/rehearsaltools` dispatch

All operations arrive as a single OSC message to the `/rehearsaltools` address.
The JSON `command` field selects the operation.

| Command | Payload fields | Returns |
|---------|---------------|---------|
| `project.new` | *(none)* | `{"ok":true}` |
| `tempo` | `bpm` (number, 20–999) | `{"bpm":<n>}` |
| `timesig` | `numerator`, `denominator`, `measure?` | `{"numerator":<n>,"denominator":<n>,"measure":<n>}` |
| `mixdown.all` | `output_dir?` (string) | `{"output_dir":"...","region_count":<n>}` |
| `songform.write` | `rows` (array), `startTime` (number), `regionName?` | `{"regionId":<n>,"startTime":<n>,"rows":[...]}` |
| `region.new` | `name?` (string) | *(no return value)* |
| `region.rename` | `id` (integer), `name` (string) | *(no return value)* |
| `region.play` | `id` (integer) | `{"id":<n>,"start":<n>}` |
| `playhead.end` | *(none)* | *(no return value)* |
| `set_log_enabled` | `enabled` (boolean) | `{"ok":true,"enabled":<bool>}` |

### Toggling REAPER console logging

Send `set_log_enabled` from the SPA or any OSC client to enable or disable verbose
logging to the REAPER console. The flag is persisted via `reaper.SetExtState` and
survives REAPER restarts. When enabled, every dispatched command and all handler
decision points produce `[rehearsaltools] [LEVEL]` lines in the REAPER console.

```json
{"command": "set_log_enabled", "enabled": true}
```
```

---

## Acceptance Criteria

- [ ] `cd reascripts && lua tests/test_runner.lua` passes with 0 failures
- [ ] New ExtState side-effect tests pass: `SetExtState` is called with `"1"` for `enabled=true` and `""` for `enabled=false`
- [ ] The ordering test passes: `ShowConsoleMsg` (the toggle log line) appears before `SetExtState` in the event sequence
- [ ] `README.md` contains a `set_log_enabled` entry in a command table
- [ ] `README.md` contains a brief explanation of how to toggle logging
- [ ] No `src/` files are modified (this task is tests + docs only, unless a correctness bug surfaces)

---

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file**: `reascripts/tests/test_dispatch.lua` (modify existing)
- **Test framework**: `test_runner.lua` harness
- **Test command**: `cd reascripts && lua tests/test_runner.lua`

### Tests to Write (write FIRST)

1. **`set_log_enabled` writes SetExtState with `"1"` when `enabled=true`** — fails if dispatch doesn't call `set_enabled` on the module logger
2. **`set_log_enabled` writes SetExtState with `""` when `enabled=false`**
3. **Toggle is logged before ExtState is written** — ordering assertion

### TDD Process

1. Add the three new tests above to `test_dispatch.lua` — they may FAIL if the Task 02 implementation has a gap in the ExtState write path (RED confirms the gap; then fix it)
2. If all three pass immediately (Task 02 was complete), move straight to GREEN — no `src/` changes needed
3. Run `cd reascripts && lua tests/test_runner.lua` — all tests pass
4. Update `README.md` (no TDD needed for documentation)
