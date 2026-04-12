-- tests/test_router.lua
-- Tests for src/router.lua — written BEFORE implementation (TDD).
-- Calls router_obj.handle(raw_string) directly, no real TCP sockets.
-- Run via: lua tests/test_runner.lua

local router_mod = dofile("src/router.lua")
local json       = dofile("src/json.lua")

-- ─────────────────────────────────────────────────────────────────────────────
-- Stub adapter (must include new_project)
-- ─────────────────────────────────────────────────────────────────────────────

local function make_stub_adapter()
  return {
    get_play_state         = function() return 0 end,
    get_cursor_position    = function() return 0.0 end,
    get_tempo_time_sig_at  = function() return 120.0, 4, 4 end,
    time_to_measures_beats = function() return 0, 0, 0.0, 0.0 end,
    action_play            = function() end,
    action_stop            = function() end,
    action_record          = function() end,
    set_tempo              = function() end,
    set_timesig_at_measure = function() end,
    update_timeline        = function() end,
    get_track_count  = function() return 10 end,
    get_track        = function(n)
      if n > 5 then return nil end  -- tracks 1-5 exist; 6+ do not
      return "track_" .. tostring(n)
    end,
    get_track_mute   = function() return false end,
    set_track_mute   = function() end,
    get_track_solo   = function() return false end,
    set_track_solo   = function() end,
    get_track_volume = function() return 1.0 end,
    set_track_volume = function() end,
    update_arrange   = function() end,
    new_project      = function() end,
  }
end

--- Helper: build a raw HTTP request string.
local function make_request(method, path, body)
  body = body or ""
  return method .. " " .. path .. " HTTP/1.0\r\n" ..
    "Content-Length: " .. #body .. "\r\n\r\n" .. body
end

--- Extract the status code integer from the response string.
local function response_status(resp)
  local code = resp:match("HTTP/1%.0 (%d+)")
  return tonumber(code)
end

--- Extract and decode the JSON body from the response string.
local function response_body(resp)
  local _, body_start = resp:find("\r\n\r\n", 1, true)
  if not body_start then return nil end
  local body_str = resp:sub(body_start + 1)
  local decoded, err = json.decode(body_str)
  return decoded, err, body_str
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Tests
-- ─────────────────────────────────────────────────────────────────────────────

describe("router", function()

  local adapter = make_stub_adapter()
  local rt = router_mod.new(adapter)

  it("GET /status → 200 with 'playing' key in body", function()
    local resp = rt.handle(make_request("GET", "/status"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_not_nil(body)
    assert_not_nil(body.playing, "body should have 'playing' key")
  end)

  it("POST /play → 200 with {ok=true}", function()
    local resp = rt.handle(make_request("POST", "/play"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_true(body.ok)
  end)

  it("POST /stop → 200 with {ok=true}", function()
    local resp = rt.handle(make_request("POST", "/stop"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_true(body.ok)
  end)

  it("POST /record → 200 with {ok=true}", function()
    local resp = rt.handle(make_request("POST", "/record"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_true(body.ok)
  end)

  it("POST /tempo with valid {bpm:120} → 200", function()
    local resp = rt.handle(make_request("POST", "/tempo", json.encode({bpm=120})))
    assert_eq(response_status(resp), 200)
  end)

  it("POST /tempo with invalid {bpm:5} → 400 with error key", function()
    local resp = rt.handle(make_request("POST", "/tempo", json.encode({bpm=5})))
    assert_eq(response_status(resp), 400)
    local body = response_body(resp)
    assert_not_nil(body.error)
  end)

  it("POST /timesig with valid body → 200", function()
    local resp = rt.handle(make_request("POST", "/timesig",
      json.encode({numerator=3, denominator=4, measure=1})))
    assert_eq(response_status(resp), 200)
  end)

  it("POST /session/new with no body → 200 with {ok=true}", function()
    local resp = rt.handle(make_request("POST", "/session/new"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_true(body.ok)
  end)

  it("POST /session/new with arbitrary JSON body → 200", function()
    local resp = rt.handle(make_request("POST", "/session/new",
      json.encode({foo="bar", ignored=true})))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_true(body.ok)
  end)

  it("GET /session/new (wrong method) → 405", function()
    local resp = rt.handle(make_request("GET", "/session/new"))
    assert_eq(response_status(resp), 405)
  end)

  it("POST /track/2/mute → 200 with 'muted' key in body", function()
    local resp = rt.handle(make_request("POST", "/track/2/mute"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_not_nil(body.muted ~= nil, "body should have 'muted' key")
  end)

  it("POST /track/99/mute → 404 (track doesn't exist)", function()
    -- stub returns nil for n > 5
    local resp = rt.handle(make_request("POST", "/track/99/mute"))
    assert_eq(response_status(resp), 404)
  end)

  it("POST /track/2/solo → 200 with 'soloed' key in body", function()
    local resp = rt.handle(make_request("POST", "/track/2/solo"))
    assert_eq(response_status(resp), 200)
    local body = response_body(resp)
    assert_not_nil(body.soloed ~= nil)
  end)

  it("POST /track/2/volume with valid body → 200", function()
    local resp = rt.handle(make_request("POST", "/track/2/volume",
      json.encode({volume=0.8})))
    assert_eq(response_status(resp), 200)
  end)

  it("POST /track/abc/volume → 400 (invalid track number)", function()
    local resp = rt.handle(make_request("POST", "/track/abc/volume",
      json.encode({volume=1.0})))
    assert_eq(response_status(resp), 400)
  end)

  it("GET /unknown → 404", function()
    local resp = rt.handle(make_request("GET", "/unknown"))
    assert_eq(response_status(resp), 404)
  end)

  it("GET /record (correct path, wrong method) → 405", function()
    local resp = rt.handle(make_request("GET", "/record"))
    assert_eq(response_status(resp), 405)
  end)

  it("empty request string → 400", function()
    local resp = rt.handle("")
    assert_eq(response_status(resp), 400)
  end)

  it("handler that raises a Lua error → 500", function()
    -- Create a router with a broken adapter that causes a handler error.
    local broken_adapter = make_stub_adapter()
    -- Override get_play_state to blow up, which the status handler calls.
    broken_adapter.get_play_state = function()
      error("boom from adapter")
    end
    local rt2 = router_mod.new(broken_adapter)
    local resp = rt2.handle(make_request("GET", "/status"))
    assert_eq(response_status(resp), 500)
    local body = response_body(resp)
    assert_not_nil(body.error)
  end)

  it("all responses start with HTTP/1.0", function()
    local cases = {
      make_request("GET", "/status"),
      make_request("POST", "/play"),
      make_request("GET", "/unknown"),
    }
    for _, raw in ipairs(cases) do
      local resp = rt.handle(raw)
      assert_true(resp:find("^HTTP/1%.0 ") ~= nil,
        "response should start with HTTP/1.0, got: " .. resp:sub(1, 20))
    end
  end)

  it("response bodies are valid JSON (parseable)", function()
    local cases = {
      make_request("GET", "/status"),
      make_request("POST", "/play"),
      make_request("GET", "/unknown"),
    }
    for _, raw in ipairs(cases) do
      local resp = rt.handle(raw)
      local body, err = response_body(resp)
      assert_nil(err, "body should be valid JSON, got decode error: " .. tostring(err))
      assert_not_nil(body)
    end
  end)

end)
