// server/tests/rehearsal.test.ts
// TDD tests for rehearsal state and routes — written BEFORE implementation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { AppState } from "../src/state.js";
import type { Config } from "../src/config.js";
import type { SongStore } from "../src/store/song.js";
import type { ReaperNativeClient } from "../src/osc/client.js";
import type { WsHub } from "../src/ws.js";
import type { PrefsStore } from "../src/store/prefs.js";

// ── AppState unit tests ────────────────────────────────────────────────────

describe("AppState.startRehearsal", () => {
  it("creates first discussion segment with num=1, sets status to discussion", () => {
    const state = new AppState();
    const seg = state.startRehearsal(10, "song-1", "Test Song");
    expect(seg.type).toBe("discussion");
    expect(seg.num).toBe(1);
    expect(seg.songId).toBe("song-1");
    expect(seg.songName).toBe("Test Song");
    expect(seg.startPosition).toBe(10);
    expect(state.rehearsalStatus).toBe("discussion");
    expect(state.rehearsalSegments).toHaveLength(1);
  });

  it("resets counts when called again", () => {
    const state = new AppState();
    state.startRehearsal(0, "song-1", "Test Song");
    state.openSegment("take", 5, "song-1", "Test Song");
    state.startRehearsal(0, "song-1", "Test Song");
    const segs = state.rehearsalSegments;
    expect(segs).toHaveLength(1);
    expect(segs[0].num).toBe(1);
  });
});

describe("AppState.openSegment take", () => {
  it("increments take counter, pushes take segment", () => {
    const state = new AppState();
    state.startRehearsal(0, "song-1", "Test Song");
    const seg = state.openSegment("take", 20, "song-1", "Test Song");
    expect(seg.type).toBe("take");
    expect(seg.num).toBe(1);
    expect(state.rehearsalStatus).toBe("take");
    expect(state.rehearsalSegments).toHaveLength(2);
  });

  it("increments counter on second take", () => {
    const state = new AppState();
    state.startRehearsal(0, "song-1", "Test Song");
    state.openSegment("take", 5, "song-1", "Test Song");
    const seg = state.openSegment("take", 10, "song-1", "Test Song");
    expect(seg.num).toBe(2);
  });
});

describe("AppState.openSegment discussion", () => {
  it("increments discussion counter, pushes discussion segment", () => {
    const state = new AppState();
    state.startRehearsal(0, "song-1", "Test Song");
    const seg = state.openSegment("discussion", 5, "song-1", "Test Song");
    // startRehearsal already added a discussion (num=1), now we add another (num=2)
    expect(seg.type).toBe("discussion");
    expect(seg.num).toBe(2);
    expect(state.rehearsalStatus).toBe("discussion");
  });
});

describe("AppState.endRehearsal", () => {
  it("clears segments array, sets status to idle", () => {
    const state = new AppState();
    state.startRehearsal(0, "song-1", "Test Song");
    state.endRehearsal();
    expect(state.rehearsalSegments).toHaveLength(0);
    expect(state.rehearsalStatus).toBe("idle");
  });
});

// ── Route integration tests ────────────────────────────────────────────────

function makeMockDeps() {
  const state = new AppState();
  const reaper = {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    record: vi.fn().mockResolvedValue(undefined),
    toggleMetronome: vi.fn().mockResolvedValue(undefined),
    setTempoRaw: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReaperNativeClient;

  const ws = {
    broadcast: vi.fn(),
    add: vi.fn(),
    size: vi.fn().mockReturnValue(0),
  } as unknown as WsHub;

  const mockSong = {
    id: "song-abc",
    name: "My Song",
    sections: [],
    songForms: [{ id: "form-1", name: "1", bpm: 120, note: "q", pattern: [] }],
    activeFormId: "form-1",
  };

  const store = {
    getSong: vi.fn().mockReturnValue(mockSong),
  } as unknown as SongStore;

  const prefs = {
    load: vi.fn().mockResolvedValue(undefined),
    getRehearsalTypeId: vi.fn().mockReturnValue(null),
    setRehearsalTypeId: vi.fn().mockResolvedValue(undefined),
  } as unknown as PrefsStore;

  const config: Config = {
    httpHost: "localhost",
    httpPort: 8080,
    reaperOscHost: "127.0.0.1",
    reaperOscPort: 8000,
    reaperFeedbackHost: "0.0.0.0",
    reaperFeedbackPort: 8001,
    reaperWebHost: "127.0.0.1",
    reaperWebPort: 8081,
    dataFile: "./data/test.json",
    prefsFile: "./data/test-prefs.json",
    rehearsalTypes: [
      { id: "full-band", name: "Full Band", desc: "All instruments", emoji: "🎸" },
      { id: "piano-vox", name: "Piano + Vox", desc: "Stripped back", emoji: "🎹" },
    ],
  };

  // Default: state has a current type seeded (matches post-boot invariant)
  state.currentRehearsalTypeId = "full-band";

  return { state, reaper, ws, store, prefs, config };
}

async function buildApp() {
  const deps = makeMockDeps();
  const app = Fastify({ logger: false });

  const { default: rehearsalRoutes } = await import("../src/routes/rehearsal.js");
  await app.register(rehearsalRoutes(deps));

  await app.ready();
  return { app, ...deps };
}

describe("GET /api/rehearsal/types", () => {
  it("returns config types array", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/rehearsal/types" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.types).toHaveLength(2);
    expect(body.types[0].id).toBe("full-band");
  });
});

describe("POST /api/rehearsal/start", () => {
  it("returns 200 with discussion segment when no typeId body is provided (uses current)", async () => {
    const { app, state } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/start",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.segment.type).toBe("discussion");
    expect(state.rehearsalStatus).toBe("discussion");
  });

  it("returns 409 when no current type is set on the server", async () => {
    const { app, state } = await buildApp();
    state.currentRehearsalTypeId = null;
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/start",
      payload: {},
    });
    expect(res.statusCode).toBe(409);
  });

  it("returns 409 when rehearsal already in progress", async () => {
    const { app, state } = await buildApp();
    state.startRehearsal(0, "song-abc", "My Song");
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/start",
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toMatch(/already in progress/);
  });
});

describe("POST /api/rehearsal/type", () => {
  it("returns 200 and updates current type when body id is valid", async () => {
    const { app, state, prefs, ws } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/type",
      payload: { typeId: "piano-vox" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.type.id).toBe("piano-vox");
    expect(state.currentRehearsalTypeId).toBe("piano-vox");
    expect(prefs.setRehearsalTypeId).toHaveBeenCalledWith("piano-vox");
    expect(ws.broadcast).toHaveBeenCalledWith(expect.objectContaining({
      type: "rehearsal:type-changed",
      data: { type: expect.objectContaining({ id: "piano-vox" }) },
    }));
  });

  it("returns 400 for an unknown typeId", async () => {
    const { app, state, prefs, ws } = await buildApp();
    const before = state.currentRehearsalTypeId;
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/type",
      payload: { typeId: "does-not-exist" },
    });
    expect(res.statusCode).toBe(400);
    expect(state.currentRehearsalTypeId).toBe(before);
    expect(prefs.setRehearsalTypeId).not.toHaveBeenCalled();
    expect(ws.broadcast).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing typeId", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/type",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/rehearsal/set-category when idle", () => {
  it("returns 409", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/set-category",
      payload: { category: "take" },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("POST /api/rehearsal/set-category take", () => {
  it("returns 200 with take segment", async () => {
    const { app, state } = await buildApp();
    state.startRehearsal(0, "song-abc", "My Song");
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/set-category",
      payload: { category: "take" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.segment.type).toBe("take");
  });
});

describe("POST /api/rehearsal/end", () => {
  it("returns 200, state.rehearsalStatus is idle", async () => {
    const { app, state, reaper } = await buildApp();
    state.startRehearsal(0, "song-abc", "My Song");
    const res = await app.inject({
      method: "POST",
      url: "/api/rehearsal/end",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(state.rehearsalStatus).toBe("idle");
    expect(reaper.stop).toHaveBeenCalled();
  });
});
