-- src/handlers/metronome.lua
-- Handler for /rt/metronome/toggle.
-- Toggles REAPER's metronome and returns the new state.

local M = {}

function M.new(adapter)
  return function(_payload)
    adapter.toggle_metronome()
    local on = adapter.get_metronome_state()
    return {on = on}
  end
end

return M
