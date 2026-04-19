-- src/handlers/mixdown.lua
-- Handler for /rt/mixdown/all.
-- Configures REAPER's render settings to render each region into a separate
-- file named after the region, then triggers a render.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

function M.new(adapter)
  return function(payload)
    payload = payload or {}
    logger.debug("mixdown: enter, output_dir=%s", tostring(payload.output_dir))
    local ok, data = validation.validate_mixdown(payload)
    if not ok then
      logger.error("mixdown: validation error=%s", tostring(data))
      return nil, data
    end
    logger.debug("mixdown: validation ok, output_dir=%s", tostring(data.output_dir))
    logger.debug("mixdown: calling configure_render_regions")
    adapter.configure_render_regions(data.output_dir)
    logger.debug("mixdown: calling render_project")
    adapter.render_project()
    local region_count = #adapter.list_regions()
    logger.debug("mixdown: ok, region_count=%d", region_count)
    return {
      output_dir   = data.output_dir,
      region_count = region_count,
    }
  end
end

return M
