# Planning Questions

## Codebase Summary

The repository is a greenfield project — only a `README.md` exists. There is no existing code, no dependencies, no test infrastructure, and no language or framework choices have been made. Everything will be built from scratch.

**Key research findings:**

- REAPER supports three scripting languages: **Lua** (v5.4, embedded), **Python** (system Python, via bridge), and **EEL2** (REAPER's own C-like language)
- REAPER ships with a **built-in HTTP/Web Remote server** (enabled via Preferences → Control/OSC/Web → Web Browser Interface) that already exposes transport and track control over HTTP — this is a significant existing capability worth understanding before building a custom solution
- **EEL2** has native built-in TCP networking functions (`tcp_connect`, `tcp_listen`, etc.) — the only language where TCP is natively available without additional libraries
- **Lua** in REAPER's embedded environment does NOT include standard LuaSocket; a community build (mavriq-lua-sockets or ReaPack package) is required for Lua TCP/HTTP support
- **Python** ReaScript can use the standard library (`http.server`, `socket`, `flask`) freely, but Python scripts communicate with REAPER via a bridge with overhead (~30–60 API calls/sec), and Python must be installed separately on the user's machine
- **Time signature API:** `reaper.SetTempoTimeSigMarker(proj, ptidx, timepos, measurepos, beatpos, bpm, timesig_num, timesig_denom, lineartempo)` — supports inserting new markers (ptidx=-1) at a time position or measure position. This can target "right now" (current playback position) or a specific future measure
- **Record toggling:** REAPER action ID 1013 (`Transport: Record`) can be triggered via `reaper.Main_OnCommand(1013, 0)` — no extra extensions needed
- **Defer loop pattern:** Long-running Lua/EEL scripts use `reaper.defer(mainLoop)` to keep a script alive and poll for work without blocking REAPER's audio engine

---

## Questions

### Q1: HTTP server approach — custom ReaScript server vs. REAPER's built-in Web Remote

**Context:** REAPER ships with a built-in HTTP remote control server (enable under Preferences → Control/OSC/Web → Web Browser Interface). It already handles transport commands (play, stop, record) and track control over HTTP. Building a custom HTTP server inside a ReaScript is significantly more complex and requires either EEL2's native TCP functions or a third-party Lua socket library. If the built-in web remote already covers the needed endpoints, a thin ReaScript wrapper that extends it (or a companion script that adds custom endpoints for time signatures) may be preferable.

**Question:** Should this be a fully custom, self-contained HTTP server embedded in the ReaScript, or can we leverage REAPER's built-in web remote interface and only add the missing pieces (e.g., a ReaScript that handles time signature changes and exposes them via REAPER's existing web remote mechanism or a custom script-invocable URL)?

**Options:**

- A) Fully custom HTTP server inside the ReaScript (most portable, no REAPER config required, more complex to build)
- B) Extend REAPER's built-in web remote with a custom HTML/JS page that calls into a ReaScript via REAPER's web remote action-command mechanism (lower complexity, leverages existing server)
- C) External sidecar process (a small Python/Node HTTP server outside REAPER) that communicates with a ReaScript via a file, shared memory, or REAPER's own web remote (cleanest separation, but requires deploying two components)

---

### Q2: Scripting language choice

**Context:** Each language has meaningful trade-offs for this use case:
- **Lua** is the most popular ReaScript language with the richest community library ecosystem, but HTTP/socket support requires installing a third-party package (via ReaPack). Scripts are single `.lua` files.
- **EEL2** has native TCP functions built into REAPER with no external dependencies, but the language is niche, less readable, and has limited string handling — making HTTP request parsing painful.
- **Python** has the richest HTTP/networking standard library (no extra installs), but requires the user to have Python installed, and has performance overhead for API calls. Python ReaScripts are less commonly distributed.

**Question:** Which scripting language should the ReaScript use?

**Options:**

- A) Lua — most community precedent, requires ReaPack socket library for HTTP
- B) EEL2 — native TCP, no external deps, but niche syntax and difficult HTTP parsing
- C) Python — best networking stdlib, but requires Python installed separately; least common for distributed ReaScripts

---

### Q3: Time signature change scope and timing

**Context:** REAPER's `SetTempoTimeSigMarker` API can insert a time signature marker at either a specific time position (in seconds) or a specific measure number. There are two meaningful behaviors: (1) insert at the *current playback cursor position* (affecting the measure the user is currently in), or (2) insert at a *specified future measure number* (allowing scheduling ahead). Additionally, the scope can be "global/project default" (replacing all existing markers) or additive (inserting a new marker that takes effect from that point forward).

**Question:** How should time signature changes work?

**Options:**

- A) Change takes effect immediately at the current playback position (useful during rehearsal — "switch to 3/4 right now")
- B) Change is scheduled at a specified measure number supplied in the HTTP request (e.g., `POST /timesig` with body `{"numerator": 3, "denominator": 4, "measure": 5}`)
- C) Both — immediate (no measure param) and scheduled (with measure param)
- D) Replace the global project time signature entirely (simpler, but destructive to existing markers)

---

### Q4: Record control behavior

**Context:** REAPER has several distinct record-related actions: "Transport: Record" (command 1013) starts recording, "Transport: Stop" (command 1016) stops everything, and there are separate "record arm" actions per track. The PRD says "trigger record" — it is unclear whether this means (a) start/stop recording the entire project transport, or (b) arm/disarm specific tracks for recording, or (c) both.

**Question:** What should "trigger record" mean in this script?

**Options:**

- A) Toggle the global transport record state (start recording if stopped, stop if recording) — single endpoint, no track awareness
- B) Arm/disarm a specific track by track number (the caller specifies which track) — requires track number in the request
- C) Both: a `/record` endpoint for transport toggle AND a `/track/:n/arm` endpoint for per-track arming
- D) Start recording only (no stop via this interface — stop is handled separately)

---

### Q5: HTTP API design and authentication

**Context:** Since this server will be remotely accessible over HTTP, there are questions about its interface contract and security. A simple REST-style API with JSON bodies is the most interoperable choice. Without any authentication, anyone on the same network can trigger recording or change the project's time signatures. For rehearsal tool use cases (local network, trusted environment), this may be acceptable.

**Question:** What should the HTTP API look like, and does it need any access control?

**Options (API style):**

- A) Simple REST: `POST /record`, `POST /timesig`, `GET /status` — JSON bodies
- B) OSC-over-HTTP (path-based commands matching OSC convention): `/record/toggle`, `/timesig/3/4`
- C) Flat query-string style: `GET /?cmd=record&action=start`

**Options (security):**

- A) No authentication (trusted local network, rehearsal context)
- B) Static API key/token in request header
- C) IP allowlist (only accept connections from specified IPs)

---

### Q6: Deployment and distribution model

**Context:** ReaScripts are typically distributed either as single files placed in REAPER's `Scripts` directory, or via ReaPack (a package manager for REAPER that can pull scripts from a GitHub repo). If the Lua + socket library approach is chosen, the socket library needs to be installed separately (via ReaPack). If Python is chosen, Python must be present. The complexity of installation instructions matters for the target users.

**Question:** Who are the target users, and how will they install this script?

**Options:**

- A) Developer/power-user self-install: single script file, manual dependency install — minimal packaging required
- B) ReaPack distribution: script + `index.xml` manifest, users install via REAPER's built-in package manager — dependencies can be listed
- C) Fully self-contained with zero external dependencies (constrains the language/HTTP approach to EEL2 or REAPER's built-in web remote)

---

### Q7: Status/feedback endpoint and additional controls

**Context:** The PRD lists record and time signature as the two core controls. Remote control tools are often more useful with a status endpoint that lets the caller know the current state (is REAPER recording? what is the current time signature? what measure are we on?). Additionally, it is common to also want transport controls like play/stop/pause alongside record.

**Question:** Beyond record-start/stop and time signature change, what additional controls or status information should the HTTP API expose?

**Options (pick any combination):**

- A) GET /status — returns current transport state (playing/recording/stopped), current BPM, current time signature, current position (bar/beat/seconds)
- B) Play and stop transport controls (`POST /play`, `POST /stop`)
- C) BPM/tempo change (`POST /tempo`)
- D) Per-track mute/solo/volume
- E) None — keep it minimal: record + timesig only

---

### Q8: TDD mode

**Context:** ReaScript Lua and Python can both be tested. Lua scripts are typically validated by running them inside REAPER directly (no standard offline test runner exists for REAPER Lua). Python ReaScripts can be unit tested with `pytest` outside REAPER for pure logic (non-REAPER API) components. The HTTP server layer (request parsing, routing, response formatting) is the most testable part regardless of language choice.

**Question:** Do you want TDD mode for this build? If yes, the task implementer will write failing tests before implementation code for each task. Given that ReaScript Lua has no standard offline test runner, TDD would apply mainly to: (a) the HTTP request parsing/routing logic, and (b) any pure utility functions — tested either with a lightweight Lua test harness (e.g., `busted`) run outside REAPER, or with Python's `pytest` if Python is chosen.

**Options:**

- A) Yes — TDD for all testable components (HTTP layer, utility functions)
- B) Yes — TDD for HTTP/networking layer only
- C) No — manual testing by running the script inside REAPER
