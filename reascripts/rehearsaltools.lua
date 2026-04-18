-- rehearsaltools.lua
-- Single REAPER custom action. Register once and bind OSC address
-- /rehearsaltools to _RS_rehearsaltools in reaper-osc-actions.ini.
-- All /rt/* operations ride through this script; the JSON payload's
-- `command` field selects which handler runs.

local script_dir = ({reaper.get_action_context()})[2]:match("^(.*[\\/])")

local payload_mod = dofile(script_dir .. "src/payload.lua")
local adapter     = dofile(script_dir .. "src/reaper_api.lua")
local dispatch    = dofile(script_dir .. "src/dispatch.lua")

local data, err = payload_mod.read()
if err then
  reaper.ShowConsoleMsg("[rehearsaltools] payload error: " .. err .. "\n")
  return
end

local _, d_err = dispatch.run(adapter, data, script_dir)
if d_err then
  reaper.ShowConsoleMsg("[rehearsaltools] " .. d_err .. "\n")
end
