# Task 005: Delete Old Screens and Rewrite App.tsx

## Objective

Delete the Dashboard, Regions, and Mixdown screen files. Rewrite `web/src/App.tsx` to be the new single-screen app shell: it boots WS, calls `refresh()`, and renders the new layout (header, main content area, transport footer, playback drawer, overlays). At this stage the new rehearsal components are imported by path — they are stubs until tasks 006–011 complete.

## Context

The current `App.tsx` renders four screens via tab state. After this task it renders a single layout. The existing `SongEditor` container component (`web/src/screens/SongEditor.tsx`) is reused directly as the `ComplexSongView` content — no rename needed yet.

The new App must:
1. Connect to WS on mount (same as today, using `connectWs`)
2. Call `store.refresh()` and `store.fetchRehearsalTypes()` on mount
3. Render the new layout structure using the new components (imported from `web/src/components/rehearsal/`)

The new component files created by tasks 006–011 will be stub-quality at the time this task runs — that is fine. This task's job is to wire the shell and delete the dead code.

## Requirements

### Files to DELETE

Remove these files entirely:
- `/home/user/rehearsaltools/web/src/screens/Dashboard.tsx`
- `/home/user/rehearsaltools/web/src/screens/DashboardPresentation.tsx`
- `/home/user/rehearsaltools/web/src/screens/DashboardPresentation.stories.tsx`
- `/home/user/rehearsaltools/web/src/screens/Regions.tsx`
- `/home/user/rehearsaltools/web/src/screens/RegionsPresentation.tsx`
- `/home/user/rehearsaltools/web/src/screens/RegionsPresentation.stories.tsx`
- `/home/user/rehearsaltools/web/src/screens/Mixdown.tsx`
- `/home/user/rehearsaltools/web/src/screens/MixdownPresentation.tsx`
- `/home/user/rehearsaltools/web/src/screens/MixdownPresentation.stories.tsx`

### Rewrite `web/src/App.tsx`

```tsx
import { useEffect } from "react";
import { connectWs } from "./api/client";
import { useStore } from "./store";
import { RehearsalHeader } from "./components/rehearsal/RehearsalHeader";
import { TransportFooter } from "./components/rehearsal/TransportFooter";
import { PlaybackDrawer } from "./components/rehearsal/PlaybackDrawer";
import { HamburgerMenu } from "./components/rehearsal/HamburgerMenu";
import { SongPickerSheet } from "./components/rehearsal/SongPickerSheet";
import { RehearsalTypeSheet } from "./components/rehearsal/RehearsalTypeSheet";
import { SimpleSongView } from "./components/rehearsal/SimpleSongView";
import { SongEditor } from "./screens/SongEditor";  // existing complex mode

export function App() {
  const refresh = useStore((s) => s.refresh);
  const applyWsMessage = useStore((s) => s.applyWsMessage);
  const fetchRehearsalTypes = useStore((s) => s.fetchRehearsalTypes);
  const songMode = useStore((s) => s.songMode);
  const takes = useStore((s) => s.takes);
  const error = useStore((s) => s.error);

  useEffect(() => {
    refresh();
    fetchRehearsalTypes();
    const ws = connectWs(applyWsMessage);
    return () => ws.close();
  }, [refresh, applyWsMessage, fetchRehearsalTypes]);

  const transportBottomOffset = takes.length > 0 ? 28 : 0;

  return (
    <div className="app">
      <RehearsalHeader />

      {/* Song name row — rendered inside MainContent or inline here */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 102 + transportBottomOffset }}>
        {/* SongNameRow and ModeToggle are part of RehearsalHeader or separate component — see task 006 */}
        {songMode === "simple" ? <SimpleSongView /> : <SongEditor />}
      </div>

      <TransportFooter />
      <PlaybackDrawer />
      <HamburgerMenu />
      <SongPickerSheet />
      <RehearsalTypeSheet />

      {error && (
        <div style={{
          position: "fixed", bottom: 80, left: 16, right: 16, zIndex: 300,
          background: "var(--accent-soft)", color: "var(--accent)",
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          fontSize: 13, border: "1px solid var(--accent)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
```

**Note:** The `SongNameRow` (song name input + Setlist button) and `ModeToggle` (Simple/Complex pills) are rendered as part of the main content area. They can be inlined in App.tsx or extracted as a `MainContent` sub-component in the same file. They connect to the store directly.

**SongNameRow inline in App.tsx:**
- `<input>` with `value={song.name}`, calls `store.updateSongName()` on blur/debounce (existing pattern from SongEditor.tsx)
- Font: `var(--font-display)`, 26px, 700, transparent bg, no border normally, accent bottom-border on focus
- Setlist button: calls `store.setSongPickerOpen(true)`, styled as a ghost pill

**ModeToggle inline in App.tsx:**
- Two pill buttons "Simple" / "Complex"
- Active: `--accent-soft` bg, `--accent` border+color
- Inactive: transparent bg, `--rule` border, `--muted` color
- Calls `store.setSongMode()`

## Existing Code References

- `/home/user/rehearsaltools/web/src/App.tsx` — rewrite this file
- `/home/user/rehearsaltools/web/src/screens/SongEditor.tsx` — keep, import as complex mode
- `/home/user/rehearsaltools/web/src/store.ts` — all new store slices from task 003
- `/home/user/rehearsaltools/web/src/api/client.ts` — `connectWs`

## Implementation Details

- The new component files from tasks 006–011 may not exist yet when this task runs; create minimal stub exports so the import graph compiles:
  ```tsx
  // e.g. web/src/components/rehearsal/RehearsalHeader.tsx stub
  export function RehearsalHeader() { return <div data-testid="rehearsal-header" />; }
  ```
  Each stub file MUST exist before App.tsx is written. Create all 8 stubs as part of this task.
- Stubs will be replaced by tasks 006–011.
- The `SongEditorPresentation` still renders its own song name input — for the complex mode that's acceptable temporarily. The PRD-specified song name input at the top of the page is in App.tsx's main content area (above the mode toggle) and both may coexist briefly.

## Acceptance Criteria

- [ ] All 9 deleted screen files are gone
- [ ] `App.tsx` no longer imports Dashboard, Regions, or Mixdown
- [ ] `App.tsx` no longer renders a tab bar
- [ ] `App.tsx` renders `RehearsalHeader`, `TransportFooter`, `PlaybackDrawer`, `HamburgerMenu`, `SongPickerSheet`, `RehearsalTypeSheet`
- [ ] Song name input and mode toggle are present in the main content area
- [ ] `SimpleSongView` renders when `songMode === 'simple'`
- [ ] `SongEditor` (complex) renders when `songMode === 'complex'`
- [ ] App compiles without TypeScript errors
- [ ] Existing Vitest tests still pass (`pnpm -F web test`)

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/App.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **renders without crashing**: render `<App />` in jsdom (mock `connectWs`, mock `store.refresh`, mock `store.fetchRehearsalTypes`); assert no thrown error
2. **renders rehearsal-header**: rendered tree includes an element with `data-testid="rehearsal-header"` (from stub)
3. **shows SimpleSongView when songMode is simple**: set `useStore` state to `{ songMode: 'simple' }`, render App, assert `data-testid="simple-song-view"` in DOM
4. **shows SongEditor when songMode is complex**: set state to `{ songMode: 'complex' }`, assert SongEditor is in tree (check for a known element from SongEditorPresentation, e.g. a form tabs container)
5. **song mode toggle buttons change songMode**: find "Simple" and "Complex" buttons, click "Complex", verify `store.songMode` becomes `'complex'`

### TDD Process

1. Write failing tests first (App stubs exist so imports resolve, tests fail on assertions)
2. Implement
3. Run full suite, no regressions

## Dependencies

- Depends on: 003 (store slice), 004 (CSS, so styles don't explode)
- Blocks: 006–011 (conceptually; stubs created here are replaced there)

## Parallelism

Must run after 003 and 004. Can overlap with 006–011 since stubs are created here.
