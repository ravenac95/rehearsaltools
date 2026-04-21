# Task 002: Server — Songs List Endpoint

## Objective

Add `GET /api/songs` and `POST /api/songs/:id/select` to the server so the frontend can display a setlist and switch the active song. For MVP, the list is derived from the single song in `SongStore`; multi-song support is a future concern.

## Context

The server is a Fastify app. `SongStore` in `/home/user/rehearsaltools/server/src/store/song.ts` manages a single `Song` document with `id`, `name`, `sections`, `songForms`, and `activeFormId`. The existing `GET /api/song` returns the full song object. The new endpoints return a lightweight list format and allow selection.

The new route module follows the pattern in `server/src/routes/song.ts` — a factory function taking a deps object and returning `async (app: FastifyInstance) => void`.

## Requirements

### New file: `server/src/routes/songs.ts`

**`GET /api/songs`**
- Derive list from `store.getSong()`
- Response:
  ```json
  { "ok": true, "songs": [{ "id": "...", "name": "...", "bpm": 120, "timeSig": "4/4" }] }
  ```
- `bpm` = `activeForm.bpm` (or first form's bpm, or 0 if no forms)
- `timeSig` = `"${num}/${denom}"` from the first stanza of the first section of the active form pattern, or `"4/4"` if no sections
- Deps: `{ store: SongStore }`

**`POST /api/songs/:id/select`**
- If `:id` matches `store.getSong().id`, return `{ ok: true, song: store.getSong() }` (no-op, already active)
- If `:id` does not match, return 404 `{ ok: false, error: 'song not found' }` (MVP: only one song exists)
- Deps: `{ store: SongStore }`

### `server/src/index.ts`
- Import and register the new `songsRoutes` module with `{ store }`

## Existing Code References

- `/home/user/rehearsaltools/server/src/routes/song.ts` — pattern to follow
- `/home/user/rehearsaltools/server/src/store/song.ts` — `SongStore.getSong()` interface
- `/home/user/rehearsaltools/server/src/index.ts` — registration point

## Implementation Details

- Keep the route file small — no new store methods needed
- The `timeSig` derivation: find `activeFormId` in song, find first letter in form's pattern, find that section, take `stanzas[0].num` / `stanzas[0].denom`; fallback to `"4/4"` at each step if missing

## Acceptance Criteria

- [ ] `GET /api/songs` returns an array with at least the current song
- [ ] `GET /api/songs` response includes `bpm` and `timeSig` fields
- [ ] `POST /api/songs/:id/select` with matching ID returns 200 with the song
- [ ] `POST /api/songs/:id/select` with unknown ID returns 404
- [ ] Existing tests still pass
- [ ] TypeScript compiles without errors

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/server/tests/songs.test.ts`
- **Test framework:** Vitest with Fastify `inject()` (same setup as task 001)
- **Test command:** Same as task 001

### Tests to Write

1. **`GET /api/songs` returns song list**: array contains one item with `id`, `name`, `bpm`, `timeSig`
2. **`GET /api/songs` timeSig fallback**: when song has no sections, returns `"4/4"`
3. **`POST /api/songs/:id/select` matching id**: 200 with song object
4. **`POST /api/songs/:id/select` unknown id**: 404

### TDD Process

1. Write failing tests first
2. Implement to make them pass
3. Run full suite, no regressions

## Dependencies

- Depends on: None (can start immediately)
- Blocks: 003 (api client extension references these endpoints)

## Parallelism

Can run in parallel with: 001 (rehearsal state), 004 (CSS migration)
