# Task 011: Frontend — SimpleSongView Component

## Objective

Implement `web/src/components/rehearsal/SimpleSongView.tsx` — the Simple mode song editor showing only tempo (TempoEditor) and time signature (preset chips + custom input) inside a card. This replaces the stub from task 005.

## Context

Simple mode is for infinite-click rehearsal at a fixed tempo and time signature, with no song structure. The existing `TempoEditor` and `TimeSigInput` / `TimeSigStack` components are used directly (they already exist in `web/src/components/song/`).

State is stored in the global Zustand store (`simpleBpm`, `simpleNote`, `simpleNum`, `simpleDenom` — added in task 003). Actions: `setSimpleBpm`, `setSimpleNote`, `setSimpleTimeSig`.

## Requirements

### `web/src/components/rehearsal/SimpleSongView.tsx`

```tsx
export function SimpleSongView() { ... }
```

**Outer wrapper:** `padding: 0 16px;` `data-testid="simple-song-view"`

**Card:**
```css
background: var(--surface-alt);
border-radius: var(--radius-lg);
padding: 20px;
border: 1px solid var(--rule);
```

**Contents:**

1. `TempoEditor` component (from `web/src/components/song/TempoEditor.tsx`):
   ```tsx
   <TempoEditor
     bpm={simpleBpm}
     note={simpleNote}
     bpmOverridden={true}
     noteOverridden={true}
     onBpmChange={store.setSimpleBpm}
     onNoteChange={store.setSimpleNote}
   />
   ```
   No `onBpmClear` or `onNoteClear` (not applicable in simple mode).

2. Spacer: `height: 16px`

3. Time signature label: `font-size: 11px; font-family: var(--font-mono); color: var(--muted); text-transform: uppercase; letter-spacing: 1; display: block; margin-bottom: 8px;` — text: "TIME SIGNATURE"

4. Time signature row: `display: flex; gap: 8px; align-items: center; flex-wrap: wrap;`

   Preset buttons (`TS_PRESETS = [[4,4],[6,8],[7,8]]`):
   ```tsx
   {[[4,4],[6,8],[7,8]].map(([n,d]) => {
     const active = simpleNum === n && simpleDenom === d;
     return (
       <button
         key={`${n}/${d}`}
         className={active ? 'chip solid' : 'chip'}
         onClick={() => store.setSimpleTimeSig(n, d)}
         style={{ minHeight: 36, padding: '6px 12px', fontSize: 14 }}
       >
         {n}/{d}
       </button>
     );
   })}
   ```

   Custom input:
   ```tsx
   <TimeSigInput
     num={simpleNum}
     denom={simpleDenom}
     onChange={(n, d) => store.setSimpleTimeSig(n, d)}
   />
   ```

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/components.jsx` lines 618–643 — `SimpleSongView` prototype
- `/home/user/rehearsaltools/web/src/components/song/TempoEditor.tsx` — existing component
- `/home/user/rehearsaltools/web/src/components/song/TimeSigInput.tsx` — existing component
- `/home/user/rehearsaltools/web/src/store.ts` — `simpleBpm`, `simpleNote`, `simpleNum`, `simpleDenom`, setters

## Implementation Details

- Import `TempoEditor` from `../song/TempoEditor`
- Import `TimeSigInput` from `../song/TimeSigInput`
- `TS_PRESETS` can be defined locally as a constant `[[4,4],[6,8],[7,8]] as const`
- No local state in this component — everything is in the store

## Acceptance Criteria

- [ ] `data-testid="simple-song-view"` present in DOM
- [ ] TempoEditor renders with `simpleBpm` and `simpleNote` from store
- [ ] BPM slider change updates `store.simpleBpm`
- [ ] Note cycle updates `store.simpleNote`
- [ ] Preset buttons (4/4, 6/8, 7/8) render; active preset has `chip solid` class
- [ ] Clicking a preset updates `store.simpleNum` and `store.simpleDenom`
- [ ] TimeSigInput custom entry updates store
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/SimpleSongView.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **renders**: `data-testid="simple-song-view"` in DOM
2. **shows bpm from store**: set `simpleBpm: 140` in store, render, assert TempoEditor shows 140 (look for "140" text or range value)
3. **preset 4/4 active**: set `simpleNum: 4, simpleDenom: 4`, assert 4/4 button has class `chip solid`
4. **preset 6/8 active**: set `simpleNum: 6, simpleDenom: 8`, assert 6/8 button has `chip solid`
5. **click 6/8 preset**: click "6/8" button, assert `setSimpleTimeSig(6, 8)` called on store
6. **click 7/8 preset**: click "7/8" button, assert `setSimpleTimeSig(7, 8)` called

### TDD Process

1. Write failing tests
2. Implement component
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store simple-mode slice), 005 (stub replaced here)
- Blocks: Nothing hard

## Parallelism

Can run in parallel with 006, 007, 008, 009, 010.
