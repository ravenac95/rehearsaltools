# RehearsalTools — REAPER OSC & web remote setup

This directory contains the REAPER OSC pattern file and ini snippets needed
to connect REAPER to the RehearsalTools Node service.

## Quick start

### 1. Enable REAPER's web interface

1. Open **REAPER → Preferences → Control/OSC/web**.
2. Under **Web browser interface**, check **Enable web browser interface**.
3. Note the port (default **8080**). This is the `REAPER_WEB_PORT` the Node
   server reads from.

> **Port collision:** The Node server also defaults to port 8080. Pick one of
> the two to move: either set `REAPER_WEB_PORT=8081` in REAPER's web config,
> or set `HTTP_PORT=8787` as an environment variable for the Node server.

### 2. Add an OSC control surface

1. In the same **Preferences → Control/OSC/web** panel, click **Add**.
2. Select **OSC (Open Sound Control)** as the control surface type.
3. Set:
   - **Pattern config**: browse to `reascripts/reaper-osc-config/RehearsalTools.ReaperOSC`
   - **Device IP**: `127.0.0.1`
   - **Device listening port** (REAPER receives here): `8000`  ← matches `REAPER_OSC_PORT`
   - **Device send port** (REAPER sends feedback here): `8001` ← matches `REAPER_FEEDBACK_PORT`

Override the Node server defaults with environment variables if you change
these ports.

### 3. Install the action scripts

Copy (or symlink) the `reascripts/actions/` folder into your REAPER Scripts
folder so it lives at `<resource>/Scripts/rehearsaltools/actions/`.

REAPER's resource folder is shown in **Preferences → General → Resource path**.

```bash
# Example — adjust paths to match your system:
ln -s /path/to/rehearsaltools/reascripts/actions \
      ~/Library/Application\ Support/REAPER/Scripts/rehearsaltools/actions
```

### 4. Register the custom actions

Append the contents of `reaper-kb.ini.snippet` to your REAPER keyboard map:

```bash
cat reaper-kb.ini.snippet >> ~/Library/Application\ Support/REAPER/reaper-kb.ini
```

(On Linux the resource folder is typically `~/.config/REAPER`; on Windows it
is `%APPDATA%\REAPER`.)

### 5. Map OSC addresses to actions

Append the contents of `reaper-osc-actions.ini.snippet` to the OSC-actions
mapping file:

```bash
cat reaper-osc-actions.ini.snippet >> \
    ~/Library/Application\ Support/REAPER/reaper-osc-actions.ini
```

Create the file if it does not exist — REAPER will pick it up on next start.

### 6. Restart REAPER

Restart REAPER for the keyboard map and OSC action mappings to take effect.
REAPER will now invoke the matching `rt_*.lua` action script whenever it
receives a `/rt/*` OSC message on the control surface port.

## How it works

```
Phone/browser  ──REST──►  Node service  ──OSC /rt/*──►  REAPER OSC server
                                                          │
                                        ◄──feedback──    └─► rt_*.lua action
                                                              └─► handler.lua
```

- **Writes** (`POST /api/regions`, `POST /api/songform/write`, etc.) are sent
  as OSC `/rt/*` messages to REAPER's native OSC port. REAPER triggers the
  matching `rt_*.lua` ReaScript, which calls the handler module in `src/`.

- **Reads** (`GET /api/regions`, transport position, etc.) are fetched from
  REAPER's HTTP web remote (`/_/REGION`, `/_/TRANSPORT`, etc.).

- **Feedback** (transport state changes) arrives as native OSC messages from
  REAPER and is forwarded to connected browser clients over WebSocket.

## File reference

| File | Purpose |
|------|---------|
| `RehearsalTools.ReaperOSC` | OSC pattern file — bidirectional transport + feedback mappings |
| `reaper-osc-actions.ini.snippet` | Maps `/rt/*` OSC addresses to custom-action IDs |
| `reaper-kb.ini.snippet` | Registers each `rt_*.lua` script as a custom action |
| `README.md` | This file |
