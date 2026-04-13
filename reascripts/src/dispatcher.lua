-- src/dispatcher.lua
-- Maps an incoming OSC address to a handler function, invokes it with the
-- JSON-decoded payload, and returns a reply message.
--
-- Handlers are plain functions: (payload_table) → (response_table)
--                                             or (nil, error_message)
--
-- Request protocol: messages carry a single string arg whose content is JSON.
-- That JSON must have a top-level "_reqId" string for reply correlation, plus
-- any handler-specific fields. If no "_reqId" is provided, no reply is sent.
--
-- Reply protocol: an OSC message sent to the server on
--   /rt/reply/<reqId>
-- carrying a single JSON string arg with shape:
--   {"ok": true,  "data": {...}}
--   {"ok": false, "error": "message"}

local json = dofile("src/json.lua")

local M = {}

--- Create a new dispatcher.
---   routes: { ["/rt/path"] = function(payload) ... end }
---   send:   function(address, json_string) — transport-layer sender
--- Returns a dispatcher object with .dispatch(osc_message).
function M.new(routes, send)
  assert(type(routes) == "table", "routes must be a table")
  assert(type(send) == "function", "send must be a function")

  local self = {}

  local function reply(req_id, payload)
    if not req_id then return end
    local ok, encoded = pcall(json.encode, payload)
    if not ok then
      encoded = json.encode({ok = false, error = "failed to encode reply: " .. tostring(encoded)})
    end
    send("/rt/reply/" .. req_id, encoded)
  end

  --- Dispatch one decoded OSC message.
  function self.dispatch(msg)
    local handler = routes[msg.address]

    -- Extract payload (always the first string arg, if any).
    local payload = {}
    local req_id  = nil
    if msg.args and msg.args[1] and type(msg.args[1]) == "string" then
      local decoded, err = json.decode(msg.args[1])
      if decoded == nil and err then
        reply(nil, {ok = false, error = "invalid JSON: " .. err})
        return
      elseif decoded ~= nil then
        payload = decoded
        req_id = payload._reqId
        payload._reqId = nil
      end
    end

    if not handler then
      reply(req_id, {ok = false, error = "no route: " .. msg.address})
      return
    end

    local ok, data, err = pcall(handler, payload)
    if not ok then
      reply(req_id, {ok = false, error = "handler raised: " .. tostring(data)})
    elseif data == nil and err then
      reply(req_id, {ok = false, error = err})
    else
      reply(req_id, {ok = true, data = data})
    end
  end

  --- Emit a server-push event (no req id, no reply expected).
  function self.emit(event_path, data)
    local encoded = json.encode({event = event_path, data = data})
    send("/rt/event" .. event_path, encoded)
  end

  return self
end

return M
