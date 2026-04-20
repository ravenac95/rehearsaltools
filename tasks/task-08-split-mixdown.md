# Task 8: Split Mixdown screen into container + presentation, add stories

## Objective

Create `MixdownPresentation.tsx` as a pure display component, reduce `Mixdown.tsx` to a thin container, and write exhaustive `MixdownPresentation.stories.tsx` with `layout: 'fullscreen'`.

## Dependencies

- Depends on: task-07-split-regions

## Files to create/modify

- `/home/user/rehearsaltools/web/src/screens/MixdownPresentation.tsx` — create
- `/home/user/rehearsaltools/web/src/screens/Mixdown.tsx` — refactor (container only)
- `/home/user/rehearsaltools/web/src/screens/MixdownPresentation.stories.tsx` — create

## Implementation notes

Read `/home/user/rehearsaltools/web/src/screens/Mixdown.tsx` in full before starting.
This is the simplest screen — `outputDir`, `running`, `regionCount` plus two callbacks.

### MixdownPresentation prop interface

```ts
interface MixdownPresentationProps {
  outputDir: string;
  running: boolean;
  regionCount: number;
  onOutputDirChange: (value: string) => void;
  onRender: () => void;
}
```

### MixdownPresentation.tsx

Move all JSX from `Mixdown` into `MixdownPresentation`. The render button label logic
(`"Rendering…"` vs `"Render N region(s)"`) stays in the presentation JSX — it is a
display concern driven by the `running` and `regionCount` props:

```tsx
<button className="primary" onClick={onRender} disabled={running}>
  {running ? "Rendering…" : `Render ${regionCount} region${regionCount !== 1 ? "s" : ""}`}
</button>
```

No internal state, no hooks.

### Mixdown.tsx — after refactor

```tsx
import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { MixdownPresentation } from "./MixdownPresentation";

export function Mixdown() {
  const setError = useStore((s) => s.setError);
  const regions = useStore((s) => s.regions);
  const [outputDir, setOutputDir] = useState("");
  const [running, setRunning] = useState(false);

  const render = async () => {
    setRunning(true);
    try {
      await api.mixdownAll(outputDir.trim() || undefined);
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <MixdownPresentation
      outputDir={outputDir}
      running={running}
      regionCount={regions.length}
      onOutputDirChange={setOutputDir}
      onRender={render}
    />
  );
}
```

### MixdownPresentation.stories.tsx

Use `layout: 'fullscreen'`.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MixdownPresentation } from "./MixdownPresentation";

const noop = () => {};

const meta = {
  title: "Screens/MixdownPresentation",
  component: MixdownPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    outputDir: "",
    running: false,
    regionCount: 0,
    onOutputDirChange: noop,
    onRender: noop,
  },
} satisfies Meta<typeof MixdownPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IdleNoRegions: Story = {};

export const IdleOneRegion: Story = {
  args: { regionCount: 1 },
};

export const IdleThreeRegions: Story = {
  args: { regionCount: 3 },
};

export const Running: Story = {
  args: { regionCount: 3, running: true },
};

export const WithOutputDir: Story = {
  args: { outputDir: "/Users/me/Music/renders", regionCount: 2 },
};
```

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0 — no type errors
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] `pnpm --filter web build-storybook` exits 0 — `MixdownPresentation.stories.tsx` compiles
- [ ] Mixdown screen in the running app is visually and functionally identical to before the refactor
- [ ] `MixdownPresentation` has no `useState`, `useEffect`, or `useStore` calls
- [ ] No `any` casts in the presentation component interface
