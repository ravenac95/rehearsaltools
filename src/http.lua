-- src/http.lua
-- Pure-Lua HTTP/1.0 request parser and response builder.
-- No dependencies on REAPER APIs or socket libraries.

local json = dofile and dofile("src/json.lua") or require("json")

local M = {}

-- ─────────────────────────────────────────────────────────────────────────────
-- Status phrases
-- ─────────────────────────────────────────────────────────────────────────────

local STATUS_PHRASES = {
  [200] = "OK",
  [400] = "Bad Request",
  [404] = "Not Found",
  [405] = "Method Not Allowed",
  [500] = "Internal Server Error",
}

-- ─────────────────────────────────────────────────────────────────────────────
-- parse_request
-- ─────────────────────────────────────────────────────────────────────────────

--- Split a string on a literal separator, returning a list of substrings.
local function split(s, sep)
  local parts = {}
  local pattern = "([^" .. sep:gsub(".", function(c)
    return c:find("[%^%]%-%%]") and "%" .. c or c
  end) .. "]*)" .. sep:gsub(".", function(c)
    return c:find("[%^%]%-%%]") and "%" .. c or c
  end) .. "?"
  -- Simpler approach: use gmatch with plain separator.
  -- We'll use a manual loop.
  local start = 1
  while true do
    local found = s:find(sep, start, true)
    if found then
      table.insert(parts, s:sub(start, found - 1))
      start = found + #sep
    else
      table.insert(parts, s:sub(start))
      break
    end
  end
  return parts
end

--- Normalise line endings to \n then split on \n.
local function split_lines(s)
  local normalised = s:gsub("\r\n", "\n"):gsub("\r", "\n")
  return split(normalised, "\n")
end

--- Parse a raw HTTP request string.
--- Returns a request table on success, or nil, error_message on failure.
function M.parse_request(raw)
  if type(raw) ~= "string" or #raw == 0 then
    return nil, "empty or nil request"
  end

  -- Normalise line endings.
  local normalised = raw:gsub("\r\n", "\n"):gsub("\r", "\n")

  -- Split headers from body on blank line.
  local header_part, body_part
  local sep_pos = normalised:find("\n\n", 1, true)
  if sep_pos then
    header_part = normalised:sub(1, sep_pos - 1)
    body_part   = normalised:sub(sep_pos + 2)
  else
    header_part = normalised
    body_part   = ""
  end

  local lines = split(header_part, "\n")

  -- First line: request line.
  local request_line = lines[1]
  if not request_line or request_line == "" then
    return nil, "missing request line"
  end

  local method, raw_path, http_ver = request_line:match("^(%S+)%s+(%S+)%s+(%S+)$")
  if not method then
    return nil, "malformed request line: " .. request_line
  end

  -- Parse path and query string.
  local path, query = raw_path:match("^([^?]*)%??(.*)")
  if not path or path == "" then
    path = "/"
    query = ""
  end

  -- Split path into parts (drop leading empty segment from leading '/').
  local raw_parts = split(path:sub(2), "/") -- sub(2) drops the leading /
  local path_parts = {}
  for _, p in ipairs(raw_parts) do
    if p ~= "" then
      table.insert(path_parts, p)
    end
  end

  -- Parse headers (lines[2] onwards).
  local headers = {}
  local content_length = 0
  for i = 2, #lines do
    local line = lines[i]
    if line and line ~= "" then
      local name, value = line:match("^([^:]+):%s*(.*)")
      if name then
        local lower_name = name:lower()
        headers[lower_name] = value
        if lower_name == "content-length" then
          content_length = tonumber(value) or 0
        end
      end
    end
  end

  return {
    method         = method:upper(),
    path           = path,
    path_parts     = path_parts,
    query          = query or "",
    headers        = headers,
    body           = body_part,
    content_length = content_length,
  }
end

-- ─────────────────────────────────────────────────────────────────────────────
-- build_response
-- ─────────────────────────────────────────────────────────────────────────────

--- Build a raw HTTP/1.0 response string.
--- @param status_code  integer
--- @param body_string  string
--- @param extra_headers  optional table of {name=value}
function M.build_response(status_code, body_string, extra_headers)
  body_string = body_string or ""
  local phrase = STATUS_PHRASES[status_code] or "Unknown"

  local lines = {
    string.format("HTTP/1.0 %d %s", status_code, phrase),
    "Content-Type: application/json",
    "Content-Length: " .. #body_string,
    "Connection: close",
  }

  if extra_headers then
    for name, value in pairs(extra_headers) do
      table.insert(lines, name .. ": " .. tostring(value))
    end
  end

  table.insert(lines, "")  -- blank line
  table.insert(lines, body_string)

  return table.concat(lines, "\r\n")
end

-- ─────────────────────────────────────────────────────────────────────────────
-- json_response
-- ─────────────────────────────────────────────────────────────────────────────

--- Convenience wrapper: encodes lua_table with json.encode, then builds response.
function M.json_response(status_code, lua_table, extra_headers)
  local body = json.encode(lua_table)
  return M.build_response(status_code, body, extra_headers)
end

-- ─────────────────────────────────────────────────────────────────────────────
-- route
-- ─────────────────────────────────────────────────────────────────────────────

--- Match path_parts against a route pattern string like "/track/:n/mute".
--- Returns a params table on match, or nil on no match.
local function match_pattern(path_parts, pattern_str)
  -- Split pattern into segments, skipping leading /.
  local pattern_parts = {}
  local raw = pattern_str:sub(2) -- drop leading /
  for part in (raw .. "/"):gmatch("([^/]*)/") do
    if part ~= "" then
      table.insert(pattern_parts, part)
    end
  end

  if #path_parts ~= #pattern_parts then
    return nil
  end

  local params = {}
  for i, pp in ipairs(pattern_parts) do
    if pp:sub(1, 1) == ":" then
      -- Named capture.
      params[pp:sub(2)] = path_parts[i]
    elseif pp ~= path_parts[i] then
      return nil
    end
  end
  return params
end

--- Match a parsed request against a routes table.
--- routes_table entries: {method, pattern, handler}
--- Returns handler_fn, params_table or nil, nil.
function M.route(request, routes_table)
  for _, entry in ipairs(routes_table) do
    local method, pattern, handler = entry[1], entry[2], entry[3]
    if method:upper() == request.method:upper() then
      local params = match_pattern(request.path_parts, pattern)
      if params then
        return handler, params
      end
    end
  end
  return nil, nil
end

return M
