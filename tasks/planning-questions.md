# Discovery Questions

(Remaining questions whose answers shape the task breakdown. The user already resolved Q1–Q7 of the high-level architecture; these are finer-grained.)

---

## D1: Region matching after create/rename

**Context.** Scripts are now fire-and-forget — REAPER assigns region IDs internally and the server cannot see them directly. The REST contract says:

- `POST /api/regions` returns the newly-created region.
- `PATCH /api/regions/:id` returns the renamed region.

So the server sends `/rt/region/new { name }` (or `/rt/region/rename { id, name }`), then must refetch `/_/REGION` and identify which row in the response is the one the user just touched.

**Options.**

- **A) Match by name.** After `new`, the script writes a region whose name the server knows. The server refetches and returns the row whose name matches. Requires names to be unique within the UI's scope; already true for this app's usage. Fails if the user created two regions with the same name in REAPER directly.
- **B) Match by highest ID (for `new`) / pass-through ID (for `rename`).** After `new`, server refetches and returns the region with the highest numeric id (regions are assigned monotonically by REAPER). For `rename`, the server already knows the id the user specified in the URL, so it refetches and returns the row whose id matches. Simpler, but "highest id" is fragile if REAPER reclaims ids after deletion.
- **C) Return the full list, let the client pick.** Change the response from `{ region }` to `{ regions }`. Forces a small SPA change; loses the immediate "here's your new region" feedback.

**Recommendation:** **B**. Pass-through ID for rename is trivially reliable. For new, matching by highest ID is a one-line `regions.sort((a, b) => b.id - a.id)[0]`. Name-match (A) is brittle if the same name exists. (C) churns the SPA for no real gain.

---

## D2: SPA — `currentTake.regionId` is referenced

**Context.** Removing `regionId` from `currentTake` (PRD says `record-take` only needs `startTime`) will break:

- `web/src/api/client.ts:21` — `interface Take { regionId: number; startTime: number }`
- `web/src/store.ts:87-88` — reads `d.regionId` from the `songform:written` message
- `web/src/screens/Dashboard.tsx:51` — displays "region #{currentTake.regionId}"

**Options.**

- **A) Drop `regionId` everywhere.** Update the `Take` type to `{ startTime: number }`. Update Dashboard copy to show just the start time (e.g. "Current take: starts at {startTime}s"). The `songform:written` websocket payload loses `regionId`. Simplest; SPA change is small.
- **B) Keep `regionId` optional.** Server still returns it when it can (by matching the freshly-created region from `/_/REGION`). When absent, SPA shows "starts at …" only. Preserves richer UI copy but adds a lookup step the server doesn't otherwise need.

**Recommendation:** **A**. Drop it. The UI copy "starts at Xs" is adequate, and the server has no reason to re-derive a region id it doesn't otherwise use.

---

## D3: Action script file layout

**Context.** The PRD says scripts go in `reascripts/actions/`. The existing repo has `reascripts/reaper_osc_dispatcher.lua` at the top of `reascripts/` plus `reascripts/src/` for modules. `reascripts/src/handlers/*.lua` exist and will stay.

The ini snippet paths must match wherever the scripts live, so this decision cascades into `reaper-osc-actions.ini.snippet` and `reaper-kb.ini.snippet`.

**Options.**

- **A) New subdirectory `reascripts/actions/`.** Clean separation: one folder for REAPER-registered entry points, another (`src/`) for shared library code. Ini snippets reference `reascripts/actions/rt_*.lua` — clear to the user where each address lives.
- **B) Top-level `reascripts/`.** Matches the previous convention of putting entry points next to `reaper_osc_dispatcher.lua` (now deleted). Nine more `.lua` files clutter the top directory.

**Recommendation:** **A**. The `actions/` folder is self-documenting and the ini snippets become easier to read. Nine entry-point files at the top level would be noisy.

---

## D4: `RtClient` vs extending `OscClient`

**Context.** Today `server/src/osc/client.ts` exports `OscClient` (raw send) and `ReaperNativeClient` (transport helpers). The PRD wants a way to send `/rt/*` addresses with a single JSON-string arg on the **same** REAPER OSC port as the native client.

**Options.**

- **A) New `RtClient` class.** Takes an `OscClient`; exposes one method, `send(address, payload: object)`, which serialises to JSON and fires one OSC string arg. Parallel to `ReaperNativeClient`. Clear separation: native vs `/rt/*`.
- **B) Add a `sendRt(address, payload)` method to `ReaperNativeClient`.** Since both go on the same port, one client is enough. Slightly more coupling but fewer moving parts.
- **C) Just use the raw `OscClient` inline where needed.** No wrapper at all; each route calls `osc.send("/rt/region/new", JSON.stringify({name}))`. Minimal code, but JSON serialisation scattered across routes.

**Recommendation:** **A**. A dedicated `RtClient` mirrors `ReaperNativeClient`'s shape and keeps the JSON-string convention encapsulated. Tests stub a single object per concern.

---

## D5: Web-remote fetch module — shape and error handling

**Context.** REAPER's web remote runs on `http://<host>:<port>/_/<COMMAND>` and returns plain text (tab-separated, newline-delimited). Node 22 has global `fetch`. Responses are small (< 10 KB even for large projects).

**Options.**

- **A) Class `WebRemoteClient` with one method per command.** Constructor takes host+port and an optional fetch impl (for tests). Methods: `getTransport()`, `getBeatPos()`, `listRegions()`, `listMarkers()`. Parsers live alongside as private helpers. Tests inject a fake fetch that returns fixture strings.
- **B) Plain async functions module.** Export `getTransport(baseUrl)`, etc. No class. Tests import the parsers directly and call them with fixture strings. Fetch is wrapped only at the outermost layer.

Timeout/retry: localhost; use 2 s timeout via `AbortSignal.timeout(2000)`. No retry — failure surfaces as a 502 from the route.

**Recommendation:** **A**. Class matches the shape of `OscClient`/`ReaperNativeClient`/`RtClient`; tests stay symmetric. Parsers are still independently-callable pure functions so test fixtures stay simple.

---

## D6: ReaperOSC `TIME` feedback pattern

**Context.** The existing `RehearsalTools.ReaperOSC` declares `PLAY_STATE`, `TEMPO`, `BEAT`, `TIMESIG_*`. The PRD asks to add cursor-position feedback so the server can stream playhead position into `transport.position` without polling the web remote.

REAPER's OSC feedback keys for position:

- `TIME`  → seconds since project start
- `BEAT` → bar.beat string (already emitted)
- `POSITION_BEATS` → full beat position as float

**Options.**

- **A) Add only `TIME` pattern (seconds).** One line in the `.ReaperOSC` file. Server's state reducer maps `/time` events to `transport.position`. Simplest; covers the UI's needs (position is displayed in seconds).
- **B) Add `TIME` and `POSITION_BEATS`.** Also feed the beat display if the UI shows bar.beat. Slight noise in the feedback stream.

**Recommendation:** **A**. The SPA's Dashboard shows position in seconds. Beat info already arrives through the existing `BEAT` pattern.

---

## D7: node-osc types

**Context.** `server/src/osc/client.ts:8` imports `Client` from `node-osc` and `server.ts:7` imports `Server`. Existing code already uses `any` in a few places (`msg: OscMessage`). Adding a new `RtClient` won't introduce new type requirements beyond what's already there.

**Question:** Do we need to add a `node-osc.d.ts` ambient declaration, or is the existing setup fine?

**Recommendation:** No change. Keep whatever types are already in play. If tsc complains during implementation, fix it then — don't pre-emptively invent types.

---

## D8: Cleanup of now-unused feedback routing

**Context.** The existing `OscServerWrapper` has three branches: `/rt/reply/*`, `/rt/event/*`, and native. After this refactor, only native remains.

**Question:** Should `OscServerWrapper` be simplified to just emit native, or left with stub branches?

**Recommendation:** Simplify. Delete `onReply`/`onEvent` from the interface; keep only `onNative`. Rename it to `NativeFeedbackServer` or leave the filename and just shrink the class. (Non-blocking — implementer decides.)
