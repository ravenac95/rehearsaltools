-- tests/test_validation.lua
-- Tests for src/validation.lua (OSC-dispatcher payloads).

local v = dofile("src/validation.lua")

describe("is_integer / is_power_of_two", function()
  it("is_integer rejects strings", function() assert_false(v.is_integer("3")) end)
  it("is_integer rejects nil",     function() assert_false(v.is_integer(nil)) end)
  it("is_integer accepts 0",       function() assert_true(v.is_integer(0)) end)
  it("is_integer rejects 1.5",     function() assert_false(v.is_integer(1.5)) end)
  it("is_integer accepts 1e3",     function() assert_true(v.is_integer(1e3)) end)

  it("is_power_of_two accepts 1",  function() assert_true(v.is_power_of_two(1)) end)
  it("is_power_of_two accepts 4",  function() assert_true(v.is_power_of_two(4)) end)
  it("is_power_of_two accepts 64", function() assert_true(v.is_power_of_two(64)) end)
  it("is_power_of_two rejects 3",  function() assert_false(v.is_power_of_two(3)) end)
  it("is_power_of_two rejects 128",function() assert_false(v.is_power_of_two(128)) end)
end)

describe("validate_tempo", function()
  it("accepts bpm=120",  function()
    local ok, data = v.validate_tempo({bpm = 120})
    assert_true(ok); assert_eq(data.bpm, 120)
  end)
  it("rejects missing bpm", function()
    local ok, err = v.validate_tempo({})
    assert_false(ok); assert_eq(err, "bpm is required")
  end)
  it("rejects bpm=0",    function()
    local ok = v.validate_tempo({bpm = 0}); assert_false(ok)
  end)
  it("rejects bpm=1000", function()
    local ok = v.validate_tempo({bpm = 1000}); assert_false(ok)
  end)
  it("rejects non-number bpm", function()
    local ok = v.validate_tempo({bpm = "120"}); assert_false(ok)
  end)
end)

describe("validate_timesig", function()
  it("accepts 4/4 no measure", function()
    local ok, data = v.validate_timesig({numerator = 4, denominator = 4})
    assert_true(ok); assert_eq(data.numerator, 4)
  end)
  it("accepts 6/8 measure=3", function()
    local ok, data = v.validate_timesig({numerator = 6, denominator = 8, measure = 3})
    assert_true(ok); assert_eq(data.measure, 3)
  end)
  it("rejects missing numerator", function()
    local ok = v.validate_timesig({denominator = 4}); assert_false(ok)
  end)
  it("rejects non-power-of-2 denominator", function()
    local ok = v.validate_timesig({numerator = 4, denominator = 3}); assert_false(ok)
  end)
  it("rejects measure=0", function()
    local ok = v.validate_timesig({numerator = 4, denominator = 4, measure = 0})
    assert_false(ok)
  end)
end)

describe("validate_region_new", function()
  it("accepts no name (auto-naming)", function()
    local ok, data = v.validate_region_new({})
    assert_true(ok); assert_eq(data.name, "")
  end)
  it("accepts named region", function()
    local ok, data = v.validate_region_new({name = "take 1"})
    assert_true(ok); assert_eq(data.name, "take 1")
  end)
  it("rejects numeric name", function()
    local ok = v.validate_region_new({name = 7}); assert_false(ok)
  end)
end)

describe("validate_region_rename", function()
  it("accepts id + name", function()
    local ok, data = v.validate_region_rename({id = 5, name = "outro"})
    assert_true(ok); assert_eq(data.id, 5); assert_eq(data.name, "outro")
  end)
  it("rejects missing id", function()
    local ok = v.validate_region_rename({name = "x"}); assert_false(ok)
  end)
  it("rejects empty name", function()
    local ok = v.validate_region_rename({id = 1, name = ""}); assert_false(ok)
  end)
end)

describe("validate_mixdown", function()
  it("accepts empty body", function()
    local ok, data = v.validate_mixdown({}); assert_true(ok); assert_nil(data.output_dir)
  end)
  it("accepts output_dir", function()
    local ok, data = v.validate_mixdown({output_dir = "/tmp/foo"})
    assert_true(ok); assert_eq(data.output_dir, "/tmp/foo")
  end)
  it("rejects numeric output_dir", function()
    local ok = v.validate_mixdown({output_dir = 3}); assert_false(ok)
  end)
end)

describe("validate_songform", function()
  it("rejects empty rows", function()
    local ok = v.validate_songform({rows = {}}); assert_false(ok)
  end)
  it("accepts a single-row form", function()
    local ok, data = v.validate_songform({
      rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}},
    })
    assert_true(ok)
    assert_eq(#data.rows, 1)
    assert_eq(data.rows[1].barOffset, 0)
  end)
  it("accepts a multi-row form with monotonic offsets", function()
    local ok = v.validate_songform({
      rows = {
        {barOffset = 0,  num = 4, denom = 4, bpm = 80},
        {barOffset = 8,  num = 6, denom = 8, bpm = 80},
        {barOffset = 12, num = 4, denom = 4, bpm = 90},
      },
    })
    assert_true(ok)
  end)
  it("rejects non-monotonic barOffsets", function()
    local ok = v.validate_songform({
      rows = {
        {barOffset = 0, num = 4, denom = 4, bpm = 80},
        {barOffset = 0, num = 4, denom = 4, bpm = 90},  -- equal → reject
      },
    })
    assert_false(ok)
  end)
  it("accepts optional regionName", function()
    local ok, data = v.validate_songform({
      regionName = "Verse 1",
      rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}},
    })
    assert_true(ok); assert_eq(data.regionName, "Verse 1")
  end)
  it("rejects bad bpm", function()
    local ok = v.validate_songform({
      rows = {{barOffset = 0, num = 4, denom = 4, bpm = 5}},
    })
    assert_false(ok)
  end)
end)
