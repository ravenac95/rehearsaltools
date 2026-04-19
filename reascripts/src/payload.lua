-- src/payload.lua
-- Reads the single JSON-string OSC arg from REAPER's action context and
-- parses it into a Lua table.
--
-- Public API:
--   local payload = dofile("src/payload.lua")
--   local data, err = payload.read(get_context_fn)
--     get_context_fn  optional injected function; defaults to
--                     reaper.get_action_context.  Must return a tuple whose
--                     7th value is the OSC string argument.
--   Returns (tbl, nil) on success, (nil, err_string) on failure.
--   An empty string arg returns ({}, nil).

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local json = dofile(script_dir .. "src/json.lua")
local logger = dofile(script_dir .. "src/logger.lua")

local osc = dofile(script_dir .. "src/osc.lua")

local M = {}

--- Read and parse the OSC payload delivered via REAPER's action context.
---
--- @param get_context_fn  optional function — if omitted defaults to
---                        reaper.get_action_context (available in REAPER).
--- @return tbl, nil   on success (empty table when arg is absent/empty)
--- @return nil, err   on JSON parse error
function M.read(get_context_fn)
  local msg = osc.get()

  local osc_address = msg and msg.address
  local osc_arg = msg and msg.arg and msg.arg

  logger.debug("payload.read: osc_address= " .. tostring(osc_address) .. ", osc_arg= " .. tostring(osc_arg))


  -- Treat nil or empty string as "no payload".
  if osc_arg == nil or osc_arg == "" then
    return {}, nil
  end

  local tbl, err = json.decode(osc_arg)
  if err then
    return nil, "parse error: " .. tostring(err)
  end

  -- json.decode returns nil for a JSON null literal — treat as empty table.
  if tbl == nil then
    return {}, nil
  end

  return tbl, nil
end

return M
