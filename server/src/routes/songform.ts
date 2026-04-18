// server/src/routes/songform.ts
// Song form CRUD + "Write to Project" action.

import type { FastifyInstance } from "fastify";
import type { SectionsStore } from "../store/sections.js";
import type { RtClient } from "../osc/client.js";
import type { WebRemoteClient } from "../reaper/web-remote.js";
import type { AppState } from "../state.js";
import type { WsHub } from "../ws.js";
import { flattenSongForm, totalBars } from "../store/sections.js";

interface Deps {
  store: SectionsStore;
  rt: RtClient;
  webRemote: WebRemoteClient;
  state: AppState;
  ws: WsHub;
}

export default function songformRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { store, rt, webRemote, state, ws } = deps;

    app.get("/api/songform", async () => {
      const form = store.getSongForm();
      const sections = store.listSections();
      return {
        ok: true,
        songForm: form,
        totalBars: totalBars(form, sections),
        flat: flattenSongForm(form, sections),
      };
    });

    app.put<{ Body: { sectionIds: string[] } }>(
      "/api/songform",
      async (req, reply) => {
        const { sectionIds } = req.body ?? ({} as any);
        if (!Array.isArray(sectionIds)) {
          return reply.code(400).send({ ok: false, error: "sectionIds must be an array" });
        }
        try {
          const updated = await store.setSongForm(sectionIds);
          return { ok: true, songForm: updated };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    /**
     * Flatten the current song form and send it to REAPER via /rt/songform/write.
     * The server pre-computes startTime from the current transport position,
     * stores the resulting take, and broadcasts a websocket event.
     */
    app.post<{ Body: { regionName?: string } }>(
      "/api/songform/write",
      async (req, reply) => {
        const form = store.getSongForm();
        const sections = store.listSections();
        const rows = flattenSongForm(form, sections);
        if (rows.length === 0) {
          return reply.code(400).send({
            ok: false,
            error: "song form is empty — add sections first",
          });
        }
        const regionName = req.body?.regionName?.trim() || undefined;

        // Pre-compute startTime from the current transport position.
        const transport = await webRemote.getTransport();
        const startTime = transport.positionSeconds;

        await rt.send("/rt/songform/write", { regionName, rows, startTime });

        state.setTake({ startTime });
        ws.broadcast({
          type: "songform:written",
          data: { startTime, regionName },
        });

        return { ok: true, startTime };
      },
    );
  };
}
