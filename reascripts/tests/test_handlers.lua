-- tests/test_handlers.lua
-- Tests for all handler modules in src/handlers/.

local project_h   = dofile("src/handlers/project.lua")
local regions_h   = dofile("src/handlers/regions.lua")
local tempo_h     = dofile("src/handlers/tempo.lua")
local timesig_h   = dofile("src/handlers/timesig.lua")
local mixdown_h   = dofile("src/handlers/mixdown.lua")
local songform_h  = dofile("src/handlers/songform.lua")

-- ── Stub adapter factory ────────────────────────────────────────────────────

local function make_adapter()
  local a = {}
  a._calls   = {}
  a._cursor  = 10.0
  a._regions = {}  -- array of {id, start, stop, name}
  a._next_id = 1
  a._items   = {}  -- array of {track_n, position, length}
  a._tracks  = 0
  a._metronome = false
  a._qn_scale = 2  -- qn = time * qn_scale

  local function record(fn, args)
    table.insert(a._calls, {fn = fn, args = args})
  end

  function a.get_cursor_position() return a._cursor end
  function a.set_edit_cursor(t) a._cursor = t; record("set_edit_cursor", {t=t}) end
  function a.get_play_state()    return 0 end

  function a.action_play()   record("action_play", {}) end
  function a.action_stop()   record("action_stop", {}) end
  function a.action_record() record("action_record", {}) end

  function a.new_project()   record("new_project", {}) end
  function a.update_arrange() record("update_arrange", {}) end
  function a.update_timeline() record("update_timeline", {}) end

  function a.toggle_metronome()
    a._metronome = not a._metronome
    record("toggle_metronome", {state = a._metronome})
  end
  function a.get_metronome_state() return a._metronome end

  function a.set_tempo(bpm) record("set_tempo", {bpm = bpm}) end
  function a.set_timesig_at_measure(n, d, m) record("set_timesig_at_measure", {n=n, d=d, m=m}) end
  function a.set_marker_at_time(t, bpm, n, d)
    record("set_marker_at_time", {t=t, bpm=bpm, n=n, d=d})
  end

  function a.time_to_qn(t) return t * a._qn_scale end
  function a.qn_to_time(qn) return qn / a._qn_scale end

  function a.get_track_count() return a._tracks end
  function a.get_track(n) return a._tracks >= n and ("trk_" .. n) or nil end
  function a.count_track_items(track)
    local n = tonumber((track or ""):match("trk_(%d+)")) or 0
    local c = 0
    for _, it in ipairs(a._items) do
      if it.track_n == n then c = c + 1 end
    end
    return c
  end
  function a.get_track_item(track, idx_0)
    local n = tonumber((track or ""):match("trk_(%d+)")) or 0
    local seen = -1
    for _, it in ipairs(a._items) do
      if it.track_n == n then
        seen = seen + 1
        if seen == idx_0 then return it end
      end
    end
    return nil
  end
  function a.get_item_position(item) return item.position end
  function a.get_item_length(item)   return item.length end

  function a.add_region(start_t, end_t, name)
    local id = a._next_id; a._next_id = a._next_id + 1
    table.insert(a._regions, {id = id, start = start_t, stop = end_t, name = name})
    record("add_region", {start = start_t, stop = end_t, name = name})
    return id
  end
  function a.list_regions()
    local out = {}
    for _, r in ipairs(a._regions) do
      out[#out + 1] = {id = r.id, start = r.start, stop = r.stop, name = r.name}
    end
    return out
  end
  function a.set_region(id, start_t, end_t, name)
    for _, r in ipairs(a._regions) do
      if r.id == id then
        r.start, r.stop, r.name = start_t, end_t, name
        record("set_region", {id=id, name=name})
        return true
      end
    end
    return false
  end

  function a.configure_render_regions(dir) record("configure_render_regions", {dir=dir}) end
  function a.render_project() record("render_project", {}) end

  return a
end

-- ── project ────────────────────────────────────────────────────────────────

describe("project handler", function()
  it("opens a new project", function()
    local a = make_adapter()
    local h = project_h.new(a)
    local res = h({})
    assert_eq(res.ok, true)
    assert_eq(a._calls[1].fn, "new_project")
  end)
end)

-- ── regions ────────────────────────────────────────────────────────────────

describe("regions.new handler", function()
  it("creates open-ended region at playhead (side-effect only)", function()
    local a = make_adapter()
    a._cursor = 100
    local h = regions_h.new(a)
    local _, err = h.new({name = "hi"})
    assert_nil(err)
    -- Verify side-effect: add_region was called with start=100 and 24h sentinel end
    local saw_add = false
    for _, c in ipairs(a._calls) do
      if c.fn == "add_region" then
        saw_add = true
        assert_eq(c.args.start, 100)
        assert_true(c.args.stop >= 100 + 60 * 60 * 24)
      end
    end
    assert_true(saw_add)
  end)
  it("defaults name to empty string", function()
    local a = make_adapter()
    local h = regions_h.new(a)
    h.new({})
    -- Verify add_region was called with name=""
    local call = a._calls[1]
    assert_not_nil(call)
    assert_eq(call.fn, "add_region")
    assert_eq(call.args.name, "")
  end)
end)

describe("regions.rename handler", function()
  it("renames an existing region (side-effect only)", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    -- Create a region first; the handler is side-effect only so we use adapter state
    r.new({name = "original"})
    local region_id = a._regions[1].id
    local _, err = r.rename({id = region_id, name = "updated"})
    assert_nil(err)
    assert_eq(a._regions[1].name, "updated")
  end)
  it("errors on unknown region id", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    local _, err = r.rename({id = 999, name = "x"})
    assert_not_nil(err)
    assert_true(err:find("not found"))
  end)
end)

describe("regions.list handler", function()
  it("lists regions", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    r.new({name = "A"}); r.new({name = "B"})
    local res = r.list({})
    assert_eq(#res.regions, 2)
  end)
end)

describe("regions.play handler", function()
  it("seeks to region start and plays", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    a._cursor = 5
    r.new({name = "x"})
    local region_id = a._regions[1].id
    a._cursor = 42  -- move cursor away
    local res, err = r.play({id = region_id})
    assert_nil(err)
    assert_eq(res.start, 5)
    assert_eq(a._cursor, 5)  -- play should have seeked back
    -- action_play was called
    local saw_play = false
    for _, c in ipairs(a._calls) do
      if c.fn == "action_play" then saw_play = true end
    end
    assert_true(saw_play)
  end)
end)

describe("regions.seek_to_end handler", function()
  it("sets cursor to 0 when there are no items (pure side-effect)", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    r.seek_to_end({})
    -- cursor should be set to 0 (the computed end)
    assert_eq(a._cursor, 0)
  end)
  it("finds the max end across all tracks and sets cursor", function()
    local a = make_adapter()
    a._tracks = 2
    a._items = {
      {track_n = 1, position = 0, length = 10},
      {track_n = 2, position = 5, length = 20},  -- ends at 25
      {track_n = 1, position = 12, length = 3},
    }
    local r = regions_h.new(a)
    r.seek_to_end({})
    assert_eq(a._cursor, 25)
  end)
end)

-- ── tempo ────────────────────────────────────────────────────────────────────

describe("tempo handler", function()
  it("sets tempo", function()
    local a = make_adapter()
    local h = tempo_h.new(a)
    local res = h({bpm = 140})
    assert_eq(res.bpm, 140)
    assert_eq(a._calls[1].args.bpm, 140)
  end)
  it("rejects bad payload", function()
    local a = make_adapter()
    local h = tempo_h.new(a)
    local res, err = h({})
    assert_nil(res); assert_not_nil(err)
  end)
end)

-- ── timesig ──────────────────────────────────────────────────────────────────

describe("timesig handler", function()
  it("inserts at playhead when measure omitted", function()
    local a = make_adapter()
    a._cursor = 7.5
    local h = timesig_h.new(a)
    local res = h({numerator = 6, denominator = 8})
    assert_eq(res.numerator, 6); assert_eq(res.denominator, 8)
    -- set_marker_at_time was called with t=7.5
    local found
    for _, c in ipairs(a._calls) do
      if c.fn == "set_marker_at_time" then found = c; break end
    end
    assert_not_nil(found); assert_eq(found.args.t, 7.5)
    assert_eq(found.args.n, 6); assert_eq(found.args.d, 8)
  end)
  it("inserts at measure when given", function()
    local a = make_adapter()
    local h = timesig_h.new(a)
    local res = h({numerator = 4, denominator = 4, measure = 3})
    assert_eq(res.measure, 3)
    local found
    for _, c in ipairs(a._calls) do
      if c.fn == "set_timesig_at_measure" then found = c; break end
    end
    assert_not_nil(found); assert_eq(found.args.m, 3)
  end)
end)

-- ── mixdown ──────────────────────────────────────────────────────────────────

describe("mixdown handler", function()
  it("configures render + renders + reports region count", function()
    local a = make_adapter()
    -- seed two regions
    table.insert(a._regions, {id=1, start=0, stop=5, name="A"})
    table.insert(a._regions, {id=2, start=5, stop=10, name="B"})
    local h = mixdown_h.new(a)
    local res, err = h({output_dir = "/tmp/x"})
    assert_nil(err)
    assert_eq(res.region_count, 2)
    assert_eq(res.output_dir, "/tmp/x")
    local saw_cfg, saw_render = false, false
    for _, c in ipairs(a._calls) do
      if c.fn == "configure_render_regions" then saw_cfg = true end
      if c.fn == "render_project"             then saw_render = true end
    end
    assert_true(saw_cfg); assert_true(saw_render)
  end)
end)

-- ── songform ─────────────────────────────────────────────────────────────────

describe("songform.compute_row_positions", function()
  it("row 1 starts at playhead; subsequent rows advance by prior row's QN span", function()
    -- 8 bars of 4/4 at 120, then 4 bars of 6/8 at 120, then 16 bars of 4/4
    local rows = {
      {barOffset = 0,  num = 4, denom = 4, bpm = 120},
      {barOffset = 8,  num = 6, denom = 8, bpm = 120},
      {barOffset = 12, num = 4, denom = 4, bpm = 120},
    }
    local ps = songform_h._compute_row_positions(rows, 100)
    assert_eq(ps[1].qn, 100)
    -- row 1 spans 8 bars of 4/4 → 8 * 4 * 4/4 = 32 QN
    assert_eq(ps[2].qn, 132)
    -- row 2 spans (12-8)=4 bars of 6/8 → 4 * 6 * 4/8 = 12 QN
    assert_eq(ps[3].qn, 144)
  end)
end)

describe("songform handler", function()
  it("writes markers and creates an open-ended region using startTime from payload", function()
    local a = make_adapter()
    -- startTime is now injected via payload, not from get_cursor_position
    local h = songform_h.new(a)
    local payload = {
      startTime  = 10,
      regionName = "Take 1",
      rows = {
        {barOffset = 0, num = 4, denom = 4, bpm = 80},
        {barOffset = 4, num = 4, denom = 4, bpm = 90},
      },
    }
    local _, err = h(payload)
    assert_nil(err)
    -- region created at startTime=10
    assert_eq(#a._regions, 1)
    assert_eq(a._regions[1].start, 10)
    assert_eq(a._regions[1].name, "Take 1")
    -- markers written at two times (qn_scale=2 → time_to_qn(10)=20)
    local marker_calls = {}
    for _, c in ipairs(a._calls) do
      if c.fn == "set_marker_at_time" then table.insert(marker_calls, c) end
    end
    assert_eq(#marker_calls, 2)
    -- first marker at startTime (time=10)
    assert_eq(marker_calls[1].args.t, 10)
    assert_eq(marker_calls[1].args.bpm, 80)
    -- second marker: 4 bars of 4/4 → 16 QN → time = (20 + 16)/2 = 18
    assert_eq(marker_calls[2].args.t, 18)
    assert_eq(marker_calls[2].args.bpm, 90)
  end)

  it("rejects rows whose first barOffset != 0", function()
    local a = make_adapter()
    local h = songform_h.new(a)
    local _, err = h({startTime = 0, rows = {{barOffset = 1, num = 4, denom = 4, bpm = 80}}})
    assert_not_nil(err)
    assert_true(err:find("barOffset must be 0"))
  end)

  it("rejects payload missing startTime", function()
    local a = make_adapter()
    local h = songform_h.new(a)
    local _, err = h({rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}}})
    assert_not_nil(err)
    assert_true(err:find("startTime"))
  end)

  it("defaults region name to 'Take' when not provided", function()
    local a = make_adapter()
    local h = songform_h.new(a)
    h({startTime = 0, rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}}})
    assert_eq(a._regions[1].name, "Take")
  end)
end)
