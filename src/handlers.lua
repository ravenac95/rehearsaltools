-- src/handlers.lua
-- All API endpoint handler functions.
-- Each handler accepts (request, adapter[, params]) and returns (status_code, response_table).
-- Handlers never call reaper.* directly — only via the adapter.
-- JSON encoding is the router's responsibility.

local json       = dofile("src/json.lua")
local validators = dofile("src/validation.lua")

local M = {}

-- ─────────────────────────────────────────────────────────────────────────────
-- status
-- ─────────────────────────────────────────────────────────────────────────────

function M.status(request, adapter)
  local state    = adapter.get_play_state()
  local playing  = (state == 1 or state == 5)
  local recording = (state == 4 or state == 5)
  local stopped  = (state == 0)

  local pos = adapter.get_cursor_position()
  local bpm, timesig_num, timesig_denom = adapter.get_tempo_time_sig_at(pos)
  local measures_0, beats_0, full_beats, _ = adapter.time_to_measures_beats(pos)

  return 200, {
    playing                 = playing,
    recording               = recording,
    stopped                 = stopped,
    bpm                     = bpm,
    timesig_num             = timesig_num,
    timesig_denom           = timesig_denom,
    position_seconds        = pos,
    position_beats          = full_beats,
    position_measure        = measures_0 + 1,
    position_beat_in_measure = beats_0 + 1,
  }
end

-- ─────────────────────────────────────────────────────────────────────────────
-- play / stop / record
-- ─────────────────────────────────────────────────────────────────────────────

function M.play(request, adapter)
  adapter.action_play()
  return 200, {ok = true}
end

function M.stop(request, adapter)
  adapter.action_stop()
  return 200, {ok = true}
end

function M.record(request, adapter)
  adapter.action_record()
  return 200, {ok = true}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- tempo
-- ─────────────────────────────────────────────────────────────────────────────

function M.tempo(request, adapter)
  local decoded, decode_err = json.decode(request.body)
  if decode_err then
    return 400, {error = "invalid JSON body"}
  end

  local ok, result = validators.validate_tempo(decoded)
  if not ok then
    return 400, {error = result}
  end

  adapter.set_tempo(result.bpm)
  adapter.update_timeline()
  return 200, {ok = true, bpm = result.bpm}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- timesig
-- ─────────────────────────────────────────────────────────────────────────────

function M.timesig(request, adapter)
  local decoded, decode_err = json.decode(request.body)
  if decode_err then
    return 400, {error = "invalid JSON body"}
  end

  local ok, result = validators.validate_timesig(decoded)
  if not ok then
    return 400, {error = result}
  end

  adapter.set_timesig_at_measure(result.numerator, result.denominator, result.measure)
  adapter.update_timeline()
  return 200, {
    ok          = true,
    numerator   = result.numerator,
    denominator = result.denominator,
    measure     = result.measure,
  }
end

-- ─────────────────────────────────────────────────────────────────────────────
-- session_new
-- ─────────────────────────────────────────────────────────────────────────────

function M.session_new(request, adapter)
  -- Attempt to decode body; silently ignore any failure (body is optional/ignored).
  local decoded = nil
  if request.body and #request.body > 0 then
    local d, _ = json.decode(request.body)
    decoded = d  -- may be nil if parse failed — that's fine
  end

  -- Validator always succeeds.
  validators.validate_session_new(decoded)

  adapter.new_project()
  return 200, {ok = true}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- track_mute
-- ─────────────────────────────────────────────────────────────────────────────

function M.track_mute(request, adapter, params)
  local ok, n = validators.validate_track_number(params.n)
  if not ok then
    return 400, {error = n}
  end

  local track = adapter.get_track(n)
  if track == nil then
    return 404, {error = "track not found"}
  end

  local current_mute = adapter.get_track_mute(track)
  local new_mute = not current_mute
  adapter.set_track_mute(track, new_mute)
  adapter.update_arrange()
  return 200, {ok = true, track = n, muted = new_mute}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- track_solo
-- ─────────────────────────────────────────────────────────────────────────────

function M.track_solo(request, adapter, params)
  local ok, n = validators.validate_track_number(params.n)
  if not ok then
    return 400, {error = n}
  end

  local track = adapter.get_track(n)
  if track == nil then
    return 404, {error = "track not found"}
  end

  local current_solo = adapter.get_track_solo(track)
  local new_solo = not current_solo
  adapter.set_track_solo(track, new_solo)
  adapter.update_arrange()
  return 200, {ok = true, track = n, soloed = new_solo}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- track_volume
-- ─────────────────────────────────────────────────────────────────────────────

function M.track_volume(request, adapter, params)
  local ok, n = validators.validate_track_number(params.n)
  if not ok then
    return 400, {error = n}
  end

  local track = adapter.get_track(n)
  if track == nil then
    return 404, {error = "track not found"}
  end

  local decoded, decode_err = json.decode(request.body)
  if decode_err then
    return 400, {error = "invalid JSON body"}
  end

  local vol_ok, result = validators.validate_volume(decoded)
  if not vol_ok then
    return 400, {error = result}
  end

  adapter.set_track_volume(track, result.volume)
  adapter.update_arrange()
  return 200, {ok = true, track = n, volume = result.volume}
end

return M
