-- actions/rt_region_rename.lua
-- Registered as a REAPER custom action, invoked via /rt/region/rename OSC.

local info = debug.getinfo(1, "S").source:sub(2)
local script_dir = info:match("(.*[/\\])") or "./"
local repo_root  = script_dir .. "../"  -- scripts live in reascripts/actions/

package.path = repo_root .. "?.lua;" .. repo_root .. "?/init.lua;" .. package.path

local payload_mod = dofile(repo_root .. "src/payload.lua")
local handler_mod = dofile(repo_root .. "src/handlers/regions.lua")
local adapter     = dofile(repo_root .. "src/reaper_api.lua")

local data, err = payload_mod.read()
if err then
  reaper.ShowConsoleMsg("[rt_region_rename] payload error: " .. err .. "\n")
  return
end

local handler = handler_mod.new(adapter)
local _, h_err = handler.rename(data)
if h_err then
  reaper.ShowConsoleMsg("[rt_region_rename] handler error: " .. h_err .. "\n")
end
