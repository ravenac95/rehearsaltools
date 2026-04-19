-- tests/test_dispatch.lua
-- Unit tests for src/dispatch.lua — the command multiplexer used by the
-- single-entry /rehearsaltools ReaScript.

local dispatch = dofile("src/dispatch.lua")

-- ── Stub handlers ─────────────────────────────────────────────────────────────
--
-- Each handler module exposes a `new(adapter)` that returns either a callable
-- (project, tempo, timesig, mixdown, songform) or a table of named methods
-- (regions). We mirror that shape with recording stubs.

local function make_stubs()
  local calls = {}

  local function record(name)
    return function(payload)
      table.insert(calls, {name = name, payload = payload})
      return {ok = true, from = name}
    end
  end

  local stubs = {
    project  = {new = function(_adapter) return record("project")            end},
    tempo    = {new = function(_adapter) return record("tempo")              end},
    timesig  = {new = function(_adapter) return record("timesig")            end},
    mixdown  = {new = function(_adapter) return record("mixdown")            end},
    songform = {new = function(_adapter) return record("songform")           end},
    regions  = {new = function(_adapter)
      return {
        new         = record("regions.new"),
        rename      = record("regions.rename"),
        play        = record("regions.play"),
        seek_to_end = record("regions.seek_to_end"),
      }
    end},
  }
  return stubs, calls
end

-- ── Tests ─────────────────────────────────────────────────────────────────────

describe("dispatch.dispatch routing", function()
  local adapter = {}  -- opaque — stubs ignore it

  it("routes project.new to project handler with stripped payload", function()
    local stubs, calls = make_stubs()
    local res, err = dispatch.dispatch(adapter, {command = "project.new"}, stubs)
    assert_nil(err)
    assert_eq(res, {ok = true, from = "project"})
    assert_eq(#calls, 1)
    assert_eq(calls[1].name, "project")
    assert_eq(calls[1].payload, {})
  end)

  it("routes region.new to regions.new", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "region.new", name = "intro"}, stubs)
    assert_eq(calls[1].name, "regions.new")
    assert_eq(calls[1].payload, {name = "intro"})
  end)

  it("routes region.rename", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "region.rename", id = 3, name = "v2"}, stubs)
    assert_eq(calls[1].name, "regions.rename")
    assert_eq(calls[1].payload, {id = 3, name = "v2"})
  end)

  it("routes region.play", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "region.play", id = 7}, stubs)
    assert_eq(calls[1].name, "regions.play")
    assert_eq(calls[1].payload, {id = 7})
  end)

  it("routes playhead.end to regions.seek_to_end", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "playhead.end"}, stubs)
    assert_eq(calls[1].name, "regions.seek_to_end")
    assert_eq(calls[1].payload, {})
  end)

  it("routes tempo", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "tempo", bpm = 120}, stubs)
    assert_eq(calls[1].name, "tempo")
    assert_eq(calls[1].payload, {bpm = 120})
  end)

  it("routes timesig", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "timesig", num = 3, denom = 4}, stubs)
    assert_eq(calls[1].name, "timesig")
    assert_eq(calls[1].payload, {num = 3, denom = 4})
  end)

  it("routes mixdown.all", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "mixdown.all", output_dir = "/tmp"}, stubs)
    assert_eq(calls[1].name, "mixdown")
    assert_eq(calls[1].payload, {output_dir = "/tmp"})
  end)

  it("routes songform.write", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {
      command = "songform.write",
      startTime = 10,
      rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}},
    }, stubs)
    assert_eq(calls[1].name, "songform")
    assert_eq(calls[1].payload.startTime, 10)
    assert_eq(calls[1].payload.rows[1].bpm, 120)
  end)
end)

describe("dispatch.dispatch error paths", function()
  local adapter = {}

  it("returns error for missing command field", function()
    local stubs = make_stubs()
    local res, err = dispatch.dispatch(adapter, {name = "intro"}, stubs)
    assert_nil(res)
    assert_true(err:find("command") ~= nil, "error should mention 'command': " .. tostring(err))
  end)

  it("returns error for non-string command", function()
    local stubs = make_stubs()
    local res, err = dispatch.dispatch(adapter, {command = 42}, stubs)
    assert_nil(res)
    assert_true(err:find("command") ~= nil)
  end)

  it("returns error for unknown command", function()
    local stubs = make_stubs()
    local res, err = dispatch.dispatch(adapter, {command = "bogus.thing"}, stubs)
    assert_nil(res)
    assert_true(err:find("unknown command") ~= nil, "got: " .. tostring(err))
    assert_true(err:find("bogus.thing") ~= nil)
  end)

  it("passes handler errors through unchanged", function()
    local stubs = make_stubs()
    -- Replace project stub with one that returns an error.
    stubs.project.new = function(_a)
      return function(_p) return nil, "project explode" end
    end
    local res, err = dispatch.dispatch(adapter, {command = "project.new"}, stubs)
    assert_nil(res)
    assert_eq(err, "project explode")
  end)
end)

describe("dispatch.dispatch payload stripping", function()
  local adapter = {}

  it("does not mutate the input payload", function()
    local stubs = make_stubs()
    local input = {command = "region.new", name = "a"}
    dispatch.dispatch(adapter, input, stubs)
    assert_eq(input.command, "region.new", "input.command should still be set")
  end)

  it("passes an empty table when payload has only the command field", function()
    local stubs, calls = make_stubs()
    dispatch.dispatch(adapter, {command = "project.new"}, stubs)
    assert_eq(calls[1].payload, {})
  end)
end)

-- ── Logger stub factory ───────────────────────────────────────────────────────

local function make_logger()
  local calls = {}
  local log = {}
  function log.info(fmt, ...)  table.insert(calls, {level="INFO",  msg=string.format(fmt, ...)}) end
  function log.debug(fmt, ...) table.insert(calls, {level="DEBUG", msg=string.format(fmt, ...)}) end
  function log.error(fmt, ...) table.insert(calls, {level="ERROR", msg=string.format(fmt, ...)}) end
  function log.dump(label, _)  table.insert(calls, {level="DUMP",  msg=label}) end
  return log, calls
end

-- ── Tests: set_log_enabled routing ───────────────────────────────────────────

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

-- ── Tests: logger calls emitted ───────────────────────────────────────────────

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
