# Build Progress

## Status: EXECUTING

## Pipeline State
- BRAINSTORM: skipped
- DISCOVERY: complete
- USER_Q&A: complete
- GENERATE: complete
- TASK_REVIEW: complete
- EXECUTE: in-progress

## Tasks
1. 001-server-rehearsal-state — Wave 1 (parallel w/ 002, 004)
2. 002-server-songs-endpoint — Wave 1 (parallel w/ 001, 004)
3. 003-store-and-api-client — Wave 2 (after 001+002)
4. 004-css-migration — Wave 1 (parallel w/ 001, 002)
5. 005-delete-old-screens — Wave 3 (after 003+004)
6. 006-status-badge-and-header — Wave 4 (parallel w/ 007–011)
7. 007-transport-footer — Wave 4
8. 008-playback-drawer — Wave 4
9. 009-hamburger-menu — Wave 4
10. 010-bottom-sheets — Wave 4
11. 011-simple-song-view — Wave 4
12. 012-integration-and-cleanup — Wave 5 (after wave 4)

## Planner artifacts
- PRD (authoritative): `designs/2026-04-20/PRD-updated.md`
- Task index: `tasks/README.md`

## Notes
- Branch: claude/build-designs-fix-discussion-KriHD (designated by system)
- Auto-commit: enabled
- User clarifications:
  - Toggling discussion/take state via the status badge MUST NOT start a new discussion or take. It only changes the categorization of the currently-recorded time of the rehearsal.
  - The Advanced sections for Mixdowns and Regions should be IGNORED — do not implement them at all.

## Resolved planning questions
- Q1 — Take/discussion creation model: **Segment boundary model** (entry created on each category transition; total entries = transitions + 1).
- Q2 — Rehearsal lifecycle wiring: **New rehearsal endpoints** (`/api/rehearsal/start`, `/api/rehearsal/end`, `/api/rehearsal/set-category`) — server owns segment log, marker placement, metronome coordination.
- Q3 — Setlist: **Server-backed multi-song** (`/api/songs` list + `/api/songs/:id` select).
- Q4 — Existing screens: **Delete Dashboard, Regions, Mixdown** — remove old screens entirely; hamburger Advanced → Transport is rebuilt as a lightweight panel.
- Q5 — Rehearsal types: **Server config-driven** (`/api/rehearsal/types` served from `server/src/config.ts`; no OSC on change).
- Q6 — Metronome toggle: **Reflective (WS truth)** — button state always mirrors `store.transport.metronome` from WebSocket.
- Q7 — CSS strategy: **Replace `styles.css` entirely** — combine needed legacy rules with new tokens (DM Sans, Caveat, `--green`, `--amber`), drop dead rules.
- Q8 — Elapsed time source: **Reaper position minus open-marker time** — read `store.transport.position` and subtract current segment's start-marker position.
- Q9 — TDD: **Full TDD** — failing tests first for every functional task (store slices, state machine, component render behavior).
