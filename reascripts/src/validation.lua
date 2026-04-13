-- src/validation.lua
-- Pure-Lua validation for OSC dispatcher payloads.
-- No dependency on REAPER APIs.

local M = {}

-- ── Helpers (also exported) ─────────────────────────────────────────────────

function M.is_integer(n)
  if type(n) ~= "number" then return false end
  return math.floor(n) == n
end

local VALID_DENOMINATORS = {[1]=true, [2]=true, [4]=true, [8]=true,
                             [16]=true, [32]=true, [64]=true}

function M.is_power_of_two(n)
  if not M.is_integer(n) then return false end
  return VALID_DENOMINATORS[n] == true
end

local function is_nonempty_string(s)
  return type(s) == "string" and #s > 0
end

-- ── Tempo / timesig ─────────────────────────────────────────────────────────

function M.validate_tempo(body)
  body = body or {}
  if body.bpm == nil then return false, "bpm is required" end
  if type(body.bpm) ~= "number" then return false, "bpm must be a number" end
  if body.bpm < 20 or body.bpm > 999 then return false, "bpm must be between 20 and 999" end
  return true, {bpm = body.bpm}
end

function M.validate_timesig(body)
  body = body or {}
  if body.numerator == nil then return false, "numerator is required" end
  if not M.is_integer(body.numerator) or body.numerator < 1 or body.numerator > 64 then
    return false, "numerator must be an integer between 1 and 64"
  end
  if body.denominator == nil then return false, "denominator is required" end
  if not M.is_power_of_two(body.denominator) then
    return false, "denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)"
  end
  -- measure is optional — when omitted, we insert at the current playhead.
  if body.measure ~= nil then
    if not M.is_integer(body.measure) or body.measure < 1 then
      return false, "measure must be a positive integer"
    end
  end
  return true, {
    numerator   = body.numerator,
    denominator = body.denominator,
    measure     = body.measure,  -- may be nil
  }
end

-- ── Regions ─────────────────────────────────────────────────────────────────

function M.validate_region_new(body)
  body = body or {}
  if body.name == nil then
    body.name = ""  -- auto-named by REAPER if empty
  end
  if type(body.name) ~= "string" then
    return false, "name must be a string"
  end
  return true, {name = body.name}
end

function M.validate_region_rename(body)
  body = body or {}
  if not M.is_integer(body.id) then
    return false, "id must be an integer region id"
  end
  if not is_nonempty_string(body.name) then
    return false, "name must be a non-empty string"
  end
  return true, {id = body.id, name = body.name}
end

function M.validate_region_id(body)
  body = body or {}
  if not M.is_integer(body.id) then
    return false, "id must be an integer region id"
  end
  return true, {id = body.id}
end

-- ── Mixdown ─────────────────────────────────────────────────────────────────

function M.validate_mixdown(body)
  body = body or {}
  if body.output_dir ~= nil and type(body.output_dir) ~= "string" then
    return false, "output_dir must be a string if provided"
  end
  return true, {output_dir = body.output_dir}
end

-- ── Song form ───────────────────────────────────────────────────────────────

--- Validates a song-form flatten payload of the form:
---   { regionName = "optional", rows = [ {barOffset, num, denom, bpm}, ... ] }
--- barOffset is an integer bar count, relative to the current playhead's bar.
--- Rows are expected in ascending barOffset order; we verify monotonicity.
function M.validate_songform(body)
  body = body or {}
  if type(body.rows) ~= "table" then
    return false, "rows must be an array"
  end
  if #body.rows == 0 then
    return false, "rows must not be empty"
  end

  local out_rows = {}
  local prev_offset = -1
  for i, row in ipairs(body.rows) do
    if type(row) ~= "table" then
      return false, "row " .. i .. " must be an object"
    end
    if not M.is_integer(row.barOffset) or row.barOffset < 0 then
      return false, "row " .. i .. ": barOffset must be a non-negative integer"
    end
    if row.barOffset <= prev_offset then
      return false, "row " .. i .. ": barOffset must strictly increase"
    end
    prev_offset = row.barOffset
    if not M.is_integer(row.num) or row.num < 1 or row.num > 64 then
      return false, "row " .. i .. ": num must be an integer 1..64"
    end
    if not M.is_power_of_two(row.denom) then
      return false, "row " .. i .. ": denom must be a power of 2"
    end
    if type(row.bpm) ~= "number" or row.bpm < 20 or row.bpm > 999 then
      return false, "row " .. i .. ": bpm must be a number between 20 and 999"
    end
    out_rows[i] = {
      barOffset = row.barOffset,
      num       = row.num,
      denom     = row.denom,
      bpm       = row.bpm,
    }
  end

  local region_name = body.regionName
  if region_name ~= nil and type(region_name) ~= "string" then
    return false, "regionName must be a string if provided"
  end

  return true, {regionName = region_name, rows = out_rows}
end

return M
