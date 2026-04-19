// server/src/routes/song.ts
// All song / form / section / revisions endpoints.

import type { FastifyInstance } from "fastify";
import type { SongStore } from "../store/song.js";
import type { RtClient } from "../osc/client.js";
import type { WebRemoteClient } from "../reaper/web-remote.js";
import type { AppState } from "../state.js";
import type { WsHub } from "../ws.js";
import { flattenForm } from "../flatten.js";

interface Deps {
  store: SongStore;
  rt: RtClient;
  webRemote: WebRemoteClient;
  state: AppState;
  ws: WsHub;
}

export default function songRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { store, rt, webRemote, state, ws } = deps;

    // ── Song ──────────────────────────────────────────────────────────────────

    app.get("/api/song", async () => {
      return { ok: true, song: store.getSong() };
    });

    app.put<{ Body: Record<string, unknown> }>(
      "/api/song",
      async (req, reply) => {
        try {
          const body = req.body ?? {};
          const partial: Parameters<SongStore["updateSong"]>[0] = {};
          if (typeof body.name === "string") partial.name = body.name;
          if ("activeFormId" in body) {
            const id = body.activeFormId;
            if (id !== null && typeof id !== "string") {
              return reply.code(400).send({ ok: false, error: "activeFormId must be a string or null" });
            }
            if (typeof id === "string" && !store.getSong().songForms.some((f) => f.id === id)) {
              return reply.code(400).send({ ok: false, error: `unknown activeFormId: ${id}` });
            }
            partial.activeFormId = id;
          }
          const song = await store.updateSong(partial);
          return { ok: true, song };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    // ── Sections ──────────────────────────────────────────────────────────────

    app.put<{ Params: { letter: string }; Body: Record<string, unknown> }>(
      "/api/song/sections/:letter",
      async (req, reply) => {
        try {
          const { letter } = req.params;
          const body = req.body ?? {};
          const stanzas = body.stanzas as any[];
          const bpm = body.bpm as number | undefined;
          const note = body.note as any;
          await store.upsertSection(letter, stanzas, bpm, note);
          return { ok: true, song: store.getSong() };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    app.delete<{ Params: { letter: string } }>(
      "/api/song/sections/:letter",
      async (req, reply) => {
        try {
          const { letter } = req.params;
          const { affectedForms } = await store.deleteSection(letter);
          const warning =
            affectedForms.length > 0
              ? `Removed ${letter} from forms: ${affectedForms.join(", ")}`
              : null;
          return { ok: true, song: store.getSong(), warning };
        } catch (err: any) {
          const msg = String(err.message ?? err);
          const code = msg.startsWith("section not found") ? 404 : 400;
          return reply.code(code).send({ ok: false, error: msg });
        }
      },
    );

    // ── SongForms ─────────────────────────────────────────────────────────────

    app.post(
      "/api/song/forms",
      async (_req, reply) => {
        try {
          await store.createSongForm();
          return { ok: true, song: store.getSong() };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
      "/api/song/forms/:id",
      async (req, reply) => {
        try {
          const { id } = req.params;
          const body = req.body ?? {};
          const partial: Parameters<SongStore["updateSongForm"]>[1] = {};
          if (typeof body.name === "string") partial.name = body.name;
          if (typeof body.bpm === "number") partial.bpm = body.bpm;
          if (Array.isArray(body.pattern)) partial.pattern = body.pattern as string[];
          if (typeof body.note === "string") partial.note = body.note as any;
          await store.updateSongForm(id, partial);
          return { ok: true, song: store.getSong() };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    app.delete<{ Params: { id: string } }>(
      "/api/song/forms/:id",
      async (req, reply) => {
        try {
          await store.deleteSongForm(req.params.id);
          return { ok: true, song: store.getSong() };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    // ── Write to REAPER ───────────────────────────────────────────────────────

    app.post<{ Params: { id: string }; Body: { regionName?: string } }>(
      "/api/song/forms/:id/write",
      async (req, reply) => {
        const song = store.getSong();
        let rows;
        let totalBars;
        try {
          ({ rows, totalBars } = flattenForm(song, req.params.id));
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
        if (rows.length === 0) {
          return reply.code(400).send({
            ok: false,
            error: "song form is empty — add sections first",
          });
        }
        const regionName = req.body?.regionName?.trim() || undefined;
        const transport = await webRemote.getTransport();
        const startTime = transport.positionSeconds;

        await rt.send("songform.write", { regionName, rows, startTime });

        state.setTake({ startTime });
        ws.broadcast({ type: "songform:written", data: { startTime, regionName } });

        return { ok: true, startTime, totalBars };
      },
    );

    // ── Revisions ─────────────────────────────────────────────────────────────

    app.get("/api/song/revisions", async () => {
      return { ok: true, revisions: store.listRevisions() };
    });

    app.get<{ Params: { id: string } }>(
      "/api/song/revisions/:id",
      async (req, reply) => {
        const revision = store.getRevision(req.params.id);
        if (!revision) return reply.code(404).send({ ok: false, error: "revision not found" });
        return { ok: true, revision };
      },
    );

    app.post<{ Params: { id: string } }>(
      "/api/song/revisions/:id/restore",
      async (req, reply) => {
        try {
          const song = await store.restoreRevision(req.params.id);
          return { ok: true, song };
        } catch (err: any) {
          return reply.code(404).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );
  };
}
