-- src/handlers/regions.lua
-- Handlers for /rt/region/{new,rename,list,play} and /rt/playhead/end.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local validation = dofile(script_dir .. "src/validation.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local M = {}

-- ── Helpers ─────────────────────────────────────────────────────────────────

local function find_region_by_id(adapter, id)
  for _, r in ipairs(adapter.list_regions()) do
    if r.id == id then return r end
  end
  return nil
end

--- Scan every track for media items and return the maximum item end time.
--- Returns 0 when the project has no items.
local function item_end_max(adapter)
  local max_end = 0
  local track_count = adapter.get_track_count()
  for t = 1, track_count do
    local track = adapter.get_track(t)
    if track then
      local n_items = adapter.count_track_items(track)
      for i = 0, n_items - 1 do
        local item = adapter.get_track_item(track, i)
        if item then
          local pos = adapter.get_item_position(item)
          local len = adapter.get_item_length(item)
          local e   = pos + len
          if e > max_end then max_end = e end
        end
      end
    end
  end
  return max_end
end

-- ── Handlers ────────────────────────────────────────────────────────────────

--- POST /rt/region/new  — body {name?}
--- Creates an open-ended region starting at the current playhead.
--- End is set to start + LARGE_OFFSET so the region is effectively unbounded
--- until the user stops recording; they can trim later.
local LARGE_OFFSET = 60 * 60 * 24  -- 24 hours

function M.new(adapter)
  return {
    new = function(payload)
      logger.debug("regions.new: enter, name=%s", tostring(payload.name))
      local ok, data = validation.validate_region_new(payload)
      if not ok then
        logger.error("regions.new: validation error=%s", tostring(data))
        return nil, data
      end
      local start_t = adapter.get_cursor_position()
      local end_t   = start_t + LARGE_OFFSET
      logger.debug("regions.new: add_region name=%q start=%.4g end=%.4g",
        data.name, start_t, end_t)
      adapter.add_region(start_t, end_t, data.name)
      adapter.update_arrange()
      logger.debug("regions.new: ok")
    end,

    rename = function(payload)
      logger.debug("regions.rename: enter, id=%s name=%s",
        tostring(payload.id), tostring(payload.name))
      local ok, data = validation.validate_region_rename(payload)
      if not ok then
        logger.error("regions.rename: validation error=%s", tostring(data))
        return nil, data
      end

      local region = find_region_by_id(adapter, data.id)
      if not region then
        logger.error("regions.rename: region not found id=%s", tostring(data.id))
        return nil, "region not found: " .. data.id
      end
      logger.debug("regions.rename: found region id=%s, calling set_region", tostring(data.id))
      adapter.set_region(data.id, region.start, region.stop, data.name)
      adapter.update_arrange()
      logger.debug("regions.rename: ok")
    end,

    list = function(_payload)
      logger.debug("regions.list: enter")
      local regions = adapter.list_regions()
      logger.debug("regions.list: ok, count=%d", #regions)
      return {regions = regions}
    end,

    play = function(payload)
      logger.debug("regions.play: enter, id=%s", tostring(payload.id))
      local ok, data = validation.validate_region_id(payload)
      if not ok then
        logger.error("regions.play: validation error=%s", tostring(data))
        return nil, data
      end

      local region = find_region_by_id(adapter, data.id)
      if not region then
        logger.error("regions.play: region not found id=%s", tostring(data.id))
        return nil, "region not found: " .. data.id
      end
      logger.debug("regions.play: seeking to start=%.4g and playing", region.start)
      adapter.set_edit_cursor(region.start, true, false)
      adapter.action_play()
      logger.debug("regions.play: ok")
      return {id = data.id, start = region.start}
    end,

    seek_to_end = function(_payload)
      logger.debug("regions.seek_to_end: enter")
      local end_t = item_end_max(adapter)
      logger.debug("regions.seek_to_end: end_t=%.4g, calling set_edit_cursor", end_t)
      adapter.set_edit_cursor(end_t, true, false)
      logger.debug("regions.seek_to_end: ok")
    end,
  }
end

--- Exported for testing.
M._item_end_max = item_end_max

return M
