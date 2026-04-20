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
