# Task 2: HTTP Request Parser and Response Builder

## Objective
Implement a pure-Lua HTTP/1.0 request parser and response builder module, fully tested before implementation.

## Dependencies
Depends on: Task 1 (test harness and JSON module must exist)

## Requirements

### 2.1 HTTP module (`src/http.lua`)

Write a pure-Lua module (returns a table) that handles HTTP/1.0 request parsing and response serialization. This module has zero dependencies on REAPER APIs or socket libraries — it operates entirely on Lua strings.

**`http.parse_request(raw_string)`**

Parses a raw HTTP request string. Returns a table on success, or `nil, error_message` on failure.

The returned request table has the following fields:
- `method` — string, uppercased: `"GET"`, `"POST"`, etc.
- `path` — string: the URL path without query string, e.g. `"/track/2/mute"`
- `path_parts` — table of path segments split by `/`, e.g. `{"track", "2", "mute"}` (leading empty string from the leading slash is dropped)
- `query` — string: raw query string (after `?`), or `""` if none
- `headers` — table of lowercased header names → values, e.g. `{["content-type"] = "application/json"}`
- `body` — string: the raw request body (may be empty string)
- `content_length` — number: parsed `Content-Length` header value, or 0 if absent

Parsing rules:
- Request line format: `METHOD PATH HTTP/version\r\n`
- Headers end at the first blank line (`\r\n\r\n`)
- Body is everything after the blank line (up to `content_length` bytes — for simplicity, take whatever follows the blank line)
- Header names are case-folded to lowercase
- Handles both `\r\n` and `\n` line endings for robustness

**`http.build_response(status_code, body_string, extra_headers)`**

Builds a raw HTTP/1.0 response string.

- `status_code` — integer (200, 400, 404, etc.)
- `body_string` — string (already serialized, e.g. JSON)
- `extra_headers` — optional table of additional headers to include

Always includes:
- `Content-Type: application/json`
- `Content-Length: <length of body>`
- `Connection: close`

Status line uses standard reason phrases for: 200 OK, 400 Bad Request, 404 Not Found, 405 Method Not Allowed, 500 Internal Server Error.

**`http.json_response(status_code, lua_table)`**

Convenience wrapper: encodes `lua_table` with the JSON module, then calls `build_response`. Requires the JSON module (`src/json.lua`).

**`http.route(request, routes_table)`**

Matches a parsed request to a route and returns the matched handler function plus any path parameters.

- `routes_table` — a list of `{method, pattern, handler}` entries, where pattern is a path template string using `:param` placeholders, e.g. `"/track/:n/mute"`
- Returns `handler_fn, params_table` where `params_table` is a string→string map of named captures (e.g. `{n = "2"}`)
- Returns `nil, nil` if no route matches
- Routes are matched in order (first match wins)
- Pattern matching is exact for literal segments and captures any single path segment for `:param` placeholders

### 2.2 HTTP tests (`tests/test_http.lua`)

Write tests before implementing. Tests must cover:

**parse_request:**
- Parses a minimal GET request with no body
- Parses a POST request with JSON body and Content-Length header
- Lowercases header names
- Populates `path_parts` correctly for multi-segment paths
- Strips query string from path and stores it in `query`
- Returns nil + error on completely malformed input (empty string, no request line)
- Handles `\n`-only line endings (no `\r`)

**build_response:**
- 200 response includes correct status line and required headers
- 404 response has correct reason phrase
- Content-Length matches actual body length
- Body is present and correct

**json_response:**
- Produces a valid JSON body from a Lua table
- Status code and Content-Type are correct

**route:**
- Matches exact literal path
- Matches path with `:param` placeholder and extracts value
- Matches multi-segment path with one placeholder (e.g. `/track/:n/mute`)
- Returns nil for unknown path
- Returns nil for correct path but wrong method
- First-match-wins: earlier route takes priority over later route for same path

## File Locations
- `src/http.lua` — HTTP module
- `tests/test_http.lua` — HTTP tests

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` passes all HTTP tests
- [ ] `http.parse_request` correctly handles all request formats used by the API
- [ ] `http.route` correctly matches all 9 API endpoints including `/track/:n/mute`, `/track/:n/solo`, `/track/:n/volume`
- [ ] `http.build_response` produces syntactically valid HTTP/1.0 responses
- [ ] Module has no dependency on REAPER APIs or socket libraries
- [ ] Existing Task 1 tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_http.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua`
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First

1. **parse GET:** `http.parse_request("GET /status HTTP/1.0\r\n\r\n")` returns `{method="GET", path="/status", body="", ...}`
2. **parse POST with body:** Full POST request string → method is POST, body is the JSON string
3. **parse headers lowercase:** `Content-Type` header key becomes `"content-type"`
4. **parse path_parts:** `/track/2/mute` → `path_parts = {"track", "2", "mute"}`
5. **parse query string:** `/status?foo=bar` → `path = "/status"`, `query = "foo=bar"`
6. **parse malformed:** empty string → `nil, <error>`
7. **parse LF-only:** request with `\n` instead of `\r\n` → parses successfully
8. **build 200:** status line is `"HTTP/1.0 200 OK\r\n"`
9. **build 404:** status line is `"HTTP/1.0 404 Not Found\r\n"`
10. **build content-length:** Content-Length header equals `#body_string`
11. **json_response table:** encodes `{ok=true}` as `'{"ok":true}'`
12. **route literal match:** `GET /status` matches `{"GET", "/status", handler}` route
13. **route param capture:** `POST /track/3/mute` matches `{"POST", "/track/:n/mute", handler}` with `params.n = "3"`
14. **route no match:** `POST /unknown` returns `nil, nil`
15. **route method mismatch:** `GET /record` does NOT match `{"POST", "/record", handler}`
16. **route first match wins:** two routes for same path — first handler is returned

### TDD Process
1. Write all tests in `tests/test_http.lua` — they FAIL (RED)
2. Implement `src/http.lua` until all tests pass (GREEN)
3. Run `lua tests/test_runner.lua` — all Task 1 and Task 2 tests must pass
4. Refactor while keeping green
