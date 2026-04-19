# Planning Questions

## Codebase Summary

The ReaScript entry point is `reascripts/rehearsaltools.lua`. It reads the OSC payload, then calls `dispatch.run(adapter, data, script_dir)`. Dispatch (`src/dispatch.lua`) loads six handler modules via `dofile`, then routes on `payload.command` to the matching handler. Each handler follows one of two shapes:

- **Simple callable**: `M.new(adapter)` returns a single `function(payload)` (project, tempo, timesig, mixdown, songform).
- **Method table**: `M.new(adapter)` returns a table of named functions (regions — new, rename, list, play, seek_to_end).

All handlers receive only `adapter` (a dependency-injected wrapper around the REAPER API). There is no shared context object, no request-ID concept, and no existing logger. The only current console output lives in the top-level entry point (`rehearsaltools.lua`) and in `adapter.console(msg)` (which wraps `r.ShowConsoleMsg`).

`adapter.console` is already defined on the adapter object (`src/reaper_api.lua` line 191). The test stub in `test_reaper_adapter.lua` already stubs `ShowConsoleMsg` into the calls log. Handler tests (`test_handlers.lua`) use a hand-rolled `make_adapter()` stub that does NOT currently have a `console` method — any logging approach that routes through the adapter would require adding it there.

Key structural facts:
- Every handler file resolves its own `script_dir` via `reaper.get_action_context()` at module load time, then `dofile`s `validation.lua`.
- A new `src/logger.lua` module would need the same `script_dir`-based loading pattern, or it would need to be passed in as a dependency (like the adapter).
- `dispatch.run` is the single choke point that both loads all handlers and holds `script_dir` and `adapter` — the cleanest injection site.
- No `GetExtState`/`SetExtState` calls exist anywhere today.

---

## Questions

### Q1: Where should the "logging enabled" flag live?

**Context:** Three realistic options exist given the codebase. A module-level constant is simplest but requires a code edit to toggle. `reaper.GetExtState` lets REAPER persist the flag between sessions without code changes and is already stubbed in `test_reaper_adapter.lua` (`ShowConsoleMsg` is there; `GetExtState` would need adding). A field on the adapter is the most test-friendly but requires the adapter to know about logging concerns.

**Question:** Which mechanism should gate whether logs are emitted?

**Options:**

- A) A `LOG_ENABLED = true/false` constant at the top of `src/logger.lua` — simplest, requires editing the file to toggle.
- B) `reaper.GetExtState("rehearsaltools", "log_enabled")` read once at script startup — persists across REAPER sessions, togglable without code changes via a small companion action or REAPER's ext-state API.
- C) A field passed into the logger at construction time (e.g., `logger.new({ enabled = true })`), with the value hard-coded in `rehearsaltools.lua` for now — clean seam for future extension, easy to stub in tests.

---

### Q2: How should the logger be injected into handlers?

**Context:** Handlers currently receive only `adapter`. Adding a second parameter would change every `M.new(adapter)` signature. The alternative is to bundle a `log` function onto the adapter itself (adapter already has `adapter.console`), or to have handlers load the logger themselves via `dofile`/script_dir (the same pattern used for `validation`). Dispatch (`dispatch.dispatch`) is the one place that calls all six `M.new(adapter)` calls, so signature changes are localized there.

**Question:** How should the logger reach handler code?

**Options:**

- A) Add a `logger` second argument to every handler's `M.new(adapter, logger)` — explicit, testable, requires updating all six handlers and `dispatch.dispatch`.
- B) Add `adapter.log(level, msg)` / `adapter.log_enabled` directly to the adapter object — no signature changes, handlers already have `adapter`, test stubs just need a `log` no-op added to `make_adapter()`.
- C) Handlers `dofile` the logger themselves (same pattern as `validation`) — no signature change, but the logger reads its own enabled flag and each handler independently loads it.

---

### Q3: What log points should be covered, and at what granularity?

**Context:** The request says "lots of logging for now." The natural points in the dispatch flow are: (1) request received with command name, (2) pre-handler with stripped payload, (3) post-handler with result or error, (4) inside individual handlers at key decision points (validation failure, adapter calls made, computed values). Points 1–3 can be done entirely in `dispatch.lua`. Point 4 requires touching each handler file.

**Question:** Which log points are required for this initial pass?

**Options:**

- A) **Dispatch-only** — log command received, payload summary, result/error at the dispatch layer only. Zero handler file changes beyond adding the logger dependency.
- B) **Dispatch + handler boundaries** — dispatch logs as above; each handler also logs at entry (payload shape) and exit (result or error string). Touches all six handler files.
- C) **Full verbose** — everything in B, plus intra-handler logs: validation outcome, each significant adapter call (e.g., "setting tempo to 140 bpm", "creating region 'intro' at t=10.0"), computed values in songform. Touches all six handler files more extensively.

---

### Q4: Should payload bodies be included in log output?

**Context:** Payloads are small JSON objects (BPM values, region names, output directories, song-form rows). The `songform.write` payload can be the largest — potentially dozens of rows, each with 4 fields. Region names and output directories are user-supplied strings. There is no authentication or PII concern identified, but output_dir paths and region names appear in log output and may be noise.

**Question:** Should full payload contents be logged, or only a summary (command name + top-level key list)?

**Options:**

- A) Log full payload bodies (serialized to a compact string) — maximum debuggability.
- B) Log only the command name and the set of top-level keys present (e.g., `"tempo {bpm}"`) — enough to confirm routing without verbosity.
- C) Log full bodies only when an error occurs; log key-list only on success.

---

### Q5: Should timing / duration be included in log output?

**Context:** Lua 5.4 (used here — test runner says "pure-Lua 5.4") provides `os.clock()` and `os.time()`. A per-dispatch wall-clock duration would help identify slow handlers (mixdown/render can take seconds). This is a small addition if the logger captures a start timestamp before the handler call and logs elapsed time afterward.

**Question:** Should each dispatched command log how long it took to execute?

**Options:**

- A) Yes — log elapsed time (ms) for every dispatch.
- B) No — keep it simple for now.

---

### Q6: Should `ShowConsoleMsg` be wrapped for testability, or is the existing `adapter.console` enough?

**Context:** `adapter.console` already calls `r.ShowConsoleMsg` and is indirectly testable (the `ShowConsoleMsg` stub exists in `test_reaper_adapter.lua`). If the logger is injected via the adapter (Q2 option B), test coverage of logging is straightforward — add a `console` (or `log`) call recorder to `make_adapter()`. If the logger is a standalone module that calls `reaper.ShowConsoleMsg` directly, it would need its own stub mechanism in tests, similar to how `payload.lua` guards on `reaper and reaper.get_action_context`.

**Question:** Should the logger call `adapter.console` (going through the adapter's `ShowConsoleMsg` wrapper) or call `reaper.ShowConsoleMsg` directly with the same guard pattern used in `payload.lua` and handlers?

**Options:**

- A) Call `adapter.console` — reuses existing abstraction, fully testable without extra stubs.
- B) Call `reaper.ShowConsoleMsg` directly, guarded by `reaper and reaper.ShowConsoleMsg` — standalone module, no adapter dependency, but requires adding a stub to `make_adapter()` tests to verify log calls.

---

### Q7: TDD mode

**Context:** The project has a working pure-Lua test harness (`tests/test_runner.lua`, run with `lua tests/test_runner.lua` from the `reascripts/` directory). Test files follow the `tests/test_*.lua` naming convention. Existing tests cover the adapter, handlers, dispatch, payload, and validation.

**Question:** Do you want TDD mode for this build? If yes, the task implementer will write failing tests before implementation code for each task (RED → GREEN → refactor).
