# Task 6: Split Dashboard screen into container + presentation, add stories

## Objective

Create `DashboardPresentation.tsx` as a pure display component, reduce `Dashboard.tsx` to a thin container, and write exhaustive `DashboardPresentation.stories.tsx` with `layout: 'fullscreen'`.

## Dependencies

- Depends on: task-05-stories-stateful-song-components

## Files to create/modify

- `/home/user/rehearsaltools/web/src/screens/DashboardPresentation.tsx` — create
- `/home/user/rehearsaltools/web/src/screens/Dashboard.tsx` — refactor (container only)
- `/home/user/rehearsaltools/web/src/screens/DashboardPresentation.stories.tsx` — create

## Implementation notes

Read `/home/user/rehearsaltools/web/src/screens/Dashboard.tsx` in full before starting.
Read `/home/user/rehearsaltools/web/src/api/client.ts` for the `TransportState` and `Take` types.
Read `/home/user/rehearsaltools/web/src/store.ts` for `AppStore` shape.

### DashboardPresentation prop interface

```ts
import type { TransportState, Take } from "../api/client";

interface DashboardPresentationProps {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  tempoInput: string;
  logEnabled: boolean;
  onTempoInputChange: (value: string) => void;
  onApplyTempo: () => void;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRecordTake: () => void;
  onSeekToEnd: () => void;
  onToggleMetronome: () => void;
  onNewProject: () => void;
  onToggleLog: () => void;
}
```

### DashboardPresentation.tsx

Move all JSX from the existing `Dashboard` component into `DashboardPresentation`.
Replace every call to `run(api.*)` with the corresponding callback prop.
Replace `setTempoInput`, `setLogEnabled` with the corresponding change callback props.
`tempoInput` becomes a controlled prop (no internal state).

The component is a pure function — no `useState`, no `useEffect`, no `useStore`.

### Dashboard.tsx — after refactor

```tsx
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { DashboardPresentation } from "./DashboardPresentation";

const LOG_ENABLED_STORAGE_KEY = "rehearsaltools:log_enabled";

export function Dashboard() {
  const transport = useStore((s) => s.transport);
  const currentTake = useStore((s) => s.currentTake);
  const setError = useStore((s) => s.setError);
  const [tempoInput, setTempoInput] = useState("");
  const [logEnabled, setLogEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(LOG_ENABLED_STORAGE_KEY) === "1"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(LOG_ENABLED_STORAGE_KEY, logEnabled ? "1" : "0"); }
    catch { /* ignore */ }
  }, [logEnabled]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); }
    catch (err: any) { setError(String(err.message ?? err)); }
  };

  const applyTempo = async () => {
    const bpm = parseFloat(tempoInput);
    if (Number.isFinite(bpm) && bpm >= 20 && bpm <= 999) {
      await run(() => api.tempo(bpm));
      setTempoInput("");
    }
  };

  return (
    <DashboardPresentation
      transport={transport}
      currentTake={currentTake}
      tempoInput={tempoInput}
      logEnabled={logEnabled}
      onTempoInputChange={setTempoInput}
      onApplyTempo={applyTempo}
      onPlay={() => run(api.play)}
      onStop={() => run(api.stop)}
      onRecord={() => run(api.record)}
      onRecordTake={() => run(api.recordTake)}
      onSeekToEnd={() => run(api.seekToEnd)}
      onToggleMetronome={() => run(api.toggleMetronome)}
      onNewProject={() => run(api.newProject)}
      onToggleLog={() => run(async () => {
        const next = !logEnabled;
        await api.setLogEnabled(next);
        setLogEnabled(next);
      })}
    />
  );
}
```

### DashboardPresentation.stories.tsx

Use `layout: 'fullscreen'` in the meta parameters.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { TransportState, Take } from "../api/client";
import { DashboardPresentation } from "./DashboardPresentation";

const noop = () => {};

const stoppedTransport: Partial<TransportState> = {
  playing: false, recording: false, stopped: true,
  position: 0, bpm: 120, num: 4, denom: 4, metronome: false,
};

const playingTransport: Partial<TransportState> = {
  ...stoppedTransport, playing: true, stopped: false,
};

const recordingTransport: Partial<TransportState> = {
  ...stoppedTransport, recording: true, stopped: false,
};

const currentTake: Take = { startTime: 4.5 };

const baseArgs = {
  tempoInput: "",
  logEnabled: false,
  onTempoInputChange: noop,
  onApplyTempo: noop,
  onPlay: noop,
  onStop: noop,
  onRecord: noop,
  onRecordTake: noop,
  onSeekToEnd: noop,
  onToggleMetronome: noop,
  onNewProject: noop,
  onToggleLog: noop,
};

const meta = {
  title: "Screens/DashboardPresentation",
  component: DashboardPresentation,
  parameters: { layout: "fullscreen" },
  args: { ...baseArgs, transport: stoppedTransport, currentTake: null },
} satisfies Meta<typeof DashboardPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stopped: Story = {};

export const Playing: Story = {
  args: { transport: playingTransport },
};

export const Recording: Story = {
  args: { transport: recordingTransport },
};

export const WithCurrentTake: Story = {
  args: { currentTake },
};

export const MetronomeOn: Story = {
  args: { transport: { ...stoppedTransport, metronome: true } },
};

export const WithTempoInput: Story = {
  args: { tempoInput: "140" },
};

export const LogEnabled: Story = {
  args: { logEnabled: true },
};

export const EmptyTransport: Story = {
  args: { transport: {} },
};
```

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0 — no type errors in new files
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] `pnpm --filter web build-storybook` exits 0 — `DashboardPresentation.stories.tsx` compiles
- [ ] Dashboard screen in the running app is visually and functionally identical to before the refactor
- [ ] `DashboardPresentation` has no `useState`, `useEffect`, or `useStore` calls
- [ ] No `any` casts in the presentation component interface
