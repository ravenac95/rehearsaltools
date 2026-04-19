# Consolidate Song Form Editor (WF2) into Single Page

> This is the final, resolved PRD. All design questions have been answered.
> Original plan: /root/.claude/plans/we-now-have-some-peppy-finch.md

## Context

The current SPA splits song authoring across two tabs: **Sections** (CRUD for named sections with bar/meter/BPM rows) and **Song Form** (builds a sequence from those sections and writes markers+region to REAPER). The split is awkward on mobile — every edit requires jumping between screens.

The designs in `designs/Song Form Editor — Wireframes.html` propose a single-page editor. The user has selected **WF2 (Type String)** and wants to match the hand-drawn, paper-themed styling of the wireframe (not the current dark/system-font UI).

New abstractions (UX only — the ReaScript contract stays the same):

- **Bar** — a time signature `{num, denom}` (implicit inside a stanza; not stored standalone).
- **Stanza** — `{bars, num, denom, bpm?}` — some multiple of bars of one time signature, optionally overriding tempo.
- **Section** — `{letter, stanzas[], bpm?}` — sequence of stanzas, single-letter name (A–Z, plus "I" for intro), unique color per letter, optional tempo override.
- **SongForm** — `{id, name, bpm, note, pattern[]}` — sequence of sections via an explicit flat list of letters, e.g. `["I","A","A","B","A","C"]` (no repeat shorthand in storage). Default tempo + note-type that stanzas/sections inherit. `name` auto-increments ("1", "2", "3"…) but is editable.
- **Song** — `{id, name, sections[], songForms[]}` — a single song holds its library of sections (shared across forms) and multiple experimental forms.

Collapsed section rows must show the full single-line strip of compact stanza cards; anything overflowing the right edge is clipped (rare — ≤2 stanzas/section in practice).

## Scope & non-goals

**In scope:**
- Replace `Sections` + `SongForm` tabs with one `Song` tab implementing WF2.
- Refactor backend storage from `{sections, songForm}` to `{song, revisions}` — single song, sections shared across its forms.
- Revision history: every successful write to the song keeps a snapshot; retain the most recent 25.
- Preserve the REAPER `/rt/songform.write` contract (flat `{barOffset, num, denom, bpm}[]`).
- **Full theme overhaul across every screen** (Transport, Regions, Mixdown, and the new Song editor) in the hand-drawn WF wireframe style — Kalam/Caveat/JetBrains Mono fonts, paper palette, sketch shadows, dashed/solid chip buttons.
- **Light/dark mode toggle** with persistent preference; both modes share the hand-drawn aesthetic (the dark mode is a night-paper variant — dark ink surface with warm off-white text — not the current system-dark UI).

**Out of scope:**
- Multi-song management (one song per project for now; the data shape allows future expansion).
- ReaScript changes — the `/rt/songform.write` payload stays BPM-only for now even though the UI tracks note-type. A TODO comment in the flatten/write code marks where note-type should eventually be sent.
- Drag-to-reorder sections or stanzas (re-order sections happens via editing the pattern string; stanza order is insertion order).
- A separate "section library" browser.
- Migrating existing data — we start fresh; legacy JSON (if any) is renamed to `.legacy.json` and replaced with an empty song.

## Data model

### New TypeScript types (`web/src/api/client.ts` + `server/src/store/song.ts`)

```ts
export type NoteValue = "w" | "h" | "q" | "e" | "s"; // whole / half / quarter / eighth / sixteenth

export interface Stanza {
  bars: number;        // >= 1
  num: number;         // 1-64
  denom: number;       // 1,2,4,8,16,32,64
  bpm?: number;        // 20-999, overrides section tempo if set
  note?: NoteValue;    // overrides section note if set
}

export interface Section {
  letter: string;      // single char, A-Z or I
  stanzas: Stanza[];
  bpm?: number;        // overrides form tempo if set
  note?: NoteValue;    // overrides form note if set
}

export interface SongForm {
  id: string;
  name: string;        // default "1", "2", ... (editable)
  bpm: number;         // default tempo for the form
  note: NoteValue;     // default note-type for the form (defaults to "q")
  pattern: string[];   // flat, explicit list of section letters, e.g. ["A","A","B","A"]
}

export interface Song {
  id: string;
  name: string;
  sections: Section[];
  songForms: SongForm[];
  activeFormId: string | null;
}
```

**Note-type inheritance:** effective note = `stanza.note ?? section.note ?? form.note`.

### Storage (`server/src/store/song.ts`)

Replaces `server/src/store/sections.ts`. Same atomic-write pattern (temp-file + rename). JSON file `./data/rehearsaltools.json` — shape becomes:

```json
{
  "song": {
    "id": "...",
    "name": "Untitled",
    "sections": [],
    "songForms": [{ "id": "...", "name": "1", "bpm": 100, "note": "q", "pattern": [] }],
    "activeFormId": "..."
  },
  "revisions": [
    { "id": "...", "at": "2026-04-19T12:34:56Z", "reason": "write", "song": { } }
  ]
}
```

### Revision history

- A revision is a full snapshot of `song` at the moment of change.
- Captured on every mutating store call.
- In-memory ring: newest first, trimmed to 25 on each write.
- Persisted alongside `song` in the same JSON file (atomic rename).
- Exposed via:
  - `GET /api/song/revisions` → `[{id, at, reason}]` (newest first, no snapshots).
  - `GET /api/song/revisions/:id` → full snapshot.
  - `POST /api/song/revisions/:id/restore` → restores song, records new revision with `reason:"restore"`.

### Fresh-start on upgrade

No migration. On first boot after upgrade:
- If `./data/rehearsaltools.json` exists and does not match the new shape, rename it to `rehearsaltools.legacy.json`.
- Initialise with an empty song: `{ id, name:"Untitled", sections:[], songForms:[{id, name:"1", bpm:100, note:"q", pattern:[]}], activeFormId:<that id> }` and `revisions:[]`.

## Backend changes

**Files to modify / create:**

- **`server/src/store/song.ts`** (new) — exports `SongStore` class.
- **`server/src/store/sections.ts`** — **delete**.
- **`server/src/flatten.ts`** (new) — `flattenForm(song, formId)`.
- **`server/src/routes/song.ts`** (new) — all song/form/section/revisions endpoints.
- **`server/src/routes/sections.ts`**, **`server/src/routes/songform.ts`** — **delete**.
- **`server/src/ws.ts`** — snapshot payload switches to `{song}`.
- **`server/src/index.ts`** — register `routes/song.ts`; remove old route registrations.
- **Tests:** delete old, add `song.test.ts`, `revisions.test.ts`, `flatten.test.ts`.

## Frontend changes

### Routing / screens

- **`web/src/App.tsx`** — remove "Sections" tab; rename "Song Form" tab to "Song".
- **`web/src/screens/Sections.tsx`** — **delete**.
- **`web/src/screens/SongForm.tsx`** — **delete** → replaced by `web/src/screens/SongEditor.tsx`.

### Theme system

- **`web/index.html`** — add Google Fonts (Caveat, Kalam, JetBrains Mono).
- **`web/src/theme.ts`** (new) — palette, `useTheme` hook, localStorage persist, `<html data-theme>`.
- **`web/src/styles.css`** — rewritten with CSS variables for light/dark themes.

### Shared UI primitives (`web/src/components/ui/`)

- `Chip.tsx`, `Card.tsx`, `Button.tsx`, `Stepper.tsx`, `ThemeToggle.tsx`.

### Song-editor components (`web/src/components/song/`)

- `colors.ts`, `FormTabs.tsx`, `FormStringEditor.tsx`, `SectionRow.tsx`, `StanzaCompact.tsx`, `StanzaExpanded.tsx`, `TempoEditor.tsx`, `NoteGlyph.tsx`, `LetterBadge.tsx`, `TimeSigStack.tsx`, `RunBar.tsx`.

### CSS variables (reference)

Light theme (paper):
- `--surface: #fbf8f1`, `--surface-alt: #f3efe4`
- `--ink: #1e1b16`, `--ink-soft: #3a3630`, `--muted: #807a70`, `--faint: #b8b2a5`
- `--rule: #cfc8b8`, `--accent: #c73a1d`

Dark theme (night-paper):
- `--surface: #1a1814`, `--surface-alt: #24221d`
- `--ink: #f3ece0`, `--ink-soft: #d9d0bf`, `--muted: #948c7e`, `--faint: #5a534a`
- `--rule: #3a3630`, `--accent: #f08a4a`

Section-letter colors:
```
A #ff8a6b / B #5fb8b0 / C #f5c147 / D #a08ad6 / E #9cc48a / F #e89abf / I #d9d2c2
```

### Pattern parser (`web/src/components/song/pattern.ts`)

`parsePattern(input: string): string[]`:
- Whitespace-separated tokens.
- Each token matches `^([A-Z])(?:[x×](\d+))?$`; `A×2` expands to `["A","A"]`.
- Invalid tokens surface as inline validation; don't mutate state until valid.

`serialisePattern(letters: string[]): string` → `"A A B A C"` style, space-separated.

### State (Zustand — `web/src/store.ts`)

- Replace `sections` + `songForm` slices with a single `song: Song` slice.
- Actions: `refreshSong`, `updateSongName`, `setActiveForm`, `createForm`, `updateForm`, `deleteForm`, `upsertSection`, `deleteSection`, `writeActiveForm`.
- `deleteSection` surfaces any `warning` returned by the API as a transient toast.
- Derived selectors: `activeForm`, `flattenedRows`, `uniqueLettersInActiveForm`, `totalBars`.

## REAPER contract

Preserved — `flattenForm` output matches `FlatRow[]` shape, and the write handler builds the same `{regionName, rows, startTime}` payload. No ReaScript edits.

## Decisions (resolved)

1. Section definitions are **shared across all forms** within the song.
2. **Start fresh** on upgrade; legacy JSON renamed to `.legacy.json`.
3. Section delete **auto-strips** the letter from every form's pattern; warning toast shown.
4. **No drag-reorder** in v1.
5. Backend keeps the **last 25** full snapshots, appended on every mutation.
6. **Hand-drawn wireframe styling** applies to the entire app. Light/dark toggle on every screen, persisted in localStorage, defaulting to system.
7. **Note-type** stored and validated at form/section/stanza; REAPER write payload omits it (TODO comment).

## Verification

1. `pnpm -F server test` — all new and existing tests pass.
2. `pnpm -F web test` — store tests updated; pattern parser tests pass.
3. Fresh-start: pre-existing `data/rehearsaltools.json` is renamed to `.legacy.json`; new file contains empty-song payload.
4. Revision history: 30 mutations → only last 25 kept. GET/POST revisions endpoints work.
5. Manual UI walkthrough at 375x812 — Song tab, pattern editor, section rows, stanza editor, tempo/note inheritance, section delete warning, form tabs, RUN button.
6. Fonts (Caveat/Kalam/JetBrains Mono) render everywhere; paper palette and sketch shadows on every screen.
7. Theme toggle: system/light/dark cycle, persists across reloads; letter badges readable in both modes.
8. Regression: Transport, Regions, Mixdown still function; WS snapshot hydrates store on reconnect.
