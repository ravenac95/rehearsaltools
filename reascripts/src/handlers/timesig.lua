-- src/handlers/timesig.lua
-- Handler for /rt/timesig.
-- When body.measure is nil, inserts at the current playhead; otherwise inserts
-- at the given 1-indexed measure boundary.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    payload = payload or {}
    logger.debug("timesig: enter, num=%s denom=%s measure=%s",
      tostring(payload.numerator), tostring(payload.denominator), tostring(payload.measure))
    local ok, data = validation.validate_timesig(payload)
    if not ok then
      logger.error("timesig: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("timesig: validation ok, %d/%d measure=%s",
      data.numerator, data.denominator, tostring(data.measure))

    if data.measure then
      logger.debug("timesig: inserting at measure %d", data.measure)
      adapter.set_timesig_at_measure(data.numerator, data.denominator, data.measure)
    else
      local t = adapter.get_cursor_position()
      logger.debug("timesig: inserting at playhead t=%.4g", t)
      adapter.set_marker_at_time(t, -1, data.numerator, data.denominator)
    end
    logger.debug("timesig: calling update_timeline")
    adapter.update_timeline()
    logger.debug("timesig: ok")

    return {
      numerator   = data.numerator,
      denominator = data.denominator,
      measure     = data.measure,
    }
  end
end

return M
