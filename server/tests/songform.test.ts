// server/tests/songform.test.ts
// Tests for the /api/songform/write route (and GET/PUT stubs).

import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { SectionsStore } from "../src/store/sections.js";
import { AppState } from "../src/state.js";
import songformRoutes from "../src/routes/songform.js";
import type { TransportSnapshot } from "../src/reaper/web-remote.js";

// ── Stubs ────────────────────────────────────────────────────────────────────

function makeTransportStub(positionSeconds = 10): TransportSnapshot {
  return {
    playState: "stopped",
    positionSeconds,
    repeat: false,
    positionStr: "0:10.000",
    positionBeats: "3.2.00",
  };
}

async function buildApp(opts: {
  store: SectionsStore;
  positionSeconds?: number;
}) {
  const rtCalls: Array<[string, Record<string, unknown>]> = [];
  const rt = {
    send: async (addr: string, payload: Record<string, unknown> = {}) => {
      rtCalls.push([addr, payload]);
    },
  };

  const webRemote = {
    getTransport: async () => makeTransportStub(opts.positionSeconds ?? 10),
  };

  const broadcasts: unknown[] = [];
  const ws = {
    broadcast: (msg: unknown) => { broadcasts.push(msg); },
  };

  const state = new AppState();

  const app = Fastify({ logger: false });
  await app.register(
    songformRoutes({
      store: opts.store,
      rt: rt as any,
      webRemote: webRemote as any,
      state,
      ws: ws as any,
    }),
  );

  return { app, rtCalls, broadcasts, state };
}

let tmpFile: string;
let store: SectionsStore;

beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rt-sf-"));
  tmpFile = path.join(dir, "store.json");
  store = new SectionsStore(tmpFile);
  await store.load();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/songform/write", () => {
  it("pre-computes startTime, fires rt.send, updates state, broadcasts ws", async () => {
    // Populate the store with one section
    const sec = await store.createSection("A", [
      { bars: 4, num: 4, denom: 4, bpm: 120 },
      { bars: 4, num: 4, denom: 4, bpm: 140 },
    ]);
    await store.setSongForm([sec.id]);

    const { app, rtCalls, broadcasts, state } = await buildApp({
      store,
      positionSeconds: 10,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/songform/write",
      payload: { regionName: "Take 1" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.startTime).toBe(10);

    // rt.send called with correct address and payload
    expect(rtCalls).toHaveLength(1);
    expect(rtCalls[0][0]).toBe("/rt/songform/write");
    const sentPayload = rtCalls[0][1];
    expect(sentPayload.startTime).toBe(10);
    expect(sentPayload.regionName).toBe("Take 1");
    expect(Array.isArray(sentPayload.rows)).toBe(true);

    // State updated (no regionId)
    expect(state.currentTake).toEqual({ startTime: 10 });

    // WS broadcast sent
    expect(broadcasts).toHaveLength(1);
    const wsMsg = broadcasts[0] as any;
    expect(wsMsg.type).toBe("songform:written");
    expect(wsMsg.data.startTime).toBe(10);
    expect(wsMsg.data.regionName).toBe("Take 1");
    expect(wsMsg.data.regionId).toBeUndefined();
  });

  it("returns 400 when song form is empty", async () => {
    // No sections in store
    const { app } = await buildApp({ store });

    const res = await app.inject({
      method: "POST",
      url: "/api/songform/write",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/empty/);
  });

  it("omits regionName from payload when not provided", async () => {
    const sec = await store.createSection("A", [
      { bars: 4, num: 4, denom: 4, bpm: 120 },
    ]);
    await store.setSongForm([sec.id]);

    const { app, rtCalls } = await buildApp({ store });

    const res = await app.inject({
      method: "POST",
      url: "/api/songform/write",
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(rtCalls[0][1].regionName).toBeUndefined();
  });
});
