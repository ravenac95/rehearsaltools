// server/tests/web-remote.test.ts
// Tests for WebRemoteClient — parsers (pure) + HTTP wrapper.

import { describe, it, expect } from "vitest";
import {
  parseTransport,
  parseBeatPos,
  parseRegionList,
  WebRemoteClient,
} from "../src/reaper/web-remote.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

const TRANSPORT_STOPPED =
  "TRANSPORT\t0\t0.000000\t0\t0:00.000\t1.1.00\n";

const TRANSPORT_PLAYING =
  "TRANSPORT\t1\t42.500000\t0\t0:42.500\t10.3.50\n";

const TRANSPORT_RECORDING =
  "TRANSPORT\t5\t10.000000\t1\t0:10.000\t3.2.00\n";

const BEATPOS_44 =
  "BEATPOS\t1\t42.5\t85.0\t22\t1\t4\t4\n";

const REGION_LIST_EMPTY =
  "REGION_LIST\nREGION_LIST_END\n";

const REGION_LIST_ONE =
  "REGION_LIST\nREGION\tintro\t1\t0.0\t60.0\t0\nREGION_LIST_END\n";

const REGION_LIST_THREE =
  "REGION_LIST\n" +
  "REGION\tintro\t1\t0.0\t60.0\t0\n" +
  "REGION\tverse\t2\t60.0\t120.0\t255\n" +
  "REGION\tchorus\t3\t120.0\t180.0\t65280\n" +
  "REGION_LIST_END\n";

// id with 'R' prefix (REAPER sometimes includes it)
const REGION_LIST_R_PREFIX =
  "REGION_LIST\nREGION\tintro\tR5\t0.0\t60.0\t0\nREGION_LIST_END\n";

const MARKER_LIST_ONE =
  "MARKER_LIST\nMARKER\tstart\t1\t0.0\t60.0\t0\nMARKER_LIST_END\n";

// ── parseTransport ───────────────────────────────────────────────────────────

describe("parseTransport", () => {
  it("parses stopped state", () => {
    const t = parseTransport(TRANSPORT_STOPPED);
    expect(t.playState).toBe("stopped");
    expect(t.positionSeconds).toBe(0);
    expect(t.repeat).toBe(false);
    expect(t.positionStr).toBe("0:00.000");
    expect(t.positionBeats).toBe("1.1.00");
  });

  it("parses playing state", () => {
    const t = parseTransport(TRANSPORT_PLAYING);
    expect(t.playState).toBe("playing");
    expect(t.positionSeconds).toBe(42.5);
    expect(t.repeat).toBe(false);
    expect(t.positionStr).toBe("0:42.500");
  });

  it("parses recording state (playstate=5)", () => {
    const t = parseTransport(TRANSPORT_RECORDING);
    expect(t.playState).toBe("recording");
    expect(t.repeat).toBe(true);
    expect(t.positionSeconds).toBe(10.0);
  });

  it("throws on malformed input", () => {
    expect(() => parseTransport("garbage")).toThrow();
  });
});

// ── parseBeatPos ─────────────────────────────────────────────────────────────

describe("parseBeatPos", () => {
  it("parses a 4/4 beat position", () => {
    const b = parseBeatPos(BEATPOS_44);
    expect(b.playState).toBe("playing");
    expect(b.positionSeconds).toBe(42.5);
    expect(b.fullBeatPosition).toBe(85.0);
    expect(b.measure).toBe(22);
    expect(b.beatInMeasure).toBe(1);
    expect(b.tsNum).toBe(4);
    expect(b.tsDenom).toBe(4);
  });

  it("throws on malformed input", () => {
    expect(() => parseBeatPos("bad")).toThrow();
  });
});

// ── parseRegionList ──────────────────────────────────────────────────────────

describe("parseRegionList", () => {
  it("parses an empty list", () => {
    const regions = parseRegionList(REGION_LIST_EMPTY);
    expect(regions).toHaveLength(0);
  });

  it("parses one region", () => {
    const regions = parseRegionList(REGION_LIST_ONE);
    expect(regions).toHaveLength(1);
    expect(regions[0].id).toBe(1);
    expect(regions[0].name).toBe("intro");
    expect(regions[0].start).toBe(0.0);
    expect(regions[0].stop).toBe(60.0);
    expect(regions[0].color).toBe(0);
  });

  it("parses three regions", () => {
    const regions = parseRegionList(REGION_LIST_THREE);
    expect(regions).toHaveLength(3);
    expect(regions[1].id).toBe(2);
    expect(regions[1].name).toBe("verse");
    expect(regions[2].id).toBe(3);
    expect(regions[2].name).toBe("chorus");
  });

  it("strips R prefix from id", () => {
    const regions = parseRegionList(REGION_LIST_R_PREFIX);
    expect(regions).toHaveLength(1);
    expect(regions[0].id).toBe(5);
  });

  it("parses MARKER_LIST the same way", () => {
    const markers = parseRegionList(MARKER_LIST_ONE);
    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe(1);
    expect(markers[0].name).toBe("start");
  });

  it("throws on malformed input", () => {
    expect(() => parseRegionList("garbage without end token")).toThrow();
  });
});

// ── WebRemoteClient ──────────────────────────────────────────────────────────

function makeFakeFetch(status: number, body: string) {
  return async (_url: string, _init?: RequestInit): Promise<Response> => {
    if (status >= 200 && status < 300) {
      return new Response(body, { status });
    }
    return new Response("error", { status });
  };
}

function makeThrowingFetch(msg: string) {
  return async (_url: string, _init?: RequestInit): Promise<Response> => {
    throw new Error(msg);
  };
}

describe("WebRemoteClient", () => {
  it("getTransport returns parsed snapshot", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeFakeFetch(200, TRANSPORT_PLAYING),
    );
    const t = await client.getTransport();
    expect(t.playState).toBe("playing");
    expect(t.positionSeconds).toBe(42.5);
  });

  it("getBeatPos returns parsed snapshot", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeFakeFetch(200, BEATPOS_44),
    );
    const b = await client.getBeatPos();
    expect(b.measure).toBe(22);
    expect(b.tsNum).toBe(4);
  });

  it("listRegions returns parsed regions", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeFakeFetch(200, REGION_LIST_THREE),
    );
    const regions = await client.listRegions();
    expect(regions).toHaveLength(3);
  });

  it("listMarkers returns parsed markers", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeFakeFetch(200, MARKER_LIST_ONE),
    );
    const markers = await client.listMarkers();
    expect(markers).toHaveLength(1);
  });

  it("rejects on non-2xx response", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeFakeFetch(500, ""),
    );
    await expect(client.getTransport()).rejects.toThrow(/500/);
  });

  it("rejects on network failure", async () => {
    const client = new WebRemoteClient(
      "http://127.0.0.1:8080",
      makeThrowingFetch("network failure"),
    );
    await expect(client.getTransport()).rejects.toThrow(/network failure/);
  });
});
