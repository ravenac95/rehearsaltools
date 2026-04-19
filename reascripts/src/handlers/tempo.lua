-- src/handlers/tempo.lua
-- Handler for /rt/tempo (only used for non-realtime tempo changes; realtime
-- tempo uses REAPER's native /tempo/raw OSC path).

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    logger.debug("tempo: enter, bpm=%s", tostring(payload.bpm))
    local ok, data = validation.validate_tempo(payload)
    if not ok then
      logger.error("tempo: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("tempo: validation ok, bpm=%.4g", data.bpm)
    logger.debug("tempo: calling set_tempo bpm=%.4g", data.bpm)
    adapter.set_tempo(data.bpm)
    logger.debug("tempo: calling update_timeline")
    adapter.update_timeline()
    logger.debug("tempo: ok")
    return {bpm = data.bpm}
  end
end

return M
