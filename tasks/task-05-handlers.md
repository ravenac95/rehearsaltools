# Task 5: Request Handlers

## Objective
Implement all API endpoint handler functions as pure logic that receives parsed request data and a REAPER adapter, and returns response data — fully tested with a stubbed adapter.

## Dependencies
Depends on: Task 1 (JSON), Task 3 (validation), Task 4 (REAPER adapter interface)

## Requirements

### 5.1 Handlers module (`src/handlers.lua`)

Write a Lua module (returns a table) where each function handles one API endpoint. Handlers:
- Accept `(request, adapter)` — the parsed HTTP request table and the REAPER adapter object
- Return `(status_code, response_table)` — an integer HTTP status code and a Lua table to be JSON-encoded as the response body
- Do NOT do any JSON encoding themselves — that is the router's job
- Do NOT call `reaper.*` directly — only call adapter methods
- Import and use `src/validation.lua` for all input validation

**`handlers.status(request, adapter)`**

Reads current transport state and returns it.

Logic:
1. Call `adapter.get_play_state()` → integer
2. Derive boolean flags: `playing = (state == 1 or state == 5)`, `recording = (state == 4 or state == 5)`, `stopped = (state == 0)`
3. Call `adapter.get_cursor_position()` → seconds
4. Call `adapter.get_tempo_time_sig_at(position_seconds)` → bpm, timesig_num, timesig_denom
5. Call `adapter.time_to_measures_beats(position_seconds)` → measures_0indexed, beats_0indexed, ...
6. Return 200 and the status object (all fields per the API spec in the PRD)

Response fields (see PRD for exact names):
- `playing`, `recording`, `stopped` — booleans
- `bpm` — number
- `timesig_num`, `timesig_denom` — integers
- `position_seconds` — number
- `position_beats` — total beats from start (float)
- `position_measure` — current measure, 1-indexed (measures_0indexed + 1)
- `position_beat_in_measure` — current beat within the measure, 1-indexed (beats_0indexed + 1)

**`handlers.play(request, adapter)`**

Calls `adapter.action_play()`. Returns `200, {ok = true}`.

**`handlers.stop(request, adapter)`**

Calls `adapter.action_stop()`. Returns `200, {ok = true}`.

**`handlers.record(request, adapter)`**

Calls `adapter.action_record()`. Returns `200, {ok = true}`.

**`handlers.tempo(request, adapter)`**

Logic:
1. Decode `request.body` as JSON — if decode fails, return `400, {error = "invalid JSON body"}`
2. Call `validators.validate_tempo(decoded)` — if fails, return `400, {error = error_message}`
3. Call `adapter.set_tempo(validated.bpm)`
4. Call `adapter.update_timeline()`
5. Return `200, {ok = true, bpm = validated.bpm}`

**`handlers.timesig(request, adapter)`**

Logic:
1. Decode `request.body` as JSON — if decode fails, return `400, {error = "invalid JSON body"}`
2. Call `validators.validate_timesig(decoded)` — if fails, return `400, {error = error_message}`
3. Call `adapter.set_timesig_at_measure(validated.numerator, validated.denominator, validated.measure)`
4. Call `adapter.update_timeline()`
5. Return `200, {ok = true, numerator = validated.numerator, denominator = validated.denominator, measure = validated.measure}`

**`handlers.track_mute(request, adapter, params)`**

`params` is the route match table, e.g. `{n = "2"}`.

Logic:
1. Call `validators.validate_track_number(params.n)` — if fails, return `400, {error = error_message}`
2. Call `adapter.get_track(n)` — if nil, return `404, {error = "track not found"}`
3. Call `adapter.get_track_mute(track)` → current mute state
4. Toggle: call `adapter.set_track_mute(track, not current_mute)`
5. Call `adapter.update_arrange()`
6. Return `200, {ok = true, track = n, muted = not current_mute}`

**`handlers.track_solo(request, adapter, params)`**

Same pattern as `track_mute`, toggling solo state.

- Uses `adapter.get_track_solo` / `adapter.set_track_solo`
- Response: `{ok = true, track = n, soloed = not current_solo}`

**`handlers.track_volume(request, adapter, params)`**

Logic:
1. Validate track number via `validators.validate_track_number(params.n)`
2. Get track via `adapter.get_track(n)` — 404 if nil
3. Decode JSON body — 400 if invalid
4. Validate via `validators.validate_volume(decoded)` — 400 if invalid
5. Call `adapter.set_track_volume(track, validated.volume)`
6. Call `adapter.update_arrange()`
7. Return `200, {ok = true, track = n, volume = validated.volume}`

### 5.2 Handler tests (`tests/test_handlers.lua`)

Tests use a full stub adapter. Define a `make_stub_adapter()` helper at the top of the test file that returns a table with all adapter methods as no-op stubs returning sensible defaults. Individual tests override specific stubs as needed.

Default stub return values:
- `get_play_state()` → 0 (stopped)
- `get_cursor_position()` → 0.0
- `get_tempo_time_sig_at()` → 120.0, 4, 4
- `time_to_measures_beats()` → 0, 0, 0.0, 0.0
- `get_track_count()` → 4
- `get_track(n)` → `"track_" .. n` (a truthy non-nil value simulating a track handle)
- `get_track_mute()` → false
- `get_track_solo()` → false
- `get_track_volume()` → 1.0
- All action/set functions → nil (no-op)

Tests must cover:

**status handler:**
- Stopped state → `stopped=true, playing=false, recording=false`
- Playing state (play_state=1) → `playing=true`
- Recording state (play_state=4) → `recording=true`
- Position conversion: measures_0indexed=2 → `position_measure=3`
- BPM and time sig are passed through from adapter

**play/stop/record handlers:**
- Returns 200 with `{ok=true}`
- Correct adapter method is called (use a spy)

**tempo handler:**
- Valid body `{"bpm":140}` → calls `adapter.set_tempo(140)` and returns 200
- Invalid JSON body → 400
- BPM out of range → 400 with validation error message
- `update_timeline` is called after set_tempo

**timesig handler:**
- Valid body → calls `adapter.set_timesig_at_measure(3, 4, 5)` for measure 5
- Invalid denominator (3) → 400
- `update_timeline` is called after set

**track_mute handler:**
- Track 2, currently unmuted → toggles to muted, response `{muted=true}`
- Track 2, currently muted → toggles to unmuted
- Invalid track number (string "abc") → 400
- Track number beyond count: `get_track` returns nil → 404

**track_solo handler:**
- Same toggle pattern as mute
- Response includes `soloed` field

**track_volume handler:**
- Valid body `{"volume":0.5}` → calls `set_track_volume(track, 0.5)`, returns 200
- Volume out of range → 400
- Invalid JSON → 400

## File Locations
- `src/handlers.lua` — handlers module
- `tests/test_handlers.lua` — handler tests

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` passes all handler tests
- [ ] All handlers return `(status_code, table)` pairs — never string responses
- [ ] No handler calls `reaper.*` directly
- [ ] Mute and solo are toggled (not set to a fixed value)
- [ ] All validation errors produce 400 responses with `{error: "..."}` bodies
- [ ] Track-not-found produces 404
- [ ] `update_timeline` is called after `set_tempo` and `set_timesig_at_measure`
- [ ] `update_arrange` is called after track mutations
- [ ] All prior task tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_handlers.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua`
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First (representative subset — write all listed above)

1. **status stopped:** play_state=0 → `{stopped=true, playing=false, recording=false}`
2. **status playing:** play_state=1 → `{playing=true, stopped=false}`
3. **status recording:** play_state=4 → `{recording=true}`
4. **status measure 1-indexed:** measures_0indexed=3 → `position_measure=4`
5. **play returns ok:** `handlers.play(req, adapter)` → `200, {ok=true}`
6. **play calls action:** spy confirms `action_play` was called
7. **tempo valid:** `200, {ok=true, bpm=140}`
8. **tempo invalid json:** `400, {error="invalid JSON body"}`
9. **tempo out of range:** `400, {error=...}` (error from validator)
10. **timesig valid:** `200, {ok=true, numerator=3, denominator=4, measure=5}`
11. **timesig bad denom:** `400`
12. **track_mute toggle off→on:** response `{muted=true}`
13. **track_mute toggle on→off:** response `{muted=false}`
14. **track_mute bad track string:** `400`
15. **track_mute nil track:** `404`
16. **track_volume valid:** `200, {ok=true, volume=0.5}`
17. **track_volume out of range:** `400`

### TDD Process
1. Write `make_stub_adapter()` helper and all tests — FAIL (RED)
2. Implement `src/handlers.lua` until all tests pass (GREEN)
3. Run full test suite — all prior tests still pass
