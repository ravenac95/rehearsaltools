# CLAUDE.md

Project-wide conventions for AI agents working in this repository.

## Repository layout

- `web/` — Vite + React app (Zustand store, Storybook). Tests via Vitest under `web/tests/`. Storybook config at `web/.storybook/`; stories auto-discovered from `web/src/**/*.stories.@(ts|tsx)`.
- `server/` — backend.
- `reascripts/` — REAPER scripts.
- `data/`, `designs/` — assets and design references.

## Conventions for `web/`

### Storybook is mandatory for new visual components

When you add or substantially change a visual React component under `web/src/`, you **must** also add or update a Storybook story for it in the same change. No new visual component lands without a story.

Specifics:

- **Where:** co-located next to the component as `<Name>.stories.tsx` (or `<Name>Presentation.stories.tsx` if following the presentation/container split — see below).
- **Title:** `<Area>/<ComponentName>` (e.g. `Rehearsal/StatusBadge`, `UI/Button`).
- **Coverage:** at minimum, one default story plus one story per meaningful visual state (loading, error, empty, selected, disabled, etc.). Don't ship a single trivial story.
- **Pattern:** use `Meta`/`StoryObj` typed against the component, fixture constants at top of file, `args` baselined on `meta`, per-story overrides. Reference `web/src/screens/SongEditorPresentation.stories.tsx` and any file under `web/src/components/rehearsal/*Presentation.stories.tsx` as the canonical examples.
- **No store, no fetch:** stories must render without `useStore` or `api.*` calls. Achieve this via the presentation/container split below.

### Presentation/container split for store-bound components

If a component needs Zustand state or side effects, split it:

- `<Name>Presentation.tsx` — pure, props-only. No `useStore`, no `api.*`, no data-fetching `useEffect`. Local UI-only `useState` is fine.
- `<Name>.tsx` — thin container. Reads the store, composes callbacks, renders `<NamePresentation .../>`. Keeps the public export name and barrel position unchanged.
- The story targets `<Name>Presentation`, not the container.

### Verification before committing a UI change

1. `pnpm exec tsc -b` from `web/` — must be clean.
2. `pnpm --filter web test` — must be green.
3. `pnpm --filter web build-storybook` — must build, and the new/updated story must appear in `storybook-static/`.

If you can't satisfy any of the above, say so explicitly rather than reporting the change as done.
