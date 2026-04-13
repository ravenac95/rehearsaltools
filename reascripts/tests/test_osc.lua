-- tests/test_osc.lua
-- Tests for src/osc.lua.
-- Run via: lua tests/test_runner.lua  (from the reascripts/ directory)

local osc = dofile("src/osc.lua")

-- ── encode: address padding ──────────────────────────────────────────────────

describe("osc.encode address padding", function()

  it("pads 4-char address (/abc) to 8 bytes (+null+pad)", function()
    -- "/abc\0\0\0\0" = 4 chars + 1 null + 3 pad = 8 bytes
    -- plus ",\0\0\0" type tag = 4 bytes; total 12
    local b = osc.encode("/abc", {})
    assert_eq(#b, 12)
    assert_eq(b:sub(1, 8), "/abc\0\0\0\0")
  end)

  it("pads 8-char address with a full 4 nulls", function()
    -- "/abcdefg" = 8 chars; needs null + 3 pad = 4 bytes → total 12
    local b = osc.encode("/abcdefg", {})
    assert_eq(b:sub(1, 12), "/abcdefg\0\0\0\0")
  end)

  it("requires leading slash", function()
    assert_error(function() osc.encode("bad", {}) end, "must be a string starting with '/'")
  end)

end)

-- ── encode: type tag ────────────────────────────────────────────────────────

describe("osc.encode type tag", function()

  it("empty args produces ',' tag padded to 4 bytes", function()
    local b = osc.encode("/x", {})
    -- "/x\0\0" + ",\0\0\0" = 8 bytes
    assert_eq(#b, 8)
    assert_eq(b:sub(5, 8), ",\0\0\0")
  end)

  it("single string arg produces ',s' tag", function()
    local b = osc.encode("/x", {{type = "s", value = "hi"}})
    -- address: "/x\0\0" (4)
    -- tag:     ",s\0\0" (4)
    -- string:  "hi\0\0" (4)
    assert_eq(#b, 12)
    assert_eq(b:sub(5, 8), ",s\0\0")
  end)

  it("s + i tag is ',si' padded to 4", function()
    local b = osc.encode("/x", {
      {type = "s", value = "hi"},
      {type = "i", value = 7},
    })
    assert_eq(b:sub(5, 8), ",si\0")
  end)

end)

-- ── encode: args ─────────────────────────────────────────────────────────────

describe("osc.encode args", function()

  it("encodes int32 big-endian", function()
    local b = osc.encode("/x", {{type = "i", value = 1}})
    -- last 4 bytes: 00 00 00 01
    assert_eq(b:sub(-4), "\0\0\0\1")
  end)

  it("encodes negative int32", function()
    local b = osc.encode("/x", {{type = "i", value = -1}})
    assert_eq(b:sub(-4), "\255\255\255\255")
  end)

  it("encodes float32", function()
    local b = osc.encode("/x", {{type = "f", value = 1.0}})
    -- 1.0 in IEEE-754 big-endian = 0x3f800000
    assert_eq(b:sub(-4), "\x3f\x80\x00\x00")
  end)

  it("rejects non-integer for type=i", function()
    assert_error(function()
      osc.encode("/x", {{type = "i", value = 1.5}})
    end, "requires integer")
  end)

  it("rejects non-string for type=s", function()
    assert_error(function()
      osc.encode("/x", {{type = "s", value = 42}})
    end, "requires string")
  end)

  it("rejects unsupported type", function()
    assert_error(function()
      osc.encode("/x", {{type = "b", value = "x"}})
    end, "unsupported")
  end)

end)

-- ── decode ───────────────────────────────────────────────────────────────────

describe("osc.decode", function()

  it("decodes address with no args", function()
    local msg = osc.decode("/ping\0\0\0,\0\0\0")
    assert_eq(msg.address, "/ping")
    assert_eq(#msg.args, 0)
  end)

  it("decodes single string arg", function()
    local b = osc.encode("/x", {{type = "s", value = "hello"}})
    local msg = osc.decode(b)
    assert_eq(msg.address, "/x")
    assert_eq(msg.args[1], "hello")
  end)

  it("decodes single int arg", function()
    local b = osc.encode("/x", {{type = "i", value = 12345}})
    local msg = osc.decode(b)
    assert_eq(msg.args[1], 12345)
  end)

  it("decodes single float arg and preserves value", function()
    local b = osc.encode("/x", {{type = "f", value = 440.0}})
    local msg = osc.decode(b)
    assert_true(math.abs(msg.args[1] - 440.0) < 1e-5)
  end)

  it("decodes mixed s + i + f", function()
    local b = osc.encode("/x", {
      {type = "s", value = "abc"},
      {type = "i", value = -7},
      {type = "f", value = 2.5},
    })
    local msg = osc.decode(b)
    assert_eq(msg.address,   "/x")
    assert_eq(msg.args[1],   "abc")
    assert_eq(msg.args[2],   -7)
    assert_true(math.abs(msg.args[3] - 2.5) < 1e-5)
  end)

  it("returns nil+error on bundle", function()
    local msg, err = osc.decode("#bundle\0")
    assert_nil(msg)
    assert_not_nil(err)
  end)

  it("returns nil+error on empty buffer", function()
    local msg, err = osc.decode("")
    assert_nil(msg)
    assert_not_nil(err)
  end)

  it("returns nil+error on missing type tag", function()
    -- address with no type-tag-string
    local msg, err = osc.decode("/x\0\0")
    assert_nil(msg)
    assert_not_nil(err)
  end)

end)

-- ── round-trip ───────────────────────────────────────────────────────────────

describe("osc round-trip", function()

  it("round-trips an empty message", function()
    local b = osc.encode("/rt/ping", {})
    local msg = osc.decode(b)
    assert_eq(msg.address, "/rt/ping")
    assert_eq(#msg.args, 0)
  end)

  it("round-trips a JSON-payload message", function()
    local json_payload = '{"bpm":120,"num":4,"denom":4}'
    local b = osc.encode("/rt/songform/write", {{type = "s", value = json_payload}})
    local msg = osc.decode(b)
    assert_eq(msg.address, "/rt/songform/write")
    assert_eq(msg.args[1], json_payload)
  end)

  it("round-trips a string whose length is a multiple of 4", function()
    local s = "1234"  -- 4 bytes; needs +4 padding (null + 3 pad)
    local b = osc.encode("/x", {{type = "s", value = s}})
    local msg = osc.decode(b)
    assert_eq(msg.args[1], s)
  end)

  it("round-trips a 7-byte string", function()
    local s = "seven!!"  -- 7 bytes → padded to 8
    local b = osc.encode("/x", {{type = "s", value = s}})
    local msg = osc.decode(b)
    assert_eq(msg.args[1], s)
  end)

end)
