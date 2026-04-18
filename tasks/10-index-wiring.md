# Task 10: server/index.ts — wire the new clients and synthesize transport events

## Dependencies
- 02-web-remote-client.md
- 03-osc-infra.md
- 07-routes-regions.md
- 08-routes-songform.md
- 09-routes-project-mixdown.md

## Goal

Rewire `server/src/index.ts`:

- Drop the `DispatcherClient`, the separate `dispatcherOsc` client, and the
  `dispatcherReplies` OSC server.
- Construct a `WebRemoteClient` from `config.reaperWebHost`/`…Port`.
- Construct an `RtClient` from the existing `reaperOsc` (same port as native
  OSC writes — `/rt/*` is served by REAPER's OSC server now).
- Simplify the feedback server to call a single inline handler that:
  - runs the raw event through `nativeEventToTransportPatch`,
  - merges the patch into `state.updateTransport`,
  - broadcasts the merged transport state as `{ type: "transport", data }`,
  - still forwards the raw `{ address, args }` as `reaper-native` (if any
    existing client wants it — keep or drop based on whether SPA uses it;
    grep to confirm, drop if unused).

## Files

### Modify

- `server/src/index.ts`

## Changes

Target shape:

```ts
import { loadConfig } from "./config.js";
import { AppState, nativeEventToTransportPatch } from "./state.js";
import { OscClient, ReaperNativeClient, RtClient } from "./osc/client.js";
import { OscServerWrapper } from "./osc/server.js";
import { WebRemoteClient } from "./reaper/web-remote.js";
// … stores + ws + routes imports (drop DispatcherClient)

async function main() {
  const config = loadConfig();

  const store = new SectionsStore(config.dataFile);
  await store.load();

  const state = new AppState();
  const ws = new WsHub();

  // OSC out — one UDP client to REAPER's OSC port, shared by both clients.
  const reaperOsc = new OscClient(config.reaperOscHost, config.reaperOscPort);
  const reaper    = new ReaperNativeClient(reaperOsc);
  const rt        = new RtClient(reaperOsc);

  // HTTP — REAPER's web remote, for reads.
  const webRemote = new WebRemoteClient(`http://${config.reaperWebHost}:${config.reaperWebPort}`);

  // OSC in — native feedback. Drives transport state + synthesised transport ws event.
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

  const app = Fastify({ logger: { level: "info" } });
  await app.register(fastifyCors, { origin: true });
  await app.register(fastifyWebsocket);

  await app.register(transportRoutes({ reaper, state }));
  await app.register(projectRoutes(rt));
  await app.register(regionsRoutes({ rt, webRemote }));
  await app.register(mixdownRoutes(rt));
  await app.register(sectionsRoutes(store));
  await app.register(songformRoutes({ store, rt, webRemote, state, ws }));

  // /ws snapshot — unchanged

  await app.listen({ host: config.httpHost, port: config.httpPort });
  app.log.info(`REAPER OSC → udp://${config.reaperOscHost}:${config.reaperOscPort}`);
  app.log.info(`REAPER web remote → http://${config.reaperWebHost}:${config.reaperWebPort}`);
  app.log.info(`REAPER feedback on udp://${config.reaperFeedbackHost}:${config.reaperFeedbackPort}`);

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

main().catch((err) => { console.error(err); process.exit(1); });
```

## Acceptance

- `pnpm -F server build` compiles (tsc clean).
- `pnpm -F server test` passes.
- `index.ts` has no reference to `DispatcherClient`, `dispatcherOsc`, or the
  old reply-server block.

## Commit

```
refactor(server): wire WebRemoteClient + RtClient in index.ts
```
