# Task 01: Add SongStore with revision history, replacing SectionsStore

## Objective

Create `server/src/store/song.ts` — the new persistent store with the Song/Section/SongForm/Stanza data model and a 25-revision ring buffer.

## Dependencies

None

## Files

- **Create** `server/src/store/song.ts`

## Context

The existing store lives at `server/src/store/sections.ts` and uses an atomic-write pattern (write to `.tmp`, then `fs.rename`). The new store must replicate this pattern exactly.

Read `server/src/store/sections.ts` before starting — copy the `ensureLoaded()` guard, the `persist()` method structure, and the `ENOENT`-handling in `load()`. The test framework is Vitest (`pnpm -F server test`), tests live in `server/tests/`.

The data file path comes from `config.dataFile` (default `./data/rehearsaltools.json`).

## Requirements

### TypeScript types (export from this file)

```ts
export type NoteValue = "w" | "h" | "q" | "e" | "s";

export interface Stanza {
  bars: number;        // >= 1
  num: number;         // 1-64
  denom: number;       // 1, 2, 4, 8, 16, 32, 64 (powers of 2)
  bpm?: number;        // 20-999 if set; overrides section tempo
  note?: NoteValue;    // overrides section note if set
}

export interface Section {
  letter: string;      // single char matching /^[A-Z]$/
  stanzas: Stanza[];
  bpm?: number;        // overrides form tempo if set
  note?: NoteValue;    // overrides form note if set
}

export interface SongForm {
  id: string;
  name: string;        // default "1", "2", ... (editable)
  bpm: number;         // default tempo (20-999)
  note: NoteValue;     // default note-type, defaults to "q"
  pattern: string[];   // flat, explicit list of section letters e.g. ["A","A","B"]
}

export interface Song {
  id: string;
  name: string;
  sections: Section[];
  songForms: SongForm[];
  activeFormId: string | null;
}

export interface Revision {
  id: string;
  at: string;          // ISO-8601
  reason: string;      // e.g. "write", "restore", "upsertSection" etc.
  song: Song;
}

export interface StoreShape {
  song: Song;
  revisions: Revision[];
}
```

### Fresh-start / migration

In `load()`, after reading the file:
- If the file does not exist (`ENOENT`): initialise with an empty song (see "Empty song" below).
- If the file exists but does NOT have a top-level `song` key (i.e. it is the legacy `{sections, songForm}` shape): rename it to `<filePath>.legacy.json` (once, using `fs.rename`), then initialise with an empty song and immediately persist.
- If the file exists and has a `song` key: load normally.

**Empty song** factory:
```ts
function emptySong(): Song {
  const formId = randomUUID();
  return {
    id: randomUUID(),
    name: "Untitled",
    sections: [],
    songForms: [{ id: formId, name: "1", bpm: 100, note: "q", pattern: [] }],
    activeFormId: formId,
  };
}
```

### Validation helpers (export)

```ts
export function validateStanza(s: unknown, idx: number): Stanza
export function validateSection(s: unknown): { letter: string; stanzas: Stanza[]; bpm?: number; note?: NoteValue }
```

Rules:
- `bars`: positive integer >= 1
- `num`: integer 1–64
- `denom`: must be in `[1,2,4,8,16,32,64]`
- `bpm` (when present): number 20–999
- `note` (when present): one of `["w","h","q","e","s"]`
- `letter`: string matching `/^[A-Z]$/`
- `stanzas`: non-empty array

### SongStore class

```ts
export class SongStore {
  constructor(private filePath: string) {}
  async load(): Promise<void>

  // Reads
  getSong(): Song
  listRevisions(): Array<{ id: string; at: string; reason: string }>
  getRevision(id: string): Revision | undefined

  // Song-level mutations
  async updateSong(partial: Partial<Pick<Song, "name" | "activeFormId">>): Promise<Song>

  // SongForm mutations
  async createSongForm(): Promise<SongForm>      // auto-name = next integer
  async updateSongForm(id: string, partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>): Promise<SongForm>
  async deleteSongForm(id: string): Promise<void>
  async setActiveFormId(id: string): Promise<Song>

  // Section mutations
  async upsertSection(letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue): Promise<Section>
  async deleteSection(letter: string): Promise<{ affectedForms: string[] }>
    // affectedForms = names of forms that had the letter stripped from their pattern

  // Revision operations
  async restoreRevision(id: string): Promise<Song>
}
```

### Revision capture

Every mutating method must, before persisting:
1. Snapshot the current `song` into a `Revision` object: `{ id: randomUUID(), at: new Date().toISOString(), reason: <methodName>, song: deepCopy(this.data.song) }`.
2. Prepend the revision to `this.data.revisions` (newest first).
3. Trim `this.data.revisions` to 25 entries.
4. Persist the entire `StoreShape` atomically.

### deleteSection behaviour

- Remove the section with `letter` from `song.sections`.
- For each `SongForm`, filter out all occurrences of `letter` from `pattern`.
- Collect the `name` of each form whose pattern was actually changed.
- Return `{ affectedForms: string[] }`.

### createSongForm auto-name

Auto-name = smallest positive integer (as string) not already used as a `name` among existing forms.

### Persistence

Same atomic-write as existing store:
```ts
private async persist(): Promise<void> {
  await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  const tmp = this.filePath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
  await fs.rename(tmp, this.filePath);
}
```

## Existing Code References

- `server/src/store/sections.ts` — copy the `load()`/`persist()`/`ensureLoaded()` pattern verbatim (just update to the new shape)
- `server/src/config.ts` — `dataFile` field shows path
- `server/tests/sections.test.ts` — example test style (Vitest, tmp dirs, `beforeEach`)

## Implementation Details

1. Import `{ promises as fs }` from `"node:fs"`, `path` from `"node:path"`, `{ randomUUID }` from `"node:crypto"`.
2. Use ESM `.js` extension on all local imports (existing pattern).
3. `deepCopy(obj)` can be `JSON.parse(JSON.stringify(obj))`.
4. Do NOT import from `store/sections.ts` — this file fully replaces it.
5. The reason string for each mutation can be the method name (e.g. `"upsertSection"`, `"deleteSongForm"`, `"restoreRevision"`).

## Acceptance Criteria

- [ ] `server/src/store/song.ts` exists and compiles (`pnpm -F server build`).
- [ ] All exported types are correct and match the PRD data model.
- [ ] `load()` with no file creates an empty-song shape and persists it.
- [ ] `load()` with a legacy file (has `sections` key but no `song` key) renames to `.legacy.json` and starts fresh.
- [ ] `load()` with a valid new-shape file reloads correctly.
- [ ] `upsertSection` creates or replaces a section by letter.
- [ ] `deleteSection` strips the letter from all form patterns and returns the affected form names.
- [ ] Every mutation appends a revision; revisions are trimmed to 25.
- [ ] `restoreRevision` replaces `song` and appends a new `"restore"` revision.
- [ ] `createSongForm` auto-names using the smallest available integer string.
- [ ] Existing server tests still pass (they do not import this file yet).
