# Updated PRD — Storybook UI Component Library

## Overview

Add Storybook 8 to the `web` package of the rehearsaltools pnpm monorepo. Refactor four
screen components into container/presentation pairs. Write exhaustive, Chromatic-ready
stories for all UI primitives, song components, and screen presentations.

## Codebase Context

- **Monorepo**: pnpm workspaces; `web/` is a Vite + React 18 + TypeScript app (no Storybook today)
- **UI primitives** (`web/src/components/ui/`): `Button`, `Card`, `Chip`, `Stepper`,
  `ThemeToggle` — all pure props-only except `ThemeToggle`, which calls
  `cycleTheme()`/`getThemePreference()` directly
- **Song components** (`web/src/components/song/`): all pure props-only; `SectionRow` and
  `FormStringEditor` hold internal `useState` only
- **Screens** (`web/src/screens/`): `Dashboard`, `Regions`, `Mixdown`, `SongEditor` —
  monolithic containers; must be split into container + presentation
- **Test runner**: Vitest (`pnpm --filter web test`); tests in `web/tests/`; story files
  are NOT in test scope; no TDD for this build
- **Theme system**: `data-theme` attribute on `<html>` via `web/src/theme.ts`

## What Needs to Be Built

### 1. Storybook install (greenfield — no `.storybook/` exists today)

- `@storybook/react-vite` builder, `@storybook/addon-essentials`,
  `@storybook/addon-interactions`, `@storybook/addon-themes`, `@storybook/blocks`,
  `storybook` — all as devDeps
- `preview.tsx`: `withThemeByDataAttribute` decorator targeting `html`, imports global CSS
- `preview-head.html`: Google Fonts `<link>` block from `web/index.html`
- Scripts: `"storybook"` and `"build-storybook"` in `web/package.json`

### 2. ThemeToggle refactor (same file, both exports)

- New export: `ThemeTogglePresentation({ pref, onCycle })` — pure display
- Existing `ThemeToggle` container wraps it; both exported from `components/ui/index.ts`

### 3. Stories — UI primitives

Co-located `*.stories.tsx` for `Button`, `Card`, `Chip`, `Stepper`,
`ThemeTogglePresentation`. Exhaustive: every prop variant, disabled states, edge cases.

### 4. Stories — simple song components

Co-located `*.stories.tsx` for `LetterBadge`, `NoteGlyph`, `TimeSigStack`, `RunBar`,
`FormTabs`, `StanzaCompact`, `TempoEditor`, `StanzaExpanded`. All already pure. Exhaustive.

### 5. Stories — stateful song components with `play()`

- `SectionRow.stories.tsx`: collapsed / with-bpm-override base stories + one `play()`
  story that clicks the header to trigger expanded state
- `FormStringEditor.stories.tsx`: empty / valid / unresolved base stories + two `play()`
  stories: typing an invalid string (error state) and typing a valid string

### 6–9. Screen container/presentation splits

Each screen: create `<Screen>Presentation.tsx` (pure display); thin `<Screen>.tsx`
container passes props down.

| Screen | Presentation file | Key state passed |
|---|---|---|
| `Dashboard` | `DashboardPresentation.tsx` | `transport`, `currentTake`, `tempoInput`, `logEnabled` + callbacks |
| `Regions` | `RegionsPresentation.tsx` | `regions`, `newName`, `renamingId`, `renameValue` + callbacks |
| `Mixdown` | `MixdownPresentation.tsx` | `outputDir`, `running`, `regionCount` + callbacks |
| `SongEditor` | `SongEditorPresentation.tsx` | flat prop surface (see below) |

**SongEditorPresentation flat prop interface** (Q4 + Q5 approved):

```ts
interface SongEditorPresentationProps {
  song: Song;
  activeForm: SongForm | undefined;
  nameDraft: string;
  onNameChange: (v: string) => void;
  onNameFocus: () => void;   // container sets nameFocused = true
  onNameBlur: () => void;    // container sets nameFocused = false, commits if dirty
  toast: string | null;
  running: boolean;
  definedLetters: string[];
  unresolvedLetters: string[];
  hasUnresolved: boolean;
  totalBars: number;
  nextLetter: string | undefined;
  canAddSection: boolean;
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

Container holds `nameFocused: boolean` local state. The store-sync effect
(`setNameDraft(song.name)`) skips when `nameFocused === true`.

### 10. Exhaustive stories for each screen presentation

`layout: 'fullscreen'` for all four. Scenarios per screen:

- **DashboardPresentation**: stopped / playing / recording transport, with/without take,
  metronome on/off
- **RegionsPresentation**: empty list, multiple regions, mid-rename state
- **MixdownPresentation**: idle 0 regions, idle 3 regions, running
- **SongEditorPresentation**: no-forms empty state, typical (2 forms + sections),
  unresolved letters, with toast, running/disabled RunBar, mid-name-edit

## Acceptance Criteria

- [ ] `pnpm --filter web build` exits 0 (tsc + vite; no new type errors; no `any` casts)
- [ ] `pnpm --filter web test` exits 0 (existing Vitest suites unchanged)
- [ ] `pnpm --filter web build-storybook` exits 0 with ≥ 19 story files compiled
- [ ] Each refactored screen renders correctly in the running app (container wiring intact)
- [ ] All story files use `satisfies Meta<...>` for type safety
