# Task 02: Wire Logger into `dispatch.lua` and Update `test_dispatch.lua`

## Objective

Load the logger inside `dispatch.lua`, add structured log calls throughout
`M.dispatch`, and add routing for the new `set_log_enabled` command. Update
`test_dispatch.lua` to cover the new behaviour. All existing dispatch tests must
continue to pass without modification.

---

## Context

After Task 01, `reascripts/src/logger.lua` exists and its tests pass.

`dispatch.lua` is the central routing file. Its public surface:

- `M.dispatch(adapter, payload, handlers)` — routes `payload.command` to the
  matching handler. Called by tests with stub handlers.
- `M.run(adapter, payload, repo_root)` — loads the six handler modules via
  `dofile`, then calls `M.dispatch`. Called by `rehearsaltools.lua`.

Current file: `reascripts/src/dispatch.lua` (61 lines). Read it before editing.

Key constraint: `test_dispatch.lua` calls `dispatch.dispatch(adapter, payload, stubs)`
with exactly three arguments. The logger parameter must be optional (defaulting to
a no-op stub) so those existing calls continue to work unchanged.

`rehearsaltools.lua` must NOT be modified. It calls `dispatch.run(adapter, data, script_dir)`.

The `json.lua` module is already loaded inside `logger.lua`. For the error-path
payload serialization in dispatch, load `json` in `dispatch.lua` separately so
dispatch can serialize payloads for error log lines. Use the same `pcall/dofile`
pattern used in logger.

---

## Files

| Path | Action |
|------|--------|
| `reascripts/src/dispatch.lua` | MODIFY |
| `reascripts/tests/test_dispatch.lua` | MODIFY |

Do not modify any other file in this task.

---

## Dependencies

- Depends on: Task 01 (logger module must exist)
- Blocks: Task 04 (the `set_log_enabled` command lives here)

---

## Requirements

### Changes to `reascripts/src/dispatch.lua`

#### 1. Module-level setup

At the top of `dispatch.lua`, add a `script_dir` resolution identical to handlers:

```lua
local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
```

Load `json` with `pcall` guard (for error-path serialization):

```lua
local _ok_json, _json = pcall(dofile, script_dir .. "src/json.lua")
if not _ok_json then _json = nil end
```

Define a private key-list helper (used for success-path payload/result summaries):

```lua
local function keys_list(t)
  if type(t) ~= "table" then return tostring(t) end
  local ks = {}
  for k in pairs(t) do table.insert(ks, tostring(k)) end
  table.sort(ks)
  return table.concat(ks, ", ")
end
```

Define a private payload-body serializer (used on error paths):

```lua
local function encode_payload(t)
  if _json and type(t) == "table" then
    local ok, s = pcall(_json.encode, t)
    if ok then return s end
  end
  return tostring(t)
end
```

#### 2. `M.dispatch` signature change

Change to:

```lua
function M.dispatch(adapter, payload, handlers, logger)
```

Add a no-op logger default at the top of the function body:

```lua
logger = logger or {
  info  = function() end,
  debug = function() end,
  error = function() end,
  dump  = function() end,
}
```

This ensures all existing `test_dispatch.lua` calls with three arguments continue
to work without any test modification.

#### 3. Log calls inside `M.dispatch`

After the existing type/command validation checks, add:

```lua
-- Entry log (after command is confirmed to be a string)
logger.info("dispatch: command=%s", command)
logger.debug("dispatch: payload keys={%s}", keys_list(args))
```

On the `unknown command` return path, change from:

```lua
return nil, "unknown command: " .. command
```

to:

```lua
local err_msg = "unknown command: " .. command
logger.error("dispatch: %s | payload=%s", err_msg, encode_payload(payload))
return nil, err_msg
```

After each successful handler call, wrap the return to log the result. For
commands that return a non-nil first value:

```lua
local result, herr = <handler call>
if herr then
  logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
  return result, herr
end
logger.debug("dispatch: result keys={%s}", keys_list(result))
return result
```

Do this for all nine routing branches. For handlers that return no value (e.g.,
`regions.new` and `regions.seek_to_end` return `nil` on success), log
`"dispatch: result=(nil)"` on success.

#### 4. New `set_log_enabled` command

Add this branch BEFORE the `unknown command` fallback. The logger must be loaded
by `M.run` before `M.dispatch` is called so it is available here. Because
`dispatch.lua` uses a module-level `script_dir`, the logger can also be loaded at
module level. Use a module-level logger loaded with `pcall`:

```lua
local _logger_module_ok, _module_logger = pcall(dofile, script_dir .. "src/logger.lua")
if not _logger_module_ok then _module_logger = nil end
```

Then in `M.dispatch`, for the `set_log_enabled` command use the passed-in `logger`
parameter (which is either the real one from `M.run` or the no-op default):

```lua
if command == "set_log_enabled" then
  local enabled = args.enabled == true or args.enabled == "true" or args.enabled == "1"
  logger.info("dispatch: logging %s via set_log_enabled",
              enabled and "enabled" or "disabled")
  -- set_enabled uses the module-level logger loaded by dispatch itself
  if _module_logger then
    _module_logger.set_enabled(enabled)
  elseif reaper and reaper.SetExtState then
    reaper.SetExtState("rehearsaltools", "log_enabled", enabled and "1" or "", true)
  end
  return {ok = true, enabled = enabled}
end
```

Note: the `logger.info` call above happens BEFORE `set_enabled` so the toggle
action itself is visible in the log (if logging was already enabled going in).

#### 5. `M.run` — load logger and pass to dispatch

In `M.run`, load the logger and pass it as the fourth argument to `M.dispatch`:

```lua
function M.run(adapter, payload, repo_root)
  local handlers = { ... }  -- unchanged
  local _ok, logger = pcall(dofile, repo_root .. "src/logger.lua")
  if not _ok then logger = nil end
  return M.dispatch(adapter, payload, handlers, logger)
end
```

### Changes to `reascripts/tests/test_dispatch.lua`

#### 1. Logger stub factory

Add at the top of the file (after the existing `dofile` and stub factories):

```lua
local function make_logger()
  local calls = {}
  return {
    _calls = calls,
    info  = function(_, fmt, ...) table.insert(calls, {level="INFO",  msg=string.format(fmt, ...)}) end,
    debug = function(_, fmt, ...) table.insert(calls, {level="DEBUG", msg=string.format(fmt, ...)}) end,
    error = function(_, fmt, ...) table.insert(calls, {level="ERROR", msg=string.format(fmt, ...)}) end,
    dump  = function(_, label, _) table.insert(calls, {level="DUMP",  msg=label}) end,
  }, calls
end
```

Note: these functions are stored in a table, not called as methods — use the
correct call convention. Check how `log.info(fmt, ...)` is defined in `logger.lua`;
if it is `function M.info(fmt, ...)` (not a method with `self`), the stub should
match:

```lua
local function make_logger()
  local calls = {}
  local log = {}
  function log.info(fmt, ...)  table.insert(calls, {level="INFO",  msg=string.format(fmt, ...)}) end
  function log.debug(fmt, ...) table.insert(calls, {level="DEBUG", msg=string.format(fmt, ...)}) end
  function log.error(fmt, ...) table.insert(calls, {level="ERROR", msg=string.format(fmt, ...)}) end
  function log.dump(label, _)  table.insert(calls, {level="DUMP",  msg=label}) end
  return log, calls
end
```

#### 2. New test: `set_log_enabled` routing

```lua
describe("dispatch.dispatch set_log_enabled command", function()
  local adapter = {}

  it("routes set_log_enabled and returns ok=true with enabled=true", function()
    local stubs = make_stubs()
    local log, _ = make_logger()
    local res, err = dispatch.dispatch(adapter, {command="set_log_enabled", enabled=true}, stubs, log)
    assert_nil(err)
    assert_eq(res.ok, true)
    assert_eq(res.enabled, true)
  end)

  it("routes set_log_enabled with enabled=false", function()
    local stubs = make_stubs()
    local log, _ = make_logger()
    local res, err = dispatch.dispatch(adapter, {command="set_log_enabled", enabled=false}, stubs, log)
    assert_nil(err)
    assert_eq(res.ok, true)
    assert_eq(res.enabled, false)
  end)

  it("does not call any handler stub for set_log_enabled", function()
    local stubs, handler_calls = make_stubs()
    local log, _ = make_logger()
    dispatch.dispatch(adapter, {command="set_log_enabled", enabled=true}, stubs, log)
    assert_eq(#handler_calls, 0)
  end)
end)
```

#### 3. New test: logger is called for known commands

```lua
describe("dispatch.dispatch emits log calls", function()
  local adapter = {}

  it("emits INFO log with command name", function()
    local stubs = make_stubs()
    local log, lcalls = make_logger()
    dispatch.dispatch(adapter, {command="tempo", bpm=120}, stubs, log)
    local found_info = false
    for _, c in ipairs(lcalls) do
      if c.level == "INFO" and c.msg:find("tempo") then
        found_info = true
      end
    end
    assert_true(found_info, "expected INFO log entry containing 'tempo'")
  end)

  it("emits ERROR log for unknown command", function()
    local stubs = make_stubs()
    local log, lcalls = make_logger()
    dispatch.dispatch(adapter, {command="bogus"}, stubs, log)
    local found_error = false
    for _, c in ipairs(lcalls) do
      if c.level == "ERROR" then found_error = true end
    end
    assert_true(found_error, "expected ERROR log entry for unknown command")
  end)
end)
```

#### 4. Verify existing tests still pass

Run the full suite. The existing tests in `test_dispatch.lua` call
`dispatch.dispatch(adapter, payload, stubs)` with three args — the added optional
`logger` parameter defaults to a no-op stub, so those tests are unaffected.

---

## Acceptance Criteria

- [ ] `cd reascripts && lua tests/test_runner.lua` passes with 0 failures after changes
- [ ] All pre-existing dispatch tests pass unchanged
- [ ] `set_log_enabled` command returns `{ok=true, enabled=<bool>}`
- [ ] `set_log_enabled` does not invoke any handler stub
- [ ] `M.dispatch` with three arguments (no logger) works identically to before
- [ ] INFO log is emitted for every successfully routed command when a logger stub is passed
- [ ] ERROR log is emitted for unknown commands when a logger stub is passed
- [ ] ERROR log includes full payload serialization on error paths
- [ ] DEBUG log uses key-list (not full body) on success paths
- [ ] `rehearsaltools.lua` is NOT modified

---

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file**: `reascripts/tests/test_dispatch.lua` (modify existing)
- **Test framework**: `test_runner.lua` harness
- **Test command**: `cd reascripts && lua tests/test_runner.lua`

### Tests to Write (write these first, before editing `dispatch.lua`)

1. **set_log_enabled returns ok=true** — assert `res.ok == true` and `res.enabled == true`
2. **set_log_enabled with false** — assert `res.enabled == false`
3. **set_log_enabled calls no handler stubs** — assert `#handler_calls == 0`
4. **INFO log emitted for known command** — pass logger stub, assert at least one `INFO` call containing the command name
5. **ERROR log emitted for unknown command** — assert at least one `ERROR` call

### TDD Process

1. Add the new test cases to `test_dispatch.lua` — they FAIL because `dispatch.lua` does not yet handle `set_log_enabled` and does not accept a logger param (RED)
2. Edit `dispatch.lua` per the requirements above (GREEN)
3. Run `cd reascripts && lua tests/test_runner.lua` — all tests pass
4. Refactor if needed while keeping tests green
