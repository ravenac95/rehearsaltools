// server/src/index.ts
// Bootstrap: wire Fastify, node-osc client/server, websocket hub, and stores.

import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";

import { loadConfig } from "./config.js";
import { AppState } from "./state.js";
import { OscClient, ReaperNativeClient } from "./osc/client.js";
import { OscServerWrapper } from "./osc/server.js";
import { DispatcherClient } from "./osc/commands.js";
import { SectionsStore } from "./store/sections.js";
import { WsHub } from "./ws.js";

import transportRoutes from "./routes/transport.js";
import projectRoutes   from "./routes/project.js";
import regionsRoutes   from "./routes/regions.js";
import mixdownRoutes   from "./routes/mixdown.js";
import sectionsRoutes  from "./routes/sections.js";
import songformRoutes  from "./routes/songform.js";

async function main() {
  const config = loadConfig();

  // ── Stores ────────────────────────────────────────────────────────────────
  const store = new SectionsStore(config.dataFile);
  await store.load();

  const state = new AppState();
  const ws = new WsHub();

  // ── OSC out ───────────────────────────────────────────────────────────────
  const dispatcherOsc = new OscClient(config.dispatcherHost, config.dispatcherPort);
  const reaperOsc     = new OscClient(config.reaperOscHost,  config.reaperOscPort);
  const dispatcher    = new DispatcherClient(dispatcherOsc);
  const reaper        = new ReaperNativeClient(reaperOsc);

  // ── OSC in ────────────────────────────────────────────────────────────────
  const dispatcherReplies = new OscServerWrapper(config.replyPort, config.replyHost, {
    onReply: (reqId, payload) => dispatcher.handleReply(reqId, payload),
    onEvent: (topic, payload) => {
      try {
        const parsed = JSON.parse(payload) as { event: string; data: unknown };
        if (topic === "/transport") {
          const patch = parsed.data as Record<string, unknown>;
          const merged = state.updateTransport(patch as any);
          ws.broadcast({ type: "transport", data: merged });
        } else {
          ws.broadcast({ type: "event" + topic, data: parsed.data });
        }
      } catch (err) {
        console.error("bad event payload:", err);
      }
    },
    onNative: (address, args) => {
      // Native REAPER feedback (e.g. /beat, /playing). Forward opaquely.
      ws.broadcast({ type: "reaper-native", data: { address, args } });
    },
  });

  // ── Fastify app ───────────────────────────────────────────────────────────
  const app = Fastify({ logger: { level: "info" } });

  await app.register(fastifyCors, { origin: true });
  await app.register(fastifyWebsocket);

  await app.register(transportRoutes({ reaper, state }));
  await app.register(projectRoutes(dispatcher));
  await app.register(regionsRoutes(dispatcher));
  await app.register(mixdownRoutes(dispatcher));
  await app.register(sectionsRoutes(store));
  await app.register(songformRoutes({ store, dispatcher, state, ws }));

  app.get("/ws", { websocket: true }, (socket /* WebSocket */) => {
    ws.add(socket as any);
    // Send current state snapshot on connect so clients don't wait for the
    // next poll.
    socket.send(JSON.stringify({
      type: "snapshot",
      data: {
        transport: state.transport,
        currentTake: state.currentTake,
        sections: store.listSections(),
        songForm: store.getSongForm(),
      },
    }));
  });

  // Serve the built web client (if present). This lets the server double as
  // the static file host, so the user only needs to run one process.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, "../../web/dist");
  try {
    await app.register(fastifyStatic, { root: webDist, prefix: "/" });
  } catch (err) {
    app.log.warn(
      "web/dist not found — SPA will not be served. Run `pnpm -F web build`.",
    );
  }

  // ── Listen ────────────────────────────────────────────────────────────────
  await app.listen({ host: config.httpHost, port: config.httpPort });
  app.log.info(`REAPER dispatcher → udp://${config.dispatcherHost}:${config.dispatcherPort}`);
  app.log.info(`REAPER native OSC → udp://${config.reaperOscHost}:${config.reaperOscPort}`);
  app.log.info(`Listening for OSC replies on udp://${config.replyHost}:${config.replyPort}`);

  // ── Shutdown ──────────────────────────────────────────────────────────────
  const shutdown = async () => {
    app.log.info("shutting down…");
    dispatcherReplies.close();
    await dispatcherOsc.close();
    await reaperOsc.close();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
