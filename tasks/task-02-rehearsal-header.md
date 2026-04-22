# Task 02: RehearsalHeader — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/RehearsalHeader.tsx` into `RehearsalHeaderPresentation` (pure) + `RehearsalHeader` (thin container) and add stories.

## Dependencies

Task 01 must be done first (stories nest a real `StatusBadgePresentation`).

## Files

- **New:** `web/src/components/rehearsal/RehearsalHeaderPresentation.tsx`
- **New:** `web/src/components/rehearsal/RehearsalHeaderPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/RehearsalHeader.tsx` — thin container

## Implementation

### `RehearsalHeaderPresentation.tsx`

Props:
```ts
export interface RehearsalHeaderPresentationProps {
  rehearsalType: RehearsalType | null;
  statusBadge: ReactNode;           // slot for <StatusBadge /> in production or <StatusBadgePresentation .../> in stories
  onOpenTypePicker: () => void;
  onOpenMenu: () => void;
}
```

Render the same markup as today, replacing `<StatusBadge />` with `{statusBadge}` and `rehearsalType`/`setTypePickerOpen`/`setMenuOpen` reads with prop usage.

### `RehearsalHeader.tsx` (container)

```tsx
import { useStore } from "../../store";
import { StatusBadge } from "./StatusBadge";
import { RehearsalHeaderPresentation } from "./RehearsalHeaderPresentation";

export function RehearsalHeader() {
  const rehearsalType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);
  return (
    <RehearsalHeaderPresentation
      rehearsalType={rehearsalType}
      statusBadge={<StatusBadge />}
      onOpenTypePicker={() => setTypePickerOpen(true)}
      onOpenMenu={() => setMenuOpen(true)}
    />
  );
}
```

### Stories

- `title: "Rehearsal/RehearsalHeader"`
- `parameters: { layout: "fullscreen" }`
- Fixture `fullBand: RehearsalType = { id: "full-band", name: "Full Band", desc: "...", emoji: "🎸" }`
- baseArgs: `rehearsalType: fullBand`, `statusBadge: <StatusBadgePresentation status="idle" position={0} segmentStart={null} onSetCategory={noop} />`, `onOpenTypePicker: noop`, `onOpenMenu: noop`
- Stories:
  - `Idle` — (default)
  - `NoTypeSelected` — `rehearsalType: null` (renders "—")
  - `DuringTake` — override `statusBadge` to use `status="take"`, `position=45`, `segmentStart=0`
  - `Playback` — `statusBadge` with `status="playback"`

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test` — existing tests unchanged
- Story file renders in Storybook showing real `StatusBadgePresentation` inside the header
