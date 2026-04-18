# rehearsaltools

A laptop-hosted, mobile-controlled remote for [REAPER](https://www.reaper.fm/)
designed for band rehearsals. Open the web UI on your phone over local Wi-Fi
and drive REAPER's transport, regions, tempo, metronome, and a bar-accurate
song-form sequencer without touching the laptop.

## Architecture

```
┌────────────────────┐      WebSocket+REST     ┌─────────────────────┐   OSC (UDP)    ┌────────────────────┐
│  React SPA (Vite)  │ ─────────────────────── │  Node service       │ ─────────────▶ │ REAPER             │
│  mobile-first      │                         │  (Fastify + node-   │                │ • native OSC in    │
│                    │ ◀─────────────────────  │   osc + WS)         │ ◀───────────── │ • dispatcher       │
└────────────────────┘     status updates      └─────────────────────┘   OSC replies  │   reascript        │
                                                                                       └────────────────────┘
```

Two OSC channels to REAPER:

- **Native REAPER OSC** — driven via a `.ReaperOSC` config file. Handles
  transport (`/play`, `/stop`, `/record`), tempo (`/tempo/raw`), seek
  (`/time`), and metronome (`/click`).
- **Custom dispatcher** — a single ReaScript (`reaper_osc_dispatcher.lua`)
  bound to its own UDP port. Handles region CRUD, per-region mixdown, and the
  song-form writer via `/rt/*` addresses, each carrying a single JSON payload.

The Node service mediates between the React SPA (REST + WS) and both OSC
channels, and also owns the persistent section library and song-form document.

## Features

- Start a new project
- Create, rename, and list regions
- Jump the playhead to the end of all recordings (safe-record position)
- Play from any region
- Set tempo (live)
- Insert time-signature markers
- Toggle metronome / click
- Render each region to a separate audio file
- **Song Form Sequencer** — compose a song as `[A, B, A, B, C, B]` from a
  library of named sections (each a list of bar × num/denom × bpm rows).
  Tapping **Write to Project** flattens the form into tempo + time-sig markers
  that start at the current playhead, and creates a new open-ended region
  covering the take. **Record** then seeks to the take region's start and
  rolls.

## Prerequisites

- **REAPER** (any recent version)
- **mavriq-lua-sockets** ReaPack package (UDP support for the dispatcher
  ReaScript). In REAPER: *Extensions → ReaPack → Browse packages*, search for
  `mavriq-lua-sockets`, install, and restart REAPER.
- **Node 22+** and **pnpm 10+** on the laptop that will host the service.
- **Lua 5.4** (optional) to run the pure-Lua test suite on your machine.

## Install

```bash
# Clone and install all workspace dependencies
pnpm install

# Build the React SPA (served by the Node server as static files)
pnpm -F web build
```

## REAPER setup

### 1. Install the dispatcher script

Copy the contents of `reascripts/` into a folder accessible from REAPER (for
example REAPER's `Scripts` folder, or any folder you add via *Actions →
Show action list → New action → Load ReaScript*). The script is:

```
reascripts/reaper_osc_dispatcher.lua
```

It loads its siblings (`src/*.lua`) via relative `dofile`, so keep the folder
layout intact.

In *Actions → Show action list*, click **New action → Load ReaScript**, pick
`reaper_osc_dispatcher.lua`, and run it. The REAPER console prints:

```
[RehearsalTools] OSC dispatcher listening on udp://0.0.0.0:9000 (replies → 127.0.0.1:9001)
```

### 2. Configure REAPER's native OSC device

Open *REAPER → Preferences → Control/OSC/web → Add*, choose **OSC (Open Sound
Control)**, and set:

- **Pattern config**: select `reascripts/reaper-osc-config/RehearsalTools.ReaperOSC`
- **Device IP**: `127.0.0.1` (the Node service on the same laptop)
- **Device listening port**: `8001` (REAPER listens here for UDP from the service)
- **Device send port**: `8000` (REAPER sends feedback here to the service)

Those defaults match the server's defaults (`REAPER_OSC_PORT=8000`,
`REAPER_FEEDBACK_PORT=8001`). Override the server via environment variables
(see below) if you need to change them.

## Run the service

From the repo root:

```bash
pnpm dev             # server + web dev server with hot reload
# ─ or ─
pnpm -F web build    # build the SPA once
pnpm start           # serve the SPA + API from one Node process
```

The server prints the listening URL. On the laptop, open the UI at
`http://localhost:8080/`. On a phone on the same Wi-Fi, use
`http://<laptop-ip>:8080/`.

### Environment variables

| Variable                  | Default        | What it controls |
|---------------------------|----------------|------------------|
| `HTTP_HOST`               | `0.0.0.0`      | HTTP bind address |
| `HTTP_PORT`               | `8080`         | HTTP bind port |
| `DISPATCHER_HOST`         | `127.0.0.1`    | REAPER dispatcher host |
| `DISPATCHER_PORT`         | `9000`         | REAPER dispatcher UDP port |
| `REPLY_HOST`              | `0.0.0.0`      | Host to receive dispatcher replies |
| `REPLY_PORT`              | `9001`         | UDP port to receive dispatcher replies |
| `REAPER_OSC_HOST`         | `127.0.0.1`    | REAPER native OSC host |
| `REAPER_OSC_PORT`         | `8000`         | REAPER native OSC port (→ REAPER) |
| `REAPER_FEEDBACK_HOST`    | `0.0.0.0`      | Host to receive native OSC feedback |
| `REAPER_FEEDBACK_PORT`    | `8001`         | UDP port to receive native OSC feedback |
| `DATA_FILE`               | `./data/rehearsaltools.json` | Persistent store path |

If you change any of these, update the matching field in REAPER's OSC device
settings so the two sides agree.

## Running tests

```bash
# Node server + React web tests (vitest)
pnpm test

# Pure-Lua tests (requires Lua 5.4 on your PATH)
cd reascripts && lua tests/test_runner.lua
```

Lua tests cover the OSC encoder/decoder, JSON, validation, the adapter, the
dispatcher, and every handler via a stubbed REAPER adapter. No REAPER
installation is required to run them.

## Repository layout

```
rehearsaltools/
├── reascripts/                          # REAPER-side Lua code
│   ├── reaper_osc_dispatcher.lua        # main script — runs inside REAPER
│   ├── src/
│   │   ├── osc.lua                      # OSC 1.0 encode/decode
│   │   ├── json.lua                     # pure-Lua JSON
│   │   ├── validation.lua               # payload validators
│   │   ├── reaper_api.lua               # adapter around reaper.* calls
│   │   ├── dispatcher.lua               # address → handler routing
│   │   └── handlers/                    # one file per /rt/* path
│   ├── reaper-osc-config/
│   │   └── RehearsalTools.ReaperOSC     # REAPER OSC device pattern file
│   └── tests/                           # pure-Lua unit tests
│
├── server/                              # Node service (Fastify + node-osc)
│   └── src/
│       ├── index.ts                     # bootstrap + wiring
│       ├── config.ts                    # env → Config
│       ├── state.ts                     # transport + current-take cache
│       ├── ws.ts                        # websocket broadcast hub
│       ├── osc/                         # OSC client/server + req/reply
│       ├── routes/                      # Fastify route modules
│       └── store/sections.ts            # persistent section + songform store
│
├── web/                                 # React SPA (Vite)
│   └── src/
│       ├── App.tsx                      # tab bar + status bar
│       ├── api/client.ts                # REST + WS client
│       ├── store.ts                     # zustand state
│       └── screens/                     # Dashboard, Sections, SongForm, Regions, Mixdown
│
└── data/                                # persistent store (ignored in git)
```

## Security

LAN-trust. The server binds to `0.0.0.0` by default with no authentication.
Anybody on your Wi-Fi can control REAPER. Don't expose the port to the open
internet.

## Stopping

`Ctrl-C` in the terminal running the Node server. The REAPER dispatcher script
terminates when its action is stopped in REAPER's action list.
