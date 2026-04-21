# Task 012: Integration, Wiring, and Final Cleanup

## Objective

Verify the full vertical slice works end-to-end; fix any integration gaps between the server endpoints and the frontend; confirm the song name row and mode toggle in App.tsx work correctly with the store; add barrel exports; ensure no dead imports remain.

## Context

By the time this task runs, all of the following are complete:
- Tasks 001–002: Server endpoints for rehearsal and songs
- Task 003: Store + API client extended
- Task 004: CSS replaced
- Task 005: App.tsx rewritten, old screens deleted
- Tasks 006–011: All rehearsal components implemented

This task is the integration/cleanup wave. It does not implement new features — it ensures everything wires together correctly.

## Requirements

### 1. Barrel export `web/src/components/rehearsal/index.ts`

Create (or verify existence of):
```ts
export { RehearsalHeader } from './RehearsalHeader';
export { StatusBadge } from './StatusBadge';
export { TransportFooter } from './TransportFooter';
export { PlaybackDrawer } from './PlaybackDrawer';
export { HamburgerMenu } from './HamburgerMenu';
export { SongPickerSheet } from './SongPickerSheet';
export { RehearsalTypeSheet } from './RehearsalTypeSheet';
export { SimpleSongView } from './SimpleSongView';
```

### 2. App.tsx song name row — verify correct behavior

Read the current `App.tsx`. Confirm:
- Song name input uses `store.song.name` (from the existing `updateSongName` action)
- On blur/enter, calls `store.updateSongName(draft)` (same debounce pattern as old `SongEditor.tsx`)
- The `SongEditor` (complex mode) still renders its own name field in the old `SongEditorPresentation` — this is acceptable for now, or the name field can be removed from `SongEditorPresentation` in this task if it creates a double-render (check the actual rendered output)

### 3. WS snapshot — verify rehearsal fields flow through

Confirm that on the first WS `snapshot` message received by the frontend:
- If `rehearsalSegments` is present in the snapshot, `store.takes` is populated
- If `rehearsalStatus` is present, `store.rehearsalStatus` is set

The server's `/ws` handler (in `server/src/index.ts`) must have been updated by task 001 to include these fields. Verify in `server/src/index.ts` and fix if not done.

### 4. `store.refresh()` — fetch rehearsal types if not loaded

Verify that `App.tsx` calls `store.fetchRehearsalTypes()` on mount (established in task 005). If this call was only added to `refresh()` conditionally and the call path may not trigger, add an explicit call in the `useEffect` in `App.tsx`.

### 5. Dead import cleanup

- Confirm `web/src/App.tsx` does not import from any deleted screen files
- Confirm `web/src/main.tsx` still correctly mounts the new `App`
- Confirm no TypeScript errors across the whole frontend (`pnpm -F web build`)

### 6. `main.tsx` — verify font loading

Check that the Google Fonts import in `styles.css` is working. The Vite dev server proxies `/api` and `/ws` but not external URLs — font loading is browser-side so no config change is needed. Verify `web/src/main.tsx` still imports `styles.css`:
```ts
import './styles.css';
```

### 7. SongEditorPresentation name field

The old `SongEditorPresentation` renders a song name input at the top. With the new layout, the App.tsx-level name input is the canonical one. Two options:
- **Option A (preferred for this task):** Keep both name inputs temporarily. They both update the same store value, so they stay in sync.
- **Option B:** Remove the name input from `SongEditorPresentation` (requires modifying `SongEditorPresentation.tsx` and its props — skip for now to avoid scope creep).

Document which option was chosen in a code comment.

## Existing Code References

- `/home/user/rehearsaltools/web/src/App.tsx` — after task 005
- `/home/user/rehearsaltools/web/src/main.tsx` — verify import chain
- `/home/user/rehearsaltools/server/src/index.ts` — WS snapshot payload
- `/home/user/rehearsaltools/web/src/components/rehearsal/` — all component files from tasks 006–011

## Acceptance Criteria

- [ ] `web/src/components/rehearsal/index.ts` barrel export exists with all 8 components
- [ ] `pnpm -F web build` completes without TypeScript errors
- [ ] `pnpm -F web test` passes all tests (no regressions from any prior task)
- [ ] WS snapshot on fresh browser connect populates rehearsal state if server has active rehearsal
- [ ] Song name input in App.tsx correctly reads from and writes to `store.song.name`
- [ ] No dead imports from deleted screen files anywhere in `web/src/`
- [ ] `main.tsx` imports `styles.css`
- [ ] Browser renders the app without console errors (manual verification)

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/integration.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **full render smoke test**: render `<App />` (mock WS), assert no crash; assert `data-testid="rehearsal-header"` exists; assert `data-testid="simple-song-view"` exists (default songMode=simple)
2. **song name syncs**: set store `song.name = 'My Song'`; render App; find name input; assert its value is "My Song"
3. **mode switch**: render App in simple mode; click "Complex" button; assert `data-testid="simple-song-view"` gone (SongEditor mounts instead)
4. **rehearsal types fetched on mount**: spy on `api.getRehearsalTypes`; render App; assert spy called
5. **rehearsal:ended resets state**: set store `takes: [{ type:'discussion', num:1, ... }]`; dispatch `rehearsal:ended` via `applyWsMessage`; assert `store.takes` is `[]`

### TDD Process

1. Write failing tests first
2. Fix integration gaps to make them pass
3. Run full suite

## Dependencies

- Depends on: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011 (all prior tasks)
- Blocks: Nothing (final task)

## Parallelism

This task runs last — after all component tasks in the 006–011 wave are complete.
