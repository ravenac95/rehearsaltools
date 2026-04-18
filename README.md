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
│                    │ ◀─────────────────────  │   osc + WS)         │ ◀───────────── │ • /rehearsaltools  │
└────────────────────┘     status updates      └─────────────────────┘   OSC feedback └────────────────────┘
                                                       │ HTTP reads
                                                       ▼
                                               REAPER web remote
                                               (/_/TRANSPORT, REGION…)
```

Two communication paths to REAPER:

- **Native REAPER OSC** — driven via a `.ReaperOSC` config file. Handles
  transport (`/play`, `/stop`, `/record`), tempo (`/tempo/raw`), seek
  (`/time`), and metronome (`/click`). Also receives `/rehearsaltools` — a
  single multiplexed address whose JSON payload names the operation via a
  `command` field; REAPER dispatches it through one custom ReaScript action.
- **REAPER web remote** — HTTP reads for transport state, regions, and markers
  via REAPER's built-in web interface (`/_/TRANSPORT`, `/_/REGION`, etc.).

The Node service mediates between the React SPA (REST + WS) and both paths,
and also owns the persistent section library and song-form document.

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

### 1. Enable the web interface

1. Open **REAPER → Preferences → Control/OSC/web**.
2. Under **Web browser interface**, check **Enable web browser interface**.
3. Note the port (default **8080**). Set `REAPER_WEB_PORT` to match.

> **Port collision note:** The Node server also defaults to HTTP port 8080.
> Either set `REAPER_WEB_PORT=8081` in REAPER's web preferences, or set
> `HTTP_PORT=8787` for the Node server, so they don't collide.

### 2. Configure REAPER's native OSC device

Open *REAPER → Preferences → Control/OSC/web → Add*, choose **OSC (Open Sound
Control)**, and set:

- **Pattern config**: select `reascripts/reaper-osc-config/RehearsalTools.ReaperOSC`
- **Device IP**: `127.0.0.1` (the Node service on the same laptop)
- **Device listening port**: `8001` (REAPER listens here for UDP from the service)
- **Device send port**: `8000` (REAPER sends feedback here to the service)

Those defaults match the server's defaults (`REAPER_OSC_PORT=8000`,
`REAPER_FEEDBACK_PORT=8001`). Override via environment variables if needed.

### 3. Install the custom action

A single ReaScript (`reascripts/rehearsaltools.lua`) handles every `/rt/*`
operation via a JSON `command` field. See
`reascripts/reaper-osc-config/README.md` for the full step-by-step guide. In
brief:

1. Copy or symlink `reascripts/` into your REAPER Scripts folder (so the
   script lives at `<resource>/Scripts/rehearsaltools/rehearsaltools.lua`).
2. Append the one-line `reaper-kb.ini.snippet` to `<resource>/reaper-kb.ini`.
3. Append the one-line `reaper-osc-actions.ini.snippet` to
   `<resource>/reaper-osc-actions.ini`.
4. Restart REAPER.

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
| `REAPER_OSC_HOST`         | `127.0.0.1`    | REAPER native OSC host |
| `REAPER_OSC_PORT`         | `8000`         | REAPER native OSC port (→ REAPER) |
| `REAPER_FEEDBACK_HOST`    | `0.0.0.0`      | Host to receive native OSC feedback |
| `REAPER_FEEDBACK_PORT`    | `8001`         | UDP port to receive native OSC feedback |
| `REAPER_WEB_HOST`         | `127.0.0.1`    | REAPER web remote host |
| `REAPER_WEB_PORT`         | `8080`         | REAPER web remote port (**see port collision note above**) |
| `DATA_FILE`               | `./data/rehearsaltools.json` | Persistent store path |

## Running tests

```bash
# Node server tests (vitest)
pnpm -F server test

# Pure-Lua tests (requires Lua 5.4 on your PATH)
cd reascripts && lua tests/test_runner.lua
```

Lua tests cover JSON, validation, the adapter, and every handler via a stubbed
REAPER adapter. No REAPER installation is required.

## Repository layout

```
rehearsaltools/
├── reascripts/                          # REAPER-side Lua code
│   ├── rehearsaltools.lua               # single custom action — multiplexes /rt/* ops
│   ├── src/
│   │   ├── json.lua                     # pure-Lua JSON
│   │   ├── payload.lua                  # reads OSC arg from REAPER action context
│   │   ├── dispatch.lua                 # command → handler router
│   │   ├── validation.lua               # payload validators
│   │   ├── reaper_api.lua               # adapter around reaper.* calls
│   │   └── handlers/                    # one file per command namespace
│   ├── reaper-osc-config/
│   │   ├── RehearsalTools.ReaperOSC     # REAPER OSC device pattern file
│   │   ├── reaper-osc-actions.ini.snippet  # maps /rehearsaltools OSC → action ID
│   │   ├── reaper-kb.ini.snippet        # registers rehearsaltools.lua as action
│   │   └── README.md                    # step-by-step setup guide
│   └── tests/                           # pure-Lua unit tests
│
├── server/                              # Node service (Fastify + node-osc)
│   └── src/
│       ├── index.ts                     # bootstrap + wiring
│       ├── config.ts                    # env → Config
│       ├── state.ts                     # transport + current-take cache
│       ├── ws.ts                        # websocket broadcast hub
│       ├── osc/                         # OSC client/server
│       │   ├── client.ts                # OscClient, ReaperNativeClient, RtClient
│       │   └── server.ts                # OscServerWrapper (native feedback)
│       ├── reaper/
│       │   └── web-remote.ts            # WebRemoteClient (HTTP reads)
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

`Ctrl-C` in the terminal running the Node server.
