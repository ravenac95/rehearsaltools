# rehearsaltools — REAPER HTTP Remote

A lightweight HTTP remote-control server for [REAPER](https://www.reaper.fm/) (digital audio workstation). Run this ReaScript to expose a REST API over a local TCP port so that external tools, scripts, and apps can control transport, tempo, time signature, track state, and sessions.

## What It Does

Starts a non-blocking HTTP/1.0 server inside REAPER's Lua environment. Each incoming request is parsed, routed to the appropriate handler, and a JSON response is returned — all within REAPER's defer loop so the DAW UI stays responsive.

## Installation

### Prerequisites

1. Install **mavriq-lua-sockets** via [ReaPack](https://reapack.com/):
   - In REAPER: Extensions → ReaPack → Browse packages
   - Search for `mavriq-lua-sockets` and install it
   - Restart REAPER after installation

### Script Setup

2. Copy the following into REAPER's Scripts directory:
   - `reaper_http_remote.lua` (the main script)
   - The entire `src/` directory

3. In REAPER, open the Action List: **Actions → Show action list**

4. Click **New action → Load ReaScript** and select `reaper_http_remote.lua`

5. Run the action — the REAPER console will show:
   ```
   [HTTP Remote] Listening on http://0.0.0.0:8765
   ```

## API Reference

All endpoints return `application/json`. Error responses always include an `"error"` key.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/status` | Current transport state, position, BPM, and time signature |
| `POST` | `/play` | Start playback |
| `POST` | `/stop` | Stop transport |
| `POST` | `/record` | Start recording |
| `POST` | `/tempo` | Set BPM (body: `{"bpm": 140}`) |
| `POST` | `/timesig` | Insert time signature marker (body: `{"numerator":3,"denominator":4,"measure":5}`) |
| `POST` | `/session/new` | Open a new empty project (see warning below) |
| `POST` | `/track/:n/mute` | Toggle mute on track `n` (1-indexed) |
| `POST` | `/track/:n/solo` | Toggle solo-in-place on track `n` (1-indexed) |
| `POST` | `/track/:n/volume` | Set volume on track `n` (body: `{"volume": 0.8}`, range 0.0–2.0) |

### Example Requests

```bash
# Get current status
curl http://localhost:8765/status

# Start playback
curl -X POST http://localhost:8765/play

# Set BPM to 140
curl -X POST -H "Content-Type: application/json" \
     -d '{"bpm":140}' http://localhost:8765/tempo

# Insert 3/4 time signature at measure 5
curl -X POST -H "Content-Type: application/json" \
     -d '{"numerator":3,"denominator":4,"measure":5}' http://localhost:8765/timesig

# Toggle mute on track 1
curl -X POST http://localhost:8765/track/1/mute

# Set volume on track 2 to 80%
curl -X POST -H "Content-Type: application/json" \
     -d '{"volume":0.8}' http://localhost:8765/track/2/volume

# Open a new empty project
curl -X POST http://localhost:8765/session/new
```

### GET /status Response Fields

```json
{
  "playing": false,
  "recording": false,
  "stopped": true,
  "bpm": 120.0,
  "timesig_num": 4,
  "timesig_denom": 4,
  "position_seconds": 0.0,
  "position_beats": 0.0,
  "position_measure": 1,
  "position_beat_in_measure": 1
}
```

## Default Port

The server listens on **port 8765** by default. To change it, edit the `PORT` constant near the top of `reaper_http_remote.lua`:

```lua
local PORT = 8765   -- change this
```

## Running Tests

Requires **Lua 5.4** installed on your system:

```bash
lua tests/test_runner.lua
```

All tests are pure-Lua and run outside REAPER. A passing run prints:

```
220 passed, 0 failed
```

## Stopping the Server

Terminate the script from REAPER's Script Manager or Action List. The server socket is garbage-collected when the Lua VM shuts down. There is no persistent background process.

## Session Warning

`POST /session/new` calls REAPER's "open new project" command, which **discards the current project**. If there are unsaved changes, REAPER will show its native "Save changes?" dialog before opening the new project. Use this endpoint with care.

## Architecture

The codebase is structured as a set of pure-Lua modules for testability:

```
src/
  json.lua         — JSON encoder/decoder (no external deps)
  http.lua         — HTTP/1.0 request parser and response builder
  validation.lua   — Input validation for all endpoints
  reaper_api.lua   — Thin adapter wrapping all reaper.* API calls
  handlers.lua     — One function per endpoint (depends on validation + adapter)
  router.lua       — Route table and dispatch (depends on http + handlers)

reaper_http_remote.lua  — Main script: TCP server + defer loop (runs inside REAPER)

tests/
  test_runner.lua       — Minimal pure-Lua test harness
  test_json.lua
  test_http.lua
  test_validation.lua
  test_reaper_adapter.lua
  test_handlers.lua
  test_router.lua
```

All modules except `reaper_http_remote.lua` are testable with the system `lua` binary — no REAPER installation required for the automated test suite.
