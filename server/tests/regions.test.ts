// server/tests/regions.test.ts
// Tests for the /api/regions and /api/playhead/end routes.

import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import regionsRoutes from "../src/routes/regions.js";
import type { RegionRow, TransportSnapshot } from "../src/reaper/web-remote.js";

// ── Stubs ────────────────────────────────────────────────────────────────────

function makeStubs() {
  const rtCalls: Array<[string, Record<string, unknown>]> = [];
  const rt = {
    send: async (addr: string, payload: Record<string, unknown> = {}) => {
      rtCalls.push([addr, payload]);
    },
  };

  let regions: RegionRow[] = [];
  const webRemote = {
    listRegions: async () => [...regions],
    getTransport: async (): Promise<TransportSnapshot> => ({
      playState: "stopped" as const,
      positionSeconds: 42.0,
      repeat: false,
      positionStr: "0:42.000",
      positionBeats: "10.1.00",
    }),
  };

  return { rt, webRemote, rtCalls, regions: (r: RegionRow[]) => { regions = r; } };
}

async function buildApp(deps: ReturnType<typeof makeStubs>) {
  const app = Fastify({ logger: false });
  await app.register(regionsRoutes({ rt: deps.rt as any, webRemote: deps.webRemote as any }));
  return app;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/regions", () => {
  it("returns regions from webRemote", async () => {
    const stubs = makeStubs();
    stubs.regions([
      { id: 1, name: "intro", start: 0, stop: 60, color: 0 },
      { id: 2, name: "verse", start: 60, stop: 120, color: 0 },
    ]);
    const app = await buildApp(stubs);

    const res = await app.inject({ method: "GET", url: "/api/regions" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.regions).toHaveLength(2);
    expect(body.regions[0].name).toBe("intro");
  });
});

describe("POST /api/regions", () => {
  it("fires rt.send and returns highest-id region", async () => {
    const stubs = makeStubs();
    // First listRegions call (pre-send snapshot) returns existing regions;
    // subsequent calls include the newly-created region.
    let callCount = 0;
    stubs.webRemote.listRegions = async () => {
      callCount++;
      if (callCount === 1) {
        return [{ id: 2, name: "existing", start: 0, stop: 30, color: 0 }];
      }
      return [
        { id: 2, name: "existing", start: 0, stop: 30, color: 0 },
        { id: 5, name: "intro", start: 0, stop: 60, color: 0 },
      ];
    };
    const app = await buildApp(stubs);

    const res = await app.inject({
      method: "POST",
      url: "/api/regions",
      payload: { name: "intro" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.region.id).toBe(5);
    expect(body.region.name).toBe("intro");
    expect(stubs.rtCalls[0][0]).toBe("/rt/region/new");
    expect(stubs.rtCalls[0][1]).toEqual({ name: "intro" });
  });

  it("returns 502 if listRegions is empty after creation", async () => {
    const stubs = makeStubs();
    stubs.regions([]); // stays empty
    const app = await buildApp(stubs);

    const res = await app.inject({
      method: "POST",
      url: "/api/regions",
      payload: { name: "intro" },
    });
    expect(res.statusCode).toBe(502);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/not found after creation/);
  });
});

describe("PATCH /api/regions/:id", () => {
  it("fires rt.send with id+name and returns renamed region", async () => {
    const stubs = makeStubs();
    stubs.regions([{ id: 3, name: "original", start: 0, stop: 60, color: 0 }]);
    const app = await buildApp(stubs);

    // After rename, stub returns updated name
    stubs.webRemote.listRegions = async () => [
      { id: 3, name: "verse", start: 0, stop: 60, color: 0 },
    ];

    const res = await app.inject({
      method: "PATCH",
      url: "/api/regions/3",
      payload: { name: "verse" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.region.id).toBe(3);
    expect(body.region.name).toBe("verse");
    expect(stubs.rtCalls[0][0]).toBe("/rt/region/rename");
    expect(stubs.rtCalls[0][1]).toEqual({ id: 3, name: "verse" });
  });

  it("returns 400 for non-numeric id", async () => {
    const stubs = makeStubs();
    const app = await buildApp(stubs);
    const res = await app.inject({
      method: "PATCH",
      url: "/api/regions/abc",
      payload: { name: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const stubs = makeStubs();
    const app = await buildApp(stubs);
    const res = await app.inject({
      method: "PATCH",
      url: "/api/regions/3",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 502 if region not found after rename", async () => {
    const stubs = makeStubs();
    stubs.webRemote.listRegions = async () => []; // empty after rename
    const app = await buildApp(stubs);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/regions/3",
      payload: { name: "verse" },
    });
    expect(res.statusCode).toBe(502);
  });
});

describe("POST /api/regions/:id/play", () => {
  it("fires rt.send with id and returns ok", async () => {
    const stubs = makeStubs();
    const app = await buildApp(stubs);

    const res = await app.inject({
      method: "POST",
      url: "/api/regions/7/play",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(stubs.rtCalls[0][0]).toBe("/rt/region/play");
    expect(stubs.rtCalls[0][1]).toEqual({ id: 7 });
  });

  it("returns 400 for non-numeric id", async () => {
    const stubs = makeStubs();
    const app = await buildApp(stubs);
    const res = await app.inject({
      method: "POST",
      url: "/api/regions/abc/play",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/playhead/end", () => {
  it("fires rt.send and returns position from transport", async () => {
    const stubs = makeStubs();
    const app = await buildApp(stubs);

    const res = await app.inject({ method: "POST", url: "/api/playhead/end" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.position).toBe(42.0);
    expect(stubs.rtCalls[0][0]).toBe("/rt/playhead/end");
    expect(stubs.rtCalls[0][1]).toEqual({});
  });
});
