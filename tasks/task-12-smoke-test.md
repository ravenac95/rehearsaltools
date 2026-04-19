# Task 12: End-to-end smoke test verification

## Objective

Verify the full feature by running the automated test suites and executing a manual walkthrough checklist; fix any remaining integration issues discovered during verification.

## Dependencies

- task-01-backend-types-and-song-store
- task-02-backend-flatten-module
- task-03-backend-routes-and-wiring
- task-04-backend-tests
- task-05-frontend-types-store-api
- task-06-theme-system
- task-07-shared-ui-primitives
- task-08-retheme-existing-screens
- task-09-pattern-parser
- task-10-song-editor-primitives
- task-11-song-editor-screen

## Files

- No new files (this task is verification-only; fix any bugs found in existing files)

## Context

This task does not write new files — it runs the tests, checks the manual walkthrough criteria, and patches any issues. The focus is integration correctness, not adding new features.

## Automated Test Suite

Run both test suites and confirm zero failures:

```bash
pnpm -F server test
pnpm -F web test
```

If any test fails, identify the root cause and apply the minimal fix to the implementation file (not the test, unless the test itself was wrong).

## Manual Walkthrough Checklist

Start the development server (`pnpm dev` or `pnpm -F server dev` + `pnpm -F web dev`) and open in a browser at 375×812 (mobile viewport).

### 1. Navigation

- [ ] Four tabs visible: Transport, Song, Regions, Mixdown.
- [ ] No "Sections" tab present.
- [ ] `ThemeToggle` chip is visible in the top header on every screen.

### 2. Theme Toggle

- [ ] Fresh load in light-mode OS (or set `localStorage.setItem("rt-theme","light")`) → paper surface (`#fbf8f1` background), dark ink.
- [ ] Fresh load in dark-mode OS (or set `localStorage.setItem("rt-theme","dark")`) → night-paper surface, warm off-white ink.
- [ ] Tapping toggle in header cycles `Auto → Light → Dark → Auto`.
- [ ] Choice persists across page reload.
- [ ] Letter badges and accent colours remain readable in both modes.
- [ ] Fonts: Kalam/Caveat/JetBrains Mono load on all screens (check DevTools Network tab for Google Fonts requests).

### 3. Song Editor — basic flow

- [ ] Song tab opens; default song name shows in top editable field.
- [ ] Form "1" is shown as active in the tab strip.
- [ ] Pattern editor input is empty; `0 bars total` shown.
- [ ] Type `A B A` in the pattern editor → `A B A` pattern commits with no errors.
- [ ] Two section rows appear: `A` and `B` — each showing "— not defined yet" placeholder.
- [ ] Tap "+ Add section A" → section A appears with a default stanza (8 bars, 4/4).
- [ ] Tap "+ Add section B" → section B appears.
- [ ] Collapsed row shows the compact stanza strip with the `TimeSigStack`, bar count, and BPM.

### 4. Stanza editing

- [ ] Tap section row header → expands with TempoEditor and stanza list.
- [ ] Tap chevron again → collapses.
- [ ] Expand section A → tap stanza 1 → `StanzaExpanded` shows.
- [ ] Change bars to 16 → `16 bars total` updates for section A rows; total bar count updates.
- [ ] Change num to 3, denom to 8 → time sig updates in compact strip.
- [ ] Set a BPM override on stanza → value appears bold in compact strip.
- [ ] Click the `×` next to BPM override → override removed; value returns to faint (inherited).
- [ ] Tap `Duplicate` → a duplicate stanza appears below.
- [ ] Tap `Delete` on a stanza (when two exist) → stanza removed.

### 5. Multiple forms

- [ ] Tap `+` in form tabs → form "2" created; tab strip shows both.
- [ ] Form "2" is now active; pattern editor is empty.
- [ ] Type `A A B A C` in form "2" → pattern commits.
- [ ] Section C not yet defined → placeholder shows.
- [ ] Switch back to form "1" → its pattern is unchanged.

### 6. Section delete warning

- [ ] With both forms referencing letter `A` in their patterns, navigate to Song editor.
- [ ] In the section row for A (expanded), there is currently no direct "delete section" UI exposed at v1 — that's fine. But we can test via the API: `fetch("/api/song/sections/A", { method: "DELETE" })` in the browser console.
- [ ] Confirm toast appears: "Removed A from forms: 1, 2" (or similar).
- [ ] Toast auto-dismisses after ~4 seconds.
- [ ] Pattern in both forms no longer contains `A`.

### 7. Pattern validation

- [ ] Type `a b c` (lowercase) in the pattern editor → red border + error message shown.
- [ ] Type `AB C` → error for the multi-char token.
- [ ] Fix to `A B C` → border clears; pattern commits.

### 8. RUN button

- [ ] With a non-empty pattern and at least one section defined, RUN button is enabled.
- [ ] With empty pattern, RUN button is disabled.
- [ ] Tap RUN with REAPER not running → server returns an error; toast or error message shows.
- [ ] (If REAPER is available) Tap RUN → markers and region appear in project; revision is appended (`GET /api/song/revisions` in browser console shows a new entry).

### 9. Revision history

- [ ] `GET /api/song/revisions` returns an array, newest first.
- [ ] Make 30 mutations (rename song 30 times or update form BPM) → `GET /api/song/revisions` shows exactly 25 entries.
- [ ] `GET /api/song/revisions/:id` (pick an id from the list) → returns full `song` snapshot.
- [ ] `POST /api/song/revisions/:id/restore` → song reverts to that snapshot; new revision appended.

### 10. Fresh-start migration

- [ ] Stop the server.
- [ ] Check `./data/rehearsaltools.json`. If it contains the legacy `{sections, songForm}` shape, restart the server and confirm:
  - `rehearsaltools.legacy.json` now exists.
  - `rehearsaltools.json` contains the new `{song, revisions}` shape with an empty song.
- [ ] If the file already has the new shape, manually rename it to introduce the legacy shape and repeat.

### 11. WebSocket snapshot hydration

- [ ] Open the Song tab, then disconnect/reconnect the WebSocket (open DevTools → Network → WS → disconnect, or reload the page).
- [ ] Store hydrates correctly on reconnect — song data appears without a manual refresh.

### 12. Regression — other screens

- [ ] Transport tab: Play, Stop, Record, Seek to End all still work (or fail gracefully without REAPER).
- [ ] Regions tab: region list renders; Create Region, Rename, Play all work.
- [ ] Mixdown tab: Render button works (or fails gracefully without REAPER).

## Acceptance Criteria

- [ ] `pnpm -F server test` — zero failures.
- [ ] `pnpm -F web test` — zero failures.
- [ ] All manual checklist items above are confirmed.
- [ ] No TypeScript errors in `pnpm -F server build` or `pnpm -F web build`.
