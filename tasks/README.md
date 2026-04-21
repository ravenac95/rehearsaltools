# Rehearsal Flow Redesign — Task Queue

These files are prompts for AI agent execution. Delete each file after its task is completed. When all files are deleted, the feature is complete.

## Summary

Redesign of the RehearsalTools SPA from a four-tab layout (Transport/Song/Regions/Mixdown) to a single-screen, rehearsal-centric app with a linear rehearsal flow (start → take/discussion → end), a slide-up playback drawer, and a hamburger menu. New server endpoints manage rehearsal segment lifecycle. CSS design tokens are updated.

## Task List (in execution order)

| File | Title | Wave | Parallelism |
|------|-------|------|-------------|
| `001-server-rehearsal-state.md` | Server rehearsal endpoints + AppState | 1 | parallel with 002, 004 |
| `002-server-songs-endpoint.md` | Server songs list endpoints | 1 | parallel with 001, 004 |
| `003-store-and-api-client.md` | Frontend store + API client extension | 2 | after 001+002; blocks 005–011 |
| `004-css-migration.md` | Replace styles.css with new token system | 1 | parallel with 001, 002 |
| `005-delete-old-screens.md` | Delete Dashboard/Regions/Mixdown; rewrite App.tsx | 3 | after 003+004 |
| `006-status-badge-and-header.md` | RehearsalHeader + StatusBadge components | 4 | parallel with 007–011 |
| `007-transport-footer.md` | TransportFooter component | 4 | parallel with 006, 008–011 |
| `008-playback-drawer.md` | PlaybackDrawer component | 4 | parallel with 006–007, 009–011 |
| `009-hamburger-menu.md` | HamburgerMenu component | 4 | parallel with 006–008, 010–011 |
| `010-bottom-sheets.md` | SongPickerSheet + RehearsalTypeSheet | 4 | parallel with 006–009, 011 |
| `011-simple-song-view.md` | SimpleSongView component | 4 | parallel with 006–010 |
| `012-integration-and-cleanup.md` | Integration, barrel exports, final cleanup | 5 | after all of wave 4 |

## Dependency Graph

```
         ┌─ 001 ─┐
Wave 1 ──┤        ├──► Wave 2: 003 ──► Wave 3: 005 ──► Wave 4: 006
         └─ 002 ─┘                                              007
         └─ 004 ─┘                                              008
                                                                009
                                                                010
                                                                011
                                                          └────────► Wave 5: 012
```

## Execution Notes

- **TDD:** Every task in waves 1–4 has a TDD section. Write the failing tests FIRST, then implement.
- **Test command (frontend):** `pnpm -F web test` (Vitest 2.x, jsdom, `web/tests/`)
- **Test command (server):** Check `server/package.json` — task 001 establishes the server test runner
- **Build verification:** `pnpm -F web build` must pass at end of task 012
- **Preserved files:** `tasks/BUILD_PROGRESS.md` and `tasks/planning-questions.md` — do NOT delete these
- **PRD reference:** `designs/2026-04-20/PRD-updated.md`
- **Design prototype:** `designs/2026-04-20/Rehearsal Flow.html`, `designs/2026-04-20/app.jsx`, `designs/2026-04-20/components.jsx`

## What NOT to implement

- Mixdown or Regions features (Advanced menu stubs only)
- Full multi-song persistence (song list MVP = single song from SongStore)
- OSC events on rehearsal type change
- Storybook stories for new rehearsal components
