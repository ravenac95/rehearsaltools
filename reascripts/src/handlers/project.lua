-- src/handlers/project.lua
-- Handler for /rt/project/new.
-- Opens a new empty project in REAPER. Any unsaved changes trigger REAPER's
-- native save-prompt dialog.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

function M.new(adapter)
  return function(_payload)
    logger.debug("project: enter")
    logger.debug("project: calling new_project")
    adapter.new_project()
    logger.debug("project: ok")
    return {ok = true}
  end
end

return M
