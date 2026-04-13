-- src/handlers/regions.lua
-- Handlers for /rt/region/{new,rename,list,play} and /rt/playhead/end.

local validation = dofile("src/validation.lua")

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
      local ok, data = validation.validate_region_new(payload)
      if not ok then return nil, data end

      local start_t = adapter.get_cursor_position()
      local end_t   = start_t + LARGE_OFFSET
      local id = adapter.add_region(start_t, end_t, data.name)
      adapter.update_arrange()
      return {id = id, start = start_t, stop = end_t, name = data.name}
    end,

    rename = function(payload)
      local ok, data = validation.validate_region_rename(payload)
      if not ok then return nil, data end

      local region = find_region_by_id(adapter, data.id)
      if not region then return nil, "region not found: " .. data.id end

      adapter.set_region(data.id, region.start, region.stop, data.name)
      adapter.update_arrange()
      return {id = data.id, name = data.name}
    end,

    list = function(_payload)
      return {regions = adapter.list_regions()}
    end,

    play = function(payload)
      local ok, data = validation.validate_region_id(payload)
      if not ok then return nil, data end

      local region = find_region_by_id(adapter, data.id)
      if not region then return nil, "region not found: " .. data.id end

      adapter.set_edit_cursor(region.start, true, false)
      adapter.action_play()
      return {id = data.id, start = region.start}
    end,

    seek_to_end = function(_payload)
      local end_t = item_end_max(adapter)
      adapter.set_edit_cursor(end_t, true, false)
      return {position = end_t}
    end,
  }
end

--- Exported for testing.
M._item_end_max = item_end_max

return M
