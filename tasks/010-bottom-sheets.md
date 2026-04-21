# Task 010: Frontend — SongPickerSheet and RehearsalTypeSheet

## Objective

Implement `web/src/components/rehearsal/SongPickerSheet.tsx` and `web/src/components/rehearsal/RehearsalTypeSheet.tsx` — the two bottom-sheet overlay components for selecting a song from the setlist and selecting a rehearsal type.

## Context

Both sheets follow the same overlay pattern: a dark backdrop `rgba(0,0,0,0.4)` covering the full screen, with a content panel sliding up from the bottom (`border-radius: 16px 16px 0 0`), max-height 70vh, scrollable. Tapping outside the panel closes the sheet.

`SongPickerSheet` calls `api.listSongs()` on open to fetch the list. Selecting a song calls `api.selectSong(id)` then `store.refreshSong()` to update the store.

`RehearsalTypeSheet` reads `store.rehearsalTypes` (fetched at app start by `fetchRehearsalTypes`) and sets `store.setRehearsalType(type)` on selection.

## Requirements

### `web/src/components/rehearsal/SongPickerSheet.tsx`

**Visibility:** render null when `store.songPickerOpen === false`

**Overlay:** `position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end;`
Click on overlay (not content) → `store.setSongPickerOpen(false)`

**Content panel:**
```css
width: 100%; max-height: 70vh;
background: var(--surface-raised);
border-radius: 16px 16px 0 0;
overflow-y: auto; padding: 16px;
```

**Content:**
1. Grip bar: `36×4px`, `background: var(--faint)`, `margin: 0 auto 14px`
2. Heading: "Choose a Song" (18px, 700)
3. "+ New Song" button — dashed border, `--muted` color, gap+plus icon, creates a new date-stamped untitled song
   - On click: generate name = `Untitled ${new Date().toISOString().slice(0,10)}`, call `api.updateSong({ name })` (or create new song if multi-song supported), close sheet
   - For MVP: call `store.updateSongName(name)` and `store.setSongPickerOpen(false)`
4. Song list items — fetched via `api.listSongs()` on mount (when `songPickerOpen` becomes true)
   - Each item: song name (15px, 600) + BPM · timeSig (12px, mono) — both from `SongListItem`
   - On click: call `api.selectSong(song.id)`, then `store.refreshSong()`, then `store.setSongPickerOpen(false)`
   - `data-testid={`song-item-${song.id}`}`
5. Loading state: show "Loading…" while fetch in progress
6. Error state: show error message

**Local state:**
- `songs: SongListItem[]`
- `loading: boolean`
- `fetchError: string | null`

Fetch songs in a `useEffect` that runs when `songPickerOpen` becomes true.

`data-testid="song-picker-sheet"`

### `web/src/components/rehearsal/RehearsalTypeSheet.tsx`

**Visibility:** render null when `store.typePickerOpen === false`

Same overlay pattern. `data-testid="type-picker-sheet"`

**Content:**
1. Grip bar
2. Heading: "Rehearsal Type" (18px, 700)
3. Type cards — one per item in `store.rehearsalTypes`
   - Layout: emoji (20px) + div with name (15px, 600) + desc (13px, muted)
   - Active card (id matches `store.rehearsalType?.id`): `background: var(--accent-soft); border: 1px solid var(--accent)`
   - Inactive: `background: var(--surface); border: 1px solid var(--rule)`
   - `padding: 14px 16px; border-radius: var(--radius-md); width: 100%; cursor: pointer; text-align: left; margin-bottom: 6px`
   - On click: `store.setRehearsalType(type)`, `store.setTypePickerOpen(false)`
   - `data-testid={`type-card-${type.id}`}`

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/app.jsx` lines 243–332 — reference implementations for both sheets
- `/home/user/rehearsaltools/web/src/api/client.ts` — `api.listSongs()`, `api.selectSong()` (from task 003)
- `/home/user/rehearsaltools/web/src/store.ts` — `songPickerOpen`, `typePickerOpen`, `rehearsalTypes`, `rehearsalType`

## Implementation Details

- For the type sheet, if `store.rehearsalTypes` is empty (fetch not yet complete), show a loading state or empty list gracefully
- Do not use an external animation library; the sheet is statically positioned when visible

## Acceptance Criteria

- [ ] `SongPickerSheet` renders null when `songPickerOpen === false`
- [ ] Sheet appears with overlay when `songPickerOpen === true`
- [ ] Song list items fetched and displayed on open
- [ ] "+ New Song" updates song name and closes sheet
- [ ] Selecting a song closes the sheet and updates the store's active song
- [ ] Overlay click closes the sheet
- [ ] `RehearsalTypeSheet` renders null when `typePickerOpen === false`
- [ ] Type cards shown from `store.rehearsalTypes`
- [ ] Active type is visually highlighted
- [ ] Selecting a type updates `store.rehearsalType` and closes the sheet
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/BottomSheets.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

**SongPickerSheet:**
1. **hidden when closed**: `songPickerOpen: false` → no `data-testid="song-picker-sheet"` in DOM
2. **visible when open**: `songPickerOpen: true` → sheet in DOM
3. **overlay click closes**: click overlay, assert `store.setSongPickerOpen(false)` called
4. **song items rendered**: mock `api.listSongs` to return 2 items; open sheet; assert 2 song items in DOM
5. **select song**: click song item, assert `api.selectSong` called with correct id

**RehearsalTypeSheet:**
6. **hidden when closed**: `typePickerOpen: false` → no sheet
7. **visible when open**: sheet in DOM
8. **type cards rendered**: set `store.rehearsalTypes` to 2 items, assert 2 type cards
9. **active type highlighted**: set `store.rehearsalType = types[0]`, assert types[0] card has accent styling
10. **select type**: click type card, assert `store.setRehearsalType` called with correct type

### TDD Process

1. Write failing tests (mock `api.listSongs`)
2. Implement components
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store), 005 (stubs replaced here)
- Blocks: Nothing hard

## Parallelism

Can run in parallel with 006, 007, 008, 009, 011.
