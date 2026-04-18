-- src/json.lua
-- Pure-Lua JSON encoder/decoder. No external dependencies.
-- Returns a table with .encode(value) and .decode(str) functions.

local M = {}

-- ─────────────────────────────────────────────────────────────────────────────
-- ENCODER
-- ─────────────────────────────────────────────────────────────────────────────

local MAX_DEPTH = 100

-- Character escape table for JSON strings.
local ESCAPE = {
  ['"']  = '\\"',
  ['\\'] = '\\\\',
  ['/']  = '\\/',
  ['\b'] = '\\b',
  ['\f'] = '\\f',
  ['\n'] = '\\n',
  ['\r'] = '\\r',
  ['\t'] = '\\t',
}

local function escape_string(s)
  -- Replace known single-char escapes.
  s = s:gsub('["\\/\b\f\n\r\t]', ESCAPE)
  -- Replace remaining control characters (< 0x20) with \uXXXX.
  s = s:gsub('[\x00-\x1f]', function(c)
    return string.format('\\u%04x', c:byte())
  end)
  return s
end

--- Returns true when a table should be encoded as a JSON array.
--- Criteria: all keys are consecutive integers starting at 1.
local function is_array(t)
  local n = 0
  for _ in pairs(t) do n = n + 1 end
  for i = 1, n do
    if t[i] == nil then return false end
  end
  return true
end

local function encode_value(val, depth, seen)
  depth = depth or 0
  seen  = seen  or {}

  if depth > MAX_DEPTH then
    error("circular reference or structure too deep (depth > " .. MAX_DEPTH .. ")")
  end

  local t = type(val)

  if val == nil then
    return "null"
  elseif t == "boolean" then
    return val and "true" or "false"
  elseif t == "number" then
    if val ~= val then return "null" end          -- NaN → null
    if val == math.huge  then return "null" end   -- +inf → null
    if val == -math.huge then return "null" end   -- -inf → null
    -- Integer check: use integer format if no fractional part.
    if math.type(val) == "integer" or (math.floor(val) == val and math.abs(val) < 2^53) then
      return string.format("%d", val)
    else
      -- Use %g for compact float; fall back to %.17g only if %g loses precision.
      local s = string.format("%.14g", val)
      return s
    end
  elseif t == "string" then
    return '"' .. escape_string(val) .. '"'
  elseif t == "table" then
    if seen[val] then
      error("circular reference detected in table")
    end
    seen[val] = true

    local result
    if is_array(t == "table" and val or {}) or next(val) == nil then
      -- Treat as array (or empty table → array []).
      if next(val) == nil then
        -- Empty table: could be array or object; we choose [].
        result = "[]"
      elseif is_array(val) then
        local parts = {}
        for i = 1, #val do
          parts[i] = encode_value(val[i], depth + 1, seen)
        end
        result = "[" .. table.concat(parts, ",") .. "]"
      else
        -- Mixed or string-keyed table → object.
        local keys = {}
        for k in pairs(val) do
          if type(k) ~= "string" then
            error("JSON object keys must be strings, got " .. type(k))
          end
          table.insert(keys, k)
        end
        table.sort(keys)
        local parts = {}
        for _, k in ipairs(keys) do
          local encoded_k = '"' .. escape_string(k) .. '"'
          local encoded_v = encode_value(val[k], depth + 1, seen)
          table.insert(parts, encoded_k .. ":" .. encoded_v)
        end
        result = "{" .. table.concat(parts, ",") .. "}"
      end
    else
      -- String-keyed table → object with sorted keys.
      local keys = {}
      for k in pairs(val) do
        if type(k) ~= "string" and type(k) ~= "number" then
          error("JSON object keys must be strings, got " .. type(k))
        end
        table.insert(keys, k)
      end
      -- Sort: convert all keys to strings for sorting purposes.
      table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
      local parts = {}
      for _, k in ipairs(keys) do
        local encoded_k = '"' .. escape_string(tostring(k)) .. '"'
        local encoded_v = encode_value(val[k], depth + 1, seen)
        table.insert(parts, encoded_k .. ":" .. encoded_v)
      end
      result = "{" .. table.concat(parts, ",") .. "}"
    end

    seen[val] = nil
    return result
  else
    error("cannot encode value of type: " .. t)
  end
end

--- Encode a Lua value to a JSON string.
function M.encode(val)
  return encode_value(val, 0, {})
end

-- ─────────────────────────────────────────────────────────────────────────────
-- DECODER
-- ─────────────────────────────────────────────────────────────────────────────

--- Returns nil, error_message on any parse failure (never raises).
function M.decode(str)
  if type(str) ~= "string" or #str == 0 then
    return nil, "input must be a non-empty string"
  end

  local pos = 1
  local len = #str

  local function skip_ws()
    while pos <= len and str:sub(pos, pos):match("%s") do
      pos = pos + 1
    end
  end

  local function peek()
    return str:sub(pos, pos)
  end

  local function consume(n)
    local s = str:sub(pos, pos + (n or 1) - 1)
    pos = pos + (n or 1)
    return s
  end

  local function expect(s)
    if str:sub(pos, pos + #s - 1) == s then
      pos = pos + #s
      return true
    end
    return false
  end

  local parse_value  -- forward declaration

  local function parse_string()
    if peek() ~= '"' then return nil, "expected '\"'" end
    consume(1)
    local parts = {}
    while pos <= len do
      local c = peek()
      if c == '"' then
        consume(1)
        return table.concat(parts)
      elseif c == '\\' then
        consume(1)
        local esc = consume(1)
        if     esc == '"'  then table.insert(parts, '"')
        elseif esc == '\\' then table.insert(parts, '\\')
        elseif esc == '/'  then table.insert(parts, '/')
        elseif esc == 'b'  then table.insert(parts, '\b')
        elseif esc == 'f'  then table.insert(parts, '\f')
        elseif esc == 'n'  then table.insert(parts, '\n')
        elseif esc == 'r'  then table.insert(parts, '\r')
        elseif esc == 't'  then table.insert(parts, '\t')
        elseif esc == 'u'  then
          local hex = consume(4)
          if #hex < 4 then return nil, "truncated \\uXXXX escape" end
          local codepoint = tonumber(hex, 16)
          if not codepoint then return nil, "invalid \\uXXXX escape: " .. hex end
          -- Encode as UTF-8.
          if codepoint < 0x80 then
            table.insert(parts, string.char(codepoint))
          elseif codepoint < 0x800 then
            table.insert(parts, string.char(
              0xC0 + math.floor(codepoint / 0x40),
              0x80 + (codepoint % 0x40)
            ))
          else
            table.insert(parts, string.char(
              0xE0 + math.floor(codepoint / 0x1000),
              0x80 + math.floor((codepoint % 0x1000) / 0x40),
              0x80 + (codepoint % 0x40)
            ))
          end
        else
          return nil, "unknown escape sequence: \\" .. esc
        end
      else
        table.insert(parts, c)
        consume(1)
      end
    end
    return nil, "unterminated string"
  end

  local function parse_number()
    local start = pos
    -- Optional minus.
    if peek() == '-' then consume(1) end
    -- Integer part.
    if peek() == '0' then
      consume(1)
    elseif peek():match('%d') then
      while pos <= len and peek():match('%d') do consume(1) end
    else
      return nil, "invalid number at pos " .. pos
    end
    -- Optional fractional part.
    if peek() == '.' then
      consume(1)
      if not peek():match('%d') then return nil, "digit expected after '.'" end
      while pos <= len and peek():match('%d') do consume(1) end
    end
    -- Optional exponent.
    if peek() == 'e' or peek() == 'E' then
      consume(1)
      if peek() == '+' or peek() == '-' then consume(1) end
      if not peek():match('%d') then return nil, "digit expected in exponent" end
      while pos <= len and peek():match('%d') do consume(1) end
    end
    local num_str = str:sub(start, pos - 1)
    local n = tonumber(num_str)
    if not n then return nil, "invalid number: " .. num_str end
    return n
  end

  local function parse_array()
    consume(1) -- '['
    local arr = {}
    skip_ws()
    if peek() == ']' then
      consume(1)
      return arr
    end
    while true do
      skip_ws()
      local val, err = parse_value()
      if err then return nil, err end
      table.insert(arr, val)
      skip_ws()
      local c = peek()
      if c == ']' then
        consume(1)
        return arr
      elseif c == ',' then
        consume(1)
      else
        return nil, "expected ',' or ']' in array at pos " .. pos
      end
    end
  end

  local function parse_object()
    consume(1) -- '{'
    local obj = {}
    skip_ws()
    if peek() == '}' then
      consume(1)
      return obj
    end
    while true do
      skip_ws()
      if peek() ~= '"' then
        return nil, "expected string key in object at pos " .. pos
      end
      local key, err = parse_string()
      if err then return nil, err end
      skip_ws()
      if peek() ~= ':' then
        return nil, "expected ':' after key at pos " .. pos
      end
      consume(1)
      skip_ws()
      local val
      val, err = parse_value()
      if err then return nil, err end
      obj[key] = val
      skip_ws()
      local c = peek()
      if c == '}' then
        consume(1)
        return obj
      elseif c == ',' then
        consume(1)
      else
        return nil, "expected ',' or '}' in object at pos " .. pos
      end
    end
  end

  parse_value = function()
    skip_ws()
    local c = peek()
    if c == '"' then
      return parse_string()
    elseif c == '{' then
      return parse_object()
    elseif c == '[' then
      return parse_array()
    elseif c == 't' then
      if expect("true") then return true end
      return nil, "invalid token at pos " .. pos
    elseif c == 'f' then
      if expect("false") then return false end
      return nil, "invalid token at pos " .. pos
    elseif c == 'n' then
      if expect("null") then return nil end
      return nil, "invalid token at pos " .. pos
    elseif c == '-' or c:match('%d') then
      return parse_number()
    else
      return nil, "unexpected character '" .. c .. "' at pos " .. pos
    end
  end

  -- Wrap in pcall so any internal error becomes a nil+message return.
  local ok, result, err = pcall(function()
    local v, e = parse_value()
    return v, e
  end)

  if not ok then
    return nil, tostring(result)
  end

  if err then
    return nil, err
  end

  -- Check for trailing garbage.
  skip_ws()
  if pos <= len then
    return nil, "unexpected trailing content at pos " .. pos
  end

  return result
end

return M
