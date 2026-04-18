// server/src/osc/server.ts
// Inbound OSC server. Forwards all inbound messages from REAPER to onNative.
// The old /rt/reply/* and /rt/event/* branches have been removed — those were
// used by the custom dispatcher (now superseded by REAPER-native OSC + web remote).

import { Server } from "node-osc";

export type OscMessage = [string, ...(string | number | boolean)[]];

export interface OscServerHandlers {
  onNative?: (address: string, args: (string | number | boolean)[]) => void;
}

export class OscServerWrapper {
  private server: Server;

  constructor(port: number, host: string, private handlers: OscServerHandlers) {
    this.server = new Server(port, host);
    this.server.on("message", (msg: OscMessage) => {
      const [address, ...args] = msg;
      this.handlers.onNative?.(address, args as (string | number | boolean)[]);
    });
  }

  close(): void {
    this.server.close();
  }
}
