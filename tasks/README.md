# Storybook UI Component Library — Task Overview

## Summary

Add Storybook 8 to the `web` package, refactor four screen components into
container/presentation pairs, and write exhaustive Chromatic-ready stories for all UI
primitives, song components, and screen presentations.

Total tasks: 10
Estimated complexity: medium-large (~400-600 lines of story/config code; ~200 lines of
presentation components)

## Task order (strictly sequential)

| Task | Slug | Description |
|---|---|---|
| 1 | `task-01-install-storybook` | Install Storybook 8 + addon-themes; write `.storybook/` config |
| 2 | `task-02-themtoggle-presentation` | Split ThemeToggle into container + presentation |
| 3 | `task-03-stories-ui-primitives` | Exhaustive stories for Button, Card, Chip, Stepper, ThemeTogglePresentation |
| 4 | `task-04-stories-simple-song-components` | Exhaustive stories for 8 pure song components |
| 5 | `task-05-stories-stateful-song-components` | SectionRow + FormStringEditor stories with play() interactions |
| 6 | `task-06-split-dashboard` | Split Dashboard; write DashboardPresentation stories |
| 7 | `task-07-split-regions` | Split Regions; write RegionsPresentation stories |
| 8 | `task-08-split-mixdown` | Split Mixdown; write MixdownPresentation stories |
| 9 | `task-09-split-songeditor` | Split SongEditor (flat props, focus-guard lift); write stories |
| 10 | `task-10-final-verification` | Run build + test + build-storybook; document warnings |

## Dependency graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
```

All dependencies are strictly linear. Each task depends on the one before it and blocks
the one after. Do not parallelize.

## How to use these files

Each file is a self-contained prompt for an AI agent. The agent should read the file,
follow the implementation notes, and verify the acceptance criteria before marking the
task done.

**Delete each task file after the task is completed.** When all task files are deleted
(and README.md + updated-prd.md are the only files left), the feature is complete.

## Key files in the codebase

- `/home/user/rehearsaltools/web/src/components/ui/` — UI primitives
- `/home/user/rehearsaltools/web/src/components/song/` — song components
- `/home/user/rehearsaltools/web/src/screens/` — screen containers (to be split)
- `/home/user/rehearsaltools/web/src/api/client.ts` — shared types
- `/home/user/rehearsaltools/web/src/theme.ts` — theme system (`data-theme` on `<html>`)
- `/home/user/rehearsaltools/web/src/store.ts` — Zustand store

## Acceptance gates

- `pnpm --filter web build` — TypeScript + Vite; must exit 0 at the end of every task
- `pnpm --filter web test` — Vitest; must exit 0 at the end of every task
- `pnpm --filter web build-storybook` — full Storybook static build; must exit 0 from task 1 onward

## Open decisions (already resolved)

- Theme toolbar: `@storybook/addon-themes` with `withThemeByDataAttribute`
- Story coverage: exhaustive (every prop permutation + edge cases)
- play() interactions: SectionRow expand-on-click + FormStringEditor error/valid typing
- SongEditorPresentation prop shape: flat interface
- Focus guard: lifted into SongEditor container via `onNameFocus`/`onNameBlur` callbacks
- Screen story layout: `'fullscreen'` for all four screen presentations
- TDD: disabled; build + test are the acceptance gates
