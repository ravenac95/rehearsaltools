// server/src/routes/songform.ts
// Song form CRUD + "Write to Project" action.

import type { FastifyInstance } from "fastify";
import type { SectionsStore } from "../store/sections.js";
import type { DispatcherClient } from "../osc/commands.js";
import type { AppState } from "../state.js";
import type { WsHub } from "../ws.js";
import { flattenSongForm, totalBars } from "../store/sections.js";

interface Deps {
  store: SectionsStore;
  dispatcher: DispatcherClient;
  state: AppState;
  ws: WsHub;
}

export default function songformRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { store, dispatcher, state, ws } = deps;

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
     * Flatten the current song form and send it to REAPER via the dispatcher.
     * Server remembers the resulting region as the "current take" and
     * broadcasts a websocket event.
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

        const result = await dispatcher.request<{
          regionId: number;
          startTime: number;
          rows: Array<{ time: number; bpm: number; num: number; denom: number }>;
        }>("/rt/songform/write", { regionName, rows });

        state.setTake({ regionId: result.regionId, startTime: result.startTime });
        ws.broadcast({
          type: "songform:written",
          data: {
            regionId:  result.regionId,
            startTime: result.startTime,
            regionName,
          },
        });

        return { ok: true, ...result };
      },
    );
  };
}
