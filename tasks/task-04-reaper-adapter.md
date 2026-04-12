# Task 4: REAPER API Adapter Module

## Objective
Implement a thin adapter module that wraps all REAPER API calls behind a single injectable interface, making all business logic testable outside REAPER.

## Dependencies
Depends on: Task 1 (test harness and JSON module)

## Requirements

### 4.1 Adapter module (`src/reaper_api.lua`)

Write a Lua module that returns a single table (the "reaper adapter") whose functions wrap every REAPER API call used in the project. This module is the ONLY place in the codebase that calls `reaper.*` functions. All handler modules receive this adapter as an argument and call only its methods.

The adapter table must expose the following functions:

**Transport:**

- `adapter.get_play_state()` → integer: 0=stopped, 1=playing, 2=paused, 4=recording, 5=recording+paused (wraps `reaper.GetPlayState()`)
- `adapter.get_cursor_position()` → number: position in seconds (wraps `reaper.GetCursorPosition()`)
- `adapter.action_play()` → nil (wraps `reaper.Main_OnCommand(1007, 0)`)
- `adapter.action_stop()` → nil (wraps `reaper.Main_OnCommand(1016, 0)`)
- `adapter.action_record()` → nil (wraps `reaper.Main_OnCommand(1013, 0)`)

**Tempo / Time Signature:**

- `adapter.get_tempo_time_sig_at(position)` → `bpm, timesig_num, timesig_denom` (wraps `reaper.TimeMap_GetTimeSigAtTime(0, position)`)
- `adapter.set_tempo(bpm)` → nil (wraps `reaper.SetTempoTimeSigMarker(0, -1, reaper.GetCursorPosition(), -1, -1, bpm, 0, 0, false)` — inserts a tempo marker at the current cursor position without changing the time signature; uses 0 for num/denom to leave them unchanged)
- `adapter.set_timesig_at_measure(numerator, denominator, measure_1indexed)` → nil (wraps `reaper.SetTempoTimeSigMarker(0, -1, -1, measure_1indexed - 1, -1, -1, numerator, denominator, false)` — inserts at 0-indexed measure position, does not change tempo)
- `adapter.update_timeline()` → nil (wraps `reaper.UpdateTimeline()` — must be called after any tempo/timesig change to refresh REAPER's display)

**Position:**

- `adapter.time_to_measures_beats(time_seconds)` → `measures, beats, full_beats, full_seconds` (wraps `reaper.TimeMap2_timeToBeats(0, time_seconds)` — returns: number of complete measures elapsed [0-indexed], beats within current measure [0-indexed], total beats from start, time in seconds)
- Note: expose the raw return values; conversion to 1-indexed is done in the handler layer.

**Tracks:**

- `adapter.get_track_count()` → integer (wraps `reaper.CountTracks(0)`)
- `adapter.get_track(n_1indexed)` → track object or nil (wraps `reaper.GetTrack(0, n_1indexed - 1)` — converts from 1-indexed to 0-indexed)
- `adapter.get_track_mute(track)` → boolean (wraps `reaper.GetMediaTrackInfo_Value(track, "B_MUTE")` — returns true if muted)
- `adapter.set_track_mute(track, muted)` → nil (wraps `reaper.SetMediaTrackInfo_Value(track, "B_MUTE", muted and 1 or 0)`)
- `adapter.get_track_solo(track)` → boolean (wraps `reaper.GetMediaTrackInfo_Value(track, "I_SOLO")` — nonzero means soloed)
- `adapter.set_track_solo(track, soloed)` → nil (wraps `reaper.SetMediaTrackInfo_Value(track, "I_SOLO", soloed and 2 or 0)` — use value 2 for solo-in-place)
- `adapter.get_track_volume(track)` → number, linear scalar (wraps `reaper.GetMediaTrackInfo_Value(track, "D_VOL")`)
- `adapter.set_track_volume(track, volume_linear)` → nil (wraps `reaper.SetMediaTrackInfo_Value(track, "D_VOL", volume_linear)`)

**Project:**

- `adapter.update_arrange()` → nil (wraps `reaper.UpdateArrange()` — call after track changes to refresh the arrange view)
- `adapter.new_project()` → nil (wraps `reaper.Main_openProject("")` — opens a new empty project, replacing the current session; REAPER may prompt the user to save if the existing project has unsaved changes)

### 4.2 Module factory pattern

The module file (`src/reaper_api.lua`) must be structured as a factory function so the test harness can inject a stub:

```lua
-- src/reaper_api.lua
local M = {}

function M.new(reaper_global)
  -- reaper_global defaults to the global `reaper` table when not provided
  local r = reaper_global or reaper
  local adapter = {}
  -- ... all functions defined here using r.* ...
  return adapter
end

return M
```

In the main script, usage is: `local adapter = require("src/reaper_api").new()`.
In tests, usage is: `local adapter = require("src/reaper_api").new(stub_reaper)`.

### 4.3 Adapter tests (`tests/test_reaper_adapter.lua`)

Since the adapter is a thin wrapper, tests focus on:
1. Verifying correct translation of 1-indexed track numbers to 0-indexed REAPER calls
2. Verifying mute/solo value encoding (boolean → 0/1)
3. Verifying `set_timesig_at_measure` passes `measure - 1` as the measurepos argument
4. Verifying `update_timeline` and `update_arrange` are called where expected
5. Verifying `new_project` calls `Main_openProject` with an empty string argument

Tests use a stub `reaper` table with spy functions that record their call arguments.

**Stub pattern to use:**

```lua
local calls = {}
local stub_reaper = {
  GetTrack = function(proj, idx)
    table.insert(calls, {fn="GetTrack", proj=proj, idx=idx})
    return "track_handle_" .. idx
  end,
  Main_openProject = function(path)
    table.insert(calls, {fn="Main_openProject", path=path})
  end,
  -- etc.
}
```

Then assert that `calls[1].idx == 1` when `adapter.get_track(2)` is called (2 → 0-indexed 1).

## File Locations
- `src/reaper_api.lua` — adapter module
- `tests/test_reaper_adapter.lua` — adapter tests

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` passes all adapter tests
- [ ] `get_track(2)` calls `reaper.GetTrack(0, 1)` (1-indexed input → 0-indexed REAPER call)
- [ ] `set_timesig_at_measure(3, 4, 5)` calls `SetTempoTimeSigMarker` with measurepos=4
- [ ] `set_track_mute(track, true)` calls `SetMediaTrackInfo_Value` with value `1`
- [ ] `set_track_solo(track, false)` calls `SetMediaTrackInfo_Value` with value `0`
- [ ] `new_project()` calls `reaper.Main_openProject("")` with exactly an empty string
- [ ] Module does NOT call any `reaper.*` global directly — only through `reaper_global` parameter
- [ ] All prior task tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_reaper_adapter.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua`
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First

1. **get_track 1-indexed:** `adapter.get_track(1)` calls stub's `GetTrack(0, 0)`
2. **get_track 1-indexed n=3:** `adapter.get_track(3)` calls stub's `GetTrack(0, 2)`
3. **set_track_mute true:** calls `SetMediaTrackInfo_Value(track, "B_MUTE", 1)`
4. **set_track_mute false:** calls `SetMediaTrackInfo_Value(track, "B_MUTE", 0)`
5. **set_track_solo true:** calls `SetMediaTrackInfo_Value(track, "I_SOLO", 2)`
6. **set_track_solo false:** calls `SetMediaTrackInfo_Value(track, "I_SOLO", 0)`
7. **get_track_mute true:** stub returns 1 → adapter returns true
8. **get_track_solo true:** stub returns 2 → adapter returns true (nonzero = soloed)
9. **set_timesig_at_measure:** measure=5 → SetTempoTimeSigMarker called with measurepos=4
10. **action_play:** calls `Main_OnCommand(1007, 0)`
11. **action_stop:** calls `Main_OnCommand(1016, 0)`
12. **action_record:** calls `Main_OnCommand(1013, 0)`
13. **new_project:** calls `Main_openProject("")` — argument is exactly `""`

### TDD Process
1. Write stub pattern and all tests in `tests/test_reaper_adapter.lua` — FAIL (RED)
2. Implement `src/reaper_api.lua` factory until tests pass (GREEN)
3. Run `lua tests/test_runner.lua` — all prior tests must still pass
