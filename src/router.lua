-- src/router.lua
-- Router module: maps incoming HTTP requests to handlers and produces responses.
-- This is the integration point between the HTTP layer and the handler layer.

-- Module loading: use dofile with relative path so tests can run from repo root.
-- In production inside REAPER the package.path is set up by the main script
-- and these will be found via require; here we prefer dofile for portability.
local function load_module(name)
  -- Try to load via dofile (works when run from repo root in tests).
  local path = "src/" .. name .. ".lua"
  local f = io.open(path, "r")
  if f then
    f:close()
    return dofile(path)
  end
  -- Fall back to require (works inside REAPER with package.path set up).
  return require(name)
end

local json     = load_module("json")
local http     = load_module("http")
local handlers = load_module("handlers")

local M = {}

-- ─────────────────────────────────────────────────────────────────────────────
-- Route table
-- ─────────────────────────────────────────────────────────────────────────────

-- Each entry: {method, path_pattern, handler_fn}
local ROUTES = {
  {"GET",  "/status",            handlers.status},
  {"POST", "/play",              handlers.play},
  {"POST", "/stop",              handlers.stop},
  {"POST", "/record",            handlers.record},
  {"POST", "/tempo",             handlers.tempo},
  {"POST", "/timesig",           handlers.timesig},
  {"POST", "/session/new",       handlers.session_new},
  {"POST", "/track/:n/mute",     handlers.track_mute},
  {"POST", "/track/:n/solo",     handlers.track_solo},
  {"POST", "/track/:n/volume",   handlers.track_volume},
}

-- ─────────────────────────────────────────────────────────────────────────────
-- 405 detection helpers
-- ─────────────────────────────────────────────────────────────────────────────

--- Check whether any route matches the path (ignoring method).
--- Returns the method that DOES match, or nil if the path itself is unknown.
local function find_allowed_method(path_parts)
  -- Temporarily fake a request with different methods to see if path matches.
  for _, entry in ipairs(ROUTES) do
    -- Build a synthetic request table for the path-only check.
    local fake = {
      method     = entry[1],
      path_parts = path_parts,
    }
    local _, params = http.route(fake, {{entry[1], entry[2], entry[3]}})
    if params then
      return entry[1]  -- this method+path combination exists
    end
  end
  return nil
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Router factory
-- ─────────────────────────────────────────────────────────────────────────────

function M.new(adapter)
  local router = {}

  --- Handle a raw HTTP request string.
  --- Returns a raw HTTP response string.
  function router.handle(raw_request_string)
    -- 1. Parse request.
    local request, parse_err = http.parse_request(raw_request_string)
    if not request then
      return http.build_response(400, json.encode({error = "malformed request"}))
    end

    -- 2. Route.
    local handler_fn, params = http.route(request, ROUTES)

    if not handler_fn then
      -- Check for 405 vs 404.
      local allowed = find_allowed_method(request.path_parts)
      if allowed then
        local extra = {["Allow"] = allowed}
        return http.build_response(405, json.encode({error = "method not allowed"}), extra)
      else
        return http.build_response(404, json.encode({error = "not found"}))
      end
    end

    -- 3. Call handler (protected).
    local ok, status_code, response_table = pcall(handler_fn, request, adapter, params)
    if not ok then
      -- status_code contains the error message in this case.
      return http.build_response(500, json.encode({error = "internal server error"}))
    end

    -- 4. Encode response and build HTTP response.
    local body = json.encode(response_table)
    return http.build_response(status_code, body)
  end

  return router
end

return M
