-- src/dispatch.lua
-- Command-multiplexer for the single /rehearsaltools OSC endpoint.
-- Takes a parsed JSON payload whose `command` field names one of the 9
-- supported operations; routes the rest of the payload to the matching
-- handler from src/handlers/*.lua.

local M = {}

local function strip_command(p)
  local out = {}
  for k, v in pairs(p) do
    if k ~= "command" then out[k] = v end
  end
  return out
end

--- Route `payload.command` to the matching handler in `handlers`.
--- `handlers` must be a table with keys:
---   project, tempo, timesig, mixdown, songform, regions
--- Each holds a module-style table with a `new(adapter)` factory.
--- Returns whatever the handler returns, or (nil, err) on routing failure.
function M.dispatch(adapter, payload, handlers)
  if type(payload) ~= "table" then
    return nil, "payload must be a table"
  end
  local command = payload.command
  if type(command) ~= "string" then
    return nil, "missing or invalid 'command' field"
  end

  local args = strip_command(payload)

  if command == "project.new"     then return handlers.project.new(adapter)(args)            end
  if command == "tempo"           then return handlers.tempo.new(adapter)(args)              end
  if command == "timesig"         then return handlers.timesig.new(adapter)(args)            end
  if command == "mixdown.all"     then return handlers.mixdown.new(adapter)(args)            end
  if command == "songform.write"  then return handlers.songform.new(adapter)(args)           end
  if command == "region.new"      then return handlers.regions.new(adapter).new(args)        end
  if command == "region.rename"   then return handlers.regions.new(adapter).rename(args)     end
  if command == "region.play"     then return handlers.regions.new(adapter).play(args)       end
  if command == "playhead.end"    then return handlers.regions.new(adapter).seek_to_end(args) end

  return nil, "unknown command: " .. command
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
