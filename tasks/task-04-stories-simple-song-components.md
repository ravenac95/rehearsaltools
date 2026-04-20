# Task 4: Write exhaustive stories for simple (pure) song components

## Objective

Create co-located `*.stories.tsx` files for `LetterBadge`, `NoteGlyph`, `TimeSigStack`, `RunBar`, `FormTabs`, `StanzaCompact`, `TempoEditor`, and `StanzaExpanded`.

## Dependencies

- Depends on: task-03-stories-ui-primitives

## Files to create/modify

- `/home/user/rehearsaltools/web/src/components/song/LetterBadge.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/NoteGlyph.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/TimeSigStack.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/RunBar.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/FormTabs.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/StanzaCompact.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/TempoEditor.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/StanzaExpanded.stories.tsx` — create

## Implementation notes

Read the component source files at these paths before writing stories — types and prop
names are critical:

- `/home/user/rehearsaltools/web/src/components/song/LetterBadge.tsx`
- `/home/user/rehearsaltools/web/src/components/song/NoteGlyph.tsx`
- `/home/user/rehearsaltools/web/src/components/song/TimeSigStack.tsx`
- `/home/user/rehearsaltools/web/src/components/song/RunBar.tsx`
- `/home/user/rehearsaltools/web/src/components/song/FormTabs.tsx`
- `/home/user/rehearsaltools/web/src/components/song/StanzaCompact.tsx`
- `/home/user/rehearsaltools/web/src/components/song/TempoEditor.tsx`
- `/home/user/rehearsaltools/web/src/components/song/StanzaExpanded.tsx`
- `/home/user/rehearsaltools/web/src/api/client.ts` — for `NoteValue`, `Stanza`, `SongForm` types

### Relevant types (from `api/client.ts`)

```ts
export type NoteValue = "w" | "h" | "q" | "e" | "s";

export interface Stanza {
  bars: number;
  num: number;
  denom: number;
  bpm?: number;
  note?: NoteValue;
}

export interface SongForm {
  id: string;
  name: string;
  bpm: number;
  note: NoteValue;
  pattern: string[];
}
```

### LetterBadge.stories.tsx

Props: `letter: string`, `size?: number` (default 36).

Cover: a few distinct letters (use different letters — the component uses `getLetterColor`
which produces a unique colour per letter), small size (24), default size, large size (56).

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { LetterBadge } from "./LetterBadge";

const meta = {
  title: "Song/LetterBadge",
  component: LetterBadge,
  args: { letter: "A" },
} satisfies Meta<typeof LetterBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LetterA: Story = { args: { letter: "A" } };
export const LetterB: Story = { args: { letter: "B" } };
export const LetterZ: Story = { args: { letter: "Z" } };
export const Small: Story = { args: { letter: "A", size: 24 } };
export const DefaultSize: Story = { args: { letter: "A", size: 36 } };
export const Large: Story = { args: { letter: "A", size: 56 } };
```

### NoteGlyph.stories.tsx

Props: `note: NoteValue`, `inherited?: boolean`, `size?: number`.
Cover: every NoteValue (w/h/q/e/s), inherited true/false, small/large size.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { NoteGlyph } from "./NoteGlyph";

const meta = {
  title: "Song/NoteGlyph",
  component: NoteGlyph,
  args: { note: "q" },
} satisfies Meta<typeof NoteGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Whole: Story = { args: { note: "w" } };
export const Half: Story = { args: { note: "h" } };
export const Quarter: Story = { args: { note: "q" } };
export const Eighth: Story = { args: { note: "e" } };
export const Sixteenth: Story = { args: { note: "s" } };
export const Inherited: Story = { args: { note: "q", inherited: true } };
export const NotInherited: Story = { args: { note: "q", inherited: false } };
export const Small: Story = { args: { note: "q", size: 14 } };
export const Large: Story = { args: { note: "q", size: 32 } };
```

### TimeSigStack.stories.tsx

Props: `num: number`, `denom: number`, `size?: "sm" | "md"`.
Cover: common time sigs (4/4, 3/4, 6/8, 5/4, 7/8), both sizes.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TimeSigStack } from "./TimeSigStack";

const meta = {
  title: "Song/TimeSigStack",
  component: TimeSigStack,
  args: { num: 4, denom: 4 },
} satisfies Meta<typeof TimeSigStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourFour: Story = { args: { num: 4, denom: 4 } };
export const ThreeFour: Story = { args: { num: 3, denom: 4 } };
export const SixEight: Story = { args: { num: 6, denom: 8 } };
export const FiveFour: Story = { args: { num: 5, denom: 4 } };
export const SevenEight: Story = { args: { num: 7, denom: 8 } };
export const SmallSize: Story = { args: { num: 4, denom: 4, size: "sm" } };
export const MediumSize: Story = { args: { num: 4, denom: 4, size: "md" } };
```

### RunBar.stories.tsx

Props: `onRun: () => void`, `disabled?: boolean`, `loading?: boolean`.
Cover: idle, disabled, loading.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { RunBar } from "./RunBar";

const meta = {
  title: "Song/RunBar",
  component: RunBar,
  args: { onRun: () => {} },
} satisfies Meta<typeof RunBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const DisabledAndLoading: Story = { args: { disabled: true, loading: true } };
```

### FormTabs.stories.tsx

Props: `forms: SongForm[]`, `activeFormId: string | null`, `onSelect`, `onCreate`.
Cover: empty forms list, single form active, multiple forms, no active form (null).

Use a helper fixture to build `SongForm` objects:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { SongForm } from "../../api/client";
import { FormTabs } from "./FormTabs";

const makeForm = (id: string, name: string): SongForm => ({
  id, name, bpm: 120, note: "q", pattern: [],
});

const twoForms = [makeForm("f1", "Verse"), makeForm("f2", "Chorus")];

const meta = {
  title: "Song/FormTabs",
  component: FormTabs,
  args: { onSelect: () => {}, onCreate: () => {} },
} satisfies Meta<typeof FormTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { forms: [], activeFormId: null } };
export const SingleForm: Story = { args: { forms: [makeForm("f1", "Verse")], activeFormId: "f1" } };
export const TwoFormsFirstActive: Story = { args: { forms: twoForms, activeFormId: "f1" } };
export const TwoFormsSecondActive: Story = { args: { forms: twoForms, activeFormId: "f2" } };
export const NoActiveForm: Story = { args: { forms: twoForms, activeFormId: null } };
export const ManyForms: Story = {
  args: {
    forms: ["Intro","Verse","Pre-Chorus","Chorus","Bridge","Outro"].map((n, i) =>
      makeForm(`f${i}`, n)
    ),
    activeFormId: "f2",
  },
};
```

### StanzaCompact.stories.tsx

Props: `stanza: Stanza`, `effectiveBpm: number`, `effectiveNote: NoteValue`,
`bpmInherited: boolean`.
Cover: bpm inherited vs overridden, common time sigs.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Stanza } from "../../api/client";
import { StanzaCompact } from "./StanzaCompact";

const base: Stanza = { bars: 8, num: 4, denom: 4 };

const meta = {
  title: "Song/StanzaCompact",
  component: StanzaCompact,
  args: { stanza: base, effectiveBpm: 120, effectiveNote: "q", bpmInherited: true },
} satisfies Meta<typeof StanzaCompact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InheritedBpm: Story = { args: { bpmInherited: true } };
export const OverriddenBpm: Story = { args: { bpmInherited: false, stanza: { ...base, bpm: 140 }, effectiveBpm: 140 } };
export const ThreeFour: Story = { args: { stanza: { ...base, num: 3, denom: 4 } } };
export const SixEight: Story = { args: { stanza: { ...base, num: 6, denom: 8 } } };
export const SingleBar: Story = { args: { stanza: { ...base, bars: 1 } } };
export const ManyBars: Story = { args: { stanza: { ...base, bars: 32 } } };
```

### TempoEditor.stories.tsx

Props: `bpm`, `note`, `bpmOverridden`, `noteOverridden`, `onBpmChange`, `onNoteChange`,
`onBpmClear?`, `onNoteClear?`.
Cover: no overrides (inherited), bpm override with clear, note override with clear, both overridden.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TempoEditor } from "./TempoEditor";

const meta = {
  title: "Song/TempoEditor",
  component: TempoEditor,
  args: {
    bpm: 120, note: "q",
    bpmOverridden: false, noteOverridden: false,
    onBpmChange: () => {}, onNoteChange: () => {},
  },
} satisfies Meta<typeof TempoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inherited: Story = {};
export const BpmOverridden: Story = {
  args: { bpmOverridden: true, onBpmClear: () => {} },
};
export const NoteOverridden: Story = {
  args: { noteOverridden: true, note: "h", onNoteClear: () => {} },
};
export const BothOverridden: Story = {
  args: { bpmOverridden: true, noteOverridden: true, onBpmClear: () => {}, onNoteClear: () => {} },
};
export const SlowTempo: Story = { args: { bpm: 40, bpmOverridden: true, onBpmClear: () => {} } };
export const FastTempo: Story = { args: { bpm: 240, bpmOverridden: true, onBpmClear: () => {} } };
```

### StanzaExpanded.stories.tsx

Props: `stanza`, `index`, `effectiveBpm`, `effectiveNote`, `formBpm`, `sectionBpm?`,
`onChange`, `onDelete`, `onDuplicate`.
Cover: no section bpm override, with section bpm override, stanza note override, single bar (edge).

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Stanza } from "../../api/client";
import { StanzaExpanded } from "./StanzaExpanded";

const base: Stanza = { bars: 8, num: 4, denom: 4 };

const meta = {
  title: "Song/StanzaExpanded",
  component: StanzaExpanded,
  args: {
    stanza: base,
    index: 0,
    effectiveBpm: 120,
    effectiveNote: "q",
    formBpm: 120,
    onChange: () => {},
    onDelete: () => {},
    onDuplicate: () => {},
  },
} satisfies Meta<typeof StanzaExpanded>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithSectionBpmOverride: Story = {
  args: { sectionBpm: 100, effectiveBpm: 100, stanza: { ...base, bpm: 140 }, effectiveBpm: 140 },
};
export const NoteOverride: Story = {
  args: { stanza: { ...base, note: "h" }, effectiveNote: "h" },
};
export const SingleBar: Story = {
  args: { stanza: { ...base, bars: 1 } },
};
export const ThreeFour: Story = {
  args: { stanza: { ...base, num: 3, denom: 4 } },
};
```

## Acceptance criteria

- [ ] `pnpm --filter web build-storybook` exits 0 and compiles all 8 new story files
- [ ] `pnpm --filter web build` exits 0 — no type errors
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] All stories use `satisfies Meta<...>` pattern
- [ ] No `any` casts
