# Task 008: Frontend — PlaybackDrawer Component

## Objective

Implement `web/src/components/rehearsal/PlaybackDrawer.tsx` — the fixed pull-up drawer that shows take/discussion pills for playback navigation and an "End Rehearsal" button.

## Context

The drawer sits at `z-index: 150` (behind the transport footer at `z-index: 100` — the footer overlaps it). In the default (closed) state, only the pull tab (28px tall) is visible. When `takes.length === 0` the drawer is invisible (`opacity: 0`, `pointer-events: none`). When open, it slides up via `translateY` transition.

When the user taps a segment pill, it calls `store.selectTakeForPlayback(index)` which sets `currentTakeIdx` and `rehearsalStatus = 'playback'`. The playback status bar appears when `rehearsalStatus === 'playback'`.

The "End Rehearsal" button calls `store.endRehearsal()`.

## Requirements

### `web/src/components/rehearsal/PlaybackDrawer.tsx`

```tsx
export function PlaybackDrawer() { ... }
```

**Outer wrapper:**
```css
position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
transform: playbackDrawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 28px))';
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
pointer-events: takes.length > 0 || playbackDrawerOpen ? 'auto' : 'none';
opacity: takes.length > 0 ? 1 : 0;
```

**Pull tab (28px height):**
```css
display: flex; align-items: center; justify-content: center; gap: 6px;
padding: 6px 0; cursor: pointer;
background: var(--surface-raised);
border-top: 1px solid var(--rule);
border-radius: 12px 12px 0 0;
box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
```
Content: grip bar (28×3px, `var(--faint)`) + "{N} clips" in mono font + chevron (up when open, down when closed)

`data-testid="drawer-pull-tab"` — clicking toggles `store.setPlaybackDrawerOpen(!playbackDrawerOpen)`

**Drawer content:**
```css
background: var(--surface-raised);
padding: 8px 16px 16px;
max-height: 40vh; overflow-y: auto;
border-top: 1px solid var(--rule);
```

**Segment pills (flex-wrap, gap: 6):**
Each `takes` entry renders as a `<button>`:
- Label: `t.type === 'discussion' ? '💬 D${t.num}' : '🎵 T${t.num}'`
- If `t.songName !== currentSongName`: show song name in small text below (font-size 10, `--muted`)
- Active pill (index === currentTakeIdx): filled bg (`--accent` for take, `--amber` for discussion), white text
- Inactive: `--surface-alt` bg, `--rule` border, `--ink` text
- `padding: 6px 14px; border-radius: var(--radius-pill); font-size: 13px; font-family: var(--font-mono); min-height: 32px`
- On click: `store.selectTakeForPlayback(index)`
- `data-testid={`segment-pill-${index}`}`

**End Rehearsal button (right-aligned):**
```css
display: flex; justify-content: flex-end; margin-bottom: 8px;
```
Button: ghost style, `color: var(--accent)`, "⏏ End Rehearsal"
On click: `store.endRehearsal()`
`data-testid="end-rehearsal-button"`

**Playback status bar** (only when `rehearsalStatus === 'playback'`):
```css
display: flex; align-items: center; gap: 8px;
padding: 10px 12px;
background: var(--green-soft);
border-radius: var(--radius-md);
```
Content: green dot + "Playing D{num}" or "Playing T{num}" + Stop button (green bg, calls `store.stopPlayback()`)

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/app.jsx` lines 335–430 — reference implementation
- `/home/user/rehearsaltools/web/src/store.ts` — `takes`, `playbackDrawerOpen`, `currentTakeIdx`, `rehearsalStatus`, `song.name`

## Implementation Details

- `currentSongName` = `useStore(s => s.song.name)`
- Use store selectors, not direct store import, for individual fields to avoid unnecessary re-renders
- The "N clips" count shows `takes.length` — segments include both takes and discussions

## Acceptance Criteria

- [ ] Drawer is invisible when `takes` is empty
- [ ] Pull tab visible and clickable when `takes.length > 0`
- [ ] Clip count in pull tab matches `takes.length`
- [ ] Chevron direction matches open/closed state
- [ ] Segment pills render for each item in `takes`
- [ ] Active pill (currentTakeIdx) has filled/colored styling
- [ ] Tapping pill calls `store.selectTakeForPlayback(index)`
- [ ] End Rehearsal button calls `store.endRehearsal()`
- [ ] Playback status bar shows when `rehearsalStatus === 'playback'`
- [ ] Stop button in status bar calls `store.stopPlayback()`
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/PlaybackDrawer.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **empty takes**: drawer wrapper has opacity 0 / pointer-events none
2. **one segment**: pull tab visible, shows "1 clips"
3. **three segments**: shows "3 clips"
4. **segment pills rendered**: for each take, pill with correct label exists
5. **discussion pill label**: type 'discussion', num 2 → shows "💬 D2"
6. **take pill label**: type 'take', num 1 → shows "🎵 T1"
7. **active pill styling**: currentTakeIdx=0, first pill has accent bg (check inline style or class)
8. **pill click**: calls `store.selectTakeForPlayback` with correct index
9. **end rehearsal**: clicking button calls `store.endRehearsal`
10. **playback status bar shown**: `rehearsalStatus = 'playback'`, assert green status bar visible
11. **stop button in status bar**: calls `store.stopPlayback`
12. **pull tab toggle**: click pull tab, assert `store.setPlaybackDrawerOpen` called with `true`

### TDD Process

1. Write failing tests
2. Implement component
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store), 005 (stub replaced here)
- Blocks: Nothing hard

## Parallelism

Can run in parallel with 006, 007, 009, 010, 011.
