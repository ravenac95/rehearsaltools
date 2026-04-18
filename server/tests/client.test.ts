// server/tests/client.test.ts
// Tests for RtClient — serialises `{command, ...payload}` JSON and sends it
// to a single multiplexed OSC address (default /rehearsaltools).

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
  it("defaults to /rehearsaltools address", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("project.new");
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe("/rehearsaltools");
  });

  it("sends command-only payload as {command} JSON", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("project.new");
    expect(calls[0].args[0]).toBe('{"command":"project.new"}');
  });

  it("merges command and payload fields in the JSON envelope", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("region.new", { name: "intro" });
    const parsed = JSON.parse(calls[0].args[0] as string);
    expect(parsed).toEqual({ command: "region.new", name: "intro" });
  });

  it("serialises nested payload correctly", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake);
    await rt.send("songform.write", { startTime: 10.5, rows: [{ bpm: 120 }] });
    const parsed = JSON.parse(calls[0].args[0] as string);
    expect(parsed.command).toBe("songform.write");
    expect(parsed.startTime).toBe(10.5);
    expect(parsed.rows).toEqual([{ bpm: 120 }]);
  });

  it("honours an overridden address", async () => {
    const { fake, calls } = makeFakeOsc();
    const rt = new RtClient(fake, "/custom/endpoint");
    await rt.send("project.new");
    expect(calls[0].address).toBe("/custom/endpoint");
  });
});
