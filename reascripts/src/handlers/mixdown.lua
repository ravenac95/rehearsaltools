-- src/handlers/mixdown.lua
-- Handler for /rt/mixdown/all.
-- Configures REAPER's render settings to render each region into a separate
-- file named after the region, then triggers a render.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    local ok, data = validation.validate_mixdown(payload)
    if not ok then return nil, data end

    adapter.configure_render_regions(data.output_dir)
    adapter.render_project()
    return {
      output_dir = data.output_dir,
      region_count = #adapter.list_regions(),
    }
  end
end

return M
