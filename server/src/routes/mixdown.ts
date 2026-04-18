// server/src/routes/mixdown.ts
// Mixdown route using RtClient fire-and-forget.

import type { FastifyInstance } from "fastify";
import type { RtClient } from "../osc/client.js";

export default function mixdownRoutes(rt: RtClient) {
  return async function (app: FastifyInstance) {
    app.post<{ Body: { output_dir?: string } }>(
      "/api/mixdown/all",
      async (req) => {
        const { output_dir } = req.body ?? {};
        await rt.send("/rt/mixdown/all", { output_dir: output_dir ?? undefined });
        return { ok: true };
      },
    );
  };
}
