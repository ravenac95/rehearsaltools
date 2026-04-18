// server/src/routes/project.ts
// Project-level operations that go through the custom dispatcher.

import type { FastifyInstance } from "fastify";
import type { DispatcherClient } from "../osc/commands.js";

export default function projectRoutes(dispatcher: DispatcherClient) {
  return async function (app: FastifyInstance) {
    app.post("/api/project/new", async () => {
      await dispatcher.request("/rt/project/new");
      return { ok: true };
    });
  };
}
