-- src/handlers/songform.lua
-- Handler for /rt/songform/write.
-- Given a flat list of rows { {barOffset, num, denom, bpm} ... }, inserts one
-- tempo+timesig marker per row starting at the current playhead, and creates
-- an open-ended region covering the take. The last marker is NOT terminated —
-- it continues ad infinitum so recording can run past the programmed length.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

local LARGE_OFFSET = 60 * 60 * 24  -- 24-hour sentinel for open-ended region

--- Convert a row's bar count to quarter-notes.
--- QN per bar = num * (4 / denom).
local function bars_to_qn(bars, num, denom)
  return bars * num * 4 / denom
end

--- Compute the absolute beat (quarter-note) start positions for each row,
--- given the playhead's QN position. Pure function — no side effects.
--- Returns an array of { qn, bpm, num, denom } aligned to the input rows.
local function compute_row_positions(rows, playhead_qn)
  -- First row always starts at playhead (offset 0 in bars).
  -- For subsequent rows, we accumulate bar spans from the previous row.
  local out = {}
  local cum_qn = 0
  for i, row in ipairs(rows) do
    if i > 1 then
      local prev = rows[i - 1]
      local bar_span = row.barOffset - prev.barOffset
      cum_qn = cum_qn + bars_to_qn(bar_span, prev.num, prev.denom)
    end
    out[i] = {
      qn    = playhead_qn + cum_qn,
      bpm   = row.bpm,
      num   = row.num,
      denom = row.denom,
    }
  end
  return out
end

M._compute_row_positions = compute_row_positions  -- exported for tests
M._bars_to_qn            = bars_to_qn

function M.new(adapter)
  return function(payload)
    payload = payload or {}
    logger.debug("songform: enter, row_count=%s startTime=%s",
      tostring(payload.rows and #payload.rows or 0),
      tostring(payload.startTime))

    local ok, data = validation.validate_songform(payload)
    if not ok then
      logger.error("songform: validation error=%s", tostring(data))
      return nil, data
    end

    -- First row must start at barOffset 0 — recording starts at bar 1 of the
    -- form (= the current playhead).
    if data.rows[1].barOffset ~= 0 then
      logger.error("songform: rows[1].barOffset must be 0, got=%s",
        tostring(data.rows[1].barOffset))
      return nil, "rows[1].barOffset must be 0 (bar 1 of the form)"
    end

    -- startTime is provided by the server (pre-computed from transport state).
    if type(data.startTime) ~= "number" then
      logger.error("songform: startTime missing or not a number, got=%s",
        type(data.startTime))
      return nil, "startTime is required and must be a number"
    end
    local playhead_time = data.startTime
    local playhead_qn   = adapter.time_to_qn(playhead_time)
    logger.debug("songform: playhead_qn=%.4g", playhead_qn)

    local positions = compute_row_positions(data.rows, playhead_qn)

    -- Insert one tempo+timesig marker per row.
    local written = {}
    for i, p in ipairs(positions) do
      local t = adapter.qn_to_time(p.qn)
      logger.debug("songform: marker %d/%d t=%.4g bpm=%.4g num=%d denom=%d",
        i, #positions, t, p.bpm, p.num, p.denom)
      adapter.set_marker_at_time(t, p.bpm, p.num, p.denom)
      written[i] = {time = t, bpm = p.bpm, num = p.num, denom = p.denom}
    end

    -- Create an open-ended region at the playhead.
    local region_name = data.regionName or "Take"
    logger.debug("songform: creating region name=%q start=%.4g end=%.4g",
      region_name, playhead_time, playhead_time + LARGE_OFFSET)
    local region_id = adapter.add_region(
      playhead_time,
      playhead_time + LARGE_OFFSET,
      region_name
    )

    adapter.update_timeline()
    adapter.update_arrange()
    logger.debug("songform: ok, regionId=%s", tostring(region_id))

    return {
      regionId  = region_id,
      startTime = playhead_time,
      rows      = written,
    }
  end
end

return M
