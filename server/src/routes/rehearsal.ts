// server/src/routes/rehearsal.ts
// Rehearsal lifecycle endpoints: start, set-category, end, types.

import type { FastifyInstance } from "fastify";
import type { ReaperNativeClient } from "../osc/client.js";
import type { AppState } from "../state.js";
import type { WsHub } from "../ws.js";
import type { Config } from "../config.js";
import type { SongStore } from "../store/song.js";

interface Deps {
  reaper: ReaperNativeClient;
  state: AppState;
  ws: WsHub;
  config: Config;
  store: SongStore;
}

export default function rehearsalRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { reaper, state, ws, config, store } = deps;

    /** GET /api/rehearsal/types — return available rehearsal types from config */
    app.get("/api/rehearsal/types", async () => {
      return { ok: true, types: config.rehearsalTypes };
    });

    /** POST /api/rehearsal/start — start recording, open first discussion segment */
    app.post<{ Body: { typeId: string } }>(
      "/api/rehearsal/start",
      async (req, reply) => {
        const { typeId } = req.body ?? ({} as any);
        const typeObj = config.rehearsalTypes.find((t) => t.id === typeId);
        if (!typeObj) {
          return reply.code(400).send({ ok: false, error: `unknown typeId: ${typeId}` });
        }
        if (state.rehearsalStatus !== "idle") {
          return reply.code(409).send({ ok: false, error: "rehearsal already in progress" });
        }

        await reaper.record();

        const song = store.getSong();
        const segment = state.startRehearsal(
          state.transport.position ?? 0,
          song.id,
          song.name,
        );

        ws.broadcast({ type: "rehearsal:started", data: { segment } });
        return { ok: true, segment };
      },
    );

    /** POST /api/rehearsal/set-category — switch between take and discussion */
    app.post<{ Body: { category: "take" | "discussion" } }>(
      "/api/rehearsal/set-category",
      async (req, reply) => {
        const { category } = req.body ?? ({} as any);

        if (state.rehearsalStatus === "idle") {
          return reply.code(409).send({ ok: false, error: "no rehearsal in progress" });
        }

        if (category !== "take" && category !== "discussion") {
          return reply.code(400).send({ ok: false, error: "category must be 'take' or 'discussion'" });
        }

        // Manage metronome: on for takes, off for discussions
        if (category === "take" && !state.transport.metronome) {
          await reaper.toggleMetronome();
        } else if (category === "discussion" && state.transport.metronome) {
          await reaper.toggleMetronome();
        }

        const song = store.getSong();
        const segment = state.openSegment(
          category,
          state.transport.position ?? 0,
          song.id,
          song.name,
        );

        ws.broadcast({ type: "rehearsal:segment", data: { segment } });
        return { ok: true, segment };
      },
    );

    /** POST /api/rehearsal/end — stop Reaper, clear rehearsal state */
    app.post("/api/rehearsal/end", async () => {
      await reaper.stop();
      state.endRehearsal();
      ws.broadcast({ type: "rehearsal:ended", data: {} });
      return { ok: true };
    });
  };
}
