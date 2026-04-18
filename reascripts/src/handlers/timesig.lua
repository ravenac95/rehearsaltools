-- src/handlers/timesig.lua
-- Handler for /rt/timesig.
-- When body.measure is nil, inserts at the current playhead; otherwise inserts
-- at the given 1-indexed measure boundary.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    local ok, data = validation.validate_timesig(payload)
    if not ok then return nil, data end

    if data.measure then
      adapter.set_timesig_at_measure(data.numerator, data.denominator, data.measure)
    else
      local t = adapter.get_cursor_position()
      adapter.set_marker_at_time(t, -1, data.numerator, data.denominator)
    end
    adapter.update_timeline()

    return {
      numerator   = data.numerator,
      denominator = data.denominator,
      measure     = data.measure,
    }
  end
end

return M
