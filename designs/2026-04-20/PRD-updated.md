# Updated PRD — Rehearsal Flow Redesign
## Status: GENERATE-phase authoritative spec (2026-04-20)

---

## 1. Overview

Replace the four-tab SPA (Transport / Song / Regions / Mixdown) with a single-screen, rehearsal-centric app. The new app exposes a linear rehearsal flow — start → record takes/discussions → review → end — while keeping the existing song-form editor (FormTabs, SectionRow, etc.) intact inside the new layout.

**What is deleted:** `App.tsx` tab bar and tab state; `Dashboard.tsx`, `DashboardPresentation.tsx`, `Regions.tsx`, `RegionsPresentation.tsx`, `Mixdown.tsx`, `MixdownPresentation.tsx` and their stories. The old `.status-bar`, `.tabs`, `.app-header` CSS rules.

**What is kept and reused:** Every component under `web/src/components/song/` and `web/src/components/ui/`; `SongEditor.tsx` and `SongEditorPresentation.tsx` (renamed / relocated as `ComplexSongView`).

---

## 2. Data Model

### 2.1 Rehearsal Segment (server-owned)

```ts
interface RehearsalSegment {
  id: string;           // uuid
  type: 'take' | 'discussion';
  num: number;          // per-type counter: T1, T2… / D1, D2…
  songId: string;
  songName: string;
  startPosition: number;  // REAPER playhead seconds when segment opened
}
```

The `takes` array in the frontend store is populated from WS events. The segment log lives entirely in `AppState` (in-memory, reset on server restart or `end`).

### 2.2 Rehearsal Type (server config)

```ts
interface RehearsalType {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}
```

Served statically from `server/src/config.ts`. Default value:
```ts
const REHEARSAL_TYPES: RehearsalType[] = [
  { id: 'full-band',  name: 'Full Band',   desc: 'All instruments, full monitoring', emoji: '🎸' },
  { id: 'piano-vox',  name: 'Piano + Vox', desc: 'Stripped back, piano and vocals only', emoji: '🎹' },
];
```

### 2.3 Song List (server-backed)

Each entry in the song list is `{ id, name, bpm, timeSig }`. The server stores an array of lightweight song records alongside (or embedded in) the existing `SongStore`. `GET /api/songs` returns the list; `POST /api/songs/:id/select` makes a song the active one (loads its full data into `SongStore`).

For MVP the song list may be derived from existing `SongStore` revisions — each unique `song.id` is one song. A new-song action creates a fresh blank `Song` document.

### 2.4 Frontend Zustand Store — new slice

Additions to `AppStore` in `web/src/store.ts`:

```ts
// Rehearsal slice
rehearsalStatus: 'idle' | 'discussion' | 'take' | 'playback';
rehearsalType: RehearsalType;
rehearsalTypes: RehearsalType[];  // fetched from /api/rehearsal/types
takes: RehearsalSegment[];        // ordered list from server
currentSegmentStart: number | null; // REAPER position when current segment opened
currentTakeIdx: number | null;    // which segment is in playback

// UI state
songMode: 'simple' | 'complex';
simpleBpm: number;
simpleNote: NoteValue;
simpleNum: number;
simpleDenom: number;
playbackDrawerOpen: boolean;
songPickerOpen: boolean;
typePickerOpen: boolean;
menuOpen: boolean;

// Computed (derived, not stored)
// elapsed = store.transport.position - currentSegmentStart  (computed in component)
```

### 2.5 WebSocket message extensions

New message types broadcast by the server:

```ts
| { type: 'rehearsal:started';   data: { segment: RehearsalSegment } }
| { type: 'rehearsal:segment';   data: { segment: RehearsalSegment } }  // new segment opened
| { type: 'rehearsal:ended';     data: {} }
| { type: 'rehearsal:snapshot';  data: { segments: RehearsalSegment[]; status: RehearsalStatus } }
```

The existing `snapshot` message gains two optional fields:
```ts
data: {
  transport: ...; currentTake: ...; song: ...;
  rehearsalSegments?: RehearsalSegment[];
  rehearsalStatus?: RehearsalStatus;
}
```

---

## 3. New Server Endpoints

### 3.1 `GET /api/rehearsal/types`
Returns the static list from config.
```json
{ "ok": true, "types": [{ "id": "full-band", "name": "Full Band", "desc": "...", "emoji": "🎸" }] }
```
No OSC fires.

### 3.2 `POST /api/rehearsal/start`
Body: `{ typeId: string }`

- Validates `typeId` against config list.
- Calls `reaper.record()` to start continuous recording.
- Opens first segment: `type = 'discussion'`, `num = 1`, `startPosition = state.transport.position`.
- Broadcasts `rehearsal:started` + updated `snapshot`.
- Returns: `{ ok: true, segment: RehearsalSegment }`

### 3.3 `POST /api/rehearsal/set-category`
Body: `{ category: 'take' | 'discussion' }`

- Closes the current open segment (records its final duration — informational only).
- Opens a new segment of the requested `category` at `state.transport.position`.
- If toggling to `take`: calls `reaper.toggleMetronome()` to enable metronome (only if `state.transport.metronome` is false).
- If toggling to `discussion`: calls `reaper.toggleMetronome()` to disable (only if metronome is on).
- Broadcasts `rehearsal:segment` with the new segment.
- Returns: `{ ok: true, segment: RehearsalSegment }`

**Note:** This endpoint is called by both the "Start Take" / "End Take" footer buttons AND the status badge toggle. The badge toggle passes the flipped category; the footer buttons pass an explicit category.

### 3.4 `POST /api/rehearsal/end`
- Calls `reaper.stop()`.
- Clears all segment state.
- Broadcasts `rehearsal:ended`.
- Returns: `{ ok: true }`

### 3.5 `GET /api/songs`
Returns a list of known songs. For MVP: derived from `SongStore` — returns `[store.getSong()]` (single song). Future: multi-song array.

```json
{ "ok": true, "songs": [{ "id": "...", "name": "...", "bpm": 120, "timeSig": "4/4" }] }
```

### 3.6 `POST /api/songs/:id/select`
Activates a song by ID. For MVP no-op if id matches the current song; reject unknown IDs.

---

## 4. UI Component Tree

```
App (new)
├── RehearsalHeader
│   ├── RehearsalTypePill (button → opens TypePickerSheet)
│   ├── StatusBadge (tappable when discussion|take)
│   └── HamburgerButton (→ opens HamburgerMenu)
│
├── MainContent (scrollable, flex:1)
│   ├── SongNameRow
│   │   ├── <input> song name (font-display, 26px)
│   │   └── SetlistButton (→ opens SongPickerSheet)
│   │
│   ├── ModeToggle (Simple | Complex pill buttons)
│   │
│   ├── SimpleSongView  [when songMode === 'simple']
│   │   └── card: TempoEditor + TimeSignatureRow
│   │
│   └── ComplexSongView [when songMode === 'complex']
│       └── (existing SongEditorPresentation content, no name input, no RunBar repositioning)
│
├── TransportFooter (fixed bottom, z=100, bottom offset = takes.length > 0 ? 28 : 0)
│   ├── ActionButton (Start Rehearsal | Start Take | End Take | Stop)
│   └── MetronomeToggle (48×48, always visible)
│
├── PlaybackDrawer (fixed bottom, z=150, transform translateY)
│   ├── PullTab (grip + "N clips" + chevron)
│   └── DrawerContent
│       ├── SegmentPills (flex-wrap, take=accent, discussion=amber)
│       ├── EndRehearsalButton
│       └── PlaybackStatusBar [when status==='playback']
│
├── HamburgerMenu (slide from right, overlay)
│   ├── Main View button
│   ├── Theme toggle
│   ├── divider
│   └── ADVANCED (collapsible)
│       ├── Transport (inline lightweight panel stub)
│       └── Debug Log (stub)
│
├── SongPickerSheet (bottom sheet overlay)
└── RehearsalTypePickerSheet (bottom sheet overlay)
```

---

## 5. Rehearsal State Machine

```
idle
  → [POST /api/rehearsal/start]         → discussion
discussion
  → [POST /api/rehearsal/set-category {category:'take'}]  → take
  → [tap segment pill in drawer]        → playback
  → [POST /api/rehearsal/end]           → idle
take
  → [POST /api/rehearsal/set-category {category:'discussion'}]  → discussion
  → [tap segment pill in drawer]        → playback
  → [POST /api/rehearsal/end]           → idle
playback
  → [POST /api/transport/stop]          → discussion
  → [POST /api/rehearsal/end]           → idle
```

The **status badge toggle** calls `set-category` with the flipped value. It does NOT create a new segment separately — `set-category` closes the current segment and opens a new one atomically.

The **Action button** label / behavior:
- idle → "Start Rehearsal" → calls `start`
- discussion → "Start Take" → calls `set-category {category:'take'}`
- take → "End Take" → calls `set-category {category:'discussion'}`
- playback → "Stop" → calls `/api/transport/stop`

---

## 6. Elapsed Time Computation

```ts
// In StatusBadge component:
const elapsed = currentSegmentStart !== null
  ? Math.max(0, transport.position - currentSegmentStart)
  : 0;
```

`transport.position` comes from `store.transport.position` (live from WS). `currentSegmentStart` is set in the store when a `rehearsal:segment` or `rehearsal:started` WS event arrives.

---

## 7. CSS Migration (`web/src/styles.css`)

Replace the entire file with a new one that:

**Keeps (updated):**
- Reset rules (`* { box-sizing }`, `html/body/#root`, `body`)
- `.chip`, `.chip.solid`, `.chip.ghost`, `.chip.empty` — same visual, updated font to `var(--font-body)`
- `button.primary` (used by RunBar)
- `.wf-shake`, `.wf-caret`, `@keyframes` for both
- `.card`, `.row`, `.stack`, `.spacer`, `.hr`, `.muted`
- `table`, `label`, `input`, `select` base rules
- All letter swatch variables (unchanged)
- `input[type="range"]` rules

**New tokens in `:root`:**
```css
--font-body:    'DM Sans', system-ui, sans-serif;
--font-display: 'Caveat', cursive;
--font-mono:    'DM Mono', 'JetBrains Mono', monospace;
--font-music:   'Noto Music', serif;
--shadow-sm:    0 1px 3px rgba(0,0,0,0.06);
--shadow-md:    0 2px 8px rgba(0,0,0,0.08);
```

**New color tokens in `[data-theme="light"]`:**
```css
--green:      #2d8a4e;
--green-soft: rgba(45,138,78,0.10);
--amber:      #b8860b;
--amber-soft: rgba(184,134,11,0.10);
--muted:      #8a8478;   /* alias; --muted-color kept for backward compat */
```

**New color tokens in `[data-theme="dark"]`:**
```css
--green:      #4ac46a;
--green-soft: rgba(74,196,106,0.12);
--amber:      #d4a017;
--amber-soft: rgba(212,160,23,0.12);
--muted:      #948c7e;
```

**Google Fonts import at top of file:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Caveat:wght@700&display=swap');
```

**Dropped:**
- `.tabs`, `.tabs button`, `.tabs button.active`
- `.app-header`, `.app-header__title`
- `.status-bar`, `.status-bar .dot.*`
- `.screen`
- `.transport` grid
- `--font-hand`, `--shadow-sketch`, `--shadow-card`

**New `@keyframes pulse`:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

---

## 8. New File Locations

| File | Purpose |
|------|---------|
| `web/src/App.tsx` | Rewritten — single screen, WS boot, new store slice |
| `web/src/store.ts` | Extended with rehearsal slice |
| `web/src/api/client.ts` | Extended with new endpoint methods + new WS types |
| `web/src/components/rehearsal/RehearsalHeader.tsx` | Header bar |
| `web/src/components/rehearsal/StatusBadge.tsx` | Status pill |
| `web/src/components/rehearsal/TransportFooter.tsx` | Bottom action bar |
| `web/src/components/rehearsal/PlaybackDrawer.tsx` | Slide-up drawer |
| `web/src/components/rehearsal/HamburgerMenu.tsx` | Slide-in menu |
| `web/src/components/rehearsal/SongPickerSheet.tsx` | Song picker bottom sheet |
| `web/src/components/rehearsal/RehearsalTypeSheet.tsx` | Type picker bottom sheet |
| `web/src/components/rehearsal/SimpleSongView.tsx` | Simple mode editor |
| `web/src/components/rehearsal/index.ts` | Barrel export |
| `server/src/routes/rehearsal.ts` | New rehearsal routes |
| `server/src/routes/songs.ts` | Song list routes |

---

## 9. Screens / Files to Delete

- `web/src/screens/Dashboard.tsx`
- `web/src/screens/DashboardPresentation.tsx`
- `web/src/screens/DashboardPresentation.stories.tsx`
- `web/src/screens/Regions.tsx`
- `web/src/screens/RegionsPresentation.tsx`
- `web/src/screens/RegionsPresentation.stories.tsx`
- `web/src/screens/Mixdown.tsx`
- `web/src/screens/MixdownPresentation.tsx`
- `web/src/screens/MixdownPresentation.stories.tsx`

---

## 10. Test Infrastructure

- **Framework:** Vitest 2.x + @testing-library/react 16.x
- **Test directory:** `web/tests/` (existing convention)
- **Test command:** `pnpm -F web test` (runs `vitest run`)
- **Environment:** jsdom (configured in `vite.config.ts`)
- **Server tests:** Use Fastify's `inject()` method (no supertest needed)
- **Naming:** `*.test.ts` / `*.test.tsx` under `web/tests/` for frontend; `server/tests/` for server

---

## 11. Out of Scope

- Mixdown and Regions features (Advanced menu stubs only)
- Full multi-song persistence (song list MVP = single song)
- OSC events on rehearsal type change
- Storybook stories for new components (unless time permits)
