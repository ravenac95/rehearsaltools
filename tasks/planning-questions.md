# Planning Questions

## Codebase Summary

The `web` package is a Vite + React 18 + Zustand app in a pnpm monorepo.
Relevant findings:

- **Vitest config** lives inside `vite.config.ts` (`test.include: ["tests/**/*.test.{ts,tsx}"]`). Story files co-located under `src/` are not in scope for Vitest — no config change needed.
- **UI primitives** (`Button`, `Card`, `Chip`, `Stepper`) are clean props-only components. `ThemeToggle` calls `cycleTheme()` + `getThemePreference()` from `theme.ts` directly — refactor to container/presentation is straightforward.
- **Song components** are all pure. `SectionRow` holds `expanded`/`expandedStanzaIdx` in `useState` (local UI state, stays internal). `FormStringEditor` holds `draft`/`errors` in `useState` (same).
- **Regions.tsx** holds `newName`, `renamingId`, `renameValue` in local `useState` and calls `api.*` + `refresh()` in a `run()` helper. The presentation layer needs those three state values, two setters, and `regions` from the store — a small, flat prop surface.
- **Mixdown.tsx** is the simplest screen: `outputDir` + `running` local state, `regions.length` from the store, one `render()` async call. Prop surface is tiny.
- **Dashboard.tsx** local state: `tempoInput`, `logEnabled`. Props the plan lists already look complete.
- **SongEditor.tsx** is the most complex: store hooks, three `useEffect`s, `nameInputRef`, derived calculations. The prop surface in the plan looks complete but the ref (`nameInputRef`) must be passed to the presentation — it needs to be a `RefObject<HTMLInputElement>` prop.
- **`data/` and `designs/`** directories exist but contain no source code relevant to Storybook.
- **No existing `.storybook/` directory** — this is a greenfield Storybook install.

---

## Questions

### Q1: Theme toolbar approach — addon-themes vs custom globalTypes decorator

**Context:** The plan calls for a `globalTypes.theme` toolbar with a custom decorator that sets `data-theme` on a wrapper `<div>`. This is ~10 lines and requires no extra package. `@storybook/addon-themes` is a published addon that provides a polished switcher and integrates with Chromatic's theme-matrix feature, but adds a dependency and some config boilerplate.

**Question:** Which approach do you want for the theme switcher in Storybook?

Options:

1. Custom `globalTypes` decorator in `preview.tsx` — no extra dep, ~10 lines, matches the plan exactly.
2. `@storybook/addon-themes` — adds one devDep, gives a polished toolbar icon and Chromatic theme-matrix support out of the box.

---

### Q2: Story coverage depth

**Context:** There are 15 components + 4 screen presentations = 19 story files. The plan lists specific stories per file (e.g., `Button.stories.tsx` gets `primary`/`secondary`/`danger` + disabled). "Minimal" means one default story plus key variants (what the plan lists). "Exhaustive" means every prop permutation and edge case — useful for visual regression but significantly more work.

**Question:** What level of story coverage do you want?

Options:

1. Minimal — one default + the named variants listed in the plan. Fast to implement, easy to maintain.
2. Exhaustive — every prop combination, edge case, and loading/error state. Chromatic/visual-regression-ready but 2-3× more stories to write and review.

---

### Q3: Interaction tests (`play()` functions)

**Context:** `@storybook/addon-interactions` is already in the plan's install list. The plan calls out one specific `play()` usage: `SectionRow.stories.tsx` should have a story that clicks the header to capture the expanded state (for Chromatic). `FormStringEditor` also has a typing interaction worth testing. The question is whether `play()` functions are limited to those two or applied wherever there's a meaningful user interaction.

**Question:** Where should `play()` interaction functions be used?

Options:

1. Sparse — only `SectionRow` (expand on click) as the plan specifies. Keep most stories static.
2. Moderate — `SectionRow` expand + `FormStringEditor` typing (error state, valid state). Two interaction stories total.
3. Wherever useful — any story with a stateful interaction (accordion, input, rename flow in RegionsPresentation, etc.).

---

### Q4: Screen Presentation prop shape

**Context:** `SongEditorPresentation` will have ~20 props. There are two common patterns: a single flat interface (`SongEditorPresentationProps { song, activeForm, nameDraft, nameInputRef, toast, running, onNameDraftChange, ... }`) or grouped namespaces (`{ data: { song, activeForm, ... }, derived: { definedLetters, totalBars, ... }, callbacks: { onNameDraftChange, ... }, refs: { nameInputRef } }`). Flat is simpler to wire from the container. Grouped is easier to mock in stories (you build one fixture object per group). The other three screens are small enough that flat is fine regardless.

**Question:** For `SongEditorPresentation` (the complex one), flat or grouped props?

Options:

1. Flat interface — all props at the top level. Simpler container wiring, standard React pattern.
2. Grouped — `data`, `derived`, `callbacks`, `refs` sub-objects. Cleaner story fixtures but slightly more verbose container code.

---

### Q5: `nameInputRef` in `SongEditorPresentation`

**Context:** `SongEditor.tsx` creates `const nameInputRef = useRef<HTMLInputElement>(null)` and passes it to the `<input ref={nameInputRef} ...>` inside the JSX. When we split into container + presentation, the ref needs to live in the container (because two `useEffect`s check `document.activeElement === nameInputRef.current`). That means `nameInputRef` must be passed as a prop to the presentation. In Storybook stories this ref will be `undefined` or a stub — the input will render fine, the focus-guard effects just won't fire. Alternatively the focus guard can be moved entirely into the container and the presentation can use a callback ref or `onFocus`/`onBlur` flags instead, removing the ref prop entirely.

**Question:** How should the focus-guard logic be handled in the split?

Options:

1. Pass `nameInputRef` as a `RefObject<HTMLInputElement>` prop — simplest refactor, stories pass `undefined` (or `useRef(null)`), no behaviour change in the app.
2. Lift the focus guard into the container — the presentation exposes `onFocus`/`onBlur` callbacks on the name input; the container tracks focus state and skips the sync effect when focused. Cleaner API, slightly more work.

---

### Q6: `layout` parameter for screen Presentation stories

**Context:** The plan notes `layout: 'padded'` as default and `'fullscreen'` for screens. The screen presentations (`DashboardPresentation`, `SongEditorPresentation`, `RegionsPresentation`, `MixdownPresentation`) are full-height scrollable panels in the real app — `fullscreen` would let Storybook render them at viewport height without artificial padding, matching their in-app context. `padded` adds 16px padding around everything and gives a white background border that can look odd for full-page layouts.

**Question:** Which Storybook `layout` parameter should the four screen Presentation stories use?

Options:

1. `'fullscreen'` for all four screen presentations — matches how they render in the app.
2. `'padded'` everywhere (the Storybook default) — consistent across all stories, simpler.
3. `'fullscreen'` only for `SongEditorPresentation` (the one with sticky `RunBar`) and `'padded'` for the other three simpler screens.

---

### Q7: TDD mode

**Context:** The web package runs Vitest with `tests/**/*.test.{ts,tsx}`. Existing test files are `web/tests/store.test.ts` and `web/tests/pattern.test.ts`. The Storybook work involves: creating config files, refactoring components to container/presentation, and writing story files. Story files are not test files — they are the visual artefact. The container/presentation refactor could be TDD'd (write a failing test that the container passes the right props before implementing the split), but the story files themselves cannot be TDD'd in the traditional sense.

**Question:** Do you want TDD mode for this build?

Options:

1. No TDD — implement directly. Story files serve as the visual specification; run `pnpm --filter web build` and `pnpm --filter web test` as acceptance gates.
2. TDD for refactor tasks only — write Vitest tests covering the container/presentation splits (`DashboardPresentation` renders correct props given store state, etc.) before implementing each split. Story writing tasks are not TDD'd.
3. Full TDD — every functional task (container splits + Storybook config) starts with a failing test. Story tasks are excluded by nature.
