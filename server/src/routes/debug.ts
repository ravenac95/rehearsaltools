// server/src/routes/debug.ts
// Debug/diagnostics routes. Toggles verbose logging inside the REAPER-side
// Lua scripts via the `set_log_enabled` dispatch command, which writes a
// persistent ExtState flag.

import type { FastifyInstance } from "fastify";
import type { RtClient } from "../osc/client.js";

export default function debugRoutes(rt: RtClient) {
  return async function (app: FastifyInstance) {
    app.post<{ Body: { enabled?: boolean } }>(
      "/api/debug/logging",
      async (req, reply) => {
        const enabled = req.body?.enabled;
        if (typeof enabled !== "boolean") {
          reply.code(400);
          return { ok: false, error: "body must include { enabled: boolean }" };
        }
        await rt.send("set_log_enabled", { enabled });
        return { ok: true, enabled };
      },
    );
  };
}
