-- src/handlers/tempo.lua
-- Handler for /rt/tempo (only used for non-realtime tempo changes; realtime
-- tempo uses REAPER's native /tempo/raw OSC path).

local validation = dofile("src/validation.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    local ok, data = validation.validate_tempo(payload)
    if not ok then return nil, data end
    adapter.set_tempo(data.bpm)
    adapter.update_timeline()
    return {bpm = data.bpm}
  end
end

return M
