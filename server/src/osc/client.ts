// server/src/osc/client.ts
// Thin wrapper over node-osc Client for the two outbound UDP channels:
//   1. REAPER native OSC  (/play, /stop, /tempo/raw, /time, /click)
//   2. Custom dispatcher  (/rt/*)
//
// The wrapper exposes typed helpers and a single `send()` for raw messages.

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
