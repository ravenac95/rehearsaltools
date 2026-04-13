-- src/handlers/project.lua
-- Handler for /rt/project/new.
-- Opens a new empty project in REAPER. Any unsaved changes trigger REAPER's
-- native save-prompt dialog.

local M = {}

function M.new(adapter)
  return function(_payload)
    adapter.new_project()
    return {ok = true}
  end
end

return M
