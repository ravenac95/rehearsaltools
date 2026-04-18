// server/src/routes/transport.ts
// Transport controls. Play/stop/record route through REAPER's native OSC
// (fire-and-forget). `record-take` is a compound action: seek to the current
// take's region start, then record.

import type { FastifyInstance } from "fastify";
import type { ReaperNativeClient } from "../osc/client.js";
import type { AppState } from "../state.js";

interface Deps {
  reaper: ReaperNativeClient;
  state: AppState;
}

export default function transportRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { reaper, state } = deps;

    app.post("/api/transport/play", async () => {
      await reaper.play();
      return { ok: true };
    });

    app.post("/api/transport/stop", async () => {
      await reaper.stop();
      return { ok: true };
    });

    /** Ad-hoc record at current playhead. */
    app.post("/api/transport/record", async () => {
      await reaper.record();
      return { ok: true };
    });

    /** Compound: seek to the current take's region start, then record. */
    app.post("/api/transport/record-take", async (_req, reply) => {
      const take = state.currentTake;
      if (!take) {
        return reply.code(409).send({
          ok: false,
          error: "no current take; write a song form first",
        });
      }
      await reaper.seek(take.startTime);
      await reaper.record();
      return { ok: true, startTime: take.startTime };
    });

    app.post<{ Body: { time: number } }>(
      "/api/transport/seek",
      async (req, reply) => {
        const { time } = req.body ?? ({} as any);
        if (typeof time !== "number") {
          return reply.code(400).send({ ok: false, error: "time must be a number" });
        }
        await reaper.seek(time);
        return { ok: true, time };
      },
    );

    app.post<{ Body: { bpm: number } }>(
      "/api/transport/tempo",
      async (req, reply) => {
        const { bpm } = req.body ?? ({} as any);
        if (typeof bpm !== "number" || bpm < 20 || bpm > 999) {
          return reply.code(400).send({ ok: false, error: "bpm must be a number 20..999" });
        }
        await reaper.setTempoRaw(bpm);
        return { ok: true, bpm };
      },
    );

    app.post("/api/transport/metronome/toggle", async () => {
      await reaper.toggleMetronome();
      return { ok: true };
    });

    app.get("/api/transport/state", async () => ({
      ok: true,
      transport: state.transport,
      currentTake: state.currentTake,
    }));
  };
}
