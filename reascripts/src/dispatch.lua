-- src/dispatch.lua
-- Command-multiplexer for the single /rehearsaltools OSC endpoint.
-- Takes a parsed JSON payload whose `command` field names one of the 9
-- supported operations; routes the rest of the payload to the matching
-- handler from src/handlers/*.lua.

local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""

local _ok_json, _json = pcall(dofile, script_dir .. "src/json.lua")
if not _ok_json then _json = nil end

local _logger_module_ok, _module_logger = pcall(dofile, script_dir .. "src/logger.lua")
if not _logger_module_ok then _module_logger = nil end

local M = {}

local function strip_command(p)
  local out = {}
  for k, v in pairs(p) do
    if k ~= "command" then out[k] = v end
  end
  return out
end

local function keys_list(t)
  if type(t) ~= "table" then return tostring(t) end
  local ks = {}
  for k in pairs(t) do table.insert(ks, tostring(k)) end
  table.sort(ks)
  return table.concat(ks, ", ")
end

local function encode_payload(t)
  if _json and type(t) == "table" then
    local ok, s = pcall(_json.encode, t)
    if ok then return s end
  end
  return tostring(t)
end

--- Route `payload.command` to the matching handler in `handlers`.
--- `handlers` must be a table with keys:
---   project, tempo, timesig, mixdown, songform, regions
--- Each holds a module-style table with a `new(adapter)` factory.
--- Returns whatever the handler returns, or (nil, err) on routing failure.
--- `logger` is optional — defaults to a no-op stub.
function M.dispatch(adapter, payload, handlers, logger)
  logger = logger or _module_logger or {
    info  = function() end,
    debug = function() end,
    error = function() end,
    dump  = function() end,
  }

  if type(payload) ~= "table" then
    return nil, "payload must be a table"
  end
  local command = payload.command
  if type(command) ~= "string" then
    return nil, "missing or invalid 'command' field"
  end

  local args = strip_command(payload)

  -- Entry log (after command is confirmed to be a string)
  logger.info("dispatch: command=%s", command)
  logger.debug("dispatch: payload keys={%s}", keys_list(args))

  if command == "set_log_enabled" then
    local enabled = args.enabled == true or args.enabled == "true" or args.enabled == "1"
    -- Log the toggle BEFORE changing the state, so the message appears if
    -- logging was already enabled going in.
    logger.info("dispatch: logging %s via set_log_enabled",
                enabled and "enabled" or "disabled")
    if _module_logger then
      _module_logger.set_enabled(enabled)
    elseif reaper and reaper.SetExtState then
      reaper.SetExtState("rehearsaltools", "log_enabled", enabled and "1" or "", true)
    end
    return {ok = true, enabled = enabled}
  end

  if command == "project.new" then
    local result, herr = handlers.project.new(adapter)(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "tempo" then
    local result, herr = handlers.tempo.new(adapter)(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "timesig" then
    local result, herr = handlers.timesig.new(adapter)(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "mixdown.all" then
    local result, herr = handlers.mixdown.new(adapter)(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "songform.write" then
    local result, herr = handlers.songform.new(adapter)(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "region.new" then
    local result, herr = handlers.regions.new(adapter).new(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result=(nil)")
    return result
  end

  if command == "region.rename" then
    local result, herr = handlers.regions.new(adapter).rename(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result=(nil)")
    return result
  end

  if command == "region.play" then
    local result, herr = handlers.regions.new(adapter).play(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result keys={%s}", keys_list(result))
    return result
  end

  if command == "playhead.end" then
    local result, herr = handlers.regions.new(adapter).seek_to_end(args)
    if herr then
      logger.error("dispatch: handler error=%s | payload=%s", tostring(herr), encode_payload(payload))
      return result, herr
    end
    logger.debug("dispatch: result=(nil)")
    return result
  end

  local err_msg = "unknown command: " .. command
  logger.error("dispatch: %s | payload=%s", err_msg, encode_payload(payload))
  return nil, err_msg
end

--- Convenience entry point used by rehearsaltools.lua: loads the six handler
--- modules from `repo_root .. "src/handlers/*.lua"`, then delegates.
function M.run(adapter, payload, repo_root)
  local handlers = {
    project  = dofile(repo_root .. "src/handlers/project.lua"),
    regions  = dofile(repo_root .. "src/handlers/regions.lua"),
    tempo    = dofile(repo_root .. "src/handlers/tempo.lua"),
    timesig  = dofile(repo_root .. "src/handlers/timesig.lua"),
    mixdown  = dofile(repo_root .. "src/handlers/mixdown.lua"),
    songform = dofile(repo_root .. "src/handlers/songform.lua"),
  }
  return M.dispatch(adapter, payload, handlers)
end

return M
