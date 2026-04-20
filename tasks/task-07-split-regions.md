# Task 7: Split Regions screen into container + presentation, add stories

## Objective

Create `RegionsPresentation.tsx` as a pure display component, reduce `Regions.tsx` to a thin container, and write exhaustive `RegionsPresentation.stories.tsx` with `layout: 'fullscreen'`.

## Dependencies

- Depends on: task-06-split-dashboard

## Files to create/modify

- `/home/user/rehearsaltools/web/src/screens/RegionsPresentation.tsx` — create
- `/home/user/rehearsaltools/web/src/screens/Regions.tsx` — refactor (container only)
- `/home/user/rehearsaltools/web/src/screens/RegionsPresentation.stories.tsx` — create

## Implementation notes

Read `/home/user/rehearsaltools/web/src/screens/Regions.tsx` in full before starting.
Read `/home/user/rehearsaltools/web/src/api/client.ts` for the `Region` type:

```ts
export interface Region {
  id: number;
  name: string;
  start: number;
  stop: number;
}
```

### RegionsPresentation prop interface

```ts
import type { Region } from "../api/client";

interface RegionsPresentationProps {
  regions: Region[];
  newName: string;
  renamingId: number | null;
  renameValue: string;
  onNewNameChange: (value: string) => void;
  onCreateRegion: () => void;
  onPlayRegion: (id: number) => void;
  onStartRename: (id: number, currentName: string) => void;
  onRenameValueChange: (value: string) => void;
  onSaveRename: (id: number) => void;
  onCancelRename: () => void;
}
```

### RegionsPresentation.tsx

Move all JSX from `Regions` into `RegionsPresentation`. Replace every `run(...)` call with the corresponding callback prop. Replace `setNewName`, `setRenamingId`, `setRenameValue` calls with the corresponding change callbacks. No internal state, no hooks.

The conditional rendering of rename-mode vs. display-mode for each region card is driven by `renamingId === r.id` — that logic stays in the presentation JSX; `renamingId` is a prop.

### Regions.tsx — after refactor

```tsx
import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { RegionsPresentation } from "./RegionsPresentation";

export function Regions() {
  const regions = useStore((s) => s.regions);
  const refresh = useStore((s) => s.refreshRegions);
  const setError = useStore((s) => s.setError);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh(); }
    catch (err: any) { setError(String(err.message ?? err)); }
  };

  return (
    <RegionsPresentation
      regions={regions}
      newName={newName}
      renamingId={renamingId}
      renameValue={renameValue}
      onNewNameChange={setNewName}
      onCreateRegion={() => run(async () => {
        await api.createRegion(newName);
        setNewName("");
      })}
      onPlayRegion={(id) => run(() => api.playRegion(id))}
      onStartRename={(id, currentName) => { setRenamingId(id); setRenameValue(currentName); }}
      onRenameValueChange={setRenameValue}
      onSaveRename={(id) => run(async () => {
        await api.renameRegion(id, renameValue);
        setRenamingId(null);
      })}
      onCancelRename={() => setRenamingId(null)}
    />
  );
}
```

### RegionsPresentation.stories.tsx

Use `layout: 'fullscreen'`.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Region } from "../api/client";
import { RegionsPresentation } from "./RegionsPresentation";

const noop = () => {};

const regions: Region[] = [
  { id: 1, name: "Intro", start: 0, stop: 10.5 },
  { id: 2, name: "Verse 1", start: 10.5, stop: 42.0 },
  { id: 3, name: "", start: 42.0, stop: 60.0 },  // unnamed region
];

const baseArgs = {
  newName: "",
  renamingId: null,
  renameValue: "",
  onNewNameChange: noop,
  onCreateRegion: noop,
  onPlayRegion: noop,
  onStartRename: noop,
  onRenameValueChange: noop,
  onSaveRename: noop,
  onCancelRename: noop,
};

const meta = {
  title: "Screens/RegionsPresentation",
  component: RegionsPresentation,
  parameters: { layout: "fullscreen" },
  args: { ...baseArgs, regions: [] },
} satisfies Meta<typeof RegionsPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const MultipleRegions: Story = {
  args: { regions },
};

export const WithNewNameTyped: Story = {
  args: { regions, newName: "Bridge" },
};

// Mid-rename state: renamingId is set for the second region
export const MidRename: Story = {
  args: {
    regions,
    renamingId: 2,
    renameValue: "Verse 1 (edited)",
  },
};

export const SingleRegion: Story = {
  args: { regions: [regions[0]] },
};

export const UnnamedRegion: Story = {
  args: { regions: [regions[2]] },
};
```

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0 — no type errors
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] `pnpm --filter web build-storybook` exits 0 — `RegionsPresentation.stories.tsx` compiles
- [ ] Regions screen in the running app is visually and functionally identical to before the refactor
- [ ] `RegionsPresentation` has no `useState`, `useEffect`, or `useStore` calls
- [ ] No `any` casts in the presentation component interface
