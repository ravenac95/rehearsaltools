# PRD Task Planner Memory — rehearsaltools

## Project: REAPER HTTP Remote Control ReaScript

**Status:** Task plan generated. 7 task files written to `tasks/`.

## Architecture

- **Language:** Lua 5.4 (REAPER embedded)
- **Networking:** mavriq-lua-sockets (LuaSocket API), installed via ReaPack
- **Server model:** Non-blocking TCP inside `reaper.defer()` loop; one connection per tick; HTTP/1.0 only
- **Distribution:** Single `.lua` file + `src/` directory; developer self-install
- **Tests:** Custom Lua test harness (`tests/test_runner.lua`); run with `lua tests/test_runner.lua`; no REAPER required for tests
- **TDD:** Enabled for all testable modules (Tasks 1–6)

## Module Map

| File | Purpose |
|------|---------|
| `reaper_http_remote.lua` | Main ReaScript entry point |
| `src/json.lua` | Pure-Lua JSON encode/decode |
| `src/http.lua` | HTTP/1.0 request parser, response builder, path router |
| `src/validation.lua` | Payload validators for tempo, timesig, volume, track number |
| `src/reaper_api.lua` | Thin adapter over all `reaper.*` calls; injectable stub for tests |
| `src/handlers.lua` | One function per API endpoint; pure logic, no REAPER globals |
| `src/router.lua` | Dispatches parsed requests to handlers; owns route table |

## Key Conventions

- All handler functions: `(request, adapter, params) → (status_code, table)`
- All validators: `(body) → (ok, result_or_error_string)`
- REAPER adapter factory: `require("reaper_api").new(optional_stub)` — injectable for tests
- Track numbers: HTTP API is 1-indexed; REAPER API is 0-indexed; adapter handles conversion
- Measure numbers: HTTP API is 1-indexed; `SetTempoTimeSigMarker` measurepos is 0-indexed; adapter handles conversion
- Test stub pattern: stub `reaper` table injected via `reaper_api.new(stub)`

## Critical REAPER API Notes

- Play: `Main_OnCommand(1007, 0)`
- Stop: `Main_OnCommand(1016, 0)`
- Record toggle: `Main_OnCommand(1013, 0)`
- Timesig at measure: `SetTempoTimeSigMarker(0, -1, -1, measure-1, -1, -1, num, denom, false)`
- Tempo at cursor: `SetTempoTimeSigMarker(0, -1, cursor_pos, -1, -1, bpm, 0, 0, false)`
- After tempo/timesig changes: call `UpdateTimeline()`
- After track changes: call `UpdateArrange()`
- Track mute: `"B_MUTE"` key; solo: `"I_SOLO"` value 2 for solo-in-place; volume: `"D_VOL"`
- Play state: 0=stopped, 1=playing, 2=paused, 4=recording, 5=recording+paused

## API Endpoints

GET /status, POST /play, POST /stop, POST /record, POST /tempo, POST /timesig,
POST /track/:n/mute, POST /track/:n/solo, POST /track/:n/volume

Default port: 8765

## Task Dependencies

Tasks 2+3+4 parallel after Task 1. Task 5 needs 1+3+4. Task 6 needs 2+5. Task 7 needs all.
