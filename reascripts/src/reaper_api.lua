-- src/reaper_api.lua
-- Thin adapter module that wraps all REAPER API calls behind an injectable
-- interface. This is the ONLY place in the codebase that calls reaper.* functions.
--
-- Usage in production:  local adapter = require("reaper_api").new()
-- Usage in tests:       local adapter = require("reaper_api").new(stub_reaper)

local M = {}

-- Command IDs reused in multiple handlers.
M.CMD_PLAY               = 1007
M.CMD_STOP               = 1016
M.CMD_RECORD             = 1013
M.CMD_TOGGLE_METRONOME   = 40364
M.CMD_RENDER_LAST        = 42230  -- File: Render project, auto-close

function M.new(reaper_global)
  local r = reaper_global or reaper
  local adapter = {}

  -- ── Transport ──────────────────────────────────────────────────────────────

  function adapter.get_play_state()
    return r.GetPlayState()
  end

  function adapter.get_cursor_position()
    return r.GetCursorPosition()
  end

  function adapter.set_edit_cursor(time, moveview, seekplay)
    r.SetEditCurPos(time, moveview and true or false, seekplay and true or false)
  end

  function adapter.action_play()      r.Main_OnCommand(M.CMD_PLAY,   0) end
  function adapter.action_stop()      r.Main_OnCommand(M.CMD_STOP,   0) end
  function adapter.action_record()    r.Main_OnCommand(M.CMD_RECORD, 0) end

  -- ── Metronome ──────────────────────────────────────────────────────────────

  --- Returns true if the metronome is currently on.
  function adapter.get_metronome_state()
    return r.GetToggleCommandState(M.CMD_TOGGLE_METRONOME) == 1
  end

  function adapter.toggle_metronome()
    r.Main_OnCommand(M.CMD_TOGGLE_METRONOME, 0)
  end

  -- ── Tempo / Time Signature ─────────────────────────────────────────────────

  function adapter.get_tempo_time_sig_at(position)
    return r.TimeMap_GetTimeSigAtTime(0, position)
  end

  --- Insert a tempo marker at the current cursor position, changing only BPM.
  function adapter.set_tempo(bpm)
    local pos = r.GetCursorPosition()
    r.SetTempoTimeSigMarker(0, -1, pos, -1, -1, bpm, 0, 0, false)
  end

  --- Insert a time-signature marker at a given 1-indexed measure number.
  function adapter.set_timesig_at_measure(numerator, denominator, measure_1indexed)
    r.SetTempoTimeSigMarker(
      0, -1, -1, measure_1indexed - 1, -1, -1, numerator, denominator, false
    )
  end

  --- Insert a combined tempo + time-sig marker at a given time (seconds).
  --- Passing bpm=-1 leaves BPM unchanged; num/denom=0 leaves time-sig unchanged.
  function adapter.set_marker_at_time(time_seconds, bpm, num, denom)
    r.SetTempoTimeSigMarker(0, -1, time_seconds, -1, -1,
      bpm or -1, num or 0, denom or 0, false)
  end

  function adapter.update_timeline()
    r.UpdateTimeline()
  end

  -- ── Position / beat conversions ────────────────────────────────────────────

  function adapter.time_to_measures_beats(time_seconds)
    return r.TimeMap2_timeToBeats(0, time_seconds)
  end

  --- Returns quarter-notes from project start at the given time in seconds.
  function adapter.time_to_qn(time_seconds)
    return r.TimeMap2_timeToQN(0, time_seconds)
  end

  --- Returns time in seconds at the given quarter-note count from project start.
  function adapter.qn_to_time(qn)
    return r.TimeMap2_QNToTime(0, qn)
  end

  -- ── Tracks ─────────────────────────────────────────────────────────────────

  function adapter.get_track_count()
    return r.CountTracks(0)
  end

  function adapter.get_track(n_1indexed)
    return r.GetTrack(0, n_1indexed - 1)
  end

  function adapter.count_track_items(track)
    return r.CountTrackMediaItems(track)
  end

  function adapter.get_track_item(track, idx_0)
    return r.GetTrackMediaItem(track, idx_0)
  end

  function adapter.get_item_position(item)
    return r.GetMediaItemInfo_Value(item, "D_POSITION")
  end

  function adapter.get_item_length(item)
    return r.GetMediaItemInfo_Value(item, "D_LENGTH")
  end

  -- ── Project ────────────────────────────────────────────────────────────────

  function adapter.update_arrange()
    r.UpdateArrange()
  end

  function adapter.new_project()
    r.Main_openProject("")
  end

  -- ── Regions ────────────────────────────────────────────────────────────────

  --- Create a region. Returns the region's numeric id (markrgnindexnumber).
  function adapter.add_region(start_time, end_time, name)
    return r.AddProjectMarker2(0, true, start_time, end_time, name or "", -1, 0)
  end

  --- Enumerate regions. Returns an array of
  --- {id = markrgnindexnumber, name, start, stop}.
  function adapter.list_regions()
    local out = {}
    local i = 0
    while true do
      local retval, isrgn, pos, rgnend, name, markrgnindexnumber =
        r.EnumProjectMarkers3(0, i)
      if retval == 0 then break end
      if isrgn then
        out[#out + 1] = {
          id    = markrgnindexnumber,
          name  = name or "",
          start = pos,
          stop  = rgnend,
        }
      end
      i = i + 1
    end
    return out
  end

  --- Set a region's name and/or bounds. Returns true on success.
  function adapter.set_region(id, start_time, end_time, name)
    return r.SetProjectMarker3(0, id, true, start_time, end_time, name)
  end

  -- ── Render (mixdown) ───────────────────────────────────────────────────────

  --- Configure project-level render settings for per-region rendering.
  --- output_dir may be nil; when nil we leave RENDER_FILE unchanged.
  function adapter.configure_render_regions(output_dir)
    -- RENDER_BOUNDSFLAG: 2 = selected regions (all regions if none selected).
    -- See https://www.reaper.fm/sdk/reascript/reascripthelp.html under
    -- GetSetProjectInfo / GetSetProjectInfo_String.
    r.GetSetProjectInfo(0, "RENDER_BOUNDSFLAG", 2, true)
    -- RENDER_SETTINGS: 8 = render all regions into individual files.
    r.GetSetProjectInfo(0, "RENDER_SETTINGS", 8, true)
    -- Output pattern: use region name.
    r.GetSetProjectInfo_String(0, "RENDER_PATTERN", "$region", true)
    if output_dir and #output_dir > 0 then
      r.GetSetProjectInfo_String(0, "RENDER_FILE", output_dir, true)
    end
  end

  --- Trigger a render using the current project render settings.
  function adapter.render_project()
    r.Main_OnCommand(M.CMD_RENDER_LAST, 0)
  end

  -- ── Messaging (console) ────────────────────────────────────────────────────

  function adapter.console(msg)
    r.ShowConsoleMsg(tostring(msg) .. "\n")
  end

  return adapter
end

return M
