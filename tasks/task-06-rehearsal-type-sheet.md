# Task 06: RehearsalTypeSheet — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/RehearsalTypeSheet.tsx` into `RehearsalTypeSheetPresentation` (pure) + `RehearsalTypeSheet` (thin container) and add stories.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/RehearsalTypeSheetPresentation.tsx`
- **New:** `web/src/components/rehearsal/RehearsalTypeSheetPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/RehearsalTypeSheet.tsx` — thin container

## Implementation

### `RehearsalTypeSheetPresentation.tsx`

Props:
```ts
export interface RehearsalTypeSheetPresentationProps {
  open: boolean;
  types: RehearsalType[];
  selectedTypeId: string | null;
  onClose: () => void;
  onSelect: (type: RehearsalType) => void;
}
```

Move markup verbatim. Replace `typePickerOpen`/`rehearsalTypes`/`rehearsalType?.id` reads and the `handleSelect` composition (which currently does `setRehearsalType(t); setTypePickerOpen(false);`) — presentation only calls `onSelect(type)`, and **the container handles the close-on-select behavior** (see below).

### `RehearsalTypeSheet.tsx` (container)

```tsx
export function RehearsalTypeSheet() {
  const open = useStore((s) => s.typePickerOpen);
  const types = useStore((s) => s.rehearsalTypes);
  const currentType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setRehearsalType = useStore((s) => s.setRehearsalType);
  return (
    <RehearsalTypeSheetPresentation
      open={open}
      types={types}
      selectedTypeId={currentType?.id ?? null}
      onClose={() => setTypePickerOpen(false)}
      onSelect={(t) => {
        setRehearsalType(t);
        setTypePickerOpen(false);
      }}
    />
  );
}
```

### Stories

- `title: "Rehearsal/RehearsalTypeSheet"`
- `parameters: { layout: "fullscreen" }`
- Fixtures:
  ```ts
  const fullBand: RehearsalType = { id: "full-band",     name: "Full Band",  desc: "Everyone plays", emoji: "🎸" };
  const vocals:   RehearsalType = { id: "vocals-only",   name: "Vocals",     desc: "Vocals only",    emoji: "🎤" };
  const rhythm:   RehearsalType = { id: "rhythm",        name: "Rhythm",     desc: "Drums + bass",   emoji: "🥁" };
  ```
- baseArgs: open=true, types=[fullBand, vocals, rhythm], selectedTypeId="full-band", callbacks=noop
- Stories:
  - `Open` (default, Full Band selected)
  - `Closed` — open=false
  - `NoSelection` — selectedTypeId=null
  - `Loading` — types=[]
  - `SingleType` — types=[fullBand]

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/BottomSheets.test.tsx` still passes unchanged
- All 5 stories render
