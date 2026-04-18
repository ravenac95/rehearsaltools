// server/src/routes/project.ts
// Project-level operations using RtClient fire-and-forget.

import type { FastifyInstance } from "fastify";
import type { RtClient } from "../osc/client.js";

export default function projectRoutes(rt: RtClient) {
  return async function (app: FastifyInstance) {
    app.post("/api/project/new", async () => {
      await rt.send("/rt/project/new");
      return { ok: true };
    });
  };
}
