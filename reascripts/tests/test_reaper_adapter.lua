-- tests/test_reaper_adapter.lua
-- Tests for src/reaper_api.lua using a stub reaper table.

local reaper_api = dofile("src/reaper_api.lua")

local function make_stub()
  local calls = {}
  local state = { cursor_pos = 10.0, play_state = 0, metronome_on = false }
  local stub
  stub = {
    _calls = calls, _state = state,

    GetPlayState = function()
      table.insert(calls, {fn="GetPlayState"}); return state.play_state
    end,
    GetCursorPosition = function()
      table.insert(calls, {fn="GetCursorPosition"}); return state.cursor_pos
    end,
    SetEditCurPos = function(t, moveview, seekplay)
      table.insert(calls, {fn="SetEditCurPos", t=t, moveview=moveview, seekplay=seekplay})
    end,
    Main_OnCommand = function(cmd, flag)
      table.insert(calls, {fn="Main_OnCommand", cmd=cmd, flag=flag})
    end,
    GetToggleCommandState = function(cmd)
      table.insert(calls, {fn="GetToggleCommandState", cmd=cmd})
      return state.metronome_on and 1 or 0
    end,
    TimeMap_GetTimeSigAtTime = function(proj, pos)
      table.insert(calls, {fn="TimeMap_GetTimeSigAtTime", proj=proj, pos=pos})
      return 120.0, 4, 4
    end,
    SetTempoTimeSigMarker = function(proj, ptidx, timepos, measurepos, beatpos, bpm, num, denom, linear)
      table.insert(calls, {
        fn="SetTempoTimeSigMarker",
        proj=proj, ptidx=ptidx, timepos=timepos, measurepos=measurepos,
        beatpos=beatpos, bpm=bpm, num=num, denom=denom, linear=linear,
      })
    end,
    UpdateTimeline = function() table.insert(calls, {fn="UpdateTimeline"}) end,
    UpdateArrange  = function() table.insert(calls, {fn="UpdateArrange"})  end,
    TimeMap2_timeToBeats = function(proj, t)
      table.insert(calls, {fn="TimeMap2_timeToBeats", t=t})
      return 2, 1, 9.0, 8.0
    end,
    TimeMap2_timeToQN = function(proj, t)
      table.insert(calls, {fn="TimeMap2_timeToQN", t=t}); return t * 2
    end,
    TimeMap2_QNToTime = function(proj, qn)
      table.insert(calls, {fn="TimeMap2_QNToTime", qn=qn}); return qn / 2
    end,
    CountTracks = function(proj) table.insert(calls, {fn="CountTracks"}); return 0 end,
    GetTrack = function(proj, idx) table.insert(calls, {fn="GetTrack", idx=idx}); return nil end,
    CountTrackMediaItems = function(tr)
      table.insert(calls, {fn="CountTrackMediaItems"}); return 0
    end,
    GetTrackMediaItem = function(tr, i)
      table.insert(calls, {fn="GetTrackMediaItem", i=i}); return nil
    end,
    GetMediaItemInfo_Value = function(item, param)
      table.insert(calls, {fn="GetMediaItemInfo_Value", param=param}); return 0
    end,
    Main_openProject = function(path)
      table.insert(calls, {fn="Main_openProject", path=path})
    end,
    AddProjectMarker2 = function(proj, isrgn, pos, rgnend, name, wantidx, color)
      table.insert(calls, {
        fn="AddProjectMarker2", proj=proj, isrgn=isrgn, pos=pos,
        rgnend=rgnend, name=name, wantidx=wantidx, color=color,
      })
      return 42  -- arbitrary region id
    end,
    SetProjectMarker3 = function(proj, idx, isrgn, pos, rgnend, name)
      table.insert(calls, {
        fn="SetProjectMarker3", idx=idx, isrgn=isrgn,
        pos=pos, rgnend=rgnend, name=name,
      })
      return true
    end,
    EnumProjectMarkers3 = function(proj, i)
      table.insert(calls, {fn="EnumProjectMarkers3", i=i})
      -- Return no markers by default; tests override when needed.
      return 0
    end,
    GetSetProjectInfo = function(proj, key, val, is_set)
      table.insert(calls, {fn="GetSetProjectInfo", key=key, val=val, is_set=is_set})
      return val
    end,
    GetSetProjectInfo_String = function(proj, key, val, is_set)
      table.insert(calls, {fn="GetSetProjectInfo_String", key=key, val=val, is_set=is_set})
      return true, val
    end,
    ShowConsoleMsg = function(s) table.insert(calls, {fn="ShowConsoleMsg", s=s}) end,
  }
  return stub, calls
end

-- ── Transport ────────────────────────────────────────────────────────────────

describe("reaper_api transport", function()
  it("action_play → Main_OnCommand(1007, 0)", function()
    local stub, calls = make_stub()
    local a = reaper_api.new(stub)
    a.action_play()
    assert_eq(calls[1].cmd, 1007); assert_eq(calls[1].flag, 0)
  end)
  it("action_stop → 1016", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).action_stop()
    assert_eq(calls[1].cmd, 1016)
  end)
  it("action_record → 1013", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).action_record()
    assert_eq(calls[1].cmd, 1013)
  end)
  it("set_edit_cursor(5, true, false) calls SetEditCurPos", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).set_edit_cursor(5, true, false)
    assert_eq(calls[1].fn, "SetEditCurPos")
    assert_eq(calls[1].t, 5)
    assert_eq(calls[1].moveview, true)
    assert_eq(calls[1].seekplay, false)
  end)
end)

-- ── Metronome ────────────────────────────────────────────────────────────────

describe("reaper_api metronome", function()
  it("toggle_metronome → Main_OnCommand(40364)", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).toggle_metronome()
    assert_eq(calls[1].cmd, 40364)
  end)
  it("get_metronome_state returns true when toggle state is 1", function()
    local stub, _ = make_stub()
    stub._state.metronome_on = true
    assert_true(reaper_api.new(stub).get_metronome_state())
  end)
  it("get_metronome_state returns false when off", function()
    local stub, _ = make_stub()
    assert_false(reaper_api.new(stub).get_metronome_state())
  end)
end)

-- ── Tempo/timesig ─────────────────────────────────────────────────────────────

describe("reaper_api tempo/timesig", function()
  it("set_tempo(140) uses cursor position and bpm 140", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).set_tempo(140)
    local stm
    for _, c in ipairs(calls) do if c.fn == "SetTempoTimeSigMarker" then stm = c; break end end
    assert_not_nil(stm)
    assert_eq(stm.bpm, 140)
    assert_eq(stm.timepos, 10.0)  -- matches stub cursor pos
  end)
  it("set_timesig_at_measure(3,4,5) → measurepos=4", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).set_timesig_at_measure(3, 4, 5)
    assert_eq(calls[1].measurepos, 4)
    assert_eq(calls[1].num, 3)
    assert_eq(calls[1].denom, 4)
  end)
  it("set_marker_at_time(t=5, bpm=120, 4, 4) stamps at time 5", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).set_marker_at_time(5, 120, 4, 4)
    assert_eq(calls[1].timepos, 5)
    assert_eq(calls[1].bpm, 120)
    assert_eq(calls[1].num, 4)
    assert_eq(calls[1].denom, 4)
  end)
end)

-- ── Regions ──────────────────────────────────────────────────────────────────

describe("reaper_api regions", function()
  it("add_region returns the stub id and passes isrgn=true", function()
    local stub, calls = make_stub()
    local id = reaper_api.new(stub).add_region(0, 10, "intro")
    assert_eq(id, 42)
    assert_eq(calls[1].fn, "AddProjectMarker2")
    assert_eq(calls[1].isrgn, true)
    assert_eq(calls[1].name, "intro")
    assert_eq(calls[1].pos, 0)
    assert_eq(calls[1].rgnend, 10)
  end)

  it("list_regions filters out non-region markers", function()
    local stub = make_stub()
    local i_called = 0
    stub.EnumProjectMarkers3 = function(proj, i)
      i_called = i_called + 1
      if i == 0 then
        return 2, false, 1.0, 0,   "a marker", 1  -- not a region
      elseif i == 1 then
        return 2, true,  2.0, 5.0, "region A", 10
      elseif i == 2 then
        return 2, true,  6.0, 9.0, "region B", 11
      else
        return 0
      end
    end
    local out = reaper_api.new(stub).list_regions()
    assert_eq(#out, 2)
    assert_eq(out[1].id, 10)
    assert_eq(out[1].name, "region A")
    assert_eq(out[1].start, 2.0)
    assert_eq(out[1].stop, 5.0)
    assert_eq(out[2].id, 11)
  end)

  it("set_region passes isrgn=true", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).set_region(42, 1, 5, "renamed")
    assert_eq(calls[1].idx, 42)
    assert_eq(calls[1].isrgn, true)
    assert_eq(calls[1].name, "renamed")
  end)
end)

-- ── Render ───────────────────────────────────────────────────────────────────

describe("reaper_api render", function()
  it("configure_render_regions sets the expected keys", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).configure_render_regions("/tmp/out")
    local keys = {}
    for _, c in ipairs(calls) do
      if c.fn == "GetSetProjectInfo" or c.fn == "GetSetProjectInfo_String" then
        keys[c.key] = c.val
      end
    end
    assert_eq(keys["RENDER_BOUNDSFLAG"], 2)
    assert_eq(keys["RENDER_SETTINGS"], 8)
    assert_eq(keys["RENDER_PATTERN"], "$region")
    assert_eq(keys["RENDER_FILE"], "/tmp/out")
  end)

  it("configure_render_regions without output_dir leaves RENDER_FILE unset", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).configure_render_regions(nil)
    for _, c in ipairs(calls) do
      if c.key == "RENDER_FILE" then
        error("RENDER_FILE should not be written when output_dir is nil")
      end
    end
  end)

  it("render_project → Main_OnCommand(42230)", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).render_project()
    assert_eq(calls[1].cmd, 42230)
  end)
end)

-- ── QN conversions ───────────────────────────────────────────────────────────

describe("reaper_api qn conversions", function()
  it("time_to_qn delegates to TimeMap2_timeToQN", function()
    local stub, calls = make_stub()
    local qn = reaper_api.new(stub).time_to_qn(10)
    assert_eq(qn, 20)  -- stub returns t*2
    assert_eq(calls[1].fn, "TimeMap2_timeToQN")
  end)
  it("qn_to_time delegates to TimeMap2_QNToTime", function()
    local stub, calls = make_stub()
    local t = reaper_api.new(stub).qn_to_time(10)
    assert_eq(t, 5)  -- stub returns qn/2
  end)
end)

-- ── Project ──────────────────────────────────────────────────────────────────

describe("reaper_api project", function()
  it("new_project opens an empty project", function()
    local stub, calls = make_stub()
    reaper_api.new(stub).new_project()
    assert_eq(calls[1].fn, "Main_openProject")
    assert_eq(calls[1].path, "")
  end)
end)
