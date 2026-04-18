// server/src/routes/sections.ts
// CRUD for the server-local section library.

import type { FastifyInstance } from "fastify";
import type { SectionsStore } from "../store/sections.js";
import { validateSectionBody } from "../store/sections.js";

export default function sectionsRoutes(store: SectionsStore) {
  return async function (app: FastifyInstance) {
    app.get("/api/sections", async () => ({ ok: true, sections: store.listSections() }));

    app.post("/api/sections", async (req, reply) => {
      try {
        const { name, rows } = validateSectionBody(req.body);
        const created = await store.createSection(name, rows);
        return { ok: true, section: created };
      } catch (err: any) {
        return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
      }
    });

    app.put<{ Params: { id: string } }>(
      "/api/sections/:id",
      async (req, reply) => {
        try {
          const { name, rows } = validateSectionBody(req.body);
          const updated = await store.updateSection(req.params.id, name, rows);
          return { ok: true, section: updated };
        } catch (err: any) {
          return reply.code(400).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );

    app.delete<{ Params: { id: string } }>(
      "/api/sections/:id",
      async (req, reply) => {
        try {
          await store.deleteSection(req.params.id);
          return { ok: true };
        } catch (err: any) {
          return reply.code(404).send({ ok: false, error: String(err.message ?? err) });
        }
      },
    );
  };
}
