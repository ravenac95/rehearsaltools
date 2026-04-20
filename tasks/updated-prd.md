# Updated PRD — Storybook UI Component Library

## Overview

Add Storybook 8 to the `web` package of the rehearsaltools pnpm monorepo. Refactor four screen components into container/presentation pairs. Write exhaustive, Chromatic-ready stories for all UI primitives, song components, and screen presentations.

## Codebase Context

- **Monorepo**: pnpm workspaces; `web/` is a Vite + React 18 + TypeScript app (no Storybook today)
- **UI primitives** (`web/src/components/ui/`): `Button`, `Card`, `Chip`, `Stepper`, `ThemeToggle` — all already pure props-only except `ThemeToggle`, which calls `cycleTheme()`/`getThemePreference()` directly
- **Song components** (`web/src/components/song/`): all pure props-only; `SectionRow` and `FormStringEditor` hold internal `useState` only
- **Screens** (`web/src/screens/`): `Dashboard`, `Regions`, `Mixdown`, `SongEditor` — all currently monolithic containers; must be split
- **Test runner**: Vitest (`pnpm --filter web test`); tests live in `web/tests/`; story files are NOT in test scope

## What Needs to Be Built

### 1. Storybook install (greenfield — no `.storybook/` exists)
- `@storybook/react-vite` builder matching Storybook 8
- `@storybook/addon-essentials`, `@storybook/addon-interactions`, `@storybook/addon-themes`
- `preview.tsx` wires `withThemeByDataAttribute` decorator (sets `data-theme` on `<html>`) + imports the app's global CSS
- `preview-head.html` injects the Google Fonts `<link>` block already used in `index.html`
- Script: `"build-storybook": "storybook build"` added to `web/package.json`
- Script: `"storybook": "storybook dev -p 6006"` added to `web/package.json`

### 2. ThemeToggle refactor (same file)
- Export `ThemeTogglePresentation({ pref, onCycle })` — pure display component
- `ThemeToggle` container remains, wraps the presentation; both exported from `components/ui/index.ts`

### 3. Stories — UI primitives
Co-located `*.stories.tsx` for `Button`, `Card`, `Chip`, `Stepper`, `ThemeTogglePresentation`. Exhaustive: every prop variant, disabled states, edge cases (empty children, all enum values).

### 4. Stories — simple song components
Co-located `*.stories.tsx` for `LetterBadge`, `NoteGlyph`, `TimeSigStack`, `RunBar`, `FormTabs`, `StanzaCompact`, `TempoEditor`, `StanzaExpanded`. All already pure. Exhaustive coverage.

### 5. Stories — stateful song components (with `play()`)
- `SectionRow.stories.tsx`: base stories (collapsed/custom-bpm) + one `play()` story that clicks the header to capture the expanded state
- `FormStringEditor.stories.tsx`: base stories (empty/valid/unresolved) + two `play()` stories: typing an invalid string (error state) and typing a valid string

### 6–9. Screen splits
Each screen: create `<Screen>Presentation.tsx` as pure display; reduce `<Screen>.tsx` to a thin container.

| Screen | New file | Key container state passed down |
|---|---|---|
| `Dashboard` | `DashboardPresentation.tsx` | `transport`, `currentTake`, `tempoInput`, `logEnabled` + callbacks |
| `Regions` | `RegionsPresentation.tsx` | `regions`, `newName`, `renamingId`, `renameValue` + callbacks |
| `Mixdown` | `MixdownPresentation.tsx` | `outputDir`, `running`, `regionCount` + callbacks |
| `SongEditor` | `SongEditorPresentation.tsx` | flat prop surface (see below) |

**SongEditorPresentation flat prop interface** (approved Q4/Q5):
```ts
interface SongEditorPresentationProps {
  song: Song;
  activeForm: SongForm | undefined;
  nameDraft: string;
  onNameChange: (v: string) => void;
  onNameFocus: () => void;   // container sets nameFocused=true
  onNameBlur: () => void;    // container sets nameFocused=false, commits if dirty
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

Container holds `nameFocused` local state; skips the store-sync effect when `nameFocused === true`.

### 10. Exhaustive stories for each screen presentation
`layout: 'fullscreen'` for all four. Story scenarios:
- `DashboardPresentation`: playing/stopped/recording transport states, with/without current take, metronome on/off
- `RegionsPresentation`: empty, multiple regions, mid-rename state
- `MixdownPresentation`: idle (0 regions), idle (3 regions), running
- `SongEditorPresentation`: empty (no forms), typical (2 forms, sections), unresolved letters, with toast, running/disabled RunBar, mid-name-edit (nameDraft differs from song.name)

## Acceptance Criteria

- [ ] `pnpm --filter web build` exits 0 (tsc + vite build, no new type errors)
- [ ] `pnpm --filter web test` exits 0 (existing Vitest suites pass unchanged)
- [ ] `pnpm --filter web build-storybook` exits 0 with at least 19 story files compiled
- [ ] Each refactored screen still renders correctly in the running app (container wiring preserved)
- [ ] No `any` casts introduced in presentation component interfaces
- [ ] All story files use `satisfies Meta<...>` for type safety where applicable
