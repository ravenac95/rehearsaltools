// server/src/routes/regions.ts
// Regions CRUD + playback + seek-to-end.
// Reads via WebRemoteClient; writes via RtClient fire-and-forget.

import type { FastifyInstance } from "fastify";
import type { RtClient } from "../osc/client.js";
import type { WebRemoteClient, RegionRow } from "../reaper/web-remote.js";

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
      const before = await webRemote.listRegions();
      const prevMaxId = before.reduce((m, r) => Math.max(m, r.id), -1);

      await rt.send("/rt/region/new", { name });

      // REAPER processes the OSC command asynchronously; retry the refetch
      // a few times to give it a chance to create the region.
      let region: RegionRow | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 50));
        const after = await webRemote.listRegions();
        region = after.reduce<RegionRow | undefined>(
          (best, r) => r.id > prevMaxId && (best === undefined || r.id > best.id) ? r : best,
          undefined,
        );
        if (region) break;
      }
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
