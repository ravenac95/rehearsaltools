// server/tests/commands.test.ts
// Tests for the DispatcherClient request/reply correlation.

import { describe, it, expect, vi } from "vitest";
import { DispatcherClient } from "../src/osc/commands.js";
import type { OscClient } from "../src/osc/client.js";

function makeFakeOsc() {
  const sent: Array<{ address: string; args: unknown[] }> = [];
  const fake: Partial<OscClient> = {
    send: vi.fn(async (address: string, ...args: unknown[]) => {
      sent.push({ address, args });
    }),
  };
  return { fake: fake as OscClient, sent };
}

describe("DispatcherClient", () => {
  it("resolves with decoded data when reply arrives", async () => {
    const { fake, sent } = makeFakeOsc();
    const dc = new DispatcherClient(fake, 1000);
    const p = dc.request<{ foo: number }>("/rt/test", { x: 1 });

    // Parse the sent payload to retrieve the req id (must round-trip through JSON).
    expect(sent).toHaveLength(1);
    const payload = JSON.parse(sent[0].args[0] as string) as { _reqId: string; x: number };
    expect(payload.x).toBe(1);
    expect(payload._reqId).toBeTruthy();

    dc.handleReply(payload._reqId, JSON.stringify({ ok: true, data: { foo: 42 } }));
    await expect(p).resolves.toEqual({ foo: 42 });
  });

  it("rejects when reply is ok=false", async () => {
    const { fake, sent } = makeFakeOsc();
    const dc = new DispatcherClient(fake, 1000);
    const p = dc.request("/rt/test");
    const payload = JSON.parse(sent[0].args[0] as string) as { _reqId: string };
    dc.handleReply(payload._reqId, JSON.stringify({ ok: false, error: "nope" }));
    await expect(p).rejects.toThrow(/nope/);
  });

  it("rejects with timeout when no reply arrives", async () => {
    const { fake } = makeFakeOsc();
    const dc = new DispatcherClient(fake, 20);
    await expect(dc.request("/rt/slow")).rejects.toThrow(/timeout/);
  });

  it("ignores replies for unknown req ids", async () => {
    const { fake } = makeFakeOsc();
    const dc = new DispatcherClient(fake, 1000);
    // Should not throw / crash
    expect(() =>
      dc.handleReply("nonexistent", JSON.stringify({ ok: true, data: {} })),
    ).not.toThrow();
  });
});
