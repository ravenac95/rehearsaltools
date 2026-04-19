# Task 02: Extract flatten module for the new Song/SongForm model

## Objective

Create `server/src/flatten.ts` — a pure function that flattens a `SongForm` within a `Song` into the `FlatRow[]` shape consumed by the REAPER write route.

## Dependencies

- task-01-backend-types-and-song-store (provides `Song`, `SongForm`, `Section`, `Stanza`, `NoteValue` types)

## Files

- **Create** `server/src/flatten.ts`

## Context

The existing `flattenSongForm` lives in `server/src/store/sections.ts`. The new version must handle the richer model: sections have `stanzas` (instead of `rows`), BPM can be overridden at three levels (stanza > section > form), and note-type follows the same inheritance chain but is **intentionally omitted from the REAPER payload** with a TODO comment.

The REAPER contract (`/rt/songform.write`) requires the same `FlatRow[]` shape as today: `{ barOffset, num, denom, bpm }[]`. No ReaScript changes.

Read `server/src/store/sections.ts` lines 173–229 to understand the existing flatten + collapse logic before rewriting it for the new model.

## Requirements

### Types

```ts
export interface FlatRow {
  barOffset: number;
  num: number;
  denom: number;
  bpm: number;
}

export interface FlatResult {
  rows: FlatRow[];             // REAPER payload — note-type intentionally omitted
  effectiveNotes: NoteValue[]; // one per FlatRow (for future UI use / debug)
  totalBars: number;
}
```

### Main export

```ts
export function flattenForm(song: Song, formId: string): FlatResult
```

Algorithm:

1. Find the `SongForm` with `id === formId`. Throw `Error("form not found: <formId>")` if missing.
2. For each `letter` in `form.pattern` (in order, repeats allowed):
   a. Find the `Section` in `song.sections` with `section.letter === letter`. Throw `Error("section not found: <letter>")` if missing.
   b. For each `stanza` in `section.stanzas`:
      - Compute `effectiveBpm = stanza.bpm ?? section.bpm ?? form.bpm`
      - Compute `effectiveNote: NoteValue = stanza.note ?? section.note ?? form.note`
      - Emit `stanza.bars` worth of raw data: `{ barOffset: cursor, num: stanza.num, denom: stanza.denom, bpm: effectiveBpm, note: effectiveNote }` (internal, before collapse). Advance `cursor += stanza.bars`.
3. Collapse consecutive raw rows where `num`, `denom`, and `bpm` are all identical — keep only the first of each run (same logic as existing `flattenSongForm`).
   - Note: collapse is on `{num, denom, bpm}` only — `note` does NOT affect collapse, since it is not in the REAPER payload.
4. Build `rows` (the REAPER payload) from collapsed entries: `{ barOffset, num, denom, bpm }` — **no `note` field**.
   - Add the TODO comment directly in the code at the point where `effectiveNote` is available but not forwarded:
     ```ts
     // TODO: send note-type to REAPER once ReaScript handler supports it
     // (see /rt/songform.write). effectiveNote is computed above.
     ```
5. Build `effectiveNotes` as one `NoteValue` per collapsed row (the `effectiveNote` of the first raw row in each collapsed run).
6. `totalBars` = sum of all `stanza.bars` across all pattern occurrences (before collapse).
7. Return `{ rows, effectiveNotes, totalBars }`.

### Edge cases

- Empty `form.pattern` → `{ rows: [], effectiveNotes: [], totalBars: 0 }`.
- A section with zero stanzas is legal (results in zero bars contributed — no marker emitted for that letter occurrence).

## Existing Code References

- `server/src/store/sections.ts` lines 173–229 — `flattenSongForm` and `totalBars` to reference for the collapse algorithm
- `server/src/store/song.ts` (task-01) — `Song`, `SongForm`, `Section`, `Stanza`, `NoteValue` types

## Implementation Details

- This file has zero side effects (no I/O, no imports from `store/sections.ts`).
- Import types from `./store/song.js` (ESM `.js` extension).
- The function is synchronous — no async needed.
- Keep the collapse logic identical to the existing `flattenSongForm` except it now keys on stanza-level fields after effective-BPM resolution.

## Acceptance Criteria

- [ ] `server/src/flatten.ts` exists and compiles (`pnpm -F server build`).
- [ ] Empty pattern returns `{ rows: [], effectiveNotes: [], totalBars: 0 }`.
- [ ] Consecutive stanzas with identical `{num, denom, effectiveBpm}` collapse to one row.
- [ ] BPM inheritance: stanza.bpm > section.bpm > form.bpm.
- [ ] Note inheritance: stanza.note > section.note > form.note (effectiveNotes array reflects this).
- [ ] `rows` never contain a `note` field; the TODO comment is present in the source.
- [ ] Pattern repeats (same letter appearing multiple times) are correctly expanded.
- [ ] `totalBars` equals the sum of stanza.bars across all pattern entries.
- [ ] Existing server tests still pass.
