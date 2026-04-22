# Task 09: Icons showcase story

## Objective

Add a single Storybook entry that showcases every icon from `web/src/components/rehearsal/icons.tsx` (IconMic, IconStop, IconPlay, IconMetronome).

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/Icons.stories.tsx`

No component changes — `icons.tsx` is already pure presentation.

## Implementation

Create `Icons.stories.tsx` with a small wrapper "showcase" component used only in the story — **do not** export it from the module under `src/`. Inline inside the story file so it doesn't pollute the barrel.

Structure:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { IconMic, IconStop, IconPlay, IconMetronome } from "./icons";

function Showcase({ metronomeActive }: { metronomeActive: boolean }) {
  const box: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: 12, background: "var(--surface-alt)", borderRadius: 8,
    color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11,
  };
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={box}><IconMic /><span>IconMic</span></div>
      <div style={box}><IconStop /><span>IconStop</span></div>
      <div style={box}><IconPlay /><span>IconPlay</span></div>
      <div style={box}><IconMetronome active={metronomeActive} /><span>IconMetronome (active={String(metronomeActive)})</span></div>
    </div>
  );
}

const meta = {
  title: "Rehearsal/Icons",
  component: Showcase,
  parameters: { layout: "padded" },
  args: { metronomeActive: false },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {};
export const MetronomeActive: Story = { args: { metronomeActive: true } };
```

## Acceptance criteria

- `pnpm --filter web build-storybook` builds cleanly
- Two stories (`AllIcons`, `MetronomeActive`) appear under `Rehearsal/Icons`
- `pnpm --filter web typecheck` passes
