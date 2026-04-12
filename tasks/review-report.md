# Code Review Report

## Compliance Score
9/10

## Summary
The implementation is solid, well-structured, and closely follows the PRD. All 10 REST endpoints are implemented and routed correctly. The full test suite (220 tests) passes with zero failures. Module boundaries are clean, the REAPER API is properly isolated behind an injectable adapter, and TDD was followed consistently across all tasks. A few minor issues were found, none of which are critical blockers.

### Critical
- No critical issues found.

### Important

1. **`handlers.lua` and `router.lua` use `dofile()` for module loading, creating fragile path assumptions.** `handlers.lua` uses `dofile("src/json.lua")` and `dofile("src/validation.lua")` with hardcoded relative paths. This works when running tests from the repo root and when REAPER sets `package.path`, but it means the module cannot be loaded via `require()` from any other working directory. Inside REAPER, the main script sets up `package.path` and uses `require()`, but `handlers.lua` bypasses this by calling `dofile()` directly. If REAPER's working directory is not the repo root, these `dofile()` calls could fail. The `router.lua` module has a `load_module()` helper that tries `dofile()` first and falls back to `require()`, which is more robust but still inconsistent with how `handlers.lua` loads its dependencies. Recommendation: all `src/` modules should use `require()` exclusively, since the main script and test runner both set up `package.path` appropriately.

2. **`http.lua` uses `dofile` with a fallback `or require` pattern on line 5.** The expression `local json = dofile and dofile("src/json.lua") or require("json")` is not a correct guard: `dofile` is always truthy (it is a standard Lua function), so the `or require("json")` branch is unreachable. This happens to work because `dofile("src/json.lua")` succeeds when the working directory is the repo root, but the fallback is dead code. If `dofile` fails (e.g., wrong working directory inside REAPER), it will raise an error rather than falling through to `require`.

3. **`json.encode` is not purely deterministic for mixed tables.** The `is_array` check on line 81 has redundant/confusing logic: `is_array(t == "table" and val or {})` always evaluates to `is_array(val)` since `t` is a string `"table"` (truthy), making the `t == "table"` comparison always true at that point. This is not a bug but is confusing to read. The encoder also has two separate object-encoding branches (lines 93-109 and lines 111-128) that handle the same case with slightly different key-type validation. The first branch requires string keys only; the second branch allows string or number keys. This inconsistency could lead to surprising behavior if a table has mixed integer and string keys that don't form a contiguous array.

4. **`find_allowed_method` in `router.lua` returns only the first matching method, not all allowed methods.** For routes where multiple methods could apply to the same path pattern (not the case currently), the `Allow` header would only include one method. For the current route table this is fine since each path has exactly one method, but it's worth noting for future extensibility.

5. **`set_tempo` in `reaper_api.lua` passes `0, 0` for timesig_num/timesig_denom (line 54).** The PRD says this should leave the time signature unchanged. While REAPER documentation suggests that passing 0 for these parameters means "no change," some REAPER versions may interpret 0 as an explicit value. The `set_timesig_at_measure` function correctly uses `-1` for the bpm parameter to mean "no change." For consistency and safety, `set_tempo` should also use `-1` for the timesig parameters, or `0` should be validated as safe with the target REAPER version. The task-04 spec explicitly says to use `0, 0` so this matches the spec, but it is a potential runtime issue.

6. **No CORS headers.** The PRD describes the primary use case as "live rehearsal control from a phone or tablet on the same local network." If the client is a web app running in a mobile browser, cross-origin requests will be blocked without `Access-Control-Allow-Origin` headers. This is not in the PRD's scope for v1 but is worth flagging as a likely real-world issue.

### Minor

1. **`POST /record` description in README says "Start recording" but the PRD says "Toggles REAPER global record state."** The README table should say "Toggle recording" for accuracy.

2. **Dead `split_lines` function in `http.lua` (line 50).** The function `split_lines` is defined but never called. It should be removed.

3. **`json.encode` handles NaN and Inf by converting to `"null"` (lines 61-63).** This is reasonable defensive behavior but is undocumented and untested. Consider adding a test for `json.encode(0/0)` and `json.encode(math.huge)`.

4. **The `position_beat_in_measure` field in the PRD response example shows `1.0` (a float) but the handler returns `beats_0indexed + 1` which could be an integer or float depending on the adapter's return value.** The test stub returns integer 0, so the test asserts integer 2. This is consistent but the PRD shows 1.0 (float). Minor type inconsistency.

5. **`test_router.lua` line 143 has a likely assertion bug:** `assert_not_nil(body.muted ~= nil, ...)` always passes because `body.muted ~= nil` evaluates to a boolean (true or false), and `assert_not_nil(true)` or `assert_not_nil(false)` always passes (neither is nil). The same pattern appears on line 157 with `body.soloed`. These assertions should be `assert_true(body.muted ~= nil)` or simply check that the key exists another way.

6. **`reaper_http_remote.lua` wraps the `rt.handle` call in `pcall` (line 113), but `router.handle` already wraps the handler call in `pcall` (router.lua line 97).** This double-pcall is not harmful but is redundant. The outer pcall in the main script would only catch errors in the router's own dispatch logic (parsing, routing, JSON encoding of the response), which is a reasonable safety net.

7. **`reaper_http_remote.lua` uses `server:setoption("reuseaddr", true)` and error-checks bind/listen manually.** The task spec used `assert()` for bind/listen, but the implementation uses manual error checking with `log()` and `return`, which is actually better UX (cleaner error messages). Not a problem, just a noted deviation from the spec that improves the code.

## Test Coverage Assessment

### TDD Compliance Summary
- **Task 1 (Test harness + JSON):** Full compliance. 30 JSON tests covering encode, decode, round-trip, error cases. Harness has all required assertion helpers plus `assert_error`.
- **Task 2 (HTTP parser):** Full compliance. 23 tests covering parse_request, build_response, json_response, and route matching.
- **Task 3 (Validation):** Full compliance. 40 tests covering all validators, all error branches, boundary values, and helper functions. All specified error message strings are verified.
- **Task 4 (REAPER adapter):** Full compliance. 17 tests covering track index translation, mute/solo encoding, tempo/timesig parameter translation, transport action IDs, and project operations.
- **Task 5 (Handlers):** Full compliance. 48 tests covering all 10 handlers with happy paths, validation failures, 404 cases, adapter spy verification, and toggle logic.
- **Task 6 (Router):** Full compliance. 21 integration tests covering all endpoints end-to-end, 404/405 detection, malformed requests, handler errors producing 500, and response format validation.
- **Task 7 (Main script):** No automated tests (as specified). Manual integration checklist is included as comments in the script.

### Missing Test Coverage Areas
- **JSON encoder edge cases:** No tests for NaN, Infinity, or very large numbers. No tests for strings with control characters other than the standard escapes.
- **HTTP parser edge cases:** No test for requests with extremely long paths, headers, or bodies. No test for HTTP methods other than GET/POST (e.g., PUT, DELETE, OPTIONS).
- **Router 405 with track paths:** No test for `GET /track/1/mute` returning 405 (method not allowed). Only `/record` and `/session/new` are tested for 405.
- **Volume handler missing body:** No test for `POST /track/1/volume` with an empty body (no JSON at all). This would exercise the `json.decode("")` path.
- **Assertion bug in test_router.lua lines 143, 157:** The `assert_not_nil(body.muted ~= nil)` pattern does not actually verify the key exists (see Minor issue #5 above).

## PRD Compliance

| Endpoint | Implemented | Routed | Tested | Response Format | Notes |
|----------|-------------|--------|--------|-----------------|-------|
| `GET /status` | Yes | Yes | Yes | Matches PRD | All fields present |
| `POST /play` | Yes | Yes | Yes | `{"ok":true}` | Action 1007 confirmed in adapter test |
| `POST /stop` | Yes | Yes | Yes | `{"ok":true}` | Action 1016 confirmed |
| `POST /record` | Yes | Yes | Yes | `{"ok":true}` | Action 1013 confirmed |
| `POST /tempo` | Yes | Yes | Yes | `{"ok":true,"bpm":N}` | Validation range [20,999] correct |
| `POST /timesig` | Yes | Yes | Yes | `{"ok":true,...}` | Measure 0-indexing conversion correct |
| `POST /session/new` | Yes | Yes | Yes | `{"ok":true}` | Body correctly ignored; `Main_openProject("")` confirmed |
| `POST /track/:n/mute` | Yes | Yes | Yes | `{"ok":true,"track":N,"muted":bool}` | Toggle logic correct |
| `POST /track/:n/solo` | Yes | Yes | Yes | `{"ok":true,"track":N,"soloed":bool}` | Solo-in-place (I_SOLO=2) correct |
| `POST /track/:n/volume` | Yes | Yes | Yes | `{"ok":true,"track":N,"volume":V}` | Range [0.0, 2.0] correct |

**Error handling compliance:**
- 400 for malformed requests: Yes
- 400 for validation failures: Yes
- 404 for unknown routes: Yes
- 404 for track not found: Yes
- 405 for wrong method on known path: Yes
- 500 for internal errors: Yes (pcall-wrapped handlers)

**Architecture compliance:**
- Non-blocking TCP via `socket:settimeout(0)`: Yes
- `reaper.defer()` loop: Yes
- Single connection per tick: Yes
- HTTP/1.0 with `Connection: close`: Yes
- LuaSocket dependency check with clear error: Yes
- Track 1-indexing in API, 0-indexing internally: Yes
- All REAPER API calls isolated in `reaper_api.lua`: Yes
- Modules testable without REAPER: Yes (220 tests pass outside REAPER)

**File structure compliance:** Matches PRD exactly. All specified files exist in the correct locations.

**README compliance:** Complete. Covers installation, all 10 endpoints, examples, port configuration, testing, stopping, session warning, and architecture overview. Minor inaccuracy: `/record` described as "Start recording" instead of "Toggle recording."
