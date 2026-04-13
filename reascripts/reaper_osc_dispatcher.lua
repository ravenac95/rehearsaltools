-- reaper_osc_dispatcher.lua
-- REAPER ReaScript entry point for the RehearsalTools custom OSC dispatcher.
--
-- Listens on a UDP socket for OSC messages whose addresses start with /rt/
-- and dispatches them to the matching handler. Replies go back to the sender
-- on /rt/reply/<reqId>.
--
-- Run this script from REAPER's action list. It installs itself in the defer
-- loop and runs until the script is terminated.
--
-- Depends on mavriq-lua-sockets (install via ReaPack) for UDP I/O.
-- The socket is non-blocking: each defer tick drains pending datagrams.
--
-- Configuration (edit the constants below):
--   LISTEN_HOST    host to bind to  (0.0.0.0 accepts from anywhere on LAN)
--   LISTEN_PORT    UDP port to bind
--   REPLY_HOST     host to send replies to  (normally the Node service)
--   REPLY_PORT     UDP port to send replies to

-- ── Configuration ────────────────────────────────────────────────────────────

local LISTEN_HOST = "0.0.0.0"
local LISTEN_PORT = 9000
local REPLY_HOST  = "127.0.0.1"
local REPLY_PORT  = 9001

-- ── Boot: resolve the script's own directory so `dofile("src/…")` works ──────

local script_path = ({reaper.get_action_context()})[2]  -- full path to this .lua
local script_dir  = script_path:match("^(.*)[/\\]") or "."
-- Shift CWD context: we always dofile relative to script_dir so that users can
-- run the script from any REAPER Scripts folder.
local function SRC(rel)
  return script_dir .. "/" .. rel
end

-- ── Module imports ───────────────────────────────────────────────────────────

local json       = dofile(SRC("src/json.lua"))
local osc        = dofile(SRC("src/osc.lua"))
local dispatcher = dofile(SRC("src/dispatcher.lua"))
local reaper_api = dofile(SRC("src/reaper_api.lua"))

local h_project   = dofile(SRC("src/handlers/project.lua"))
local h_regions   = dofile(SRC("src/handlers/regions.lua"))
local h_tempo     = dofile(SRC("src/handlers/tempo.lua"))
local h_timesig   = dofile(SRC("src/handlers/timesig.lua"))
local h_metronome = dofile(SRC("src/handlers/metronome.lua"))
local h_mixdown   = dofile(SRC("src/handlers/mixdown.lua"))
local h_songform  = dofile(SRC("src/handlers/songform.lua"))

-- ── Socket setup via mavriq-lua-sockets ──────────────────────────────────────

local socket_ok, socket = pcall(require, "socket")
if not socket_ok then
  reaper.ShowMessageBox(
    "The mavriq-lua-sockets package is not installed.\n" ..
    "Install it via ReaPack (Extensions → ReaPack → Browse packages) " ..
    "and restart REAPER.",
    "RehearsalTools — dependency missing", 0)
  return
end

local udp = socket.udp()
udp:settimeout(0)
local ok, err = udp:setsockname(LISTEN_HOST, LISTEN_PORT)
if not ok then
  reaper.ShowMessageBox(
    "Failed to bind UDP socket on " .. LISTEN_HOST .. ":" .. LISTEN_PORT ..
    "\n" .. tostring(err),
    "RehearsalTools", 0)
  return
end

local out = socket.udp()
out:settimeout(0)

-- ── Wire up handlers ────────────────────────────────────────────────────────

local adapter = reaper_api.new()

local regions = h_regions.new(adapter)

local routes = {
  ["/rt/project/new"]    = h_project.new(adapter),
  ["/rt/region/new"]     = regions.new,
  ["/rt/region/rename"]  = regions.rename,
  ["/rt/region/list"]    = regions.list,
  ["/rt/region/play"]    = regions.play,
  ["/rt/playhead/end"]   = regions.seek_to_end,
  ["/rt/tempo"]          = h_tempo.new(adapter),
  ["/rt/timesig"]        = h_timesig.new(adapter),
  ["/rt/metronome/toggle"] = h_metronome.new(adapter),
  ["/rt/mixdown/all"]    = h_mixdown.new(adapter),
  ["/rt/songform/write"] = h_songform.new(adapter),
}

local function send(addr, payload)
  local bytes = osc.encode(addr, {{type = "s", value = payload}})
  out:sendto(bytes, REPLY_HOST, REPLY_PORT)
end

local d = dispatcher.new(routes, send)

adapter.console(string.format(
  "[RehearsalTools] OSC dispatcher listening on udp://%s:%d (replies → %s:%d)",
  LISTEN_HOST, LISTEN_PORT, REPLY_HOST, REPLY_PORT))

-- ── Defer loop ───────────────────────────────────────────────────────────────

local function tick()
  -- Drain up to 32 datagrams per tick to avoid starving other scripts.
  for _ = 1, 32 do
    local data, ip, port = udp:receivefrom()
    if not data then break end
    local msg, parse_err = osc.decode(data)
    if msg then
      d.dispatch(msg)
    else
      adapter.console("[RehearsalTools] bad OSC packet from " ..
        tostring(ip) .. ":" .. tostring(port) .. " — " .. tostring(parse_err))
    end
  end
  reaper.defer(tick)
end

-- Periodically broadcast transport state so the UI can stay in sync.
local last_state = {}
local function broadcast_state()
  local play_state = adapter.get_play_state()
  local pos        = adapter.get_cursor_position()
  local bpm, num, denom = adapter.get_tempo_time_sig_at(pos)
  local metronome = adapter.get_metronome_state()

  local state = {
    playing    = play_state == 1,
    recording  = play_state == 4 or play_state == 5,
    stopped    = play_state == 0,
    position   = pos,
    bpm        = bpm,
    num        = num,
    denom      = denom,
    metronome  = metronome,
  }

  -- Only emit when something changed.
  local changed = false
  for k, v in pairs(state) do
    if last_state[k] ~= v then changed = true; break end
  end
  if changed then
    last_state = state
    d.emit("/transport", state)
  end
end

local frame = 0
local function state_tick()
  frame = frame + 1
  if frame % 15 == 0 then  -- ~4 Hz at REAPER's ~60 Hz defer rate
    broadcast_state()
  end
  reaper.defer(state_tick)
end

tick()
state_tick()
