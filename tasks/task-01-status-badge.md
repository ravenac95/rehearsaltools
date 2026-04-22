# Task 01: StatusBadge — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/StatusBadge.tsx` into `StatusBadgePresentation` (pure) + `StatusBadge` (thin container) and add `StatusBadgePresentation.stories.tsx`.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/StatusBadgePresentation.tsx`
- **New:** `web/src/components/rehearsal/StatusBadgePresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/StatusBadge.tsx` — becomes thin container

## Implementation

### `StatusBadgePresentation.tsx`

Move all rendering + the `STATUS_CONFIG` table + `formatTime` helper out of `StatusBadge.tsx` into this file.

Props (exact shape):
```ts
export interface StatusBadgePresentationProps {
  status: RehearsalStatus;
  position: number;           // seconds since transport start (or 0)
  segmentStart: number | null; // null when idle / between segments
  onSetCategory: (category: "take" | "discussion") => void;
}
```

Derive `elapsed` and the conditional `onClick` inside the presentation component exactly as today.

### `StatusBadge.tsx` (container)

Reduce to:
```tsx
import { useStore } from "../../store";
import { StatusBadgePresentation } from "./StatusBadgePresentation";

export function StatusBadge() {
  const status = useStore((s) => s.rehearsalStatus);
  const position = useStore((s) => s.transport.position ?? 0);
  const segmentStart = useStore((s) => s.currentSegmentStart);
  const setCategory = useStore((s) => s.setCategory);
  return (
    <StatusBadgePresentation
      status={status}
      position={position}
      segmentStart={segmentStart}
      onSetCategory={setCategory}
    />
  );
}
```

### Stories

Follow the pattern in `web/src/screens/SongEditorPresentation.stories.tsx`:

- `title: "Rehearsal/StatusBadge"`
- `parameters: { layout: "padded" }` (this is an inline pill, not fullscreen)
- `args` on meta: status=`"idle"`, position=0, segmentStart=null, onSetCategory=noop
- Stories: `Idle`, `Discussion` (position=10, segmentStart=0 → shows 0:10), `Take` (position=65, segmentStart=60 → shows 0:05), `Playback` (position=0, segmentStart=0), `LongElapsed` (position=3725, segmentStart=5 → shows 61:00)

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/StatusBadge.test.tsx` still passes without modification
- Story file builds under `pnpm --filter web build-storybook`
- `StatusBadge` container export name unchanged — no consumers break
