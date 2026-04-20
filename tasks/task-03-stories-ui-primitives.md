# Task 3: Write exhaustive stories for UI primitives

## Objective

Create co-located `*.stories.tsx` files for `Button`, `Card`, `Chip`, `Stepper`, and `ThemeTogglePresentation` covering every prop variant and edge case.

## Dependencies

- Depends on: task-02-themtoggle-presentation (ThemeTogglePresentation must exist before its story can be written)

## Files to create/modify

- `/home/user/rehearsaltools/web/src/components/ui/Button.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/ui/Card.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/ui/Chip.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/ui/Stepper.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/ui/ThemeTogglePresentation.stories.tsx` — create

## Implementation notes

### Conventions to follow throughout all story files

- Use `satisfies Meta<typeof Component>` for full type-safety.
- Use `StoryObj<typeof meta>` for individual story types.
- Storybook is configured with `layout: 'padded'` as the default — no need to override it for component-level stories.
- No `play()` functions in this task — these components are stateless.
- Keep `args` at the story level when testing a specific variant; use `argTypes` in `meta` to document controls.

### Button.stories.tsx

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Click me" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Danger: Story = { args: { variant: "danger" } };
export const PrimaryDisabled: Story = { args: { variant: "primary", disabled: true } };
export const SecondaryDisabled: Story = { args: { variant: "secondary", disabled: true } };
export const DangerDisabled: Story = { args: { variant: "danger", disabled: true } };
export const EmptyChildren: Story = { args: { variant: "primary", children: "" } };
export const LongLabel: Story = { args: { variant: "secondary", children: "This is a very long button label that might wrap" } };
```

### Card.stories.tsx

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  args: { children: "Card content" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Clickable: Story = { args: { onClick: () => alert("clicked") } };
export const WithCustomClass: Story = { args: { className: "highlight" } };
export const EmptyContent: Story = { args: { children: "" } };
export const RichContent: Story = {
  args: {
    children: (
      <div>
        <strong>Title</strong>
        <p style={{ margin: "4px 0 0" }}>Some body text inside the card.</p>
      </div>
    ),
  },
};
```

### Chip.stories.tsx

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./Chip";

const meta = {
  title: "UI/Chip",
  component: Chip,
  args: { children: "Label" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashed: Story = { args: { variant: "dashed" } };
export const Solid: Story = { args: { variant: "solid" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const DashedDisabled: Story = { args: { variant: "dashed", disabled: true } };
export const SolidDisabled: Story = { args: { variant: "solid", disabled: true } };
export const GhostDisabled: Story = { args: { variant: "ghost", disabled: true } };
export const WithTitle: Story = { args: { title: "Tooltip text", children: "Hover me" } };
```

### Stepper.stories.tsx

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./Stepper";

const meta = {
  title: "UI/Stepper",
  component: Stepper,
  args: { label: "BPM", value: 120, onChange: () => {} },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithUnit: Story = { args: { unit: "BPM", mono: true } };
export const WithMinMax: Story = { args: { value: 20, min: 20, max: 240, step: 5, unit: "BPM" } };
export const AtMin: Story = { args: { value: 20, min: 20, max: 240, unit: "BPM" } };
export const AtMax: Story = { args: { value: 240, min: 20, max: 240, unit: "BPM" } };
export const MonoFont: Story = { args: { mono: true, value: 120, unit: "BPM" } };
export const HandFont: Story = { args: { mono: false, value: 120 } };
export const LargeStep: Story = { args: { step: 10, value: 120, unit: "BPM" } };
```

### ThemeTogglePresentation.stories.tsx

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ThemeTogglePresentation } from "./ThemeToggle";

const meta = {
  title: "UI/ThemeTogglePresentation",
  component: ThemeTogglePresentation,
  args: { onCycle: () => {} },
} satisfies Meta<typeof ThemeTogglePresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = { args: { pref: "system" } };
export const Light: Story = { args: { pref: "light" } };
export const Dark: Story = { args: { pref: "dark" } };
```

## Acceptance criteria

- [ ] `pnpm --filter web build-storybook` exits 0 and compiles these 5 story files
- [ ] `pnpm --filter web build` exits 0 — no type errors in story files
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] No `any` casts in any story file
- [ ] All stories use `satisfies Meta<...>` pattern
