-- tests/test_logger.lua
-- TDD tests for src/logger.lua
-- Write these FIRST so they fail (RED) before the implementation exists.

-- ── Stub factory ─────────────────────────────────────────────────────────────

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

-- ── Helper to load a fresh logger with a given stub ───────────────────────────

local function load_logger(stub)
  local old_reaper = reaper
  reaper = stub
  local log = dofile("src/logger.lua")
  reaper = old_reaper
  return log
end

-- ── describe("logger.is_enabled") ─────────────────────────────────────────────

describe("logger.is_enabled", function()

  it("returns false when GetExtState returns empty string", function()
    local stub = make_reaper_stub("")
    local log = load_logger(stub)
    assert_false(log.is_enabled())
  end)

  it("returns true when GetExtState returns '1'", function()
    local stub = make_reaper_stub("1")
    local log = load_logger(stub)
    -- is_enabled reads ExtState fresh each call, so inject reaper for the call
    local old_reaper = reaper
    reaper = stub
    local result = log.is_enabled()
    reaper = old_reaper
    assert_true(result)
  end)

  it("returns true when GetExtState returns 'true'", function()
    local stub = make_reaper_stub("true")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    local result = log.is_enabled()
    reaper = old_reaper
    assert_true(result)
  end)

  it("returns false when reaper global is nil", function()
    local old_reaper = reaper
    reaper = nil
    local log = dofile("src/logger.lua")
    local result = log.is_enabled()
    reaper = old_reaper
    assert_false(result)
  end)

end)

-- ── describe("logger.set_enabled") ────────────────────────────────────────────

describe("logger.set_enabled", function()

  it("calls SetExtState with '1' when passed true", function()
    local stub, calls = make_reaper_stub("")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.set_enabled(true)
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "SetExtState" and c.value == "1" then
        found = true
      end
    end
    assert_true(found, "SetExtState should be called with '1'")
  end)

  it("calls SetExtState with '' when passed false", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.set_enabled(false)
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "SetExtState" and c.value == "" then
        found = true
      end
    end
    assert_true(found, "SetExtState should be called with ''")
  end)

  it("persist flag is true", function()
    local stub, calls = make_reaper_stub("")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.set_enabled(true)
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "SetExtState" then
        assert_true(c.persist == true, "persist flag should be true")
        found = true
      end
    end
    assert_true(found, "SetExtState should have been called")
  end)

  it("is a no-op when reaper global is nil", function()
    local old_reaper = reaper
    reaper = nil
    local log = dofile("src/logger.lua")
    -- Should not error
    log.set_enabled(true)
    reaper = old_reaper
    assert_true(true)  -- just verifying no error
  end)

end)

-- ── describe("logger.info / debug / error") ───────────────────────────────────

describe("logger.info / debug / error", function()

  it("calls ShowConsoleMsg with correct prefix and newline when enabled", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.info("hello %s", "world")
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" then
        found = true
        assert_true(c.s:find("%[rehearsaltools%]") ~= nil,
          "missing [rehearsaltools] prefix: " .. c.s)
        assert_true(c.s:find("%[INFO%]") ~= nil,
          "missing [INFO] tag: " .. c.s)
        assert_true(c.s:find("hello world") ~= nil,
          "missing message body: " .. c.s)
        assert_true(c.s:sub(-1) == "\n",
          "should end with newline")
      end
    end
    assert_true(found, "ShowConsoleMsg was never called")
  end)

  it("message contains [INFO] tag for log.info", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.info("test")
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("%[INFO%]") then
        found = true
      end
    end
    assert_true(found, "expected [INFO] tag in ShowConsoleMsg call")
  end)

  it("message contains [DEBUG] tag for log.debug", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.debug("test")
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("%[DEBUG%]") then
        found = true
      end
    end
    assert_true(found, "expected [DEBUG] tag in ShowConsoleMsg call")
  end)

  it("message contains [ERROR] tag for log.error", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.error("test")
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("%[ERROR%]") then
        found = true
      end
    end
    assert_true(found, "expected [ERROR] tag in ShowConsoleMsg call")
  end)

  it("formats variadic args via string.format", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.info("value=%d name=%s", 42, "foo")
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("value=42") and c.s:find("name=foo") then
        found = true
      end
    end
    assert_true(found, "expected formatted message in ShowConsoleMsg call")
  end)

  it("is a no-op (no ShowConsoleMsg call) when disabled", function()
    local stub, calls = make_reaper_stub("")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.info("should not appear")
    log.debug("should not appear")
    log.error("should not appear")
    reaper = old_reaper
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" then
        error("ShowConsoleMsg should NOT be called when disabled")
      end
    end
  end)

  it("does NOT call string.format when disabled", function()
    -- Use a format string with a bad arg type that would error if formatted
    local stub = make_reaper_stub("")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    reaper = old_reaper
    -- %d with a table arg would error if string.format were called
    -- No error should be raised because is_enabled() returns false first
    local ok, err = pcall(function()
      local bad_table = {}
      -- Inject disabled reaper for this call
      local r = reaper
      reaper = stub
      log.info("value=%d", bad_table)
      reaper = r
    end)
    assert_true(ok, "should not error when disabled, but got: " .. tostring(err))
  end)

end)

-- ── describe("logger.dump") ───────────────────────────────────────────────────

describe("logger.dump", function()

  it("emits a DEBUG line containing the label", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.dump("my_label", {x = 1})
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("my_label") and c.s:find("%[DEBUG%]") then
        found = true
      end
    end
    assert_true(found, "expected DEBUG log line containing the label")
  end)

  it("uses tostring for non-table values", function()
    local stub, calls = make_reaper_stub("1")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.dump("num_val", 42)
    reaper = old_reaper
    local found = false
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" and c.s:find("num_val") and c.s:find("42") then
        found = true
      end
    end
    assert_true(found, "expected label and tostring value in dump output")
  end)

  it("is a no-op when disabled", function()
    local stub, calls = make_reaper_stub("")
    local old_reaper = reaper
    reaper = stub
    local log = dofile("src/logger.lua")
    log.dump("label", {a = 1})
    reaper = old_reaper
    for _, c in ipairs(calls) do
      if c.fn == "ShowConsoleMsg" then
        error("ShowConsoleMsg should NOT be called when dump is disabled")
      end
    end
  end)

  it("does not error when json.lua cannot be loaded", function()
    -- Load a logger where script_dir points somewhere without src/json.lua
    -- We simulate this by loading with an empty script_dir that points nowhere
    -- The logger uses pcall for json loading so it should degrade gracefully
    local stub = make_reaper_stub("1")
    -- Override get_action_context to return a path that has no src/json.lua
    stub.get_action_context = function()
      return nil, "/nonexistent/path/", nil, nil, nil, nil, nil
    end
    local old_reaper = reaper
    reaper = stub
    local ok, result = pcall(dofile, "src/logger.lua")
    reaper = old_reaper
    -- The module should load without error (json load failure is handled by pcall)
    assert_true(ok, "logger should load even when json.lua is not found: " .. tostring(result))
    if ok and result then
      -- dump should still work, just using tostring fallback
      local old_r = reaper
      reaper = stub
      -- restore normal get_action_context for the dump call
      stub.get_action_context = function()
        return nil, "./", nil, nil, nil, nil, nil
      end
      local ok2, err2 = pcall(function() result.dump("lbl", {x=1}) end)
      reaper = old_r
      assert_true(ok2, "dump should not error even without json: " .. tostring(err2))
    end
  end)

end)
