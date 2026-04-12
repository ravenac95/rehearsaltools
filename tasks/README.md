# rehearsaltools — Task Plan

This directory contains the implementation plan for the REAPER HTTP Remote Control ReaScript.

**These task files are prompts for AI agents. Delete each file after the task is completed. When all task files are deleted, the feature is complete.**

---

## Summary

A self-contained Lua ReaScript for REAPER that embeds a non-blocking HTTP/1.0 server, exposing a REST/JSON API for remote transport control, time signature scheduling, tempo changes, and per-track mixing over a local network.

**Language:** Lua (REAPER's embedded Lua 5.4)
**Networking:** mavriq-lua-sockets (LuaSocket-compatible, installed via ReaPack)
**Server model:** Non-blocking TCP, one connection per `reaper.defer()` tick
**Tests:** Custom Lua test harness, run with `lua tests/test_runner.lua`
**TDD:** Enabled — tests written before implementation for all testable modules

---

## Task List

| # | File | Description | Status |
|---|------|-------------|--------|
| 1 | `task-01-test-harness-and-json.md` | Test harness + JSON encode/decode | TODO |
| 2 | `task-02-http-parser.md` | HTTP request parser + response builder + router | TODO |
| 3 | `task-03-validation.md` | Request payload validation module | TODO |
| 4 | `task-04-reaper-adapter.md` | REAPER API adapter (injectable, testable) | TODO |
| 5 | `task-05-handlers.md` | API endpoint handler functions | TODO |
| 6 | `task-06-router.md` | Router — dispatches requests to handlers | TODO |
| 7 | `task-07-main-script.md` | Main ReaScript — TCP server + defer loop | TODO |

---

## Dependency Graph

```
Task 1 (harness + JSON)
  └── Task 2 (HTTP parser)       ─┐
  └── Task 3 (validation)         ├── Task 6 (router) ── Task 7 (main script)
  └── Task 4 (REAPER adapter)    ─┤
        └── Task 5 (handlers)    ─┘
```

Tasks 2, 3, and 4 can be done in parallel after Task 1 is complete.
Task 5 requires Tasks 1, 3, and 4.
Task 6 requires Tasks 2 and 5.
Task 7 requires Tasks 2, 4, and 6 (all prior tasks effectively).

---

## File Structure (after all tasks complete)

```
rehearsaltools/
├── README.md                         # Project README (updated in Task 7)
├── reaper_http_remote.lua            # Main ReaScript (Task 7)
├── src/
│   ├── json.lua                      # JSON encoder/decoder (Task 1)
│   ├── http.lua                      # HTTP parser + response builder (Task 2)
│   ├── validation.lua                # Request validation (Task 3)
│   ├── reaper_api.lua                # REAPER API adapter (Task 4)
│   ├── handlers.lua                  # Endpoint handlers (Task 5)
│   └── router.lua                    # Request router (Task 6)
└── tests/
    ├── test_runner.lua               # Test harness entry point (Task 1)
    ├── test_json.lua                 # JSON tests (Task 1)
    ├── test_http.lua                 # HTTP tests (Task 2)
    ├── test_validation.lua           # Validation tests (Task 3)
    ├── test_reaper_adapter.lua       # Adapter tests (Task 4)
    ├── test_handlers.lua             # Handler tests (Task 5)
    └── test_router.lua              # Router integration tests (Task 6)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /status | Transport state, BPM, time sig, position |
| POST | /play | Start playback |
| POST | /stop | Stop transport |
| POST | /record | Toggle record |
| POST | /tempo | Set BPM (`{"bpm": 140}`) |
| POST | /timesig | Schedule time sig change (`{"numerator":3,"denominator":4,"measure":5}`) |
| POST | /track/:n/mute | Toggle mute on track n (1-indexed) |
| POST | /track/:n/solo | Toggle solo on track n (1-indexed) |
| POST | /track/:n/volume | Set track volume (`{"volume": 0.75}`, 0.0–2.0 linear) |

---

## Test Command

```bash
lua tests/test_runner.lua
```

Requires Lua 5.4 installed on the development machine. Does not require REAPER.

---

## Open Decisions

None — all questions resolved via planning Q&A. See `updated-prd.md` for the full specification.
