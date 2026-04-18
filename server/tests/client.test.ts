// server/tests/client.test.ts
// Tests for RtClient (fire-and-forget /rt/* writer).

import { describe, it, expect, vi } from "vitest";
import { RtClient } from "../src/osc/client.js";
import type { OscClient } from "../src/osc/client.js";

function makeFakeOsc() {
  const calls: Array<{ address: string; args: unknown[] }> = [];
  const fake: Partial<OscClient> = {
    send: vi.fn(async (address: string, ...args: unknown[]) => {
      calls.push({ address, args });
    }),
  };
  return { fake: fake as OscClient, calls };
}

describe("RtClient", () => {
  it("send with no payload sends empty JSON object", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("/rt/project/new");
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe("/rt/project/new");
    expect(calls[0].args[0]).toBe("{}");
  });

  it("send with payload serialises to JSON string", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("/rt/region/new", { name: "intro" });
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe("/rt/region/new");
    expect(calls[0].args[0]).toBe('{"name":"intro"}');
  });

  it("send with nested payload serialises correctly", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("/rt/songform/write", { startTime: 10.5, rows: [{ bpm: 120 }] });
    expect(calls).toHaveLength(1);
    const parsed = JSON.parse(calls[0].args[0] as string);
    expect(parsed.startTime).toBe(10.5);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].bpm).toBe(120);
  });
});
