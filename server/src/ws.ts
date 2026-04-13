// server/src/ws.ts
// In-process WebSocket broadcast hub. Routes in-process events to all
// connected clients. Implemented as a plain set of sockets — no fan-out
// topics; the client filters by message type.

import type { WebSocket } from "ws";

export interface WsEvent {
  type: string;
  data?: unknown;
}

export class WsHub {
  private sockets = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.sockets.add(socket);
    socket.on("close", () => this.sockets.delete(socket));
  }

  broadcast(event: WsEvent): void {
    const msg = JSON.stringify(event);
    for (const s of this.sockets) {
      if (s.readyState === 1 /* OPEN */) {
        s.send(msg);
      }
    }
  }

  size(): number {
    return this.sockets.size;
  }
}
