# Task 6: Router — Wiring Routes to Handlers

## Objective
Implement the router module that maps incoming parsed HTTP requests to the correct handler, calls the handler, and produces a complete HTTP response string.

## Dependencies
Depends on: Task 2 (HTTP module), Task 5 (handlers module)

## Requirements

### 6.1 Router module (`src/router.lua`)

Write a Lua module (returns a table) that owns the route table and the dispatch loop. It is the integration point between the HTTP layer and the handler layer.

**`router.new(adapter)`**

Factory function. Accepts the REAPER adapter and returns a router object. The router object has one method:

**`router_obj.handle(raw_request_string)`**

Given a raw HTTP request string (as read from the TCP socket):

1. Call `http.parse_request(raw_request_string)` — if parsing fails, return `http.build_response(400, '{"error":"malformed request"}')` as a raw response string
2. Call `http.route(request, ROUTE_TABLE)` → `handler_fn, params`
3. If no route matched, return a 404 JSON response
4. If method is wrong for a known path (detect by checking path-only match), return 405; otherwise 404
5. Call `handler_fn(request, adapter, params)` → `status_code, response_table`
6. Encode `response_table` with the JSON module
7. Return `http.build_response(status_code, json_string)` as a raw response string

The route table (defined as a module-level constant inside `src/router.lua`):

```
GET  /status                 → handlers.status
POST /play                   → handlers.play
POST /stop                   → handlers.stop
POST /record                 → handlers.record
POST /tempo                  → handlers.tempo
POST /timesig                → handlers.timesig
POST /session/new            → handlers.session_new
POST /track/:n/mute          → handlers.track_mute
POST /track/:n/solo          → handlers.track_solo
POST /track/:n/volume        → handlers.track_volume
```

Total: 10 routes.

**405 Method Not Allowed detection:**

The router must distinguish between "path exists but wrong method" (405) and "path doesn't exist" (404).

Approach: after failing to find a route match, scan the route table again for any entry whose path pattern matches (ignoring method). If found, return 405 with `Allow: POST` or `Allow: GET` header. Otherwise return 404.

**Error handling:**

If `handler_fn` raises a Lua error (pcall wrapper), the router returns a 500 response:
```json
{"error": "internal server error"}
```

Always wrap the handler call in `pcall`.

### 6.2 Router tests (`tests/test_router.lua`)

Tests inject a stub adapter and verify the full request→response pipeline.

Tests do NOT use a real TCP socket — they call `router_obj.handle(raw_string)` directly with handcrafted request strings.

Tests must cover:

- `GET /status` → returns a 200 response containing `"playing"` in the body
- `POST /play` → returns 200 with `{"ok":true}`
- `POST /stop` → returns 200 with `{"ok":true}`
- `POST /record` → returns 200 with `{"ok":true}`
- `POST /tempo` with valid body → returns 200
- `POST /tempo` with invalid body → returns 400
- `POST /timesig` with valid body → returns 200
- `POST /session/new` → returns 200 with `{"ok":true}` and no body required
- `POST /track/2/mute` → returns 200 with `"muted"` in body
- `POST /track/2/solo` → returns 200 with `"soloed"` in body
- `POST /track/2/volume` with valid body → returns 200
- `GET /unknown` → 404 response
- `GET /record` (wrong method) → 405 response
- `GET /session/new` (wrong method for a known path) → 405 response
- Malformed request (empty string) → 400 response
- Handler that raises a Lua error → 500 response

For tests that inspect the response body, parse it with `json.decode` and check fields.

### 6.3 Integration note

This module is the only module that `require`s both `src/http.lua` and `src/handlers.lua`. The dependency graph from router's perspective:

```
router → http (parse, route, build_response, json_response)
router → handlers (all handler functions)
router → json (for encoding handler return values)
```

## File Locations
- `src/router.lua` — router module
- `tests/test_router.lua` — router tests

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` passes all router tests
- [ ] All 10 API endpoints route to the correct handler
- [ ] `POST /session/new` routes to `handlers.session_new` and returns 200 with `{ok:true}`
- [ ] `GET /session/new` (wrong method) returns 405
- [ ] 404 returned for unknown paths
- [ ] 405 returned for known paths with wrong method
- [ ] 400 returned for malformed request strings
- [ ] 500 returned when handler raises a Lua error (not propagated)
- [ ] All responses are valid HTTP/1.0 strings (start with `HTTP/1.0 `)
- [ ] All response bodies are valid JSON (parseable by `json.decode`)
- [ ] All prior task tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_router.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua`
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First

Construct raw HTTP request strings manually for each test. Example helper:

```lua
local function make_request(method, path, body)
  body = body or ""
  return method .. " " .. path .. " HTTP/1.0\r\n" ..
    "Content-Length: " .. #body .. "\r\n\r\n" .. body
end
```

The stub adapter must include a `new_project` no-op stub so the `session_new` handler can call it without error.

1. **GET /status 200:** response starts with `"HTTP/1.0 200"`
2. **POST /play 200:** body decodes to `{ok=true}`
3. **POST /tempo valid:** `{"bpm":120}` body → 200
4. **POST /tempo invalid:** `{"bpm":5}` body → 400, body has `"error"` key
5. **POST /timesig valid:** `{"numerator":3,"denominator":4,"measure":1}` → 200
6. **POST /session/new no body:** `make_request("POST", "/session/new")` → 200, body decodes to `{ok=true}`
7. **POST /session/new with body:** arbitrary JSON body → still 200 (body ignored)
8. **GET /session/new wrong method:** → 405
9. **POST /track/2/mute:** → 200, `"muted"` key in body
10. **POST /track/99/mute:** stub returns nil for track 99 → 404
11. **GET /unknown:** → 404
12. **GET /record:** (correct path, wrong method) → 405
13. **empty request:** `router_obj.handle("")` → 400
14. **handler error:** inject a handler that calls `error("boom")` → 500
15. **POST /track/abc/volume:** → 400 (invalid track number)

### TDD Process
1. Write all tests with raw request strings — FAIL (RED) since `src/router.lua` doesn't exist
2. Implement `src/router.lua`
3. Run `lua tests/test_runner.lua` — all tests GREEN including prior tasks
