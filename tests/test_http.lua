-- tests/test_http.lua
-- Tests for src/http.lua — written BEFORE implementation (TDD).
-- Run via: lua tests/test_runner.lua

local http = dofile("src/http.lua")
local json = dofile("src/json.lua")

-- ─────────────────────────────────────────────────────────────────────────────
-- parse_request
-- ─────────────────────────────────────────────────────────────────────────────

describe("http.parse_request", function()

  it("parses minimal GET request", function()
    local req = http.parse_request("GET /status HTTP/1.0\r\n\r\n")
    assert_not_nil(req)
    assert_eq(req.method, "GET")
    assert_eq(req.path,   "/status")
    assert_eq(req.body,   "")
    assert_eq(req.query,  "")
    assert_eq(req.content_length, 0)
  end)

  it("parses POST request with JSON body", function()
    local body = '{"bpm":120}'
    local raw = "POST /tempo HTTP/1.0\r\n" ..
                "Content-Type: application/json\r\n" ..
                "Content-Length: " .. #body .. "\r\n" ..
                "\r\n" .. body
    local req = http.parse_request(raw)
    assert_not_nil(req)
    assert_eq(req.method, "POST")
    assert_eq(req.path,   "/tempo")
    assert_eq(req.body,   body)
    assert_eq(req.content_length, #body)
  end)

  it("lowercases header names", function()
    local raw = "GET /x HTTP/1.0\r\nContent-Type: application/json\r\n\r\n"
    local req = http.parse_request(raw)
    assert_not_nil(req.headers["content-type"])
    assert_eq(req.headers["content-type"], "application/json")
  end)

  it("populates path_parts correctly", function()
    local req = http.parse_request("GET /track/2/mute HTTP/1.0\r\n\r\n")
    assert_not_nil(req)
    assert_eq(req.path_parts, {"track", "2", "mute"})
  end)

  it("strips query string from path", function()
    local req = http.parse_request("GET /status?foo=bar HTTP/1.0\r\n\r\n")
    assert_not_nil(req)
    assert_eq(req.path,  "/status")
    assert_eq(req.query, "foo=bar")
  end)

  it("returns nil+error on empty string", function()
    local req, err = http.parse_request("")
    assert_nil(req)
    assert_not_nil(err)
  end)

  it("returns nil+error on missing request line", function()
    local req, err = http.parse_request("\r\n\r\n")
    assert_nil(req)
    assert_not_nil(err)
  end)

  it("handles LF-only line endings", function()
    local req = http.parse_request("GET /status HTTP/1.0\n\n")
    assert_not_nil(req, "should parse LF-only request")
    assert_eq(req.method, "GET")
    assert_eq(req.path,   "/status")
  end)

  it("parses path with single segment", function()
    local req = http.parse_request("POST /play HTTP/1.0\r\n\r\n")
    assert_eq(req.path_parts, {"play"})
  end)

  it("parses multi-level path session/new", function()
    local req = http.parse_request("POST /session/new HTTP/1.0\r\n\r\n")
    assert_eq(req.path_parts, {"session", "new"})
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- build_response
-- ─────────────────────────────────────────────────────────────────────────────

describe("http.build_response", function()

  it("200 response has correct status line", function()
    local resp = http.build_response(200, "hello")
    assert_true(resp:find("^HTTP/1%.0 200 OK\r\n") ~= nil,
      "should start with HTTP/1.0 200 OK\\r\\n, got: " .. resp:sub(1,40))
  end)

  it("404 response has correct reason phrase", function()
    local resp = http.build_response(404, "")
    assert_true(resp:find("^HTTP/1%.0 404 Not Found\r\n") ~= nil)
  end)

  it("400 response has correct reason phrase", function()
    local resp = http.build_response(400, "")
    assert_true(resp:find("^HTTP/1%.0 400 Bad Request\r\n") ~= nil)
  end)

  it("405 response has correct reason phrase", function()
    local resp = http.build_response(405, "")
    assert_true(resp:find("^HTTP/1%.0 405 Method Not Allowed\r\n") ~= nil)
  end)

  it("500 response has correct reason phrase", function()
    local resp = http.build_response(500, "")
    assert_true(resp:find("^HTTP/1%.0 500 Internal Server Error\r\n") ~= nil)
  end)

  it("Content-Length matches body length", function()
    local body = "hello world"
    local resp = http.build_response(200, body)
    local cl = resp:match("Content%-Length: (%d+)")
    assert_not_nil(cl, "Content-Length header should be present")
    assert_eq(tonumber(cl), #body)
  end)

  it("body appears after double CRLF", function()
    local body = '{"ok":true}'
    local resp = http.build_response(200, body)
    local _, body_start = resp:find("\r\n\r\n", 1, true)
    assert_not_nil(body_start, "should have \\r\\n\\r\\n separator")
    local actual_body = resp:sub(body_start + 1)
    assert_eq(actual_body, body)
  end)

  it("includes Content-Type: application/json", function()
    local resp = http.build_response(200, "{}")
    assert_true(resp:find("Content%-Type: application/json") ~= nil)
  end)

  it("includes Connection: close", function()
    local resp = http.build_response(200, "{}")
    assert_true(resp:find("Connection: close") ~= nil)
  end)

  it("includes extra headers when provided", function()
    local resp = http.build_response(405, "", {["Allow"] = "GET"})
    assert_true(resp:find("Allow: GET") ~= nil)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- json_response
-- ─────────────────────────────────────────────────────────────────────────────

describe("http.json_response", function()

  it("encodes table as JSON body with correct status", function()
    local resp = http.json_response(200, {ok = true})
    assert_true(resp:find("^HTTP/1%.0 200 OK") ~= nil)
    -- Extract body.
    local _, body_start = resp:find("\r\n\r\n", 1, true)
    local body_str = resp:sub(body_start + 1)
    local decoded = json.decode(body_str)
    assert_not_nil(decoded, "body should be valid JSON")
    assert_eq(decoded.ok, true)
  end)

  it("uses Content-Type application/json", function()
    local resp = http.json_response(200, {x = 1})
    assert_true(resp:find("Content%-Type: application/json") ~= nil)
  end)

  it("404 json_response has 404 status", function()
    local resp = http.json_response(404, {error = "not found"})
    assert_true(resp:find("^HTTP/1%.0 404") ~= nil)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- http.route
-- ─────────────────────────────────────────────────────────────────────────────

describe("http.route", function()

  local function fake_handler() return 200, {} end
  local function fake_handler2() return 200, {} end

  local routes = {
    {"GET",  "/status",           fake_handler},
    {"POST", "/play",             fake_handler},
    {"POST", "/track/:n/mute",    fake_handler},
    {"POST", "/track/:n/solo",    fake_handler},
    {"POST", "/track/:n/volume",  fake_handler},
    {"POST", "/session/new",      fake_handler},
  }

  it("matches exact literal path", function()
    local req = http.parse_request("GET /status HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_not_nil(handler, "handler should be found for GET /status")
    assert_eq(handler, fake_handler)
  end)

  it("matches path with :param and extracts value", function()
    local req = http.parse_request("POST /track/3/mute HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_not_nil(handler)
    assert_eq(params.n, "3")
  end)

  it("matches multi-segment path with placeholder", function()
    local req = http.parse_request("POST /track/7/volume HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_not_nil(handler)
    assert_eq(params.n, "7")
  end)

  it("returns nil for unknown path", function()
    local req = http.parse_request("GET /unknown HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_nil(handler)
    assert_nil(params)
  end)

  it("returns nil for correct path but wrong method", function()
    local req = http.parse_request("GET /play HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_nil(handler)
  end)

  it("first-match-wins for duplicate path", function()
    local routes2 = {
      {"GET", "/status", fake_handler},
      {"GET", "/status", fake_handler2},
    }
    local req = http.parse_request("GET /status HTTP/1.0\r\n\r\n")
    local handler = http.route(req, routes2)
    assert_eq(handler, fake_handler)
  end)

  it("matches /session/new (two-segment literal)", function()
    local req = http.parse_request("POST /session/new HTTP/1.0\r\n\r\n")
    local handler, params = http.route(req, routes)
    assert_not_nil(handler)
    assert_eq(handler, fake_handler)
  end)

end)
