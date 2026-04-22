# Task 04: PlaybackDrawer — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/PlaybackDrawer.tsx` into `PlaybackDrawerPresentation` (pure) + `PlaybackDrawer` (thin container) and add stories.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/PlaybackDrawerPresentation.tsx`
- **New:** `web/src/components/rehearsal/PlaybackDrawerPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/PlaybackDrawer.tsx` — thin container

## Implementation

### `PlaybackDrawerPresentation.tsx`

Props:
```ts
export interface PlaybackDrawerPresentationProps {
  open: boolean;
  takes: RehearsalSegment[];
  currentTakeIdx: number | null;
  status: RehearsalStatus;
  currentSongName: string;              // used to decide whether to show songName badge on pill
  onToggleOpen: () => void;             // pull-tab click flips open/closed
  onEndRehearsal: () => void;
  onStopPlayback: () => void;
  onSelectTake: (idx: number) => void;
}
```

Move all markup verbatim; replace `playbackDrawerOpen` with `open`, `currentSongName` (was `song.name`) with the prop, and dispatch callbacks as named.

### `PlaybackDrawer.tsx` (container)

```tsx
export function PlaybackDrawer() {
  const takes = useStore((s) => s.takes);
  const open = useStore((s) => s.playbackDrawerOpen);
  const currentTakeIdx = useStore((s) => s.currentTakeIdx);
  const status = useStore((s) => s.rehearsalStatus);
  const currentSongName = useStore((s) => s.song.name);
  const setPlaybackDrawerOpen = useStore((s) => s.setPlaybackDrawerOpen);
  const selectTakeForPlayback = useStore((s) => s.selectTakeForPlayback);
  const endRehearsal = useStore((s) => s.endRehearsal);
  const stopPlayback = useStore((s) => s.stopPlayback);
  return (
    <PlaybackDrawerPresentation
      open={open}
      takes={takes}
      currentTakeIdx={currentTakeIdx}
      status={status}
      currentSongName={currentSongName}
      onToggleOpen={() => setPlaybackDrawerOpen(!open)}
      onEndRehearsal={() => { endRehearsal(); }}
      onStopPlayback={() => { stopPlayback(); }}
      onSelectTake={(idx) => { selectTakeForPlayback(idx); }}
    />
  );
}
```

### Stories

- `title: "Rehearsal/PlaybackDrawer"`
- `parameters: { layout: "fullscreen" }`
- Fixtures:
  ```ts
  const take1: RehearsalSegment = { id: "s1", type: "take",       num: 1, songId: "song-1", songName: "My Song",   startPosition: 0 };
  const disc1: RehearsalSegment = { id: "s2", type: "discussion", num: 1, songId: "song-1", songName: "My Song",   startPosition: 30 };
  const take2: RehearsalSegment = { id: "s3", type: "take",       num: 2, songId: "song-2", songName: "Other Song", startPosition: 60 };
  ```
- baseArgs: open=false, takes=[], currentTakeIdx=null, status=`"idle"`, currentSongName=`"My Song"`, callbacks=noop
- Stories:
  - `ClosedEmpty` — default (invisible, opacity 0)
  - `ClosedWithTakes` — open=false, takes=[take1, disc1] (shows pull tab peeking)
  - `OpenNoPlayback` — open=true, takes=[take1, disc1, take2]
  - `Playing` — open=true, takes=[take1, disc1, take2], status=`"playback"`, currentTakeIdx=1 (shows green status bar for D1)
  - `CrossSongTake` — open=true, takes=[take2], currentTakeIdx=null (take2's songName differs from currentSongName → shows song subtitle)

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/PlaybackDrawer.test.tsx` still passes unchanged
- All 5 stories render
