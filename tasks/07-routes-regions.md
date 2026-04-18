# Task 07: Routes — /api/regions and /api/playhead/end

## Dependencies
- 02-web-remote-client.md
- 03-osc-infra.md

## Goal

Rewire `server/src/routes/regions.ts` so:

- `GET  /api/regions`         → read-only via `WebRemoteClient.listRegions()`.
- `POST /api/regions`         → fire `/rt/region/new` via `RtClient`, then
                                refetch `listRegions()` and return the region
                                with the **highest** id (the one REAPER just
                                created — REAPER assigns monotonically).
- `PATCH /api/regions/:id`    → fire `/rt/region/rename`, then refetch and
                                return the row whose id equals the URL param.
- `POST /api/regions/:id/play`→ fire `/rt/region/play` (no refetch).
- `POST /api/playhead/end`    → fire `/rt/playhead/end`, then refetch
                                `getTransport()` and return `{ position: transport.positionSeconds }`.

## Files

### Modify

- `server/src/routes/regions.ts`
- `server/src/routes/regions.test.ts` (or the existing test file — check the
  path; the test folder may be `server/src/routes/__tests__/` or similar)

## TDD steps

### 1. Update/create route tests

Inject fake `RtClient` and `WebRemoteClient` stubs:

```ts
const rtCalls: Array<[string, unknown]> = [];
const rt = { send: (addr: string, payload: unknown) => { rtCalls.push([addr, payload]); return Promise.resolve(); } };

let regions: RegionRow[] = [];
const webRemote = {
  listRegions: async () => regions,
  getTransport: async () => ({ positionSeconds: 42.0, /* … */ }),
};
```

Cases:

- `GET /api/regions` when `webRemote.listRegions` returns 2 rows → response
  is `{ ok: true, regions: [...] }`.
- `POST /api/regions` with `{ name: "intro" }`:
  - `rtCalls` contains `["/rt/region/new", { name: "intro" }]`.
  - Before the POST returns, the test stub swaps `regions` to include a new
    row `{ id: 5, name: "intro", … }` (simulates REAPER's side-effect).
  - Response is `{ ok: true, region: { id: 5, name: "intro", … } }` — the
    highest-id row.
  - Edge: if `listRegions()` returns empty after the trigger, respond 502
    with `{ ok: false, error: "region not found after creation" }`.
- `PATCH /api/regions/3` with `{ name: "verse" }`:
  - `rtCalls` contains `["/rt/region/rename", { id: 3, name: "verse" }]`.
  - Stub updates `regions` to reflect the rename.
  - Response returns the row with `id === 3`.
  - Edge: if that row is missing in the refetch, respond 502.
- `POST /api/regions/7/play`: `rtCalls` contains
  `["/rt/region/play", { id: 7 }]`; response is `{ ok: true }` (no refetch).
- `POST /api/playhead/end`: `rtCalls` contains `["/rt/playhead/end", {}]`;
  response is `{ ok: true, position: 42.0 }`.

### 2. Rewrite `regions.ts`

```ts
import type { RtClient } from "../osc/client.js";
import type { WebRemoteClient } from "../reaper/web-remote.js";

interface Deps {
  rt: RtClient;
  webRemote: WebRemoteClient;
}

export default function regionsRoutes({ rt, webRemote }: Deps) {
  return async function (app: FastifyInstance) {
    app.get("/api/regions", async () => {
      const regions = await webRemote.listRegions();
      return { ok: true, regions };
    });

    app.post<{ Body: { name?: string } }>("/api/regions", async (_req, reply) => {
      const name = _req.body?.name ?? "";
      await rt.send("/rt/region/new", { name });
      const regions = await webRemote.listRegions();
      const region = regions.reduce<RegionRow | undefined>(
        (best, r) => (best === undefined || r.id > best.id ? r : best),
        undefined,
      );
      if (!region) {
        return reply.code(502).send({ ok: false, error: "region not found after creation" });
      }
      return { ok: true, region };
    });

    app.patch<{ Params: { id: string }; Body: { name: string } }>(
      "/api/regions/:id",
      async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return reply.code(400).send({ ok: false, error: "id must be a number" });
        }
        const name = req.body?.name;
        if (typeof name !== "string" || name.length === 0) {
          return reply.code(400).send({ ok: false, error: "name required" });
        }
        await rt.send("/rt/region/rename", { id, name });
        const region = (await webRemote.listRegions()).find((r) => r.id === id);
        if (!region) {
          return reply.code(502).send({ ok: false, error: "region not found after rename" });
        }
        return { ok: true, region };
      },
    );

    app.post<{ Params: { id: string } }>("/api/regions/:id/play", async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return reply.code(400).send({ ok: false, error: "id must be a number" });
      }
      await rt.send("/rt/region/play", { id });
      return { ok: true };
    });

    app.post("/api/playhead/end", async () => {
      await rt.send("/rt/playhead/end", {});
      const transport = await webRemote.getTransport();
      return { ok: true, position: transport.positionSeconds };
    });
  };
}
```

## Non-goals

- Do NOT touch `index.ts` — task 10 wires the new `{ rt, webRemote }` deps.

## Acceptance

- `pnpm -F server test -- routes/regions` passes.
- No import of `DispatcherClient` in `regions.ts`.

## Commit

```
refactor(server): move regions routes to RtClient + WebRemoteClient
```
