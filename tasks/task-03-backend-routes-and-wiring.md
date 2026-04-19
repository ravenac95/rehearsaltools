# Task 03: New song routes, update ws.ts and index.ts, delete old route/store files

## Objective

Replace the old sections and songform routes with a single `server/src/routes/song.ts`, update the WebSocket snapshot, wire everything into `index.ts`, and delete the superseded files.

## Dependencies

- task-01-backend-types-and-song-store
- task-02-backend-flatten-module

## Files

- **Create** `server/src/routes/song.ts`
- **Modify** `server/src/ws.ts`
- **Modify** `server/src/index.ts`
- **Delete** `server/src/routes/sections.ts`
- **Delete** `server/src/routes/songform.ts`
- **Delete** `server/src/store/sections.ts` (after confirming no remaining imports)

## Context

Read the following files in full before starting:
- `server/src/routes/songform.ts` — the existing write route to preserve (REAPER integration pattern)
- `server/src/routes/sections.ts` — existing CRUD pattern for reference
- `server/src/ws.ts` — current WebSocket hub (snapshot payload to update)
- `server/src/index.ts` — current route registration to update

The route file follows the Fastify plugin pattern: a function that takes a `deps` object and returns an `async (app: FastifyInstance) => void`.

## Requirements

### `server/src/routes/song.ts`

```ts
interface Deps {
  store: SongStore;
  rt: RtClient;
  webRemote: WebRemoteClient;
  state: AppState;
  ws: WsHub;
}

export default function songRoutes(deps: Deps) {
  return async function(app: FastifyInstance) { ... }
}
```

Endpoints:

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/api/song` | Returns `{ ok: true, song: store.getSong() }` |
| `PUT` | `/api/song` | Patches `name` and/or `activeFormId`; calls `store.updateSong(body)`; returns `{ ok: true, song }` |
| `PUT` | `/api/song/sections/:letter` | Calls `store.upsertSection(letter, body.stanzas, body.bpm, body.note)`; wraps validation errors in 400; returns `{ ok: true, song: store.getSong() }` |
| `DELETE` | `/api/song/sections/:letter` | Calls `store.deleteSection(letter)`; returns `{ ok: true, song: store.getSong(), warning: <string or null> }` where warning is `"Removed <letter> from forms: <names>"` when `affectedForms` is non-empty, otherwise `null` |
| `POST` | `/api/song/forms` | Calls `store.createSongForm()`; returns `{ ok: true, song: store.getSong() }` |
| `PUT` | `/api/song/forms/:id` | Calls `store.updateSongForm(id, body)`; returns `{ ok: true, song: store.getSong() }` |
| `DELETE` | `/api/song/forms/:id` | Calls `store.deleteSongForm(id)`; returns `{ ok: true, song: store.getSong() }` |
| `POST` | `/api/song/forms/:id/write` | Flatten + send to REAPER (see below) |
| `GET` | `/api/song/revisions` | Returns `{ ok: true, revisions: store.listRevisions() }` (array of `{id, at, reason}`, no snapshots) |
| `GET` | `/api/song/revisions/:id` | Returns `{ ok: true, revision: store.getRevision(id) }` or 404 |
| `POST` | `/api/song/revisions/:id/restore` | Calls `store.restoreRevision(id)`, returns `{ ok: true, song }` or 404 |

#### `POST /api/song/forms/:id/write` — preserve the REAPER integration

This is the most important endpoint — it must preserve the existing REAPER contract exactly. Model it on the existing `POST /api/songform/write` in `server/src/routes/songform.ts`:

```ts
app.post<{ Params: { id: string }; Body: { regionName?: string } }>(
  "/api/song/forms/:id/write",
  async (req, reply) => {
    const song = store.getSong();
    const { rows, totalBars } = flattenForm(song, req.params.id);
    if (rows.length === 0) {
      return reply.code(400).send({ ok: false, error: "song form is empty — add sections first" });
    }
    const regionName = req.body?.regionName?.trim() || undefined;
    const transport = await webRemote.getTransport();
    const startTime = transport.positionSeconds;

    await rt.send("songform.write", { regionName, rows, startTime });

    state.setTake({ startTime });
    ws.broadcast({ type: "songform:written", data: { startTime, regionName } });

    return { ok: true, startTime, totalBars };
  },
);
```

Note: `flattenForm` is imported from `../flatten.js`.

#### Error handling pattern

For routes that may throw validation errors, wrap in try/catch and return 400:
```ts
try {
  // ... mutating call
} catch (err: any) {
  return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
}
```

### `server/src/ws.ts` — update snapshot payload

The snapshot sent on WebSocket connect currently includes `sections` and `songForm`. Change it so the snapshot is:

```ts
socket.send(JSON.stringify({
  type: "snapshot",
  data: {
    transport: state.transport,
    currentTake: state.currentTake,
    song: store.getSong(),
  },
}));
```

This requires passing `store` (the new `SongStore`) to wherever the `/ws` handler is registered.

### `server/src/index.ts` — update wiring

1. Replace `import { SectionsStore } from "./store/sections.js"` with `import { SongStore } from "./store/song.js"`.
2. Replace `new SectionsStore(config.dataFile)` with `new SongStore(config.dataFile)`.
3. Replace route registrations:
   - Remove: `await app.register(sectionsRoutes(store))`
   - Remove: `await app.register(songformRoutes({ store, rt, webRemote, state, ws }))`
   - Add: `await app.register(songRoutes({ store, rt, webRemote, state, ws }))`
4. Remove the old imports for `sectionsRoutes` and `songformRoutes`.
5. Add `import songRoutes from "./routes/song.js"`.
6. Update the `/ws` handler to pass `store` so the snapshot uses `store.getSong()`.

### Delete superseded files

After verifying no remaining imports point to them:
- Delete `server/src/routes/sections.ts`
- Delete `server/src/routes/songform.ts`
- Delete `server/src/store/sections.ts`

## Existing Code References

- `server/src/routes/songform.ts` — REAPER write pattern to replicate in the new write endpoint
- `server/src/routes/sections.ts` — CRUD pattern and error handling style
- `server/src/ws.ts` — snapshot broadcast; only the payload shape changes
- `server/src/index.ts` — full file; change store class, route registrations, and ws snapshot

## Acceptance Criteria

- [ ] `pnpm -F server build` succeeds with no TypeScript errors.
- [ ] `GET /api/song` returns `{ ok: true, song: { id, name, sections, songForms, activeFormId } }`.
- [ ] `PUT /api/song/sections/:letter` creates/updates a section; 400 on invalid stanza data.
- [ ] `DELETE /api/song/sections/:letter` returns `warning` string when forms are affected.
- [ ] `POST /api/song/forms/:id/write` calls `rt.send("songform.write", ...)` with `{ regionName, rows, startTime }` matching existing contract.
- [ ] `GET /api/song/revisions` returns list without full snapshots.
- [ ] WebSocket snapshot payload contains `song` (not `sections`/`songForm`).
- [ ] Old route files and `store/sections.ts` are deleted.
- [ ] No remaining imports reference the deleted files.
