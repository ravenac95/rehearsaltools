# Task 03: TransportFooter — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/TransportFooter.tsx` into `TransportFooterPresentation` (pure) + `TransportFooter` (thin container) and add stories.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/TransportFooterPresentation.tsx`
- **New:** `web/src/components/rehearsal/TransportFooterPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/TransportFooter.tsx` — thin container

## Implementation

### `TransportFooterPresentation.tsx`

Move `ACTION_CONFIG` and all markup into this file, along with the `handleAction` dispatch table.

Props:
```ts
export interface TransportFooterPresentationProps {
  status: RehearsalStatus;
  hasTakes: boolean;               // controls bottomOffset (28 if true, 0 otherwise)
  metronomeActive: boolean;
  onStart: () => void;             // idle → Start Rehearsal
  onSetCategory: (c: "take" | "discussion") => void;
  onStop: () => void;              // playback → Stop
  onToggleMetronome: () => void;
}
```

Inside presentation:
```ts
const bottomOffset = hasTakes ? 28 : 0;
const handleAction = () => {
  switch (status) {
    case "idle":       return onStart();
    case "discussion": return onSetCategory("take");
    case "take":       return onSetCategory("discussion");
    case "playback":   return onStop();
  }
};
```

### `TransportFooter.tsx` (container)

```tsx
import { useStore } from "../../store";
import { api } from "../../api/client";
import { TransportFooterPresentation } from "./TransportFooterPresentation";

export function TransportFooter() {
  const status = useStore((s) => s.rehearsalStatus);
  const takes = useStore((s) => s.takes);
  const metronomeActive = useStore((s) => s.transport.metronome ?? false);
  const startRehearsal = useStore((s) => s.startRehearsal);
  const setCategory = useStore((s) => s.setCategory);
  const stopPlayback = useStore((s) => s.stopPlayback);
  return (
    <TransportFooterPresentation
      status={status}
      hasTakes={takes.length > 0}
      metronomeActive={metronomeActive}
      onStart={() => { startRehearsal(); }}
      onSetCategory={(c) => { setCategory(c); }}
      onStop={() => { stopPlayback(); }}
      onToggleMetronome={() => { api.toggleMetronome(); }}
    />
  );
}
```

### Stories

- `title: "Rehearsal/TransportFooter"`
- `parameters: { layout: "fullscreen" }`
- baseArgs: all callbacks = noop, status=`"idle"`, hasTakes=false, metronomeActive=false
- Stories: `Idle`, `Discussion`, `Take` (hasTakes=true, shows gap above footer), `Playback`, `MetronomeOn`

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/TransportFooter.test.tsx` still passes unchanged
- All 5 stories render in Storybook
