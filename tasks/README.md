# Tasks — Consolidate Song Form Editor (WF2)

These task files are prompts for AI agents running in sequence.
**Delete each file after the task is completed. When all task files are deleted, the feature is complete.**

## Summary

Replaces the separate Sections + Song Form tabs with a single Song editor implementing WF2 (type-string pattern). Includes:
- New backend `SongStore` with the Section/SongForm/Stanza data model and 25-revision ring.
- Pure `flattenForm` module preserving the REAPER write contract.
- New `/api/song/*` routes replacing `/api/sections` and `/api/songform`.
- Full theme overhaul: hand-drawn wireframe aesthetic (Kalam/Caveat/JetBrains Mono fonts, paper palette), light/dark toggle, CSS variables.
- Shared UI primitives (Chip, Card, Button, Stepper, ThemeToggle).
- WF2 Song Editor screen with FormTabs, FormStringEditor, collapsible SectionRows, TempoEditor, RunBar.

## Ordered Task List

| # | Slug | Description |
|---|------|-------------|
| 01 | `task-01-backend-types-and-song-store.md` | New `SongStore` with revision history |
| 02 | `task-02-backend-flatten-module.md` | `flattenForm` — pure flatten for new model |
| 03 | `task-03-backend-routes-and-wiring.md` | New routes, ws.ts, index.ts; delete old files |
| 04 | `task-04-backend-tests.md` | Backend test suite (song, revisions, flatten) |
| 05 | `task-05-frontend-types-store-api.md` | Frontend types, Zustand store, API client |
| 06 | `task-06-theme-system.md` | CSS variables, Google Fonts, theme toggle |
| 07 | `task-07-shared-ui-primitives.md` | Chip, Card, Button, Stepper components |
| 08 | `task-08-retheme-existing-screens.md` | Retheme Dashboard, Regions, Mixdown, App shell |
| 09 | `task-09-pattern-parser.md` | `parsePattern` / `serialisePattern` + tests |
| 10 | `task-10-song-editor-primitives.md` | All song-editor primitive components |
| 11 | `task-11-song-editor-screen.md` | SongEditor screen, tab cleanup, delete old screens |
| 12 | `task-12-smoke-test.md` | End-to-end verification |

## Dependency Graph

```
01 ──► 02 ──► 03 ──► 04
                │
                └──────────► 05 ──► 06 ──► 07 ──► 08
                                                    │
                             09 ──────────────────► 10 ──► 11 ──► 12
```

In plain English:
- Tasks 01 → 02 → 03 → 04 must run in order (each depends on the previous).
- Task 05 can start after task 03 (needs the new backend routes to exist).
- Tasks 06, 07, 08 chain off task 05.
- Task 09 (pattern parser) only needs task 05 for a clean build; can run immediately after.
- Task 10 needs tasks 06, 07, 09.
- Task 11 needs tasks 08 and 10.
- Task 12 is the final integration check — needs everything.

Since the orchestrator runs sequentially, the ordering above already satisfies all dependencies.

## Test Commands

```bash
pnpm -F server test   # Vitest, server/tests/**/*.test.ts
pnpm -F web test      # Vitest + jsdom, web/tests/**/*.test.{ts,tsx}
pnpm -F server build  # tsc — check server types
pnpm -F web build     # tsc + vite — check web types + bundle
```

## Key Files to Read Before Starting Any Task

- `/root/.claude/plans/we-now-have-some-peppy-finch.md` — the final resolved PRD
- `server/src/store/sections.ts` — existing store pattern (atomic writes, validation style)
- `server/src/routes/songform.ts` — existing REAPER write integration to preserve
- `web/src/store.ts` — existing Zustand store to refactor
- `web/src/api/client.ts` — existing types and API client to update
- `designs/Song Form Editor — Wireframes.html` — wireframe visual reference

## Open Questions / Decisions Already Made

All design decisions are resolved. See the "Decisions" section of the PRD. Key points:
1. One song per project; sections shared across all forms.
2. Legacy JSON renamed to `.legacy.json`; no migration.
3. Section delete auto-strips the letter from every form's pattern; surfaces a warning toast.
4. No drag-to-reorder in v1.
5. Backend keeps 25 full revision snapshots.
6. Hand-drawn theme applies to the whole app; light/dark toggle persisted in localStorage.
7. Note-type is stored and displayed; REAPER write payload continues to omit it (TODO comment in `flatten.ts`).
