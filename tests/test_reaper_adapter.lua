-- tests/test_reaper_adapter.lua
-- Tests for src/reaper_api.lua — written BEFORE implementation (TDD).
-- Uses a stub reaper table with spy functions.
-- Run via: lua tests/test_runner.lua

local reaper_api_factory = dofile("src/reaper_api.lua")

-- ─────────────────────────────────────────────────────────────────────────────
-- Stub / spy factory
-- ─────────────────────────────────────────────────────────────────────────────

local function make_stub()
  local calls = {}
  local stub = {
    _calls = calls,

    GetPlayState = function()
      table.insert(calls, {fn="GetPlayState"})
      return 0
    end,
    GetCursorPosition = function()
      table.insert(calls, {fn="GetCursorPosition"})
      return 10.0
    end,
    Main_OnCommand = function(cmd, flag)
      table.insert(calls, {fn="Main_OnCommand", cmd=cmd, flag=flag})
    end,
    TimeMap_GetTimeSigAtTime = function(proj, pos)
      table.insert(calls, {fn="TimeMap_GetTimeSigAtTime", proj=proj, pos=pos})
      return 120.0, 4, 4
    end,
    SetTempoTimeSigMarker = function(proj, ptidx, timepos, measurepos, beatpos, bpm, timesig_num, timesig_denom, lineartempochange)
      table.insert(calls, {
        fn="SetTempoTimeSigMarker",
        proj=proj, ptidx=ptidx, timepos=timepos, measurepos=measurepos,
        beatpos=beatpos, bpm=bpm,
        timesig_num=timesig_num, timesig_denom=timesig_denom,
        lineartempochange=lineartempochange,
      })
    end,
    UpdateTimeline = function()
      table.insert(calls, {fn="UpdateTimeline"})
    end,
    TimeMap2_timeToBeats = function(proj, t)
      table.insert(calls, {fn="TimeMap2_timeToBeats", proj=proj, t=t})
      return 2, 1, 9.0, 8.0
    end,
    CountTracks = function(proj)
      table.insert(calls, {fn="CountTracks", proj=proj})
      return 4
    end,
    GetTrack = function(proj, idx)
      table.insert(calls, {fn="GetTrack", proj=proj, idx=idx})
      return "track_handle_" .. tostring(idx)
    end,
    GetMediaTrackInfo_Value = function(track, param)
      table.insert(calls, {fn="GetMediaTrackInfo_Value", track=track, param=param})
      -- Return 0 by default; tests override via spy replacement.
      return 0
    end,
    SetMediaTrackInfo_Value = function(track, param, val)
      table.insert(calls, {fn="SetMediaTrackInfo_Value", track=track, param=param, val=val})
    end,
    UpdateArrange = function()
      table.insert(calls, {fn="UpdateArrange"})
    end,
    Main_openProject = function(path)
      table.insert(calls, {fn="Main_openProject", path=path})
    end,
  }
  return stub, calls
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Track index translation
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter track indexing", function()

  it("get_track(1) calls GetTrack(0, 0)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.get_track(1)
    assert_eq(calls[1].fn,   "GetTrack")
    assert_eq(calls[1].proj, 0)
    assert_eq(calls[1].idx,  0)
  end)

  it("get_track(2) calls GetTrack(0, 1)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.get_track(2)
    assert_eq(calls[1].idx, 1)
  end)

  it("get_track(3) calls GetTrack(0, 2)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.get_track(3)
    assert_eq(calls[1].idx, 2)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Mute encoding
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter mute", function()

  it("set_track_mute true calls SetMediaTrackInfo_Value with B_MUTE=1", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.set_track_mute("my_track", true)
    local c = calls[1]
    assert_eq(c.fn,    "SetMediaTrackInfo_Value")
    assert_eq(c.track, "my_track")
    assert_eq(c.param, "B_MUTE")
    assert_eq(c.val,   1)
  end)

  it("set_track_mute false calls SetMediaTrackInfo_Value with B_MUTE=0", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.set_track_mute("my_track", false)
    assert_eq(calls[1].val, 0)
  end)

  it("get_track_mute: stub returns 1 → adapter returns true", function()
    local stub, calls = make_stub()
    stub.GetMediaTrackInfo_Value = function(track, param)
      table.insert(calls, {fn="GetMediaTrackInfo_Value", track=track, param=param})
      return 1
    end
    local adapter = reaper_api_factory.new(stub)
    local result = adapter.get_track_mute("my_track")
    assert_true(result)
  end)

  it("get_track_mute: stub returns 0 → adapter returns false", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    local result = adapter.get_track_mute("my_track")
    assert_false(result)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Solo encoding
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter solo", function()

  it("set_track_solo true calls SetMediaTrackInfo_Value with I_SOLO=2", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.set_track_solo("my_track", true)
    local c = calls[1]
    assert_eq(c.param, "I_SOLO")
    assert_eq(c.val,   2)
  end)

  it("set_track_solo false calls SetMediaTrackInfo_Value with I_SOLO=0", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.set_track_solo("my_track", false)
    assert_eq(calls[1].val, 0)
  end)

  it("get_track_solo: stub returns 2 → adapter returns true (nonzero = soloed)", function()
    local stub, calls = make_stub()
    stub.GetMediaTrackInfo_Value = function(track, param)
      table.insert(calls, {fn="GetMediaTrackInfo_Value"})
      return 2
    end
    local adapter = reaper_api_factory.new(stub)
    local result = adapter.get_track_solo("my_track")
    assert_true(result)
  end)

  it("get_track_solo: stub returns 0 → adapter returns false", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    local result = adapter.get_track_solo("my_track")
    assert_false(result)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Tempo / timesig
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter tempo/timesig", function()

  it("set_timesig_at_measure(3,4,5) passes measurepos=4", function()
    local stub, calls = make_stub()
    -- set_tempo needs GetCursorPosition for timepos, so it will call that too.
    local adapter = reaper_api_factory.new(stub)
    adapter.set_timesig_at_measure(3, 4, 5)
    -- Find the SetTempoTimeSigMarker call.
    local stm
    for _, c in ipairs(calls) do
      if c.fn == "SetTempoTimeSigMarker" then stm = c; break end
    end
    assert_not_nil(stm, "SetTempoTimeSigMarker should have been called")
    assert_eq(stm.measurepos, 4)   -- 5 - 1 = 4
    assert_eq(stm.timesig_num,   3)
    assert_eq(stm.timesig_denom, 4)
  end)

  it("update_timeline calls UpdateTimeline", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.update_timeline()
    assert_eq(calls[1].fn, "UpdateTimeline")
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Transport actions
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter transport", function()

  it("action_play calls Main_OnCommand(1007, 0)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.action_play()
    assert_eq(calls[1].fn,  "Main_OnCommand")
    assert_eq(calls[1].cmd, 1007)
    assert_eq(calls[1].flag, 0)
  end)

  it("action_stop calls Main_OnCommand(1016, 0)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.action_stop()
    assert_eq(calls[1].cmd, 1016)
  end)

  it("action_record calls Main_OnCommand(1013, 0)", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.action_record()
    assert_eq(calls[1].cmd, 1013)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Project
-- ─────────────────────────────────────────────────────────────────────────────

describe("reaper_adapter project", function()

  it("new_project calls Main_openProject with empty string", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.new_project()
    assert_eq(calls[1].fn,   "Main_openProject")
    assert_eq(calls[1].path, "")
  end)

  it("update_arrange calls UpdateArrange", function()
    local stub, calls = make_stub()
    local adapter = reaper_api_factory.new(stub)
    adapter.update_arrange()
    assert_eq(calls[1].fn, "UpdateArrange")
  end)

end)
