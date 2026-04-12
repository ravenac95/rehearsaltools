# Task 7: Main ReaScript — TCP Server and Defer Loop

## Objective
Implement the top-level `reaper_http_remote.lua` ReaScript that starts a non-blocking TCP server, runs the defer loop, and wires together all modules. This is the file users install into REAPER.

## Dependencies
Depends on: Task 2 (HTTP), Task 4 (REAPER adapter), Task 6 (router)
All prior modules (Tasks 1–6) must be complete.

## Requirements

### 7.1 Script structure

The main script `reaper_http_remote.lua` is the only file that runs inside REAPER. It must be structured as a top-level script (not a module) with the following sections in order:

**Section 1: Dependency check**

Before doing anything else, attempt to `require` the LuaSocket library (via mavriq-lua-sockets). If the require fails, show a clear error in the REAPER console and abort.

```lua
local socket_ok, socket = pcall(require, "socket")
if not socket_ok then
  reaper.ShowConsoleMsg(
    "[HTTP Remote] ERROR: LuaSocket not found.\n" ..
    "Install mavriq-lua-sockets via ReaPack, then restart REAPER.\n"
  )
  return  -- abort script
end
```

**Section 2: Module path setup**

Add the script's own directory to `package.path` so that the `src/` subdirectory can be found via `require`. Use `reaper.GetResourcePath()` or `({reaper.get_action_context()})[2]` to locate the script file, then derive the directory.

```lua
local script_path = ({reaper.get_action_context()})[2]
local script_dir = script_path:match("^(.*[/\\])")
package.path = script_dir .. "src/?.lua;" .. package.path
```

**Section 3: Module loading**

```lua
local json     = require("json")
local reaper_api = require("reaper_api")
local router   = require("router")
```

**Section 4: Configuration constants**

```lua
local HOST = "0.0.0.0"   -- listen on all interfaces
local PORT = 8765         -- default port; can be changed here
```

**Section 5: Server startup**

Create a TCP server socket with LuaSocket:

```lua
local server = assert(socket.tcp())
server:setoption("reuseaddr", true)
assert(server:bind(HOST, PORT))
assert(server:listen(5))
server:settimeout(0)  -- non-blocking: accept() returns immediately if no connection
```

On success, print to the REAPER console:
```
[HTTP Remote] Listening on http://0.0.0.0:8765
```

On failure (e.g., port in use), show an error and return.

**Section 6: Adapter and router initialization**

```lua
local adapter = reaper_api.new()         -- uses global `reaper`
local rt = router.new(adapter)
```

**Section 7: The defer loop**

Define a `main_loop` function and register it with `reaper.defer`:

```lua
local function main_loop()
  -- Accept one incoming connection (non-blocking)
  local client, err = server:accept()
  if client then
    client:settimeout(0.05)  -- short blocking read timeout (50ms max)
    local data, recv_err, partial = client:receive("*a")
    -- "receive *a" reads until connection closes or timeout
    -- Partial data fallback: for POST bodies sent before connection close,
    -- LuaSocket may return nil + "timeout" + partial string.
    -- All realistic API payloads are < 4KB on a local network.
    local request_data = data or partial or ""
    if #request_data > 0 then
      local response = rt.handle(request_data)
      client:send(response)
    end
    client:close()
  end

  -- Re-register for next REAPER tick
  reaper.defer(main_loop)
end

reaper.defer(main_loop)
```

**Section 8: Cleanup on script termination**

REAPER does not have a guaranteed script teardown hook. Document in a comment that to stop the server, the user removes the script from the action list or uses the REAPER script manager to terminate it. The server socket will be garbage-collected when the Lua VM is torn down.

### 7.2 Console logging

Add a small utility at the top of the script for consistent logging:

```lua
local function log(msg)
  reaper.ShowConsoleMsg("[HTTP Remote] " .. tostring(msg) .. "\n")
end
```

Use `log()` for:
- Startup confirmation (address and port)
- Any `pcall`-caught errors from the server accept loop (log and continue — don't crash)

### 7.3 No automated tests for this file

`reaper_http_remote.lua` cannot be run by the test harness because it calls `reaper.*` APIs directly (outside the adapter). It is tested by manual integration testing inside REAPER (see Acceptance Criteria). The modules it calls (router, handlers, adapter, HTTP, JSON) are all covered by automated tests in prior tasks.

### 7.4 README update

Update `README.md` with:
1. **What it does** — brief description
2. **Installation**
   - Install mavriq-lua-sockets via ReaPack (link to ReaPack homepage)
   - Copy `reaper_http_remote.lua` and the `src/` directory to REAPER's Scripts directory
   - Add the script as a REAPER Action (Actions → Load ReaScript)
   - Run the action — it starts the HTTP server
3. **API reference** — table of all 10 endpoints (method, path, description), including `POST /session/new`
4. **Default port** — 8765, note it is configurable at the top of the script
5. **Running tests** — `lua tests/test_runner.lua` (requires Lua 5.4 installed)
6. **Stopping the server** — terminate the script from REAPER's script manager or action list
7. **Session warning** — note that `POST /session/new` will discard the current project and that REAPER may show a native "save changes?" dialog

## File Locations
- `reaper_http_remote.lua` — main script (repo root)
- `README.md` — update in place

## Acceptance Criteria
- [ ] Script starts without errors inside REAPER when mavriq-lua-sockets is installed
- [ ] `[HTTP Remote] Listening on http://0.0.0.0:8765` appears in the REAPER console on start
- [ ] `curl http://localhost:8765/status` returns a 200 JSON response from REAPER
- [ ] `curl -X POST http://localhost:8765/play` causes REAPER transport to play
- [ ] `curl -X POST http://localhost:8765/stop` stops transport
- [ ] `curl -X POST -H "Content-Type: application/json" -d '{"bpm":140}' http://localhost:8765/tempo` changes the project BPM to 140
- [ ] `curl -X POST -H "Content-Type: application/json" -d '{"numerator":3,"denominator":4,"measure":5}' http://localhost:8765/timesig` inserts a 3/4 time signature marker at measure 5
- [ ] `curl -X POST http://localhost:8765/session/new` opens a new empty REAPER project (REAPER may prompt to save)
- [ ] `curl -X POST http://localhost:8765/track/1/mute` toggles mute on track 1
- [ ] Unknown routes return 404 JSON
- [ ] If mavriq-lua-sockets is not installed, the script shows a clear error in the REAPER console and does not crash REAPER
- [ ] Script survives REAPER continuing to run after script termination (no process-level crash)
- [ ] `lua tests/test_runner.lua` still passes all automated tests (no regressions from README or script changes)
- [ ] README clearly documents all 10 endpoints, installation steps, test command, and session/new warning

## TDD Mode

No automated TDD for this task — the main script is integration-only code that wraps the REAPER environment. All underlying logic is already covered by tests in Tasks 1–6.

Manual integration test sequence (document in a checklist comment at the bottom of `reaper_http_remote.lua`):

1. Install mavriq-lua-sockets via ReaPack
2. Copy script and `src/` to REAPER Scripts dir
3. Load as action and run — verify console message
4. Run `curl http://localhost:8765/status` — verify JSON response
5. Run `curl -X POST http://localhost:8765/play` — REAPER plays
6. Run `curl -X POST http://localhost:8765/stop` — REAPER stops
7. Run `curl -X POST -d '{"bpm":140}' http://localhost:8765/tempo` — BPM changes
8. Run `curl -X POST -d '{"numerator":3,"denominator":4,"measure":5}' http://localhost:8765/timesig` — timesig marker inserted
9. Run `curl -X POST http://localhost:8765/session/new` — new empty project opens (save dialog may appear)
10. Run `curl -X POST http://localhost:8765/track/1/mute` twice — mute toggles on, then off
