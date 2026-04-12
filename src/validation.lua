-- src/validation.lua
-- Pure-Lua validation module for all API request payloads.
-- No dependency on REAPER APIs.

local M = {}

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers (also exported for testing)
-- ─────────────────────────────────────────────────────────────────────────────

--- Returns true if n is a Lua number with no fractional part.
function M.is_integer(n)
  if type(n) ~= "number" then return false end
  return math.floor(n) == n
end

--- Valid power-of-2 denominators (1 through 64).
local VALID_DENOMINATORS = {[1]=true, [2]=true, [4]=true, [8]=true,
                             [16]=true, [32]=true, [64]=true}

--- Returns true if n is an integer and a power of 2 in {1,2,4,8,16,32,64}.
function M.is_power_of_two(n)
  if not M.is_integer(n) then return false end
  return VALID_DENOMINATORS[n] == true
end

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_tempo
-- ─────────────────────────────────────────────────────────────────────────────

function M.validate_tempo(body)
  body = body or {}
  if body.bpm == nil then
    return false, "bpm is required"
  end
  if type(body.bpm) ~= "number" then
    return false, "bpm must be a number"
  end
  if body.bpm < 20 or body.bpm > 999 then
    return false, "bpm must be between 20 and 999"
  end
  return true, {bpm = body.bpm}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_timesig
-- ─────────────────────────────────────────────────────────────────────────────

function M.validate_timesig(body)
  body = body or {}

  -- numerator
  if body.numerator == nil then
    return false, "numerator is required"
  end
  if not M.is_integer(body.numerator) or body.numerator < 1 or body.numerator > 64 then
    return false, "numerator must be an integer between 1 and 64"
  end

  -- denominator
  if body.denominator == nil then
    return false, "denominator is required"
  end
  if not M.is_power_of_two(body.denominator) then
    return false, "denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)"
  end

  -- measure
  if body.measure == nil then
    return false, "measure is required"
  end
  if not M.is_integer(body.measure) or body.measure < 1 then
    return false, "measure must be a positive integer"
  end

  return true, {
    numerator   = body.numerator,
    denominator = body.denominator,
    measure     = body.measure,
  }
end

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_volume
-- ─────────────────────────────────────────────────────────────────────────────

function M.validate_volume(body)
  body = body or {}
  if body.volume == nil then
    return false, "volume is required"
  end
  if type(body.volume) ~= "number" then
    return false, "volume must be a number"
  end
  if body.volume < 0.0 or body.volume > 2.0 then
    return false, "volume must be between 0.0 and 2.0"
  end
  return true, {volume = body.volume}
end

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_track_number
-- ─────────────────────────────────────────────────────────────────────────────

function M.validate_track_number(n_string)
  local n = tonumber(n_string)
  if not n then
    return false, "track number must be a positive integer"
  end
  if not M.is_integer(n) then
    return false, "track number must be a positive integer"
  end
  if n < 1 then
    return false, "track number must be a positive integer"
  end
  return true, n
end

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_session_new
-- ─────────────────────────────────────────────────────────────────────────────

--- Always returns true, {} — body is ignored for this endpoint.
function M.validate_session_new(_body)
  return true, {}
end

return M
