-- reaper_http_remote.lua
-- REAPER HTTP Remote Control ReaScript
--
-- This script starts a non-blocking HTTP/1.0 server inside REAPER using
-- LuaSocket (mavriq-lua-sockets). It exposes a REST API for controlling
-- transport, tempo, time signature, track mute/solo/volume, and sessions.
--
-- Installation:
--   1. Install mavriq-lua-sockets via ReaPack.
--   2. Copy this file and the src/ directory to REAPER's Scripts directory.
--   3. Add as a REAPER Action: Actions → Load ReaScript → select this file.
--   4. Run the action — the server starts and logs to the REAPER console.
--
-- Stopping the server:
--   Terminate the script from REAPER's Script Manager or Action List.
--   The server socket is garbage-collected when the Lua VM shuts down.
--
-- WARNING (POST /session/new):
--   This endpoint opens a new empty REAPER project, discarding the current
--   session. REAPER may show a native "Save changes?" dialog first.

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 1: Logging utility
-- ─────────────────────────────────────────────────────────────────────────────

local function log(msg)
  reaper.ShowConsoleMsg("[HTTP Remote] " .. tostring(msg) .. "\n")
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 2: Dependency check — LuaSocket
-- ─────────────────────────────────────────────────────────────────────────────

local socket_ok, socket = pcall(require, "socket")
if not socket_ok then
  reaper.ShowConsoleMsg(
    "[HTTP Remote] ERROR: LuaSocket not found.\n" ..
    "Install mavriq-lua-sockets via ReaPack, then restart REAPER.\n"
  )
  return  -- abort script
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 3: Module path setup
-- ─────────────────────────────────────────────────────────────────────────────

local script_path = ({reaper.get_action_context()})[2]
local script_dir  = script_path:match("^(.*[/\\])") or "./"
package.path = script_dir .. "src/?.lua;" .. package.path

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 4: Module loading
-- ─────────────────────────────────────────────────────────────────────────────

local json       = require("json")
local reaper_api = require("reaper_api")
local router_mod = require("router")

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 5: Configuration constants
-- ─────────────────────────────────────────────────────────────────────────────

local HOST = "0.0.0.0"   -- listen on all interfaces; change to "127.0.0.1" for localhost-only
local PORT = 8765         -- default port; change here if needed

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 6: Server startup
-- ─────────────────────────────────────────────────────────────────────────────

local server = socket.tcp()
server:setoption("reuseaddr", true)

local bind_ok, bind_err = server:bind(HOST, PORT)
if not bind_ok then
  log("ERROR: Cannot bind to " .. HOST .. ":" .. PORT .. " — " .. tostring(bind_err))
  log("Is the port already in use? Try changing PORT at the top of the script.")
  return
end

local listen_ok, listen_err = server:listen(5)
if not listen_ok then
  log("ERROR: Cannot listen: " .. tostring(listen_err))
  return
end

server:settimeout(0)  -- non-blocking: accept() returns immediately if no connection

log("Listening on http://" .. HOST .. ":" .. PORT)

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 7: Adapter and router initialisation
-- ─────────────────────────────────────────────────────────────────────────────

local adapter = reaper_api.new()          -- uses global `reaper` table
local rt      = router_mod.new(adapter)

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 8: The defer loop
-- ─────────────────────────────────────────────────────────────────────────────

local function main_loop()
  -- Accept one incoming connection (non-blocking; returns nil immediately if none).
  local client, accept_err = server:accept()
  if client then
    client:settimeout(0.05)  -- short read timeout (50ms) — all payloads are < 4KB

    -- "receive *a" reads until connection closes or timeout.
    -- On timeout, LuaSocket returns nil + "timeout" + partial string.
    local data, recv_err, partial = client:receive("*a")
    local request_data = data or partial or ""

    if #request_data > 0 then
      local ok, response = pcall(rt.handle, request_data)
      if ok then
        client:send(response)
      else
        -- Should not happen (router wraps handlers in pcall), but just in case.
        log("Unexpected error handling request: " .. tostring(response))
        client:send("HTTP/1.0 500 Internal Server Error\r\n" ..
                    "Content-Type: application/json\r\n" ..
                    "Content-Length: 27\r\n" ..
                    "Connection: close\r\n\r\n" ..
                    '{"error":"internal error"}')
      end
    end

    client:close()
  elseif accept_err and accept_err ~= "timeout" then
    log("Accept error: " .. tostring(accept_err))
  end

  -- Re-register for the next REAPER tick.
  reaper.defer(main_loop)
end

-- Kick off the loop.
reaper.defer(main_loop)

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 9: Cleanup note
-- ─────────────────────────────────────────────────────────────────────────────
-- REAPER does not provide a guaranteed script teardown hook.
-- To stop the server, terminate this script from REAPER's Script Manager
-- (Extensions → ReaScript → Show ReaScript console) or from the Action List.
-- The server socket will be garbage-collected when the Lua VM is torn down.

-- ─────────────────────────────────────────────────────────────────────────────
-- Manual Integration Test Checklist (run inside REAPER after installation):
--
-- 1. Install mavriq-lua-sockets via ReaPack.
-- 2. Copy reaper_http_remote.lua and src/ to REAPER's Scripts directory.
-- 3. Load as action: Actions → Load ReaScript → select this file.
-- 4. Run the action — verify console shows "[HTTP Remote] Listening on http://0.0.0.0:8765".
-- 5. curl http://localhost:8765/status
--    → Expect: 200 JSON with playing/stopped/bpm fields.
-- 6. curl -X POST http://localhost:8765/play
--    → Expect: 200 {"ok":true}; REAPER transport starts playing.
-- 7. curl -X POST http://localhost:8765/stop
--    → Expect: 200 {"ok":true}; REAPER transport stops.
-- 8. curl -X POST -H "Content-Type: application/json" \
--         -d '{"bpm":140}' http://localhost:8765/tempo
--    → Expect: 200 {"ok":true,"bpm":140}; REAPER BPM changes to 140.
-- 9. curl -X POST -H "Content-Type: application/json" \
--         -d '{"numerator":3,"denominator":4,"measure":5}' http://localhost:8765/timesig
--    → Expect: 200 {"ok":true,...}; 3/4 time sig marker inserted at measure 5.
-- 10. curl -X POST http://localhost:8765/session/new
--     → Expect: 200 {"ok":true}; new empty project opens (save dialog may appear).
-- 11. curl -X POST http://localhost:8765/track/1/mute
--     → Expect: 200 {"ok":true,"track":1,"muted":true}; track 1 muted.
--     Run again → {"muted":false}; mute toggled off.
-- 12. curl http://localhost:8765/nonexistent
--     → Expect: 404 {"error":"not found"}.
-- 13. Remove mavriq-lua-sockets, restart REAPER, run action again:
--     → Expect: error message in console, no crash.
-- ─────────────────────────────────────────────────────────────────────────────
