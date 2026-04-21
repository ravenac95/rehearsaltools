# Planning Questions

## Codebase Summary

**Frontend** (`web/`) — React 18 + Vite + TypeScript + Zustand 5. No routing library; the current `App.tsx` renders four tab-switched screens: Dashboard (Transport), Song, Regions, Mixdown. The existing Zustand store (`store.ts`) holds transport state (received via WebSocket), the single `Song` object (sections/forms), regions list, and a toast string. The song state is server-authoritative — every mutation calls an API and then overwrites the store from the response.

**Component library** — All reuse targets already exist as TypeScript TSX files in `web/src/components/song/` (FormTabs, FormStringEditor, TempoEditor, SectionRow, StanzaCompact/Expanded, TimeSigStack/Input, NoteGlyph, LetterBadge, Stepper, RunBar) and `web/src/components/ui/` (ThemeToggle, UndoToast, Card, Button, Chip). `ThemeToggle` is a self-contained container that reads/writes `localStorage` via `web/src/theme.ts` and cycles through `system → light → dark`.

**CSS** — `styles.css` is a hand-drawn wireframe palette; the design prototype uses the same CSS-variable names (`--surface`, `--accent`, etc.) but DM Sans replaces Kalam as `--font-body`. The dark-mode letter swatches and all design tokens are already present in `styles.css`.

**API / backend** — `api/client.ts` exposes: transport commands (play, stop, record, recordTake, seek, tempo, toggleMetronome), project/song CRUD, regions, mixdown, and debug logging. There is **no** `/api/rehearsal/start`, `/api/rehearsal/end`, or `/api/transport/categorize` endpoint. Metronome is toggled via `/api/transport/metronome/toggle` (OSC fire-and-forget; REAPER echoes state back over WebSocket). There is no concept of "rehearsal type" anywhere in the server.

**Testing** — Vitest + `@testing-library/react`. Tests live in `web/tests/`. Command: `npm test` (inside `web/`). No existing component-level render tests; only store unit tests and a `pattern.test.ts`.

**Key gap vs. PRD**: the entire "rehearsal flow" (start/end rehearsal, take categorization, elapsed timer, setlist, rehearsal types, playback drawer) is pure front-end state in the prototype. None of it has backend API endpoints yet. The `takes` array is purely client-side in the design prototype.

---

## Questions

### Q1: How are takes/discussions actually created given continuous recording?

**Context:** The user clarification says the status badge toggle does NOT create new takes or discussions — it only retags the in-progress segment. But the design prototype's `startTake()`, `endTake()`, and `startRehearsal()` all push new entries into the `takes` array immediately when the UI action fires. The `takes` array is what populates the playback drawer pills (D1, T1, D2, …). If toggling categorization does not create entries, the question is: **when** does an entry appear in the `takes` list, and what data uniquely identifies each segment?

**Question:** Which of these models should drive take/discussion entry creation?

**Options:**

- A) **Segment boundary model** — Each contiguous run of the same category (discussion or take) becomes one entry. An entry is created (pushed into the `takes` array) at the moment the category *changes* (i.e., on badge toggle or on "Start Take" / "End Take" button press). So toggling D→T closes the current discussion segment and opens a new take segment; toggling T→D closes the take and opens a new discussion. Total entries = number of category transitions + 1. This is what the prototype already does under the hood, just without describing it that way.
- B) **End-of-rehearsal model** — No entries appear in the drawer during the rehearsal. Entries are created only when "End Rehearsal" is pressed, by analysing the Reaper timeline to identify contiguous regions. The drawer is empty until rehearsal ends.
- C) **Explicit "commit" model** — Entries only appear when the user explicitly taps "Mark take" or a similar action mid-rehearsal. Toggling the badge is purely a visual/metronome signal; the user consciously decides what to save.

---

### Q2: What backend/Reaper actions, if any, should fire on "Start Rehearsal", "End Rehearsal", and categorization toggle?

**Context:** The server's transport routes today are: `play`, `stop`, `record`, `record-take`, `seek`, `tempo`, `toggleMetronome`, `newProject`. There are no rehearsal-lifecycle endpoints. The existing `api.record()` sends OSC `/record 1` to Reaper (fire-and-forget). The `api.toggleMetronome()` sends OSC `/click 1`. Based on the PRD: "Discussion = recording without metronome; Take = recording with metronome; recording is continuous from Start Rehearsal to End Rehearsal."

**Question:** Which API calls should fire at each lifecycle point?

**Options:**

- A) **Minimal (metronome only)** — "Start Rehearsal" calls `api.record()` to begin continuous Reaper recording, and also calls `api.tempo(bpm)` to set tempo. Badge toggle to Take calls `api.toggleMetronome()` to turn metronome on; badge toggle back to Discussion calls `api.toggleMetronome()` to turn it off. "End Rehearsal" calls `api.stop()`. No new server endpoints needed.
- B) **New rehearsal endpoints** — Add `/api/rehearsal/start`, `/api/rehearsal/end`, and `/api/rehearsal/set-category` (discussion/take) to the server. These consolidate record + metronome + marker logic and would let the server own the segment log.
- C) **No backend calls at all for categorization** — Treat it as purely a front-end annotation. Only "Start Rehearsal" triggers `api.record()` + `api.tempo(bpm)`, and "End Rehearsal" triggers `api.stop()`. Metronome is managed client-side by tracking the toggle state without calling the API on every badge flip.

---

### Q3: Does the Song Picker / Setlist need a backend, or is it purely local?

**Context:** The current backend supports exactly **one song** — `GET /api/song` and `PUT /api/song`. There is no multi-song setlist endpoint. The design prototype uses `MOCK_SETLIST` (5 hardcoded songs). The "Setlist" button opens a song picker bottom sheet where the user can pick an existing song or create a new one.

**Question:** How should the setlist be implemented?

**Options:**

- A) **Local-only, session-scoped** — The setlist is an in-memory list of songs that the user builds during the app session (initial state = just the current server song). "New Song" adds a blank entry to local state. Switching songs loads a new set of front-end defaults; no multi-song persistence. Simple to build, fits current backend.
- B) **Server-backed multi-song** — Add `/api/songs` (list) and `/api/songs/:id` (select/load) to the server. Switching songs swaps which song the server's `SongStore` operates on. Requires backend changes but persists the setlist.
- C) **Omit the setlist / song picker entirely for this build** — The "Setlist" button and song picker bottom sheet are deferred. The song name is editable inline and syncs to the backend's single song as today. The setlist feature is a future task.

---

### Q4: Should the existing tab-based screens (Dashboard, Regions, Mixdown) be deleted or preserved?

**Context:** `App.tsx` currently renders four tab-switched screens. The PRD removes the tab bar and replaces it with a single-screen layout. The Regions and Mixdown screens are excluded from this build per the user clarification (hamburger menu Advanced section entries for Regions/Mixdown should be stubs). The Dashboard/Transport screen has functionality (raw play/stop/record/seek/tempo/newProject/toggleLog) that the PRD moves to hamburger → Advanced → Transport.

**Question:** What happens to the existing screen components?

**Options:**

- A) **Delete Dashboard, Regions, Mixdown screens** — Remove all four screen files and `App.tsx`'s tab machinery entirely. Transport functionality in the hamburger Advanced section is rebuilt from scratch as a lightweight panel, not reusing `DashboardPresentation`.
- B) **Keep screens, hide from main nav** — Remove the tab bar from `App.tsx` but preserve the screen files for reference/fallback. The hamburger Advanced → Transport item renders `<Dashboard />` inside the slide-in menu panel.
- C) **Keep screens exactly as-is, just restructure App.tsx** — The new `App.tsx` is purely a container switch: main view (new redesign) vs. embedded screens in the hamburger. The old screens are preserved and wired into the hamburger panel with minimal changes.

---

### Q5: How should Rehearsal Types be defined and signalled?

**Context:** The PRD describes Rehearsal Types as "defined in config, signal different Reaper templates to the backend." The design prototype has `REHEARSAL_TYPES = [{ id: 'full-band', name: 'Full Band', desc: '...' }, { id: 'piano-vox', name: 'Piano + Vox', desc: '...' }]` as a hardcoded constant in the frontend. There is currently no backend concept of rehearsal types — no config, no API endpoint, no OSC action for it. The server's `config.ts` has no mention of templates.

**Question:** How should Rehearsal Types be handled?

**Options:**

- A) **Hardcode in frontend only** — Define the two types as a constant in the new store/component. No backend call fires when the type changes. The selected type is stored in frontend state as a display annotation only (visible in the header pill). Backend wiring deferred.
- B) **Hardcode in frontend, fire an OSC command on change** — Add `api.setRehearsalType(id)` which calls a new `/api/rehearsal/type` endpoint that sends an OSC message to Reaper (e.g., loads a template). This would need a new server route.
- C) **Load types from server config** — Add `/api/rehearsal/types` to serve the list from `config.ts` (so types can be edited without a frontend rebuild). Still no OSC action on change unless B is also chosen.

---

### Q6: How does the "always-visible metronome toggle" interact with Reaper's actual metronome state?

**Context:** The existing metronome is a Reaper-side toggle: `api.toggleMetronome()` sends OSC `/click 1` and Reaper echoes back its actual state via WebSocket as `transport.metronome: boolean`. The current `Dashboard` screen has a "Metronome: On/Off" button wired this way. The new design wants an always-visible 48×48 metronome button in the transport footer. There is a potential conflict: the frontend needs to show the metronome as "on" during a Take and "off" during Discussion — but the design prototype manages this as pure local state (`setMetronome(true)` on Start Take, `setMetronome(false)` on End Take), not by reading back from Reaper's WebSocket transport.

**Question:** Should the metronome toggle button be authoritative (local state drives Reaper) or reflective (Reaper's WebSocket state is the truth)?

**Options:**

- A) **Authoritative (local state)** — The button calls `api.toggleMetronome()` and immediately flips a local `metronome: boolean` in the new Zustand slice. The WS `transport.metronome` field is ignored for button rendering purposes. This matches the prototype and avoids latency flicker.
- B) **Reflective (WS truth)** — The button calls `api.toggleMetronome()` but the button's displayed state always mirrors `store.transport.metronome` from the WebSocket. There may be a brief flicker between tap and Reaper echo, but state is always accurate.
- C) **Optimistic reflective** — The button optimistically flips local state on tap, then reconciles when the WS update arrives (overwrite with server truth). Most correct but most complex.

---

### Q7: What is the CSS migration strategy — new stylesheet or extend existing?

**Context:** The design prototype introduces a significantly different visual language: DM Sans replaces Kalam as `--font-body`; `--font-display` (Caveat) is used for song names and large numbers; `--green` and `--amber` color tokens are new; there is no `.chip`, `.primary`, `.secondary` button pattern — instead, components use inline styles. The existing `styles.css` defines `.chip`, `.card`, `.transport`, `.tabs`, and button classes that are used by the components being preserved (SectionRow, RunBar's `.primary` button, the pattern editor's `.chip`, etc.). The new component tree (RehearsalHeader, TransportFooter, PlaybackDrawer, HamburgerMenu) will all use inline styles as in the prototype, but the existing components (FormTabs, SectionRow, etc.) rely on `.chip` and `.primary`.

**Question:** How should the CSS be handled?

**Options:**

- A) **Extend `styles.css`** — Add the new font imports (`DM Sans`, Caveat) and new tokens (`--green`, `--amber`, `--green-soft`, `--amber-soft`, `--font-body: DM Sans`, `--font-display: Caveat`) to `styles.css`. New components use inline styles as in the prototype; existing components continue to use their CSS classes. The tab bar and status bar classes stay in the file but go unused.
- B) **Replace `styles.css` entirely** — Write a new `styles.css` that combines the old chip/card/button rules (needed by reused components) with all the new design tokens and font imports in one pass. Removes dead rules (`.tabs`, `.status-bar`, etc.).
- C) **Scoped CSS modules** — New components get CSS module files; existing components stay on global classes. This is the cleanest long-term approach but adds significant implementation overhead for what's effectively a stylesheet migration.

---

### Q8: Where does "elapsed time" come from — client timer or Reaper position?

**Context:** The status badge shows elapsed time (e.g., "2:14") while in Discussion or Take state. The design prototype uses a `setInterval` in the frontend, counting from when the status transitions. Reaper does broadcast `position` (seconds) in its WebSocket transport messages (`/time` → `transport.position`), which is the authoritative playhead position. However, Reaper's position resets if the transport stops/restarts, and during continuous recording it would be the total elapsed project time (not the segment time). The PRD says the elapsed counter is for the status badge display only.

**Question:** Should elapsed time be derived from the client-side interval timer or from Reaper's transport position?

**Options:**

- A) **Client-side interval** — Start a `setInterval` when `transportStatus` changes to `discussion` or `take`; reset on each transition. Does not reset if the WebSocket drops. Matches the prototype exactly.
- B) **Reaper transport position** — Read `store.transport.position` from WebSocket and display it directly. Accurate to Reaper's clock, but shows total project time (not segment elapsed time). Would need a "segment start position" to subtract.
- C) **Client-side interval, reset only on Start Rehearsal** — The counter shows total rehearsal elapsed time (not per-segment), never resetting on take/discussion transitions. Simpler mental model for the user.

---

### Q9: TDD mode

**Context:** The test setup is Vitest + `@testing-library/react`. Existing tests are unit tests for the store and pattern parser. No render/integration tests exist yet. Test command: `npm test` inside `web/`.

**Question:** Do you want TDD mode for this build? If yes, the task implementer will write failing tests (Vitest + `@testing-library/react` render tests, plus store unit tests) before writing implementation code for each task.

**Options:**

- A) Yes — write failing tests first for every functional task (store slices, component render behavior, state machine transitions).
- B) Partial — write tests only for the new Zustand store slice and the state machine logic; skip component render tests.
- C) No — implement first, add tests at the end or not at all for this build.
