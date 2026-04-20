# Task 9: Split SongEditor screen into container + presentation, add stories

## Objective

Create `SongEditorPresentation.tsx` with a flat prop interface and `onNameFocus`/`onNameBlur` callbacks replacing the `nameInputRef`. Reduce `SongEditor.tsx` to a thin container that holds `nameFocused` local state and skips the store-sync effect when focused. Write exhaustive `SongEditorPresentation.stories.tsx` with `layout: 'fullscreen'`.

## Dependencies

- Depends on: task-08-split-mixdown

## Files to create/modify

- `/home/user/rehearsaltools/web/src/screens/SongEditorPresentation.tsx` — create
- `/home/user/rehearsaltools/web/src/screens/SongEditor.tsx` — refactor (container only)
- `/home/user/rehearsaltools/web/src/screens/SongEditorPresentation.stories.tsx` — create

## Implementation notes

Read the following files in full before starting:

- `/home/user/rehearsaltools/web/src/screens/SongEditor.tsx` — full current implementation
- `/home/user/rehearsaltools/web/src/api/client.ts` — for `Song`, `SongForm`, `Section`, `Stanza`, `NoteValue` types
- `/home/user/rehearsaltools/web/src/components/song/FormTabs.tsx` — used in the presentation
- `/home/user/rehearsaltools/web/src/components/song/FormStringEditor.tsx` — used in the presentation
- `/home/user/rehearsaltools/web/src/components/song/SectionRow.tsx` — used in the presentation
- `/home/user/rehearsaltools/web/src/components/song/RunBar.tsx` — used in the presentation

### SongEditorPresentation prop interface

All props are flat — no nested objects. This is the approved design (Q4).

```ts
import type { Song, SongForm, NoteValue, Stanza } from "../api/client";

interface SongEditorPresentationProps {
  // Data
  song: Song;
  activeForm: SongForm | undefined;
  nameDraft: string;
  toast: string | null;
  running: boolean;
  // Derived (computed in container)
  definedLetters: string[];
  unresolvedLetters: string[];
  hasUnresolved: boolean;
  totalBars: number;
  nextLetter: string | undefined;
  canAddSection: boolean;
  // Callbacks
  onNameChange: (v: string) => void;
  onNameFocus: () => void;   // container sets nameFocused = true
  onNameBlur: () => void;    // container sets nameFocused = false, then commits if dirty
  onSelectForm: (id: string) => void;
  onCreateForm: () => void;
  onPatternChange: (letters: string[]) => void;
  onFormBpmChange: (bpm: number) => void;
  onFormNoteChange: (note: NoteValue) => void;
  onSectionUpdate: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) => void;
  onAddSection: () => void;
  onDeleteSection: (letter: string) => void;
  onRun: () => void;
}
```

### SongEditorPresentation.tsx — structure

The presentation handles two top-level states derived from props:

1. **No forms yet** (`activeForm === undefined`): render the "no forms" empty state with a "+ Create form" button wired to `onCreateForm`.
2. **Normal state** (`activeForm` defined): render the full editor.

Move all JSX from `SongEditor.tsx` into `SongEditorPresentation`. Replace:

- `<input ref={nameInputRef} ... onBlur={commitName} onFocus={...}>` →
  `<input value={nameDraft} onChange={(e) => onNameChange(e.target.value)} onFocus={onNameFocus} onBlur={onNameBlur} ...>`
  (no `ref` — the focus guard lives in the container)
- All `run(...)` calls → corresponding callback props
- All `setNameDraft(...)` → `onNameChange(...)`

No `useState`, no `useEffect`, no `useStore`, no `useRef` in the presentation.

### SongEditor.tsx — after refactor

```tsx
import { useState, useEffect } from "react";
import { useStore } from "../store";
import { SongEditorPresentation } from "./SongEditorPresentation";
import type { NoteValue, Stanza } from "../api/client";

export function SongEditor() {
  const song = useStore((s) => s.song);
  const createForm = useStore((s) => s.createForm);
  const setActiveForm = useStore((s) => s.setActiveForm);
  const updateForm = useStore((s) => s.updateForm);
  const upsertSection = useStore((s) => s.upsertSection);
  const deleteSection = useStore((s) => s.deleteSection);
  const updateSongName = useStore((s) => s.updateSongName);
  const writeActiveForm = useStore((s) => s.writeActiveForm);
  const setError = useStore((s) => s.setError);
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  const [running, setRunning] = useState(false);
  const [nameDraft, setNameDraft] = useState(song.name);
  const [nameFocused, setNameFocused] = useState(false);  // focus guard (replaces ref)

  // Auto-clear toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  // Sync name draft from store when not focused
  useEffect(() => {
    if (nameFocused) return;  // guard: skip while user is editing
    setNameDraft(song.name);
  }, [song.name, nameFocused]);

  // Debounce name commit while typing
  useEffect(() => {
    if (nameDraft === song.name) return;
    const t = setTimeout(() => {
      run(() => updateSongName(nameDraft));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameDraft]);

  const commitName = () => {
    if (nameDraft !== song.name) run(() => updateSongName(nameDraft));
  };

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (err: any) { setError(String(err.message ?? err)); }
  };

  const activeForm = song.songForms.find((f) => f.id === song.activeFormId)
    ?? song.songForms[0];

  const sectionsByLetter = Object.fromEntries(song.sections.map((s) => [s.letter, s]));
  const definedLetters = song.sections.map((s) => s.letter);
  const unresolvedLetters = activeForm
    ? activeForm.pattern.filter((l) => !sectionsByLetter[l])
    : [];
  const hasUnresolved = unresolvedLetters.length > 0;
  const totalBars = activeForm
    ? activeForm.pattern.reduce((acc, letter) => {
        const sec = sectionsByLetter[letter];
        return acc + (sec ? sec.stanzas.reduce((a, st) => a + st.bars, 0) : 0);
      }, 0)
    : 0;
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const nextLetter = ALPHABET.find((l) => !definedLetters.includes(l));
  const canAddSection = nextLetter !== undefined;

  return (
    <SongEditorPresentation
      song={song}
      activeForm={activeForm}
      nameDraft={nameDraft}
      toast={toast}
      running={running}
      definedLetters={definedLetters}
      unresolvedLetters={unresolvedLetters}
      hasUnresolved={hasUnresolved}
      totalBars={totalBars}
      nextLetter={nextLetter}
      canAddSection={canAddSection}
      onNameChange={setNameDraft}
      onNameFocus={() => setNameFocused(true)}
      onNameBlur={() => {
        setNameFocused(false);
        commitName();
      }}
      onSelectForm={(id) => run(() => setActiveForm(id))}
      onCreateForm={() => run(createForm)}
      onPatternChange={(letters) => run(() => updateForm(activeForm!.id, { pattern: letters }))}
      onFormBpmChange={(bpm) => run(() => updateForm(activeForm!.id, { bpm }))}
      onFormNoteChange={(note: NoteValue) => run(() => updateForm(activeForm!.id, { note }))}
      onSectionUpdate={(letter, stanzas, bpm, note) => run(() => upsertSection(letter, stanzas, bpm, note))}
      onAddSection={() => {
        if (!nextLetter) return;
        run(() => upsertSection(nextLetter, [{ bars: 8, num: 4, denom: 4 }]));
      }}
      onDeleteSection={(letter) => run(() => deleteSection(letter))}
      onRun={async () => {
        setRunning(true);
        try { await writeActiveForm(); }
        catch (err: any) { setError(String(err.message ?? err)); }
        finally { setRunning(false); }
      }}
    />
  );
}
```

### SongEditorPresentation.stories.tsx

Use `layout: 'fullscreen'`. Build fixture data using types from `api/client.ts`.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Song, SongForm, Section } from "../api/client";
import { SongEditorPresentation } from "./SongEditorPresentation";

const noop = () => {};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const verseForm: SongForm = {
  id: "f1", name: "Verse", bpm: 120, note: "q", pattern: ["A", "B", "A"],
};
const chorusForm: SongForm = {
  id: "f2", name: "Chorus", bpm: 130, note: "q", pattern: ["C"],
};

const sectionA: Section = {
  letter: "A",
  stanzas: [{ bars: 8, num: 4, denom: 4 }],
};
const sectionB: Section = {
  letter: "B",
  stanzas: [{ bars: 4, num: 3, denom: 4 }],
};
const sectionC: Section = {
  letter: "C",
  stanzas: [{ bars: 8, num: 4, denom: 4 }],
};

const emptySong: Song = {
  id: "s1", name: "New Song", sections: [], songForms: [], activeFormId: null,
};
const typicalSong: Song = {
  id: "s1", name: "My Song",
  sections: [sectionA, sectionB, sectionC],
  songForms: [verseForm, chorusForm],
  activeFormId: "f1",
};

const baseCallbacks = {
  onNameChange: noop, onNameFocus: noop, onNameBlur: noop,
  onSelectForm: noop, onCreateForm: noop,
  onPatternChange: noop, onFormBpmChange: noop, onFormNoteChange: noop,
  onSectionUpdate: noop, onAddSection: noop, onDeleteSection: noop,
  onRun: noop,
};

const typicalDerived = {
  definedLetters: ["A", "B", "C"],
  unresolvedLetters: [],
  hasUnresolved: false,
  totalBars: 20,  // 8 + 4 + 8 (pattern A B A expands; 8+4+8)
  nextLetter: "D",
  canAddSection: true,
};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Screens/SongEditorPresentation",
  component: SongEditorPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    song: typicalSong,
    activeForm: verseForm,
    nameDraft: "My Song",
    toast: null,
    running: false,
    ...typicalDerived,
    ...baseCallbacks,
  },
} satisfies Meta<typeof SongEditorPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

// No forms exist at all — renders the "no forms" empty state
export const NoForms: Story = {
  args: {
    song: emptySong,
    activeForm: undefined,
    nameDraft: "New Song",
    definedLetters: [],
    unresolvedLetters: [],
    hasUnresolved: false,
    totalBars: 0,
    nextLetter: "A",
    canAddSection: true,
  },
};

// Typical state: two forms, sections defined, pattern valid
export const Typical: Story = {};

// Pattern references a letter with no matching section
export const WithUnresolvedLetters: Story = {
  args: {
    activeForm: { ...verseForm, pattern: ["A", "D", "B"] },  // D is unresolved
    unresolvedLetters: ["D"],
    hasUnresolved: true,
  },
};

// Toast message visible
export const WithToast: Story = {
  args: { toast: "✓ form written to REAPER" },
};

// RunBar is in loading state
export const Running: Story = {
  args: { running: true },
};

// RunBar is disabled — pattern empty
export const RunBarDisabledEmptyPattern: Story = {
  args: {
    activeForm: { ...verseForm, pattern: [] },
    totalBars: 0,
    hasUnresolved: false,
  },
};

// User is mid-edit of the song name (nameDraft differs from song.name)
export const MidNameEdit: Story = {
  args: { nameDraft: "My Song (in progress)" },
};

// All 26 sections defined — canAddSection = false
export const AllSectionsUsed: Story = {
  args: { nextLetter: undefined, canAddSection: false },
};
```

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0 — no type errors in new files or the refactored container
- [ ] `pnpm --filter web test` exits 0 — unaffected
- [ ] `pnpm --filter web build-storybook` exits 0 — `SongEditorPresentation.stories.tsx` compiles
- [ ] SongEditor screen in the running app is visually and functionally identical to before the refactor
- [ ] Song name focus guard works: editing the name does not get overwritten by store syncs while focused
- [ ] `SongEditorPresentation` has no `useState`, `useEffect`, `useStore`, or `useRef` calls
- [ ] No `any` casts in the presentation component interface
