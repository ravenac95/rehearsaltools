# Task 08: SimpleSongView — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/SimpleSongView.tsx` into `SimpleSongViewPresentation` (pure) + `SimpleSongView` (thin container) and add stories.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/SimpleSongViewPresentation.tsx`
- **New:** `web/src/components/rehearsal/SimpleSongViewPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/SimpleSongView.tsx` — thin container

## Implementation

### `SimpleSongViewPresentation.tsx`

Keep the `TS_PRESETS` constant and the whole markup. The children (`TempoEditor`, `TimeSigInput`) are already prop-driven and can stay inside the presentation component — they don't touch the store.

Props:
```ts
export interface SimpleSongViewPresentationProps {
  bpm: number;
  note: NoteValue;
  num: number;
  denom: number;
  onBpmChange: (bpm: number) => void;
  onNoteChange: (note: NoteValue) => void;
  onTimeSigChange: (num: number, denom: number) => void;
}
```

Pass props through to `TempoEditor` and `TimeSigInput` as today.

### `SimpleSongView.tsx` (container)

```tsx
export function SimpleSongView() {
  const bpm = useStore((s) => s.simpleBpm);
  const note = useStore((s) => s.simpleNote);
  const num = useStore((s) => s.simpleNum);
  const denom = useStore((s) => s.simpleDenom);
  const setSimpleBpm = useStore((s) => s.setSimpleBpm);
  const setSimpleNote = useStore((s) => s.setSimpleNote);
  const setSimpleTimeSig = useStore((s) => s.setSimpleTimeSig);
  return (
    <SimpleSongViewPresentation
      bpm={bpm} note={note} num={num} denom={denom}
      onBpmChange={setSimpleBpm}
      onNoteChange={setSimpleNote}
      onTimeSigChange={setSimpleTimeSig}
    />
  );
}
```

### Stories

- `title: "Rehearsal/SimpleSongView"`
- `parameters: { layout: "padded" }`
- baseArgs: bpm=120, note=`"q"`, num=4, denom=4, callbacks=noop
- Stories:
  - `Default` (4/4, 120, quarter note)
  - `SixEight` — num=6, denom=8
  - `SevenEight` — num=7, denom=8
  - `CustomTimeSig` — num=5, denom=4 (none of the presets match → only `TimeSigInput` reflects)
  - `DottedQuarter` — note=`"qd"` (if valid in `NoteValue`, else use an alternate supported value)
  - `SlowTempo` — bpm=60
  - `FastTempo` — bpm=180

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/SimpleSongView.test.tsx` still passes unchanged
- All stories render; preset highlighting toggles correctly for 4/4 vs custom
