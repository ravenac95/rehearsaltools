-- tests/test_handlers.lua
-- Tests for all handler modules in src/handlers/.

local project_h   = dofile("src/handlers/project.lua")
local regions_h   = dofile("src/handlers/regions.lua")
local tempo_h     = dofile("src/handlers/tempo.lua")
local timesig_h   = dofile("src/handlers/timesig.lua")
local metronome_h = dofile("src/handlers/metronome.lua")
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
  it("creates open-ended region at playhead", function()
    local a = make_adapter()
    a._cursor = 100
    local h = regions_h.new(a)
    local res, err = h.new({name = "hi"})
    assert_nil(err)
    assert_not_nil(res.id)
    assert_eq(res.start, 100)
    assert_true(res.stop >= 100 + 60 * 60 * 24)  -- 24h sentinel
  end)
  it("defaults name to empty string", function()
    local a = make_adapter()
    local h = regions_h.new(a)
    local res = h.new({})
    assert_eq(res.name, "")
  end)
end)

describe("regions.rename handler", function()
  it("renames an existing region", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    local created = r.new({name = "original"})
    local res, err = r.rename({id = created.id, name = "updated"})
    assert_nil(err)
    assert_eq(res.name, "updated")
    assert_eq(a._regions[1].name, "updated")
  end)
  it("errors on unknown region id", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    local res, err = r.rename({id = 999, name = "x"})
    assert_nil(res)
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
    local created = r.new({name = "x"})
    a._cursor = 42  -- move cursor away
    local res, err = r.play({id = created.id})
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
  it("returns 0 when there are no items", function()
    local a = make_adapter()
    local r = regions_h.new(a)
    local res = r.seek_to_end({})
    assert_eq(res.position, 0)
  end)
  it("finds the max end across all tracks", function()
    local a = make_adapter()
    a._tracks = 2
    a._items = {
      {track_n = 1, position = 0, length = 10},
      {track_n = 2, position = 5, length = 20},  -- ends at 25
      {track_n = 1, position = 12, length = 3},
    }
    local r = regions_h.new(a)
    local res = r.seek_to_end({})
    assert_eq(res.position, 25)
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

-- ── metronome ────────────────────────────────────────────────────────────────

describe("metronome handler", function()
  it("toggles and reports new state", function()
    local a = make_adapter()
    local h = metronome_h.new(a)
    local res = h({})
    assert_eq(res.on, true)
    local res2 = h({})
    assert_eq(res2.on, false)
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
  it("writes markers and creates an open-ended region at playhead", function()
    local a = make_adapter()
    a._cursor = 10
    -- qn_scale = 2 → time_to_qn(10) = 20
    local h = songform_h.new(a)
    local payload = {
      regionName = "Take 1",
      rows = {
        {barOffset = 0, num = 4, denom = 4, bpm = 80},
        {barOffset = 4, num = 4, denom = 4, bpm = 90},
      },
    }
    local res, err = h(payload)
    assert_nil(err)
    assert_eq(res.startTime, 10)
    assert_eq(#res.rows, 2)
    -- region created
    assert_eq(#a._regions, 1)
    assert_eq(a._regions[1].start, 10)
    assert_eq(a._regions[1].name, "Take 1")
    -- markers written at two times
    local marker_calls = {}
    for _, c in ipairs(a._calls) do
      if c.fn == "set_marker_at_time" then table.insert(marker_calls, c) end
    end
    assert_eq(#marker_calls, 2)
    -- first marker at the playhead (time=10)
    assert_eq(marker_calls[1].args.t, 10)
    assert_eq(marker_calls[1].args.bpm, 80)
    -- second marker: 4 bars of 4/4 from playhead → 16 QN → time = (20 + 16)/2 = 18
    assert_eq(marker_calls[2].args.t, 18)
    assert_eq(marker_calls[2].args.bpm, 90)
  end)

  it("rejects rows whose first barOffset != 0", function()
    local a = make_adapter()
    local h = songform_h.new(a)
    local res, err = h({rows = {{barOffset = 1, num = 4, denom = 4, bpm = 80}}})
    assert_nil(res)
    assert_true(err:find("barOffset must be 0"))
  end)

  it("defaults region name to 'Take' when not provided", function()
    local a = make_adapter()
    local h = songform_h.new(a)
    local _ = h({rows = {{barOffset = 0, num = 4, denom = 4, bpm = 120}}})
    assert_eq(a._regions[1].name, "Take")
  end)
end)
