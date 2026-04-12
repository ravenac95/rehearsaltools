-- src/reaper_api.lua
-- Thin adapter module that wraps all REAPER API calls behind an injectable
-- interface. This is the ONLY place in the codebase that calls reaper.* functions.
--
-- Usage in production:  local adapter = require("reaper_api").new()
-- Usage in tests:       local adapter = require("reaper_api").new(stub_reaper)

local M = {}

--- Factory: create a new adapter bound to reaper_global.
--- When reaper_global is nil, falls back to the global `reaper` table.
function M.new(reaper_global)
  local r = reaper_global or reaper
  local adapter = {}

  -- ── Transport ──────────────────────────────────────────────────────────────

  --- Returns integer play state: 0=stopped, 1=playing, 2=paused,
  --- 4=recording, 5=recording+paused.
  function adapter.get_play_state()
    return r.GetPlayState()
  end

  --- Returns cursor position in seconds.
  function adapter.get_cursor_position()
    return r.GetCursorPosition()
  end

  --- Start playback.
  function adapter.action_play()
    r.Main_OnCommand(1007, 0)
  end

  --- Stop transport.
  function adapter.action_stop()
    r.Main_OnCommand(1016, 0)
  end

  --- Start recording.
  function adapter.action_record()
    r.Main_OnCommand(1013, 0)
  end

  -- ── Tempo / Time Signature ─────────────────────────────────────────────────

  --- Returns bpm, timesig_num, timesig_denom at the given position.
  function adapter.get_tempo_time_sig_at(position)
    return r.TimeMap_GetTimeSigAtTime(0, position)
  end

  --- Insert a tempo marker at the current cursor position, changing only BPM.
  function adapter.set_tempo(bpm)
    local pos = r.GetCursorPosition()
    r.SetTempoTimeSigMarker(0, -1, pos, -1, -1, bpm, 0, 0, false)
  end

  --- Insert a time-signature marker at a given 1-indexed measure number.
  --- Does not change the tempo.
  function adapter.set_timesig_at_measure(numerator, denominator, measure_1indexed)
    r.SetTempoTimeSigMarker(
      0,                       -- proj
      -1,                      -- ptidx (-1 = create new)
      -1,                      -- timepos (-1 = use measurepos)
      measure_1indexed - 1,    -- measurepos (0-indexed)
      -1,                      -- beatpos
      -1,                      -- bpm (-1 = no change)
      numerator,               -- timesig_num
      denominator,             -- timesig_denom
      false                    -- lineartempochange
    )
  end

  --- Refresh REAPER's timeline display after tempo/timesig changes.
  function adapter.update_timeline()
    r.UpdateTimeline()
  end

  -- ── Position ───────────────────────────────────────────────────────────────

  --- Returns measures_0indexed, beats_0indexed, full_beats, full_seconds.
  function adapter.time_to_measures_beats(time_seconds)
    return r.TimeMap2_timeToBeats(0, time_seconds)
  end

  -- ── Tracks ─────────────────────────────────────────────────────────────────

  --- Returns the number of tracks in the project.
  function adapter.get_track_count()
    return r.CountTracks(0)
  end

  --- Returns a track object (or nil) for the given 1-indexed track number.
  function adapter.get_track(n_1indexed)
    return r.GetTrack(0, n_1indexed - 1)
  end

  --- Returns true if the track is muted.
  function adapter.get_track_mute(track)
    return r.GetMediaTrackInfo_Value(track, "B_MUTE") ~= 0
  end

  --- Set or clear the mute flag on a track.
  function adapter.set_track_mute(track, muted)
    r.SetMediaTrackInfo_Value(track, "B_MUTE", muted and 1 or 0)
  end

  --- Returns true if the track is soloed (any nonzero I_SOLO value).
  function adapter.get_track_solo(track)
    return r.GetMediaTrackInfo_Value(track, "I_SOLO") ~= 0
  end

  --- Set or clear the solo-in-place flag on a track.
  function adapter.set_track_solo(track, soloed)
    r.SetMediaTrackInfo_Value(track, "I_SOLO", soloed and 2 or 0)
  end

  --- Returns the track volume as a linear scalar.
  function adapter.get_track_volume(track)
    return r.GetMediaTrackInfo_Value(track, "D_VOL")
  end

  --- Set the track volume (linear scalar).
  function adapter.set_track_volume(track, volume_linear)
    r.SetMediaTrackInfo_Value(track, "D_VOL", volume_linear)
  end

  -- ── Project ────────────────────────────────────────────────────────────────

  --- Refresh REAPER's arrange view after track changes.
  function adapter.update_arrange()
    r.UpdateArrange()
  end

  --- Open a new empty project, replacing the current session.
  --- REAPER may prompt the user to save if there are unsaved changes.
  function adapter.new_project()
    r.Main_openProject("")
  end

  return adapter
end

return M
