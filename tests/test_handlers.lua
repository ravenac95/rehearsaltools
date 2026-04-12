-- tests/test_handlers.lua
-- Tests for src/handlers.lua — written BEFORE implementation (TDD).
-- Uses a full stub adapter with sensible defaults.
-- Run via: lua tests/test_runner.lua

local handlers = dofile("src/handlers.lua")
local json     = dofile("src/json.lua")

-- ─────────────────────────────────────────────────────────────────────────────
-- Stub adapter factory
-- ─────────────────────────────────────────────────────────────────────────────

local function make_stub_adapter()
  return {
    -- Transport
    get_play_state         = function() return 0 end,
    get_cursor_position    = function() return 0.0 end,
    get_tempo_time_sig_at  = function() return 120.0, 4, 4 end,
    time_to_measures_beats = function() return 0, 0, 0.0, 0.0 end,
    action_play            = function() end,
    action_stop            = function() end,
    action_record          = function() end,
    -- Tempo/timesig
    set_tempo              = function() end,
    set_timesig_at_measure = function() end,
    update_timeline        = function() end,
    -- Tracks
    get_track_count  = function() return 4 end,
    get_track        = function(n) return "track_" .. tostring(n) end,
    get_track_mute   = function() return false end,
    set_track_mute   = function() end,
    get_track_solo   = function() return false end,
    set_track_solo   = function() end,
    get_track_volume = function() return 1.0 end,
    set_track_volume = function() end,
    update_arrange   = function() end,
    -- Project
    new_project = function() end,
  }
end

--- Build a minimal fake request table (no real HTTP parsing needed).
local function fake_req(method, path, body)
  return {
    method = method or "GET",
    path   = path   or "/",
    body   = body   or "",
  }
end

-- ─────────────────────────────────────────────────────────────────────────────
-- status handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.status", function()

  it("stopped state → stopped=true, playing=false, recording=false", function()
    local adapter = make_stub_adapter()
    adapter.get_play_state = function() return 0 end
    local code, resp = handlers.status(fake_req(), adapter)
    assert_eq(code, 200)
    assert_true(resp.stopped)
    assert_false(resp.playing)
    assert_false(resp.recording)
  end)

  it("play_state=1 → playing=true, stopped=false", function()
    local adapter = make_stub_adapter()
    adapter.get_play_state = function() return 1 end
    local code, resp = handlers.status(fake_req(), adapter)
    assert_true(resp.playing)
    assert_false(resp.stopped)
  end)

  it("play_state=4 → recording=true", function()
    local adapter = make_stub_adapter()
    adapter.get_play_state = function() return 4 end
    local code, resp = handlers.status(fake_req(), adapter)
    assert_true(resp.recording)
  end)

  it("play_state=5 → playing=true AND recording=true", function()
    local adapter = make_stub_adapter()
    adapter.get_play_state = function() return 5 end
    local code, resp = handlers.status(fake_req(), adapter)
    assert_true(resp.playing)
    assert_true(resp.recording)
  end)

  it("measures_0indexed=2 → position_measure=3 (1-indexed)", function()
    local adapter = make_stub_adapter()
    adapter.time_to_measures_beats = function() return 2, 0, 0.0, 0.0 end
    local _, resp = handlers.status(fake_req(), adapter)
    assert_eq(resp.position_measure, 3)
  end)

  it("measures_0indexed=3 → position_measure=4", function()
    local adapter = make_stub_adapter()
    adapter.time_to_measures_beats = function() return 3, 0, 0.0, 0.0 end
    local _, resp = handlers.status(fake_req(), adapter)
    assert_eq(resp.position_measure, 4)
  end)

  it("beats_0indexed=1 → position_beat_in_measure=2", function()
    local adapter = make_stub_adapter()
    adapter.time_to_measures_beats = function() return 0, 1, 0.0, 0.0 end
    local _, resp = handlers.status(fake_req(), adapter)
    assert_eq(resp.position_beat_in_measure, 2)
  end)

  it("BPM and timesig are passed through from adapter", function()
    local adapter = make_stub_adapter()
    adapter.get_tempo_time_sig_at = function() return 140.0, 3, 8 end
    local _, resp = handlers.status(fake_req(), adapter)
    assert_eq(resp.bpm, 140.0)
    assert_eq(resp.timesig_num,   3)
    assert_eq(resp.timesig_denom, 8)
  end)

  it("returns position_seconds from cursor position", function()
    local adapter = make_stub_adapter()
    adapter.get_cursor_position = function() return 5.5 end
    local _, resp = handlers.status(fake_req(), adapter)
    assert_eq(resp.position_seconds, 5.5)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- play / stop / record handlers
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.play", function()

  it("returns 200 with {ok=true}", function()
    local adapter = make_stub_adapter()
    local code, resp = handlers.play(fake_req(), adapter)
    assert_eq(code, 200)
    assert_true(resp.ok)
  end)

  it("calls adapter.action_play", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.action_play = function() called = true end
    handlers.play(fake_req(), adapter)
    assert_true(called, "action_play should have been called")
  end)

end)

describe("handlers.stop", function()

  it("returns 200 with {ok=true}", function()
    local code, resp = handlers.stop(fake_req(), make_stub_adapter())
    assert_eq(code, 200)
    assert_true(resp.ok)
  end)

  it("calls adapter.action_stop", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.action_stop = function() called = true end
    handlers.stop(fake_req(), adapter)
    assert_true(called)
  end)

end)

describe("handlers.record", function()

  it("returns 200 with {ok=true}", function()
    local code, resp = handlers.record(fake_req(), make_stub_adapter())
    assert_eq(code, 200)
    assert_true(resp.ok)
  end)

  it("calls adapter.action_record", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.action_record = function() called = true end
    handlers.record(fake_req(), adapter)
    assert_true(called)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- tempo handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.tempo", function()

  it("valid body {bpm:140} → 200 with ok=true and bpm=140", function()
    local adapter = make_stub_adapter()
    local req = fake_req("POST", "/tempo", json.encode({bpm=140}))
    local code, resp = handlers.tempo(req, adapter)
    assert_eq(code, 200)
    assert_true(resp.ok)
    assert_eq(resp.bpm, 140)
  end)

  it("invalid JSON body → 400 with error='invalid JSON body'", function()
    local req = fake_req("POST", "/tempo", "{not valid}")
    local code, resp = handlers.tempo(req, make_stub_adapter())
    assert_eq(code, 400)
    assert_eq(resp.error, "invalid JSON body")
  end)

  it("bpm out of range → 400", function()
    local req = fake_req("POST", "/tempo", json.encode({bpm=5}))
    local code, resp = handlers.tempo(req, make_stub_adapter())
    assert_eq(code, 400)
    assert_not_nil(resp.error)
  end)

  it("calls adapter.set_tempo with validated bpm", function()
    local adapter = make_stub_adapter()
    local set_bpm
    adapter.set_tempo = function(bpm) set_bpm = bpm end
    local req = fake_req("POST", "/tempo", json.encode({bpm=120}))
    handlers.tempo(req, adapter)
    assert_eq(set_bpm, 120)
  end)

  it("calls adapter.update_timeline after set_tempo", function()
    local adapter = make_stub_adapter()
    local timeline_called = false
    adapter.update_timeline = function() timeline_called = true end
    local req = fake_req("POST", "/tempo", json.encode({bpm=120}))
    handlers.tempo(req, adapter)
    assert_true(timeline_called)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- timesig handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.timesig", function()

  it("valid body → 200 with numerator/denominator/measure", function()
    local req = fake_req("POST", "/timesig",
      json.encode({numerator=3, denominator=4, measure=5}))
    local code, resp = handlers.timesig(req, make_stub_adapter())
    assert_eq(code, 200)
    assert_true(resp.ok)
    assert_eq(resp.numerator,   3)
    assert_eq(resp.denominator, 4)
    assert_eq(resp.measure,     5)
  end)

  it("invalid denominator (3) → 400", function()
    local req = fake_req("POST", "/timesig",
      json.encode({numerator=4, denominator=3, measure=1}))
    local code, resp = handlers.timesig(req, make_stub_adapter())
    assert_eq(code, 400)
    assert_not_nil(resp.error)
  end)

  it("calls adapter.set_timesig_at_measure with correct args", function()
    local adapter = make_stub_adapter()
    local captured = {}
    adapter.set_timesig_at_measure = function(num, den, m)
      captured = {num=num, den=den, m=m}
    end
    local req = fake_req("POST", "/timesig",
      json.encode({numerator=3, denominator=4, measure=5}))
    handlers.timesig(req, adapter)
    assert_eq(captured.num, 3)
    assert_eq(captured.den, 4)
    assert_eq(captured.m,   5)
  end)

  it("calls update_timeline after set", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.update_timeline = function() called = true end
    local req = fake_req("POST", "/timesig",
      json.encode({numerator=4, denominator=4, measure=1}))
    handlers.timesig(req, adapter)
    assert_true(called)
  end)

  it("invalid JSON → 400", function()
    local req = fake_req("POST", "/timesig", "bad json")
    local code = handlers.timesig(req, make_stub_adapter())
    assert_eq(code, 400)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- session_new handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.session_new", function()

  it("returns 200 with {ok=true}", function()
    local code, resp = handlers.session_new(fake_req("POST", "/session/new", ""), make_stub_adapter())
    assert_eq(code, 200)
    assert_true(resp.ok)
  end)

  it("calls adapter.new_project exactly once", function()
    local adapter = make_stub_adapter()
    local count = 0
    adapter.new_project = function() count = count + 1 end
    handlers.session_new(fake_req("POST", "/session/new", ""), adapter)
    assert_eq(count, 1)
  end)

  it("empty body still returns 200 (no 400)", function()
    local req = fake_req("POST", "/session/new", "")
    local code = handlers.session_new(req, make_stub_adapter())
    assert_eq(code, 200)
  end)

  it("unparseable JSON body still returns 200 (body is ignored)", function()
    local req = fake_req("POST", "/session/new", "{bad json}")
    local code = handlers.session_new(req, make_stub_adapter())
    assert_eq(code, 200)
  end)

  it("arbitrary valid JSON body → 200 (body is ignored)", function()
    local req = fake_req("POST", "/session/new", json.encode({foo="bar"}))
    local code = handlers.session_new(req, make_stub_adapter())
    assert_eq(code, 200)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- track_mute handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.track_mute", function()

  it("track 2, currently unmuted → toggles to muted, response muted=true", function()
    local adapter = make_stub_adapter()
    adapter.get_track_mute = function() return false end
    local set_muted
    adapter.set_track_mute = function(t, m) set_muted = m end
    local code, resp = handlers.track_mute(fake_req(), adapter, {n="2"})
    assert_eq(code, 200)
    assert_true(resp.muted)
    assert_true(set_muted)
  end)

  it("track 2, currently muted → toggles to unmuted, response muted=false", function()
    local adapter = make_stub_adapter()
    adapter.get_track_mute = function() return true end
    local set_muted
    adapter.set_track_mute = function(t, m) set_muted = m end
    local code, resp = handlers.track_mute(fake_req(), adapter, {n="2"})
    assert_eq(code, 200)
    assert_false(resp.muted)
    assert_false(set_muted)
  end)

  it("invalid track number string 'abc' → 400", function()
    local code, resp = handlers.track_mute(fake_req(), make_stub_adapter(), {n="abc"})
    assert_eq(code, 400)
    assert_not_nil(resp.error)
  end)

  it("track returns nil → 404", function()
    local adapter = make_stub_adapter()
    adapter.get_track = function() return nil end
    local code, resp = handlers.track_mute(fake_req(), adapter, {n="99"})
    assert_eq(code, 404)
    assert_not_nil(resp.error)
  end)

  it("calls update_arrange after mute toggle", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.update_arrange = function() called = true end
    handlers.track_mute(fake_req(), adapter, {n="1"})
    assert_true(called)
  end)

  it("response includes track number", function()
    local _, resp = handlers.track_mute(fake_req(), make_stub_adapter(), {n="3"})
    assert_eq(resp.track, 3)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- track_solo handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.track_solo", function()

  it("track 1, currently unsoloed → toggles to soloed, response soloed=true", function()
    local adapter = make_stub_adapter()
    adapter.get_track_solo = function() return false end
    local code, resp = handlers.track_solo(fake_req(), adapter, {n="1"})
    assert_eq(code, 200)
    assert_true(resp.soloed)
  end)

  it("track 1, currently soloed → toggles to unsoloed, response soloed=false", function()
    local adapter = make_stub_adapter()
    adapter.get_track_solo = function() return true end
    local code, resp = handlers.track_solo(fake_req(), adapter, {n="1"})
    assert_false(resp.soloed)
  end)

  it("invalid track number → 400", function()
    local code = handlers.track_solo(fake_req(), make_stub_adapter(), {n="0"})
    assert_eq(code, 400)
  end)

  it("track returns nil → 404", function()
    local adapter = make_stub_adapter()
    adapter.get_track = function() return nil end
    local code = handlers.track_solo(fake_req(), adapter, {n="1"})
    assert_eq(code, 404)
  end)

  it("response includes track number", function()
    local _, resp = handlers.track_solo(fake_req(), make_stub_adapter(), {n="2"})
    assert_eq(resp.track, 2)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- track_volume handler
-- ─────────────────────────────────────────────────────────────────────────────

describe("handlers.track_volume", function()

  it("valid body {volume:0.5} → 200 with volume=0.5", function()
    local req = fake_req("POST", "/track/2/volume", json.encode({volume=0.5}))
    local code, resp = handlers.track_volume(req, make_stub_adapter(), {n="2"})
    assert_eq(code, 200)
    assert_true(resp.ok)
    assert_eq(resp.volume, 0.5)
  end)

  it("volume out of range → 400", function()
    local req = fake_req("POST", "/track/2/volume", json.encode({volume=5.0}))
    local code = handlers.track_volume(req, make_stub_adapter(), {n="2"})
    assert_eq(code, 400)
  end)

  it("invalid JSON body → 400", function()
    local req = fake_req("POST", "/track/2/volume", "not json")
    local code = handlers.track_volume(req, make_stub_adapter(), {n="2"})
    assert_eq(code, 400)
  end)

  it("invalid track number → 400", function()
    local req = fake_req("POST", "/track/abc/volume", json.encode({volume=1.0}))
    local code = handlers.track_volume(req, make_stub_adapter(), {n="abc"})
    assert_eq(code, 400)
  end)

  it("track returns nil → 404", function()
    local adapter = make_stub_adapter()
    adapter.get_track = function() return nil end
    local req = fake_req("POST", "/track/99/volume", json.encode({volume=1.0}))
    local code = handlers.track_volume(req, adapter, {n="99"})
    assert_eq(code, 404)
  end)

  it("calls adapter.set_track_volume with correct value", function()
    local adapter = make_stub_adapter()
    local set_vol
    adapter.set_track_volume = function(t, vol) set_vol = vol end
    local req = fake_req("POST", "/track/1/volume", json.encode({volume=0.75}))
    handlers.track_volume(req, adapter, {n="1"})
    assert_eq(set_vol, 0.75)
  end)

  it("calls update_arrange after set", function()
    local adapter = make_stub_adapter()
    local called = false
    adapter.update_arrange = function() called = true end
    local req = fake_req("POST", "/track/1/volume", json.encode({volume=1.0}))
    handlers.track_volume(req, adapter, {n="1"})
    assert_true(called)
  end)

  it("response includes track number", function()
    local req = fake_req("POST", "/track/3/volume", json.encode({volume=1.0}))
    local _, resp = handlers.track_volume(req, make_stub_adapter(), {n="3"})
    assert_eq(resp.track, 3)
  end)

end)
