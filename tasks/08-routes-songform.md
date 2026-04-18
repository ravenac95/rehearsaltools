# Task 08: Routes — /api/songform/write

## Dependencies
- 02-web-remote-client.md
- 03-osc-infra.md

## Goal

Rewire `POST /api/songform/write` so:

- The server pre-computes `startTime` from `webRemote.getTransport()` rather
  than letting the Lua handler call `get_cursor_position()`.
- The payload sent to `/rt/songform/write` includes `startTime`, `rows`, and
  the optional `regionName`.
- The server stores `currentTake = { startTime }` (no `regionId`).
- The `songform:written` websocket message carries `{ startTime, regionName? }`.

## Files

### Modify

- `server/src/routes/songform.ts`
- The songform route test file (find it alongside `regions.test.ts`)

## TDD steps

### 1. Update/create route tests

With fake `RtClient`, fake `WebRemoteClient`, a real `SectionsStore` backed by
a tmp file (or a minimal stub), a real `AppState`, and a recording `WsHub`:

- Populate the sections store so `flattenSongForm` returns 2+ rows.
- Stub `webRemote.getTransport()` to return `{ positionSeconds: 10, … }`.
- POST `/api/songform/write` with `{ regionName: "Take 1" }`.
- Assert:
  - `rt.send` was called with `("/rt/songform/write", { regionName: "Take 1", startTime: 10, rows: [...] })`.
  - `state.currentTake === { startTime: 10 }`.
  - `ws.broadcast` received `{ type: "songform:written", data: { startTime: 10, regionName: "Take 1" } }`.
  - HTTP response is `{ ok: true, startTime: 10 }`.
- Empty song form → 400 with "song form is empty …" (behaviour preserved).

### 2. Rewrite `songform.ts`

```ts
import type { RtClient } from "../osc/client.js";
import type { WebRemoteClient } from "../reaper/web-remote.js";

interface Deps {
  store: SectionsStore;
  rt: RtClient;
  webRemote: WebRemoteClient;
  state: AppState;
  ws: WsHub;
}

export default function songformRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { store, rt, webRemote, state, ws } = deps;

    app.get(/* unchanged */);
    app.put(/* unchanged */);

    app.post<{ Body: { regionName?: string } }>(
      "/api/songform/write",
      async (req, reply) => {
        const form = store.getSongForm();
        const sections = store.listSections();
        const rows = flattenSongForm(form, sections);
        if (rows.length === 0) {
          return reply.code(400).send({ ok: false, error: "song form is empty — add sections first" });
        }
        const regionName = req.body?.regionName?.trim() || undefined;

        const transport = await webRemote.getTransport();
        const startTime = transport.positionSeconds;

        await rt.send("/rt/songform/write", { regionName, rows, startTime });

        state.setTake({ startTime });
        ws.broadcast({
          type: "songform:written",
          data: { startTime, regionName },
        });

        return { ok: true, startTime };
      },
    );
  };
}
```

## Acceptance

- `pnpm -F server test -- routes/songform` passes.
- No import of `DispatcherClient` in `songform.ts`.
- `state.Take` is `{ startTime: number }` only (confirmed in task 03).

## Commit

```
refactor(server): pre-compute startTime in songform/write; drop regionId from take
```
