-- src/osc.lua
-- Minimal OSC 1.0 encoder / decoder sufficient for RehearsalTools.
-- Supports message addressing + these argument types:
--   s  — string (null-terminated, 4-byte padded)
--   i  — int32  (big-endian signed)
--   f  — float32 (big-endian IEEE-754)
--
-- Bundles are NOT supported; we only need single messages.
--
-- Pure Lua 5.4 (string.pack / string.unpack). No external deps.

local M = {}

-- ── Helpers ──────────────────────────────────────────────────────────────────

--- Pad a string with nulls so its total length is a multiple of 4.
--- OSC strings are null-terminated *then* padded, so always add >=1 null.
local function pad_string(s)
  local with_null = s .. "\0"
  local rem = #with_null % 4
  if rem == 0 then
    return with_null
  else
    return with_null .. string.rep("\0", 4 - rem)
  end
end

--- Read a null-terminated string starting at pos (1-indexed).
--- Returns (string, new_pos) where new_pos points past padding, aligned to 4.
local function read_string(buf, pos)
  local start = pos
  while pos <= #buf and buf:sub(pos, pos) ~= "\0" do
    pos = pos + 1
  end
  if pos > #buf then
    error("OSC string not null-terminated at offset " .. (start - 1))
  end
  local s = buf:sub(start, pos - 1)
  -- advance past the terminating null
  pos = pos + 1
  -- align to 4 bytes (relative to buffer start)
  local consumed = pos - 1  -- how many bytes of buf we've read in total
  local rem = consumed % 4
  if rem ~= 0 then
    pos = pos + (4 - rem)
  end
  return s, pos
end

-- ── Public API ───────────────────────────────────────────────────────────────

--- Encode an OSC message.
---   address: string, e.g. "/rt/region/new"
---   args:    array of { type = "s"|"i"|"f", value = ... }
--- Returns the wire-format bytes.
function M.encode(address, args)
  args = args or {}
  if type(address) ~= "string" or address:sub(1, 1) ~= "/" then
    error("OSC address must be a string starting with '/'")
  end

  -- type tag: leading comma followed by one char per arg
  local tags = {","}
  local arg_bytes = {}
  for i, a in ipairs(args) do
    if type(a) ~= "table" or a.type == nil then
      error("arg " .. i .. " must be a table with .type")
    end
    local t = a.type
    if t == "s" then
      tags[#tags + 1] = "s"
      if type(a.value) ~= "string" then
        error("arg " .. i .. " type=s requires string value")
      end
      arg_bytes[#arg_bytes + 1] = pad_string(a.value)
    elseif t == "i" then
      tags[#tags + 1] = "i"
      local n = a.value
      if type(n) ~= "number" or math.floor(n) ~= n then
        error("arg " .. i .. " type=i requires integer value")
      end
      arg_bytes[#arg_bytes + 1] = string.pack(">i4", n)
    elseif t == "f" then
      tags[#tags + 1] = "f"
      if type(a.value) ~= "number" then
        error("arg " .. i .. " type=f requires number value")
      end
      arg_bytes[#arg_bytes + 1] = string.pack(">f", a.value)
    else
      error("unsupported OSC type: " .. tostring(t))
    end
  end

  return pad_string(address) .. pad_string(table.concat(tags)) .. table.concat(arg_bytes)
end

--- Decode an OSC message. Returns { address = "...", args = {val, val, ...} }.
--- Arg values are plain Lua values (numbers, strings).
--- Returns nil, error_message on parse failure.
function M.decode(buf)
  if type(buf) ~= "string" or #buf == 0 then
    return nil, "OSC buffer must be a non-empty string"
  end
  if buf:sub(1, 1) == "#" then
    return nil, "OSC bundles not supported"
  end

  local ok, result_or_err = pcall(function()
    local pos = 1
    local address
    address, pos = read_string(buf, pos)

    local tag_str
    tag_str, pos = read_string(buf, pos)
    if tag_str:sub(1, 1) ~= "," then
      error("OSC type tag string must begin with ','")
    end

    local args = {}
    for i = 2, #tag_str do
      local t = tag_str:sub(i, i)
      if t == "s" then
        local s
        s, pos = read_string(buf, pos)
        args[#args + 1] = s
      elseif t == "i" then
        if pos + 3 > #buf then error("truncated int32 argument") end
        local v = string.unpack(">i4", buf, pos)
        pos = pos + 4
        args[#args + 1] = v
      elseif t == "f" then
        if pos + 3 > #buf then error("truncated float32 argument") end
        local v = string.unpack(">f", buf, pos)
        pos = pos + 4
        args[#args + 1] = v
      else
        error("unsupported OSC type tag: '" .. t .. "'")
      end
    end

    return { address = address, args = args }
  end)

  if ok then
    return result_or_err
  else
    return nil, tostring(result_or_err)
  end
end

return M
