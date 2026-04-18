-- tests/test_payload.lua
-- Tests for src/payload.lua

local payload = dofile("src/payload.lua")

-- ── Helper: build a fake get_action_context that returns the given OSC arg
--    as the 7th value of a 7-value tuple.
local function make_ctx(osc_arg)
  return function()
    return nil, nil, nil, nil, nil, nil, osc_arg
  end
end

-- ── Tests ────────────────────────────────────────────────────────────────────

describe("payload.read", function()

  it("empty string arg returns {} with no error", function()
    local data, err = payload.read(make_ctx(""))
    assert_nil(err)
    assert_not_nil(data)
    assert_eq(type(data), "table")
    -- Should be empty table
    local count = 0
    for _ in pairs(data) do count = count + 1 end
    assert_eq(count, 0)
  end)

  it("nil arg returns {} with no error", function()
    local data, err = payload.read(make_ctx(nil))
    assert_nil(err)
    assert_not_nil(data)
    assert_eq(type(data), "table")
  end)

  it("valid JSON object returns parsed table", function()
    local data, err = payload.read(make_ctx('{"name":"intro"}'))
    assert_nil(err)
    assert_not_nil(data)
    assert_eq(data.name, "intro")
  end)

  it("valid JSON with multiple fields parses correctly", function()
    local data, err = payload.read(make_ctx('{"id":42,"startTime":10.5}'))
    assert_nil(err)
    assert_eq(data.id, 42)
    assert_eq(data.startTime, 10.5)
  end)

  it("malformed JSON returns nil and parse error", function()
    local data, err = payload.read(make_ctx('{bad json'))
    assert_nil(data)
    assert_not_nil(err)
    assert_true(err:find("parse error") ~= nil)
  end)

  it("injected context fn receives no args and returns OSC string at index 7", function()
    local called_with_args = {}
    local ctx_fn = function(...)
      called_with_args = {...}
      return nil, nil, nil, nil, nil, nil, '{"test":true}'
    end
    local data, err = payload.read(ctx_fn)
    assert_nil(err)
    assert_eq(data.test, true)
    -- context fn should be called with no arguments
    assert_eq(#called_with_args, 0)
  end)

end)
