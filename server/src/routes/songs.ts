// server/src/routes/songs.ts
// Song list endpoints — lightweight list format and song selection.

import type { FastifyInstance } from "fastify";
import type { SongStore, SongForm, Section } from "../store/song.js";

interface Deps {
  store: SongStore;
}

/** Derive the effective time signature from a song's active form first section. */
function getTimeSig(store: SongStore): string {
  const song = store.getSong();
  const activeForm = song.songForms.find((f) => f.id === song.activeFormId);
  if (!activeForm) return "4/4";

  // Find first letter in pattern
  const firstLetter = activeForm.pattern[0];
  if (!firstLetter) return "4/4";

  const section = song.sections.find((s) => s.letter === firstLetter);
  if (!section) return "4/4";

  const stanza = section.stanzas[0];
  if (!stanza) return "4/4";

  return `${stanza.num}/${stanza.denom}`;
}

/** Derive BPM from the active form. */
function getBpm(store: SongStore): number {
  const song = store.getSong();
  const activeForm = song.songForms.find((f) => f.id === song.activeFormId);
  if (!activeForm) {
    return song.songForms[0]?.bpm ?? 0;
  }
  return activeForm.bpm;
}

export default function songsRoutes(deps: Deps) {
  return async function (app: FastifyInstance) {
    const { store } = deps;

    /** GET /api/songs — return lightweight song list */
    app.get("/api/songs", async () => {
      const song = store.getSong();
      const bpm = getBpm(store);
      const timeSig = getTimeSig(store);

      return {
        ok: true,
        songs: [
          {
            id: song.id,
            name: song.name,
            bpm,
            timeSig,
          },
        ],
      };
    });

    /** POST /api/songs/:id/select — select active song (MVP: only one song) */
    app.post<{ Params: { id: string } }>(
      "/api/songs/:id/select",
      async (req, reply) => {
        const { id } = req.params;
        const song = store.getSong();

        if (song.id !== id) {
          return reply.code(404).send({ ok: false, error: "song not found" });
        }

        return { ok: true, song };
      },
    );
  };
}
