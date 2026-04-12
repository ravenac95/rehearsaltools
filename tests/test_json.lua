-- tests/test_json.lua
-- Tests for src/json.lua — written BEFORE implementation (TDD).
-- Run via: lua tests/test_runner.lua

local json = dofile("src/json.lua")

describe("json.encode", function()

  it("encodes nil as null", function()
    assert_eq(json.encode(nil), "null")
  end)

  it("encodes true", function()
    assert_eq(json.encode(true), "true")
  end)

  it("encodes false", function()
    assert_eq(json.encode(false), "false")
  end)

  it("encodes integer", function()
    assert_eq(json.encode(42), "42")
  end)

  it("encodes negative integer", function()
    assert_eq(json.encode(-7), "-7")
  end)

  it("encodes float (parseable as 3.14)", function()
    local s = json.encode(3.14)
    local n = tonumber(s)
    assert_not_nil(n, "encode(3.14) should produce a parseable number string")
    assert_true(math.abs(n - 3.14) < 1e-9, "parsed value should be ~3.14, got " .. tostring(n))
  end)

  it("encodes empty string", function()
    assert_eq(json.encode(""), '""')
  end)

  it("encodes string with quotes", function()
    assert_eq(json.encode('say "hi"'), '"say \\"hi\\""')
  end)

  it("encodes string with newline", function()
    assert_eq(json.encode("a\nb"), '"a\\nb"')
  end)

  it("encodes string with backslash", function()
    assert_eq(json.encode("a\\b"), '"a\\\\b"')
  end)

  it("encodes string with tab", function()
    assert_eq(json.encode("a\tb"), '"a\\tb"')
  end)

  it("encodes string with carriage return", function()
    assert_eq(json.encode("a\rb"), '"a\\rb"')
  end)

  it("encodes array", function()
    assert_eq(json.encode({1, 2, 3}), "[1,2,3]")
  end)

  it("encodes nested object", function()
    assert_eq(json.encode({x = {y = true}}), '{"x":{"y":true}}')
  end)

  it("encodes object with sorted keys (deterministic)", function()
    local s = json.encode({a = 1, b = 2})
    assert_eq(s, '{"a":1,"b":2}')
  end)

  it("encodes empty table as array []", function()
    -- empty table is ambiguous; we document it encodes as []
    local s = json.encode({})
    assert_true(s == "[]" or s == "{}", "empty table should encode as [] or {}")
  end)

  it("raises error on circular reference", function()
    local t = {}
    t.self = t
    assert_error(function() json.encode(t) end, "circular")
  end)

  it("raises error on function value", function()
    assert_error(function() json.encode(function() end) end)
  end)

end)

describe("json.decode", function()

  it("decodes null to nil", function()
    local val, err = json.decode("null")
    assert_nil(err, "should have no error")
    assert_nil(val, "null should decode to nil")
  end)

  it("decodes true", function()
    local val = json.decode("true")
    assert_eq(val, true)
  end)

  it("decodes false", function()
    local val = json.decode("false")
    assert_eq(val, false)
  end)

  it("decodes integer", function()
    assert_eq(json.decode("42"), 42)
  end)

  it("decodes negative integer", function()
    assert_eq(json.decode("-7"), -7)
  end)

  it("decodes float", function()
    local v = json.decode("3.14")
    assert_true(math.abs(v - 3.14) < 1e-9, "float decode mismatch")
  end)

  it("decodes string", function()
    assert_eq(json.decode('"hello"'), "hello")
  end)

  it("decodes escaped quote", function()
    assert_eq(json.decode('"say \\"hi\\""'), 'say "hi"')
  end)

  it("decodes escaped newline", function()
    assert_eq(json.decode('"a\\nb"'), "a\nb")
  end)

  it("decodes escaped tab", function()
    assert_eq(json.decode('"a\\tb"'), "a\tb")
  end)

  it("decodes escaped backslash", function()
    assert_eq(json.decode('"a\\\\b"'), "a\\b")
  end)

  it("decodes unicode escape \\u0041 -> A", function()
    assert_eq(json.decode('"\\u0041"'), "A")
  end)

  it("decodes unicode escape \\u0000 -> null byte", function()
    assert_eq(json.decode('"\\u0000"'), "\0")
  end)

  it("decodes array", function()
    local t = json.decode("[1,2,3]")
    assert_eq(t, {1, 2, 3})
  end)

  it("decodes object", function()
    local t = json.decode('{"a":1}')
    assert_eq(t, {a = 1})
  end)

  it("decodes nested structure", function()
    local t = json.decode('{"x":{"y":true}}')
    assert_eq(t, {x = {y = true}})
  end)

  it("decodes with surrounding whitespace", function()
    local t = json.decode('  { "a" : 1 }  ')
    assert_eq(t, {a = 1})
  end)

  it("returns nil+error on malformed JSON (bad token)", function()
    local val, err = json.decode("{bad}")
    assert_nil(val, "malformed should return nil value")
    assert_not_nil(err, "malformed should return error message")
  end)

  it("returns nil+error on truncated JSON", function()
    local val, err = json.decode('{"a":')
    assert_nil(val)
    assert_not_nil(err)
  end)

  it("returns nil+error on empty string", function()
    local val, err = json.decode("")
    assert_nil(val)
    assert_not_nil(err)
  end)

  it("does NOT raise on malformed JSON (safe return)", function()
    local ok = pcall(function()
      json.decode("{bad}")
    end)
    assert_true(ok, "json.decode should not raise on bad input")
  end)

end)

describe("json round-trip", function()

  it("encode then decode round-trips a number", function()
    local orig = 12345
    local decoded = json.decode(json.encode(orig))
    assert_eq(decoded, orig)
  end)

  it("encode then decode round-trips a string", function()
    local orig = 'hello "world"\nbye'
    local decoded = json.decode(json.encode(orig))
    assert_eq(decoded, orig)
  end)

  it("encode then decode round-trips a nested table", function()
    local orig = {a = 1, b = {c = true, d = "test"}}
    local decoded = json.decode(json.encode(orig))
    assert_eq(decoded, orig)
  end)

  it("decode then encode round-trips a JSON string", function()
    local s = '{"bpm":120,"ok":true}'
    local decoded = json.decode(s)
    local re_encoded = json.encode(decoded)
    -- re-decode to compare (key order may differ from original string but values same)
    local re_decoded = json.decode(re_encoded)
    assert_eq(re_decoded, decoded)
  end)

end)
