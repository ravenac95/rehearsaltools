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
      console.log("OSC send", address, ...args);
      this.client.send(address, ...args, (err: Error | null) => {
        console.log("OSC send callback", { err });
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
  constructor(private osc: OscClient) { }

  play() { return this.osc.send("/play", 1); }
  stop() { return this.osc.send("/stop", 1); }
  record() { return this.osc.send("/record", 1); }
  toggleMetronome() { return this.osc.send("/click", 1); }

  /** Set tempo live (no marker). */
  setTempoRaw(bpm: number) { return this.osc.send("/tempo/raw", bpm); }

  /** Seek to a project time in seconds. */
  seek(timeSeconds: number) { return this.osc.send("/time", timeSeconds); }
}

/**
 * Fire-and-forget client for the single `/rehearsaltools` OSC endpoint served
 * by REAPER's native OSC server. The `command` name plus the remaining
 * payload fields are serialised as one JSON string arg; the REAPER-side
 * dispatcher routes by `command`.
 */
export class RtClient {
  constructor(private osc: OscClient, private address: string = "/rehearsaltools") { }

  /** Fire-and-forget. `command` is packed into the JSON payload. */
  send(command: string, payload: Record<string, unknown> = {}): Promise<void> {
    return this.osc.send(this.address, JSON.stringify({ command, ...payload }));
  }
}
