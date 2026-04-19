# Task 04: Backend test suite for song store, revisions, and flatten

## Objective

Add `server/tests/song.test.ts`, `server/tests/revisions.test.ts`, and `server/tests/flatten.test.ts`; delete the now-superseded `sections.test.ts` and `songform.test.ts`.

## Dependencies

- task-01-backend-types-and-song-store
- task-02-backend-flatten-module
- task-03-backend-routes-and-wiring

## Files

- **Create** `server/tests/song.test.ts`
- **Create** `server/tests/revisions.test.ts`
- **Create** `server/tests/flatten.test.ts`
- **Delete** `server/tests/sections.test.ts`
- **Delete** `server/tests/songform.test.ts`

## Context

Test framework: Vitest. Tests live in `server/tests/`. Test command: `pnpm -F server test`.

Look at `server/tests/sections.test.ts` for the pattern: `beforeEach` creates a temp dir with `fs.mkdtemp`, constructs a fresh store, calls `store.load()`, and runs assertions. Copy this setup for the new tests.

Look at `server/tests/songform.test.ts` for the route-level test pattern: creates a Fastify instance with injected stubs for `rt`, `webRemote`, `ws`, and `state`, then uses `app.inject()`.

## TDD Mode

These tests should be written to verify the already-implemented store and routes. Since this task follows tasks 01–03, write tests that confirm the actual behaviour of the code produced there. Run `pnpm -F server test` after writing each test file.

## Requirements

### `server/tests/song.test.ts` — SongStore CRUD and validation

```
describe("SongStore — fresh-start / migration")
  it("initialises empty song when no file exists")
  it("renames legacy file to .legacy.json and starts fresh")
  it("reloads correctly from a valid new-shape file")

describe("SongStore — upsertSection")
  it("creates a new section")
  it("replaces an existing section by letter")
  it("rejects invalid letter (not /^[A-Z]/)")
  it("rejects stanza with bars < 1")
  it("rejects stanza with bpm out of range")
  it("rejects stanza with invalid denom")
  it("rejects stanza with invalid note value")

describe("SongStore — deleteSection")
  it("removes the section")
  it("strips the letter from all form patterns and returns affectedForms")
  it("returns empty affectedForms when no forms reference the letter")

describe("SongStore — SongForm CRUD")
  it("createSongForm auto-names with the next available integer")
  it("updateSongForm patches name, bpm, pattern")
  it("deleteSongForm removes the form")

describe("SongStore — validation")
  it("validateStanza rejects non-power-of-two denom")
  it("validateStanza accepts all valid NoteValues")
  it("validateSection rejects multi-char letter")
```

### `server/tests/revisions.test.ts` — revision ring

```
describe("Revision history")
  it("appends a revision on every mutation")
  it("revisions are newest-first")
  it("trims revisions to 25 after 30 mutations")
  it("persists revisions across store reload")
  it("getRevision returns the full snapshot")
  it("restoreRevision replaces song with snapshot")
  it("restoreRevision appends a new revision with reason 'restore'")
```

For the "trims to 25" test, call `store.updateSong({ name: `r-${i}` })` 30 times in a loop.

### `server/tests/flatten.test.ts` — flattenForm

```
describe("flattenForm")
  it("returns empty result for empty pattern")
  it("produces correct barOffsets across sections")
  it("collapses consecutive stanzas with identical num/denom/bpm")
  it("does not collapse stanzas that differ in bpm only")
  it("BPM inheritance: stanza > section > form")
  it("note inheritance: stanza > section > form (in effectiveNotes)")
  it("rows never contain a note field")
  it("totalBars sums correctly including pattern repeats")
  it("throws when a letter in pattern has no matching section")
  it("throws when formId is not found")
```

For the "barOffset" test, create a `Song` object inline (no store needed — `flattenForm` is a pure function):

```ts
const song: Song = {
  id: "s1", name: "Test", activeFormId: "f1",
  sections: [
    { letter: "A", stanzas: [{ bars: 8, num: 4, denom: 4 }, { bars: 4, num: 6, denom: 8 }] },
    { letter: "B", stanzas: [{ bars: 16, num: 4, denom: 4 }] },
  ],
  songForms: [{
    id: "f1", name: "1", bpm: 80, note: "q",
    pattern: ["A", "B", "A"],
  }],
};
const result = flattenForm(song, "f1");
// A: stanza[0] at bar 0 (4/4 @80), stanza[1] at bar 8 (6/8 @80)
// B: 4/4 @80 — differs from A's last (6/8), new marker at bar 12
// A (2nd): stanza[0] 4/4@80 — differs from B's 4/4@80? No, same. Collapsed.
//          stanza[1] 6/8@80 — differs, marker at bar 36
expect(result.rows.map(r => r.barOffset)).toEqual([0, 8, 12, 36]);
expect(result.totalBars).toBe(8 + 4 + 16 + 8 + 4); // = 40
```

### Route test for write endpoint

Add a `describe("POST /api/song/forms/:id/write")` in `server/tests/song.test.ts` or a separate file that:
- Sets up a Fastify app with `songRoutes` (using stubbed `rt`, `webRemote`, `ws`, `state` exactly as `songform.test.ts` did)
- Verifies `rt.send("songform.write", ...)` is called with `rows`, `startTime`, and `regionName`
- Verifies 400 when the pattern is empty

## Existing Code References

- `server/tests/sections.test.ts` — store test setup pattern (beforeEach + tmpFile + mkdtemp)
- `server/tests/songform.test.ts` — route test stub pattern (`buildApp`, `app.inject()`)
- `server/src/store/song.ts` (task-01) — types and class to test
- `server/src/flatten.ts` (task-02) — pure function to test
- `server/src/routes/song.ts` (task-03) — routes to test

## Acceptance Criteria

- [ ] `pnpm -F server test` — all new tests pass, zero failures.
- [ ] `sections.test.ts` and `songform.test.ts` are deleted.
- [ ] Fresh-start test: store initialises with empty song when no file exists.
- [ ] Legacy migration test: file with `sections` key is renamed and fresh song is created.
- [ ] Revision trim test: 30 mutations → only 25 revisions remain.
- [ ] Flatten collapse test: identical consecutive stanzas produce one marker.
- [ ] Write endpoint test: `rt.send` receives correct payload matching REAPER contract.
