-- src/logger.lua
-- Standalone logger module for RehearsalTools REAPER-side Lua layer.
-- Gates all output behind an ExtState flag togglable at runtime.
-- Load with: local logger = dofile(script_dir .. "src/logger.lua")

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""

local ok_json, json = pcall(dofile, script_dir .. "src/json.lua")
if not ok_json then json = nil end

-- ── Private helpers ───────────────────────────────────────────────────────────

local function is_enabled()
  return true
  --if not (reaper and reaper.GetExtState) then return false end
  --local v = reaper.GetExtState("rehearsaltools", "log_enabled")
  -- return v == "1" or v == "true"
end

local function emit(level, msg)
  if not is_enabled() then return end
  if reaper and reaper.ShowConsoleMsg then
    reaper.ShowConsoleMsg("[rehearsaltools] [" .. level .. "] " .. msg .. "\n")
  end
end

-- ── Public API ────────────────────────────────────────────────────────────────

local M = {}

function M.is_enabled()
  return is_enabled()
end

function M.set_enabled(bool)
  if reaper and reaper.SetExtState then
    reaper.SetExtState("rehearsaltools", "log_enabled", bool and "1" or "", true)
  end
end

function M.info(fmt, ...)
  if not is_enabled() then return end
  emit("INFO", string.format(fmt, ...))
end

function M.debug(fmt, ...)
  if not is_enabled() then return end
  emit("DEBUG", string.format(fmt, ...))
end

function M.error(fmt, ...)
  if not is_enabled() then return end
  emit("ERROR", string.format(fmt, ...))
end

function M.dump(label, value)
  if not is_enabled() then return end
  local serialized
  if json and type(value) == "table" then
    local ok, s = pcall(json.encode, value)
    if ok then
      serialized = s
    else
      serialized = tostring(value)
    end
  else
    serialized = tostring(value)
  end
  emit("DEBUG", label .. ": " .. serialized)
end

return M
