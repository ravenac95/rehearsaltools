// server/src/osc/server.ts
// Inbound OSC server. Handles two classes of messages from REAPER:
//   /rt/reply/<reqId>     — correlated replies from the dispatcher ReaScript
//   /rt/event/<topic>     — fire-and-forget events (e.g. /rt/event/transport)
//   anything else         — native REAPER feedback (e.g. /beat, /playing)

import { Server } from "node-osc";

export type OscMessage = [string, ...(string | number | boolean)[]];

export interface OscServerHandlers {
  onReply?: (reqId: string, payloadJson: string) => void;
  onEvent?: (topic: string, payloadJson: string) => void;
  onNative?: (address: string, args: (string | number | boolean)[]) => void;
}

export class OscServerWrapper {
  private server: Server;

  constructor(port: number, host: string, private handlers: OscServerHandlers) {
    this.server = new Server(port, host);
    this.server.on("message", (msg: OscMessage) => {
      const [address, ...args] = msg;
      this.route(address, args as (string | number | boolean)[]);
    });
  }

  private route(address: string, args: (string | number | boolean)[]): void {
    if (address.startsWith("/rt/reply/")) {
      const reqId = address.slice("/rt/reply/".length);
      const payload = typeof args[0] === "string" ? args[0] : "";
      this.handlers.onReply?.(reqId, payload);
      return;
    }
    if (address.startsWith("/rt/event")) {
      const topic = address.slice("/rt/event".length); // keep leading slash
      const payload = typeof args[0] === "string" ? args[0] : "";
      this.handlers.onEvent?.(topic, payload);
      return;
    }
    this.handlers.onNative?.(address, args);
  }

  close(): void {
    this.server.close();
  }
}
