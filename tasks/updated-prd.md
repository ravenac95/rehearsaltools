# Updated PRD: REAPER HTTP Remote Control ReaScript

**Last Updated:** 2026-04-12
**Status:** Approved for implementation
**TDD Mode:** Enabled — all testable components use test-first development

---

## Overview

A self-contained Lua ReaScript for REAPER that embeds a non-blocking HTTP server, exposing a REST/JSON API for remote transport control, time signature scheduling, tempo changes, and per-track mixing. The primary use case is live rehearsal control from a phone or tablet on the same local network.

---

## What Already Exists

This is a **greenfield repository**. Only a `README.md` stub exists. Everything is built from scratch.

---

## Architecture Decisions (from discovery)

### Language: Lua
- REAPER embeds Lua 5.4
- TCP networking via **mavriq-lua-sockets** (installed via ReaPack), which provides a LuaSocket-compatible API
- Single `.lua` script file, placed in REAPER's Scripts directory and run via Actions

### HTTP Server: Custom embedded, non-blocking
- Runs inside REAPER's `reaper.defer()` loop — the main loop function is re-registered each tick
- Uses non-blocking TCP socket (`socket:settimeout(0)`) so REAPER's audio engine is never blocked
- Accepts one connection per defer tick, reads the request, writes the response, closes the connection
- No persistent connections, no chunked transfer — simple HTTP/1.0 request-response

### Distribution: Developer self-install
- Single `.lua` file
- Dependency installation documented in README: install mavriq-lua-sockets via ReaPack
- No ReaPack manifest needed for this project

### Test Infrastructure
- **Test framework:** A lightweight custom Lua test harness (`tests/test_runner.lua`) written in pure Lua, runnable with the system `lua` binary (Lua 5.4) outside REAPER
- **Test command:** `lua tests/test_runner.lua` (run from repo root)
- **Testable modules:** Everything except the REAPER API call sites — all logic is extracted into pure functions that receive data as arguments and return results
- The REAPER API surface is abstracted behind a thin interface that can be stubbed in tests

---

## API Specification

All responses are JSON. All POST bodies are JSON. HTTP version 1.0 (no keep-alive).

### GET /status
Returns current REAPER transport state.

**Response:**
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
  "position_beat_in_measure": 1.0
}
```

### POST /play
Triggers REAPER transport play (action 1007).

**Response:** `{"ok": true}`

### POST /stop
Triggers REAPER transport stop (action 1016).

**Response:** `{"ok": true}`

### POST /record
Toggles REAPER global record state (action 1013 — Transport: Record).

**Response:** `{"ok": true}`

### POST /tempo
Changes project BPM.

**Request:** `{"bpm": 140.0}`
**Response:** `{"ok": true, "bpm": 140.0}`
**Validation:** bpm must be a number between 20 and 999.

### POST /timesig
Schedules a time signature change at a specific measure number.

**Request:** `{"numerator": 3, "denominator": 4, "measure": 5}`
**Response:** `{"ok": true, "numerator": 3, "denominator": 4, "measure": 5}`
**Validation:**
- numerator: integer 1–64
- denominator: integer, must be a power of 2 (1, 2, 4, 8, 16, 32, 64)
- measure: integer >= 1

**Implementation note:** Uses `reaper.SetTempoTimeSigMarker(0, -1, -1, measure-1, -1, -1, numerator, denominator, false)` — ptidx=-1 inserts a new marker, measurepos is 0-indexed.

### POST /track/:n/mute
Toggles mute on track `n` (1-indexed).

**Response:** `{"ok": true, "track": 1, "muted": true}`

### POST /track/:n/solo
Toggles solo on track `n` (1-indexed).

**Response:** `{"ok": true, "track": 1, "soloed": true}`

### POST /track/:n/volume
Sets volume on track `n` (1-indexed).

**Request:** `{"volume": 0.75}` — linear scalar, 0.0 to 2.0 (1.0 = unity, 2.0 = +6dB)
**Response:** `{"ok": true, "track": 1, "volume": 0.75}`

### Error Responses
All errors return an appropriate HTTP status code and JSON body:
```json
{"error": "description of problem"}
```

HTTP status codes used:
- 200: success
- 400: bad request (validation failure, malformed JSON)
- 404: unknown route or track not found
- 405: method not allowed
- 500: internal REAPER API failure

---

## File Structure

```
rehearsaltools/
├── README.md
├── reaper_http_remote.lua        # Main script (the ReaScript)
├── tests/
│   ├── test_runner.lua           # Lightweight test harness
│   ├── test_http.lua             # Tests for HTTP parsing/routing/response
│   ├── test_json.lua             # Tests for JSON encode/decode
│   ├── test_validation.lua       # Tests for request validation logic
│   └── test_handlers.lua         # Tests for handler logic (REAPER API stubbed)
```

The main script (`reaper_http_remote.lua`) is structured as a set of pure modules (HTTP, JSON, routing, handlers, validation) followed by a thin REAPER-integration section that wires everything together and starts the defer loop. The modules are written so they can be `require`'d by the test harness without REAPER being present.

---

## Constraints and Risks

1. **mavriq-lua-sockets availability:** The script will fail to start with a clear error message if the library is not installed. A startup check prints a human-readable error to the REAPER console.

2. **Non-blocking I/O with partial reads:** HTTP requests must be read with timeout(0). For requests with bodies (POST), the script may need to accumulate data across defer ticks. For simplicity in v1, POST bodies are assumed to be <= 4KB and readable in one non-blocking read. This covers all realistic rehearsal API payloads.

3. **REAPER API availability in tests:** All REAPER API calls (`reaper.*`) are isolated to a single `reaper_api.lua` adapter module. Tests inject a stub table in place of the global `reaper`. This is the standard pattern for testable ReaScript code.

4. **Track indexing:** REAPER tracks are 0-indexed internally. The HTTP API is 1-indexed (natural for musicians). The adapter layer converts.

5. **SetTempoTimeSigMarker measure indexing:** The `measurepos` parameter is 0-indexed. A user requesting measure 5 passes `measure=5` and the script uses `measurepos=4`.

6. **Denominator validation:** REAPER only accepts power-of-2 denominators for time signatures. Invalid denominators return 400.

---

## Out of Scope (v1)

- Authentication / API keys
- Track record arming (per-track arm/disarm)
- Persistent connection / keep-alive
- MIDI over HTTP
- OSC protocol support
- ReaPack distribution packaging
