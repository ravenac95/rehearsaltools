// server/tests/songs.test.ts
// TDD tests for songs list routes — written BEFORE implementation.

import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { SongStore, Song } from "../src/store/song.js";

function makeMockStore(overrides: Partial<Song> = {}) {
  const mockSong: Song = {
    id: "song-abc",
    name: "My Test Song",
    sections: [
      {
        letter: "A",
        stanzas: [{ bars: 4, num: 6, denom: 8 }],
        bpm: 90,
      },
    ],
    songForms: [{ id: "form-1", name: "1", bpm: 120, note: "q", pattern: ["A"] }],
    activeFormId: "form-1",
    ...overrides,
  };

  return {
    getSong: vi.fn().mockReturnValue(mockSong),
  } as unknown as SongStore;
}

async function buildApp(store: SongStore) {
  const app = Fastify({ logger: false });
  const { default: songsRoutes } = await import("../src/routes/songs.js");
  await app.register(songsRoutes({ store }));
  await app.ready();
  return app;
}

describe("GET /api/songs", () => {
  it("returns song list with id, name, bpm, timeSig", async () => {
    const store = makeMockStore();
    const app = await buildApp(store);

    const res = await app.inject({ method: "GET", url: "/api/songs" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.songs)).toBe(true);
    expect(body.songs).toHaveLength(1);
    const song = body.songs[0];
    expect(song.id).toBe("song-abc");
    expect(song.name).toBe("My Test Song");
    expect(typeof song.bpm).toBe("number");
    expect(typeof song.timeSig).toBe("string");
  });

  it("returns timeSig from active form section stanza", async () => {
    const store = makeMockStore();
    const app = await buildApp(store);

    const res = await app.inject({ method: "GET", url: "/api/songs" });
    const body = res.json();
    // stanza[0] has num=6, denom=8
    expect(body.songs[0].timeSig).toBe("6/8");
  });

  it("timeSig fallback to 4/4 when song has no sections", async () => {
    const store = makeMockStore({ sections: [], songForms: [{ id: "form-1", name: "1", bpm: 100, note: "q", pattern: [] }], activeFormId: "form-1" });
    const app = await buildApp(store);

    const res = await app.inject({ method: "GET", url: "/api/songs" });
    const body = res.json();
    expect(body.songs[0].timeSig).toBe("4/4");
  });
});

describe("POST /api/songs/:id/select", () => {
  it("matching id returns 200 with song object", async () => {
    const store = makeMockStore();
    const app = await buildApp(store);

    const res = await app.inject({ method: "POST", url: "/api/songs/song-abc/select" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.song.id).toBe("song-abc");
  });

  it("unknown id returns 404", async () => {
    const store = makeMockStore();
    const app = await buildApp(store);

    const res = await app.inject({ method: "POST", url: "/api/songs/unknown-id/select" });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.ok).toBe(false);
  });
});
