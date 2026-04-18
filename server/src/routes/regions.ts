// server/src/routes/regions.ts
// Regions CRUD + playback + seek-to-end.

import type { FastifyInstance } from "fastify";
import type { DispatcherClient } from "../osc/commands.js";

export default function regionsRoutes(dispatcher: DispatcherClient) {
  return async function (app: FastifyInstance) {
    app.get("/api/regions", async () => {
      const data = await dispatcher.request<{ regions: unknown[] }>("/rt/region/list");
      return { ok: true, ...data };
    });

    app.post<{ Body: { name?: string } }>("/api/regions", async (req) => {
      const { name } = req.body ?? {};
      const data = await dispatcher.request("/rt/region/new", { name: name ?? "" });
      return { ok: true, region: data };
    });

    app.patch<{ Params: { id: string }; Body: { name: string } }>(
      "/api/regions/:id",
      async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return reply.code(400).send({ ok: false, error: "id must be a number" });
        }
        const { name } = req.body ?? ({} as any);
        if (typeof name !== "string" || name.length === 0) {
          return reply.code(400).send({ ok: false, error: "name required" });
        }
        const data = await dispatcher.request("/rt/region/rename", { id, name });
        return { ok: true, region: data };
      },
    );

    app.post<{ Params: { id: string } }>("/api/regions/:id/play", async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return reply.code(400).send({ ok: false, error: "id must be a number" });
      }
      const data = await dispatcher.request("/rt/region/play", { id });
      return { ok: true, ...(data as object) };
    });

    app.post("/api/playhead/end", async () => {
      const data = await dispatcher.request<{ position: number }>("/rt/playhead/end");
      return { ok: true, ...data };
    });
  };
}
