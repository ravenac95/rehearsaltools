// server/src/routes/mixdown.ts

import type { FastifyInstance } from "fastify";
import type { DispatcherClient } from "../osc/commands.js";

export default function mixdownRoutes(dispatcher: DispatcherClient) {
  return async function (app: FastifyInstance) {
    app.post<{ Body: { output_dir?: string } }>(
      "/api/mixdown/all",
      async (req) => {
        const { output_dir } = req.body ?? {};
        const data = await dispatcher.request("/rt/mixdown/all", {
          output_dir: output_dir ?? undefined,
        });
        return { ok: true, ...(data as object) };
      },
    );
  };
}
