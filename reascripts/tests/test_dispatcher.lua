-- tests/test_dispatcher.lua
-- Tests for src/dispatcher.lua.

local dispatcher = dofile("src/dispatcher.lua")
local json       = dofile("src/json.lua")

local function make_capture()
  local sent = {}
  return sent, function(addr, payload) table.insert(sent, {addr = addr, payload = payload}) end
end

describe("dispatcher routing", function()
  it("invokes the matching handler", function()
    local called = {}
    local routes = {
      ["/rt/foo"] = function(p) called.payload = p; return {ok = 1} end,
    }
    local sent, send = make_capture()
    local d = dispatcher.new(routes, send)
    d.dispatch({
      address = "/rt/foo",
      args = {json.encode({_reqId = "abc", x = 1})},
    })
    assert_eq(called.payload.x, 1)
    assert_eq(#sent, 1)
    assert_eq(sent[1].addr, "/rt/reply/abc")
    local r = json.decode(sent[1].payload)
    assert_true(r.ok); assert_eq(r.data.ok, 1)
  end)

  it("replies with ok=false on unknown route", function()
    local sent, send = make_capture()
    local d = dispatcher.new({}, send)
    d.dispatch({
      address = "/rt/missing",
      args = {json.encode({_reqId = "z"})},
    })
    local r = json.decode(sent[1].payload)
    assert_false(r.ok)
    assert_true(r.error:find("no route"))
  end)

  it("replies with ok=false when handler returns nil, err", function()
    local routes = {["/rt/x"] = function() return nil, "bad" end}
    local sent, send = make_capture()
    local d = dispatcher.new(routes, send)
    d.dispatch({address = "/rt/x", args = {json.encode({_reqId = "q"})}})
    local r = json.decode(sent[1].payload)
    assert_false(r.ok)
    assert_eq(r.error, "bad")
  end)

  it("replies with ok=false when handler raises", function()
    local routes = {["/rt/x"] = function() error("boom") end}
    local sent, send = make_capture()
    local d = dispatcher.new(routes, send)
    d.dispatch({address = "/rt/x", args = {json.encode({_reqId = "q"})}})
    local r = json.decode(sent[1].payload)
    assert_false(r.ok)
    assert_true(r.error:find("handler raised"))
    assert_true(r.error:find("boom"))
  end)

  it("suppresses reply when _reqId is missing", function()
    local routes = {["/rt/x"] = function() return {ok = true} end}
    local sent, send = make_capture()
    local d = dispatcher.new(routes, send)
    d.dispatch({address = "/rt/x", args = {json.encode({})}})
    assert_eq(#sent, 0)
  end)

  it("handles messages with no args (empty payload)", function()
    local called = false
    local routes = {["/rt/x"] = function(p) called = true; return {ok = true} end}
    local _, send = make_capture()
    local d = dispatcher.new(routes, send)
    d.dispatch({address = "/rt/x", args = {}})
    assert_true(called)
  end)

  it("emit(event, data) sends on /rt/event<path>", function()
    local sent, send = make_capture()
    local d = dispatcher.new({}, send)
    d.emit("/transport", {playing = true})
    assert_eq(sent[1].addr, "/rt/event/transport")
    local payload = json.decode(sent[1].payload)
    assert_eq(payload.event, "/transport")
    assert_eq(payload.data.playing, true)
  end)
end)
