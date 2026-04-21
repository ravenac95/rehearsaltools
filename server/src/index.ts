// server/src/index.ts
// Bootstrap: wire Fastify, OSC client/server, websocket hub, and stores.

import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";

import { loadConfig } from "./config.js";
import { AppState, nativeEventToTransportPatch } from "./state.js";
import { OscClient, ReaperNativeClient, RtClient } from "./osc/client.js";
import { OscServerWrapper } from "./osc/server.js";
import { WebRemoteClient } from "./reaper/web-remote.js";
import { SongStore } from "./store/song.js";
import { PrefsStore } from "./store/prefs.js";
import { WsHub } from "./ws.js";

import transportRoutes from "./routes/transport.js";
import projectRoutes   from "./routes/project.js";
import regionsRoutes   from "./routes/regions.js";
import mixdownRoutes   from "./routes/mixdown.js";
import songRoutes      from "./routes/song.js";
import debugRoutes     from "./routes/debug.js";
import rehearsalRoutes from "./routes/rehearsal.js";
import songsRoutes     from "./routes/songs.js";

async function main() {
  const config = loadConfig();

  // ── Stores ────────────────────────────────────────────────────────────────
  const store = new SongStore(config.dataFile);
  await store.load();

  const prefs = new PrefsStore(config.prefsFile);
  await prefs.load();

  const state = new AppState();
  const ws = new WsHub();

  // Seed currentRehearsalTypeId from prefs, falling back to the first
  // configured type. Persist the fallback so future boots are stable.
  const persistedTypeId = prefs.getRehearsalTypeId();
  const seedType =
    config.rehearsalTypes.find((t) => t.id === persistedTypeId) ??
    config.rehearsalTypes[0] ??
    null;
  state.currentRehearsalTypeId = seedType?.id ?? null;
  if (seedType && persistedTypeId !== seedType.id) {
    await prefs.setRehearsalTypeId(seedType.id);
  }

  // ── OSC out ───────────────────────────────────────────────────────────────
  // One UDP client to REAPER's OSC port, shared by both native + /rt/* clients.
  const reaperOsc = new OscClient(config.reaperOscHost, config.reaperOscPort);
  const reaper    = new ReaperNativeClient(reaperOsc);
  const rt        = new RtClient(reaperOsc);

  // ── HTTP reads — REAPER's web remote ─────────────────────────────────────
  const webRemote = new WebRemoteClient(
    `http://${config.reaperWebHost}:${config.reaperWebPort}`,
  );

  // ── OSC in — native REAPER feedback ──────────────────────────────────────
  // Drives transport state and synthesises a "transport" WebSocket event.
  const reaperFeedback = new OscServerWrapper(
    config.reaperFeedbackPort, config.reaperFeedbackHost, {
      onNative: (address, args) => {
        const patch = nativeEventToTransportPatch(address, args);
        if (Object.keys(patch).length > 0) {
          const merged = state.updateTransport(patch);
          ws.broadcast({ type: "transport", data: merged });
        }
      },
    },
  );

  // ── Fastify app ───────────────────────────────────────────────────────────
  const app = Fastify({ logger: { level: "info" } });

  await app.register(fastifyCors, { origin: true });
  await app.register(fastifyWebsocket);

  await app.register(transportRoutes({ reaper, state }));
  await app.register(projectRoutes(rt));
  await app.register(regionsRoutes({ rt, webRemote }));
  await app.register(mixdownRoutes(rt));
  await app.register(songRoutes({ store, rt, webRemote, state, ws }));
  await app.register(debugRoutes(rt));
  await app.register(rehearsalRoutes({ reaper, state, ws, config, store, prefs }));
  await app.register(songsRoutes({ store }));

  app.get("/ws", { websocket: true }, (socket /* WebSocket */) => {
    ws.add(socket as any);
    // Send current state snapshot on connect so clients don't wait for the
    // next poll.
    const rehearsalType =
      config.rehearsalTypes.find((t) => t.id === state.currentRehearsalTypeId) ?? null;
    socket.send(JSON.stringify({
      type: "snapshot",
      data: {
        transport: state.transport,
        currentTake: state.currentTake,
        song: store.getSong(),
        rehearsalSegments: state.rehearsalSegments,
        rehearsalStatus: state.rehearsalStatus,
        rehearsalType,
      },
    }));
  });

  // Serve the built web client (if present). This lets the server double as
  // the static file host, so the user only needs to run one process.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, "../../web/dist");
  try {
    await app.register(fastifyStatic, { root: webDist, prefix: "/" });
  } catch (_err) {
    app.log.warn(
      "web/dist not found — SPA will not be served. Run `pnpm -F web build`.",
    );
  }

  // ── Listen ────────────────────────────────────────────────────────────────
  await app.listen({ host: config.httpHost, port: config.httpPort });
  app.log.info(`REAPER OSC → udp://${config.reaperOscHost}:${config.reaperOscPort}`);
  app.log.info(`REAPER web remote → http://${config.reaperWebHost}:${config.reaperWebPort}`);
  app.log.info(`REAPER feedback on udp://${config.reaperFeedbackHost}:${config.reaperFeedbackPort}`);

  // ── Shutdown ──────────────────────────────────────────────────────────────
  const shutdown = async () => {
    app.log.info("shutting down…");
    reaperFeedback.close();
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
