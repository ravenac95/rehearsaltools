// server/src/osc/commands.ts
// Typed request/response helpers for the /rt/* dispatcher.
// Adds a unique req id to each outbound payload, then waits for the matching
// /rt/reply/<reqId> message before resolving.

import { randomUUID } from "node:crypto";
import { OscClient } from "./client.js";

interface Pending {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export interface DispatcherReply<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class DispatcherClient {
  private pending = new Map<string, Pending>();

  constructor(private osc: OscClient, private timeoutMs = 5000) {}

  /** Called by the OSC server when a /rt/reply/<reqId> comes in. */
  handleReply(reqId: string, payloadJson: string): void {
    const p = this.pending.get(reqId);
    if (!p) return;
    this.pending.delete(reqId);
    clearTimeout(p.timer);
    try {
      const parsed: DispatcherReply = JSON.parse(payloadJson);
      if (parsed.ok) {
        p.resolve(parsed.data);
      } else {
        p.reject(new Error(parsed.error ?? "dispatcher error"));
      }
    } catch (err) {
      p.reject(new Error("failed to parse dispatcher reply: " + String(err)));
    }
  }

  /**
   * Send a request and await a correlated reply.
   * Payload is serialised as a single string arg containing JSON.
   */
  async request<T = unknown>(
    address: string,
    payload: Record<string, unknown> = {}
  ): Promise<T> {
    const reqId = randomUUID();
    const fullPayload = { ...payload, _reqId: reqId };
    const json = JSON.stringify(fullPayload);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`dispatcher timeout after ${this.timeoutMs}ms for ${address}`));
      }, this.timeoutMs);

      this.pending.set(reqId, {
        resolve: (d) => resolve(d as T),
        reject,
        timer,
      });

      this.osc.send(address, json).catch((err) => {
        this.pending.delete(reqId);
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
