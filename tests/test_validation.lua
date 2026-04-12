-- tests/test_validation.lua
-- Tests for src/validation.lua — written BEFORE implementation (TDD).
-- Run via: lua tests/test_runner.lua

local v = dofile("src/validation.lua")

-- ─────────────────────────────────────────────────────────────────────────────
-- is_integer helper
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.is_integer", function()

  it("1 is integer", function()
    assert_true(v.is_integer(1))
  end)

  it("42 is integer", function()
    assert_true(v.is_integer(42))
  end)

  it("0 is integer", function()
    assert_true(v.is_integer(0))
  end)

  it("1.5 is not integer", function()
    assert_false(v.is_integer(1.5))
  end)

  it("0.1 is not integer", function()
    assert_false(v.is_integer(0.1))
  end)

  it("non-number returns false", function()
    assert_false(v.is_integer("1"))
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- is_power_of_two helper
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.is_power_of_two", function()

  it("1 is power of 2", function()  assert_true(v.is_power_of_two(1))  end)
  it("2 is power of 2", function()  assert_true(v.is_power_of_two(2))  end)
  it("4 is power of 2", function()  assert_true(v.is_power_of_two(4))  end)
  it("8 is power of 2", function()  assert_true(v.is_power_of_two(8))  end)
  it("16 is power of 2", function() assert_true(v.is_power_of_two(16)) end)
  it("32 is power of 2", function() assert_true(v.is_power_of_two(32)) end)
  it("64 is power of 2", function() assert_true(v.is_power_of_two(64)) end)

  it("3 is not power of 2",   function() assert_false(v.is_power_of_two(3))   end)
  it("5 is not power of 2",   function() assert_false(v.is_power_of_two(5))   end)
  it("6 is not power of 2",   function() assert_false(v.is_power_of_two(6))   end)
  it("7 is not power of 2",   function() assert_false(v.is_power_of_two(7))   end)
  it("12 is not power of 2",  function() assert_false(v.is_power_of_two(12))  end)
  it("100 is not power of 2", function() assert_false(v.is_power_of_two(100)) end)
  it("0 is not power of 2",   function() assert_false(v.is_power_of_two(0))   end)
  it("-1 is not power of 2",  function() assert_false(v.is_power_of_two(-1))  end)
  it("128 outside valid set is not accepted", function()
    assert_false(v.is_power_of_two(128))
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_tempo
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.validate_tempo", function()

  it("valid bpm 120", function()
    local ok, result = v.validate_tempo({bpm = 120})
    assert_true(ok)
    assert_eq(result, {bpm = 120})
  end)

  it("boundary bpm 20", function()
    local ok, result = v.validate_tempo({bpm = 20})
    assert_true(ok)
    assert_eq(result.bpm, 20)
  end)

  it("boundary bpm 999", function()
    local ok, result = v.validate_tempo({bpm = 999})
    assert_true(ok)
    assert_eq(result.bpm, 999)
  end)

  it("missing bpm", function()
    local ok, err = v.validate_tempo({})
    assert_false(ok)
    assert_eq(err, "bpm is required")
  end)

  it("bpm as string fails type check", function()
    local ok, err = v.validate_tempo({bpm = "120"})
    assert_false(ok)
    assert_eq(err, "bpm must be a number")
  end)

  it("bpm 19 is below range", function()
    local ok, err = v.validate_tempo({bpm = 19})
    assert_false(ok)
    assert_eq(err, "bpm must be between 20 and 999")
  end)

  it("bpm 1000 is above range", function()
    local ok, err = v.validate_tempo({bpm = 1000})
    assert_false(ok)
    assert_eq(err, "bpm must be between 20 and 999")
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_timesig
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.validate_timesig", function()

  it("valid 4/4 at measure 1", function()
    local ok, result = v.validate_timesig({numerator=4, denominator=4, measure=1})
    assert_true(ok)
    assert_eq(result, {numerator=4, denominator=4, measure=1})
  end)

  it("valid 3/4 at measure 5", function()
    local ok, result = v.validate_timesig({numerator=3, denominator=4, measure=5})
    assert_true(ok)
    assert_eq(result.numerator, 3)
    assert_eq(result.denominator, 4)
    assert_eq(result.measure, 5)
  end)

  it("missing numerator", function()
    local ok, err = v.validate_timesig({})
    assert_false(ok)
    assert_eq(err, "numerator is required")
  end)

  it("numerator 0 is invalid", function()
    local ok, err = v.validate_timesig({numerator=0, denominator=4, measure=1})
    assert_false(ok)
    assert_eq(err, "numerator must be an integer between 1 and 64")
  end)

  it("numerator 65 is invalid", function()
    local ok, err = v.validate_timesig({numerator=65, denominator=4, measure=1})
    assert_false(ok)
    assert_eq(err, "numerator must be an integer between 1 and 64")
  end)

  it("numerator 1.5 (float) is invalid", function()
    local ok, err = v.validate_timesig({numerator=1.5, denominator=4, measure=1})
    assert_false(ok)
    assert_eq(err, "numerator must be an integer between 1 and 64")
  end)

  it("missing denominator", function()
    local ok, err = v.validate_timesig({numerator=4})
    assert_false(ok)
    assert_eq(err, "denominator is required")
  end)

  it("denominator 3 is not a power of 2", function()
    local ok, err = v.validate_timesig({numerator=4, denominator=3, measure=1})
    assert_false(ok)
    assert_eq(err, "denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)")
  end)

  it("denominator 5 is not a power of 2", function()
    local ok, err = v.validate_timesig({numerator=4, denominator=5, measure=1})
    assert_false(ok)
    assert_eq(err, "denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)")
  end)

  it("missing measure", function()
    local ok, err = v.validate_timesig({numerator=4, denominator=4})
    assert_false(ok)
    assert_eq(err, "measure is required")
  end)

  it("measure 0 is invalid", function()
    local ok, err = v.validate_timesig({numerator=4, denominator=4, measure=0})
    assert_false(ok)
    assert_eq(err, "measure must be a positive integer")
  end)

  it("measure -1 is invalid", function()
    local ok, err = v.validate_timesig({numerator=4, denominator=4, measure=-1})
    assert_false(ok)
    assert_eq(err, "measure must be a positive integer")
  end)

  it("all boundary denominators are valid: 1,2,4,8,16,32,64", function()
    for _, d in ipairs({1, 2, 4, 8, 16, 32, 64}) do
      local ok, _ = v.validate_timesig({numerator=4, denominator=d, measure=1})
      assert_true(ok, "denominator " .. d .. " should be valid")
    end
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_volume
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.validate_volume", function()

  it("volume 1.0 is valid", function()
    local ok, result = v.validate_volume({volume = 1.0})
    assert_true(ok)
    assert_eq(result, {volume = 1.0})
  end)

  it("volume 0.0 boundary is valid", function()
    local ok = v.validate_volume({volume = 0.0})
    assert_true(ok)
  end)

  it("volume 2.0 boundary is valid", function()
    local ok = v.validate_volume({volume = 2.0})
    assert_true(ok)
  end)

  it("missing volume", function()
    local ok, err = v.validate_volume({})
    assert_false(ok)
    assert_eq(err, "volume is required")
  end)

  it("volume -0.1 is out of range", function()
    local ok, err = v.validate_volume({volume = -0.1})
    assert_false(ok)
    assert_eq(err, "volume must be between 0.0 and 2.0")
  end)

  it("volume 2.1 is out of range", function()
    local ok, err = v.validate_volume({volume = 2.1})
    assert_false(ok)
    assert_eq(err, "volume must be between 0.0 and 2.0")
  end)

  it("volume as string fails type check", function()
    local ok, err = v.validate_volume({volume = "loud"})
    assert_false(ok)
    assert_eq(err, "volume must be a number")
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_track_number
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.validate_track_number", function()

  it("'1' parses to 1", function()
    local ok, n = v.validate_track_number("1")
    assert_true(ok)
    assert_eq(n, 1)
  end)

  it("'10' parses to 10", function()
    local ok, n = v.validate_track_number("10")
    assert_true(ok)
    assert_eq(n, 10)
  end)

  it("'0' is invalid (not positive)", function()
    local ok, err = v.validate_track_number("0")
    assert_false(ok)
    assert_eq(err, "track number must be a positive integer")
  end)

  it("'-1' is invalid (negative)", function()
    local ok, err = v.validate_track_number("-1")
    assert_false(ok)
    assert_eq(err, "track number must be a positive integer")
  end)

  it("'abc' is invalid (non-numeric)", function()
    local ok, err = v.validate_track_number("abc")
    assert_false(ok)
    assert_eq(err, "track number must be a positive integer")
  end)

  it("'1.5' is invalid (not integer)", function()
    local ok, err = v.validate_track_number("1.5")
    assert_false(ok)
    assert_eq(err, "track number must be a positive integer")
  end)

  it("'99' parses to 99", function()
    local ok, n = v.validate_track_number("99")
    assert_true(ok)
    assert_eq(n, 99)
  end)

end)

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_session_new
-- ─────────────────────────────────────────────────────────────────────────────

describe("validators.validate_session_new", function()

  it("nil input returns ok, {}", function()
    local ok, result = v.validate_session_new(nil)
    assert_true(ok)
    assert_eq(result, {})
  end)

  it("empty table returns ok, {}", function()
    local ok, result = v.validate_session_new({})
    assert_true(ok)
    assert_eq(result, {})
  end)

  it("arbitrary table is ignored, returns ok, {}", function()
    local ok, result = v.validate_session_new({anything = "ignored", foo = 42})
    assert_true(ok)
    assert_eq(result, {})
  end)

end)
