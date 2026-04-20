# Task 5: Write stories with play() interactions for SectionRow and FormStringEditor

## Objective

Create `SectionRow.stories.tsx` (with expand-on-click interaction) and `FormStringEditor.stories.tsx` (with typing interactions for error and valid states).

## Dependencies

- Depends on: task-04-stories-simple-song-components

## Files to create/modify

- `/home/user/rehearsaltools/web/src/components/song/SectionRow.stories.tsx` — create
- `/home/user/rehearsaltools/web/src/components/song/FormStringEditor.stories.tsx` — create

## Implementation notes

### Required imports for play() stories

`@storybook/addon-interactions` must already be installed (task 1). Import the testing
utilities from `@storybook/test`:

```ts
import { userEvent, within, expect } from "@storybook/test";
```

### Relevant types (from `api/client.ts`)

```ts
export interface Section {
  letter: string;
  stanzas: Stanza[];
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

Read `/home/user/rehearsaltools/web/src/components/song/SectionRow.tsx` and
`/home/user/rehearsaltools/web/src/components/song/FormStringEditor.tsx` for exact prop
shapes before writing stories.

---

### SectionRow.stories.tsx

`SectionRow` holds `expanded` / `expandedStanzaIdx` in local `useState` — it is self-contained. The story just renders it with fixture props; the `play()` story clicks the header div.

**Fixtures:**

```ts
const baseForm: SongForm = { id: "f1", name: "Verse", bpm: 120, note: "q", pattern: ["A"] };

const baseSection: Section = {
  letter: "A",
  stanzas: [{ bars: 8, num: 4, denom: 4 }],
};

const multiStanzaSection: Section = {
  letter: "B",
  stanzas: [
    { bars: 8, num: 4, denom: 4 },
    { bars: 4, num: 3, denom: 4 },
  ],
};

const sectionWithBpm: Section = {
  letter: "C",
  stanzas: [{ bars: 4, num: 4, denom: 4 }],
  bpm: 140,
};
```

**Stories:**

```tsx
export const Collapsed: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {} },
};

export const CollapsedWithBpmOverride: Story = {
  args: { section: sectionWithBpm, form: baseForm, onUpdate: () => {} },
};

export const CollapsedMultiStanza: Story = {
  args: { section: multiStanzaSection, form: baseForm, onUpdate: () => {} },
};

export const CollapsedWithDelete: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {}, onDelete: () => {} },
};

// play() story — clicks the header to expand the section
export const ExpandedAfterClick: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {}, onDelete: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The header is a div with cursor:pointer; find it by the letter badge text
    const header = canvas.getByText("A").closest("[style*='cursor: pointer']") ??
                   canvasElement.querySelector("[style*='cursor']") as HTMLElement;
    await userEvent.click(header);
    // After click: expanded section content becomes visible
    await expect(canvas.getByText("+ stanza")).toBeInTheDocument();
  },
};
```

Note: if the `closest` selector above does not resolve cleanly in the play() runner,
an alternative is to click the first child of the section row container — the collapsible
header is always the first `<div>` inside the outer wrapper. Use
`canvasElement.querySelector(".storybook-root > div > div")` or a similar structural
selector if needed, but prefer text-based queries.

---

### FormStringEditor.stories.tsx

`FormStringEditor` holds `draft` and `errors` in local `useState` and uses an internal
`inputRef` to guard against external syncs while focused. Stories supply a static
`pattern` and `onChange` callback.

**Fixtures:**

```ts
const DEFINED = ["A", "B", "C"];
```

**Base stories (no play()):**

```tsx
export const Empty: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
};

export const ValidPattern: Story = {
  args: { pattern: ["A", "B", "A"], onChange: () => {}, definedLetters: DEFINED },
};

export const PatternWithUnresolved: Story = {
  args: { pattern: ["A", "D", "B"], onChange: () => {}, definedLetters: DEFINED },
  // "D" is not in definedLetters → renders with dashed border
};

export const NoDefinedLetters: Story = {
  args: { pattern: ["A", "B"], onChange: () => {} },
  // definedLetters undefined → no unresolved highlighting
};
```

**play() stories:**

```tsx
// Typing an invalid string — error state
export const TypeInvalidPattern: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "A ab");   // "ab" is invalid — lowercase multi-char
    await expect(canvas.getByText(/not a valid section token/i)).toBeInTheDocument();
  },
};

// Typing a valid string — success state (no error message)
export const TypeValidPattern: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "A B A");
    // No error element should be present
    await expect(canvas.queryByText(/not a valid section token/i)).toBeNull();
  },
};
```

---

### Storybook meta for both files

```tsx
// SectionRow.stories.tsx
const meta = {
  title: "Song/SectionRow",
  component: SectionRow,
} satisfies Meta<typeof SectionRow>;

// FormStringEditor.stories.tsx
const meta = {
  title: "Song/FormStringEditor",
  component: FormStringEditor,
} satisfies Meta<typeof FormStringEditor>;
```

## Acceptance criteria

- [ ] `pnpm --filter web build-storybook` exits 0 — both story files compile cleanly
- [ ] `pnpm --filter web build` exits 0 — no type errors
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] `ExpandedAfterClick` story: clicking the header reveals the `+ stanza` button
- [ ] `TypeInvalidPattern` story: error message appears after typing `"A ab"`
- [ ] `TypeValidPattern` story: no error message after typing `"A B A"`
- [ ] No `any` casts; all stories use `satisfies Meta<...>`
