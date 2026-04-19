# Task 05: Frontend types, Zustand store refactor, and API client update

## Objective

Replace the `sections`/`songForm` slices in `web/src/store.ts` and `web/src/api/client.ts` with a unified `song: Song` slice matching the new backend model.

## Dependencies

- task-03-backend-routes-and-wiring (the new `/api/song/*` endpoints must exist)

## Files

- **Modify** `web/src/api/client.ts`
- **Modify** `web/src/store.ts`
- **Modify** `web/tests/store.test.ts`

## Context

Read these files completely before starting:
- `web/src/api/client.ts` — current types and `api` object
- `web/src/store.ts` — current Zustand store
- `web/tests/store.test.ts` — current store tests (must be updated, not deleted)

The test framework is Vitest with jsdom. Test command: `pnpm -F web test`.

At this point `Sections.tsx` and `SongForm.tsx` still exist but will be deleted in task-11. They currently import from the store. They will break after this task — that is expected and acceptable because task-11 removes them. The screens `Dashboard.tsx`, `Regions.tsx`, and `Mixdown.tsx` use `useStore` for `transport`, `regions`, and `error` — those fields must be preserved.

## Requirements

### `web/src/api/client.ts` — new types and API methods

**Replace the old `Section`, `SongForm`, `SectionRow` types** with:

```ts
export type NoteValue = "w" | "h" | "q" | "e" | "s";

export interface Stanza {
  bars: number;
  num: number;
  denom: number;
  bpm?: number;
  note?: NoteValue;
}

export interface Section {
  letter: string;
  stanzas: Stanza[];
  bpm?: number;
  note?: NoteValue;
}

export interface SongForm {
  id: string;
  name: string;
  bpm: number;
  note: NoteValue;
  pattern: string[];
}

export interface Song {
  id: string;
  name: string;
  sections: Section[];
  songForms: SongForm[];
  activeFormId: string | null;
}
```

Keep existing types that are still used: `Region`, `TransportState`, `Take`.

**Replace the sections and songform API methods** with:

```ts
// Song
getSong: () => req<{ song: Song }>("/api/song"),
updateSong: (partial: Partial<Pick<Song, "name" | "activeFormId">>) =>
  req<{ song: Song }>("/api/song", { method: "PUT", body: JSON.stringify(partial) }),
upsertSection: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) =>
  req<{ song: Song }>(`/api/song/sections/${letter}`,
    { method: "PUT", body: JSON.stringify({ stanzas, bpm, note }) }),
deleteSection: (letter: string) =>
  req<{ song: Song; warning: string | null }>(`/api/song/sections/${letter}`,
    { method: "DELETE", body: JSON.stringify({}) }),
createForm: () =>
  req<{ song: Song }>("/api/song/forms", { method: "POST", body: JSON.stringify({}) }),
updateForm: (id: string, partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>) =>
  req<{ song: Song }>(`/api/song/forms/${id}`,
    { method: "PUT", body: JSON.stringify(partial) }),
deleteForm: (id: string) =>
  req<{ song: Song }>(`/api/song/forms/${id}`, { method: "DELETE", body: JSON.stringify({}) }),
writeActiveForm: (id: string, regionName?: string) =>
  req<{ ok: boolean; startTime: number }>(`/api/song/forms/${id}/write`,
    { method: "POST", body: JSON.stringify({ regionName }) }),
```

**Update the `WsMessage` type** — the snapshot type changes:

```ts
export type WsMessage =
  | { type: "snapshot"; data: { transport: Partial<TransportState>; currentTake: Take | null; song: Song } }
  | { type: "transport"; data: TransportState }
  | { type: "songform:written"; data: { startTime: number; regionName?: string } }
  | { type: string; data: unknown };
```

Keep `connectWs` unchanged.

### `web/src/store.ts` — new Zustand slice

Replace the `sections`, `songForm` fields with a single `song` field. Keep `transport`, `currentTake`, `regions`, `loading`, `error`.

```ts
import type { Song, SongForm, TransportState, Region, Take, WsMessage, NoteValue, Stanza } from "./api/client";

export interface AppStore {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  song: Song;
  regions: Region[];
  loading: boolean;
  error: string | null;
  toast: string | null;   // transient warning toast

  // Infrastructure
  refresh: () => Promise<void>;
  refreshRegions: () => Promise<void>;
  applyWsMessage: (msg: WsMessage) => void;
  setError: (err: string | null) => void;
  clearToast: () => void;

  // Song
  refreshSong: () => Promise<void>;
  updateSongName: (name: string) => Promise<void>;
  setActiveForm: (id: string) => Promise<void>;
  createForm: () => Promise<void>;
  updateForm: (id: string, partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  upsertSection: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) => Promise<void>;
  deleteSection: (letter: string) => Promise<void>;
  writeActiveForm: (regionName?: string) => Promise<void>;
}
```

**Empty song default** (used as initial state):
```ts
const EMPTY_SONG: Song = {
  id: "", name: "", sections: [], songForms: [], activeFormId: null,
};
```

**`refresh()`** — call `api.getSong()` and `api.listRegions()` in parallel; set `song` and `regions`.

**`applyWsMessage()`** — handle the new snapshot shape:
```ts
if (msg.type === "snapshot") {
  const d = msg.data as { transport?: Partial<TransportState>; currentTake: Take | null; song: Song };
  set({ transport: d.transport ?? {}, currentTake: d.currentTake, song: d.song });
}
```
Keep existing handling for `"transport"` and `"songform:written"`.

**`deleteSection()`** — after calling `api.deleteSection(letter)`, if `result.warning` is non-null, call `set({ toast: result.warning })`.

**`writeActiveForm()`** — use `song.activeFormId` from state; throw if null:
```ts
writeActiveForm: async (regionName) => {
  const { song } = get();
  if (!song.activeFormId) throw new Error("no active form");
  await api.writeActiveForm(song.activeFormId, regionName);
  await get().refreshRegions();
},
```

### `web/tests/store.test.ts` — update tests

Replace the three existing tests to cover the new shape:

1. `"transport message patches transport state"` — keep identical logic (no change needed).
2. `"songform:written sets currentTake"` — keep identical logic.
3. `"snapshot message populates the store"` — update to use the new snapshot shape with `song` key instead of `sections`/`songForm`:
   ```ts
   useStore.getState().applyWsMessage({
     type: "snapshot",
     data: {
       transport: { bpm: 100 },
       currentTake: null,
       song: {
         id: "s1", name: "T", sections: [], activeFormId: "f1",
         songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: [] }],
       },
     },
   } as any);
   expect(useStore.getState().song.id).toBe("s1");
   expect(useStore.getState().transport.bpm).toBe(100);
   ```

Add one more test:
4. `"deleteSection surfaces warning toast"` — mock `api.deleteSection` to return `{ ok: true, song: EMPTY_SONG, warning: "Removed A from forms: 1" }`, call `store.deleteSection("A")`, verify `useStore.getState().toast` equals the warning string.

## Existing Code References

- `web/src/api/client.ts` — full file, replace types and API methods
- `web/src/store.ts` — full file, replace sections/songForm with song
- `web/tests/store.test.ts` — update snapshot test and add toast test

## Acceptance Criteria

- [ ] `pnpm -F web test` — all store tests pass.
- [ ] `pnpm -F web build` — TypeScript compiles (Sections.tsx and SongForm.tsx import errors are acceptable at this stage since they will be replaced in task-11; comment out those imports in App.tsx temporarily if build fails).
- [ ] `AppStore` has `song: Song` (not `sections`/`songForm`).
- [ ] `api` object has `getSong`, `upsertSection`, `deleteSection`, `createForm`, `updateForm`, `deleteForm`, `writeActiveForm`.
- [ ] `WsMessage` snapshot type uses `song` key.
- [ ] `deleteSection` action sets `toast` when API returns a warning.
