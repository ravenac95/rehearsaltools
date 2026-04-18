# Task 05: SPA — drop `regionId` from `currentTake`

## Dependencies
None.

## Goal

The server will stop returning `regionId` with the "current take" (task 08),
so the SPA must drop the field from its type, store reducer, and UI copy.

## Files

### Modify

- `web/src/api/client.ts`
- `web/src/store.ts`
- `web/src/screens/Dashboard.tsx`

## Changes

### `web/src/api/client.ts`

- Line 21: change `export interface Take { regionId: number; startTime: number; }`
  to `export interface Take { startTime: number; }`.
- Line 81: `req<{ regionId: number; startTime: number }>("/api/songform/write", …)` →
  `req<{ startTime: number }>("/api/songform/write", …)`.
- Line 94: `{ type: "songform:written"; data: { regionId: number; startTime: number; regionName?: string } }` →
  `{ type: "songform:written"; data: { startTime: number; regionName?: string } }`.

### `web/src/store.ts`

- Lines 87–88: the `songform:written` handler currently sets
  `{ currentTake: { regionId: d.regionId, startTime: d.startTime } }`. Change
  to `{ currentTake: { startTime: d.startTime } }`. Drop the
  `{ regionId: number; startTime: number }` type annotation on `d` — use the
  new `Take` shape.

### `web/src/screens/Dashboard.tsx`

- Line 51: `Current take: region #{currentTake.regionId}, starts at {currentTake.startTime.toFixed(2)}s`
  → `Current take: starts at {currentTake.startTime.toFixed(2)}s`.

## TDD

The web package uses vitest (check `web/vitest.config.ts` if present). If
there are existing store tests, update them to reflect the new `Take` shape.
If there are no tests, do not add a new suite for this — the type system +
tsc catches the field removal, and the UI change is a single-line copy edit.

## Acceptance

- `pnpm -F web build` (or `pnpm -F web typecheck` if present) passes.
- No file in `web/src/` references `regionId` except transitory OSC event
  payloads from REAPER (none should exist — search confirms).

## Commit

```
refactor(web): drop regionId from currentTake
```
