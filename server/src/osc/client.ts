// server/src/osc/client.ts
// Thin wrapper over node-osc Client for REAPER's OSC port.
// ReaperNativeClient sends transport controls; RtClient sends /rt/* action payloads.

import { Client } from "node-osc";

export type OscArg = string | number | boolean;

export class OscClient {
  private client: Client;

  constructor(host: string, port: number) {
    this.client = new Client(host, port);
  }

  /** Fire-and-forget. node-osc uses UDP — no confirmation. */
  send(address: string, ...args: OscArg[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.send(address, ...args, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.client.close(() => resolve());
    });
  }
}

/** Transport + basic controls that REAPER handles on its native OSC port. */
export class ReaperNativeClient {
  constructor(private osc: OscClient) {}

  play()   { return this.osc.send("/play",   1); }
  stop()   { return this.osc.send("/stop",   1); }
  record() { return this.osc.send("/record", 1); }
  toggleMetronome() { return this.osc.send("/click", 1); }

  /** Set tempo live (no marker). */
  setTempoRaw(bpm: number) { return this.osc.send("/tempo/raw", bpm); }

  /** Seek to a project time in seconds. */
  seek(timeSeconds: number) { return this.osc.send("/time", timeSeconds); }
}

/**
 * Fire-and-forget client for /rt/* addresses served by REAPER's native OSC
 * server. Payload is serialised as a single JSON string arg.
 */
export class RtClient {
  constructor(private osc: OscClient) {}

  /** Fire-and-forget /rt/* write. Payload is serialised as a single JSON string arg. */
  send(address: string, payload: Record<string, unknown> = {}): Promise<void> {
    return this.osc.send(address, JSON.stringify(payload));
  }
}
