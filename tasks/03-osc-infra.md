# Task 03: OSC infrastructure — RtClient, simplified server, transport reducer, config

## Dependencies
None.

## Goal

Reshape the Node-side OSC layer for the new architecture:

1. Add `RtClient` for fire-and-forget `/rt/*` writes on the native port.
2. Simplify `OscServerWrapper` to only handle native feedback (drop reply +
   event correlation).
3. Add a pure reducer `nativeEventToTransportPatch` in `state.ts` that
   converts a native-OSC event `{ address, args }` into a
   `Partial<TransportState>`.
4. Update `config.ts` — add `reaperWebHost`/`reaperWebPort`, remove
   `dispatcherHost`/`dispatcherPort`, `replyHost`/`replyPort`.

## Files

### Modify

- `server/src/osc/client.ts`          — add `RtClient` class
- `server/src/osc/server.ts`          — drop `onReply` + `onEvent`, keep `onNative`
- `server/src/state.ts`               — add `nativeEventToTransportPatch`
- `server/src/config.ts`              — rotate env vars

### Create

- `server/src/osc/client.test.ts`     — covers `RtClient` (if no existing file)
- `server/src/state.test.ts`          — covers the reducer

## TDD steps

### 1. `RtClient` in `server/src/osc/client.ts`

Add below `ReaperNativeClient`:

```ts
export class RtClient {
  constructor(private osc: OscClient) {}

  /** Fire-and-forget /rt/* write. Payload is serialised as a single JSON string arg. */
  send(address: string, payload: Record<string, unknown> = {}): Promise<void> {
    return this.osc.send(address, JSON.stringify(payload));
  }
}
```

Test (`client.test.ts`) with a fake `OscClient` that records calls:

- `send("/rt/project/new")` → underlying osc received
  `("/rt/project/new", "{}")`.
- `send("/rt/region/new", { name: "intro" })` → osc received
  `("/rt/region/new", '{"name":"intro"}')`.

### 2. Simplify `OscServerWrapper` in `server/src/osc/server.ts`

Read the file first. Its current interface likely accepts
`{ onReply, onEvent, onNative }` callbacks and routes by address prefix.

Refactor:

- Keep only the `onNative` callback in the options type.
- Remove the `/rt/reply/*` and `/rt/event/*` branches.
- The server now forwards every inbound OSC message to `onNative(address, args)`.

This is called from two places in `index.ts` today — the reply server and the
feedback server. After task 10 (index wiring) only the feedback server
remains. For this task, just simplify the class; `index.ts` still compiles
because the dispatcher-replies block will be deleted in task 10.

Add/update tests if `server/src/osc/server.test.ts` exists; otherwise skip.

### 3. Reducer in `server/src/state.ts`

Add (alongside `updateTransport`):

```ts
/**
 * Map a native REAPER OSC event into a transport patch.
 * Returns an empty patch for addresses we don't care about.
 */
export function nativeEventToTransportPatch(
  address: string,
  args: readonly (string | number | boolean)[],
): Partial<TransportState> {
  switch (address) {
    case "/play":     return { playing: true,  stopped: false, recording: false };
    case "/stop":     return { playing: false, stopped: true,  recording: false };
    case "/record":   return { playing: false, stopped: false, recording: true  };
    case "/playing":  return { playing:   Boolean(args[0]) };
    case "/stopped":  return { stopped:   Boolean(args[0]) };
    case "/recording":return { recording: Boolean(args[0]) };
    case "/tempo":    return { bpm:      Number(args[0]) };
    case "/timesig_num":   return { num:   Number(args[0]) };
    case "/timesig_denom": return { denom: Number(args[0]) };
    case "/time":     return { position: Number(args[0]) };
    case "/click":    return { metronome: Boolean(args[0]) };
    default:          return {};
  }
}
```

Also drop `Take.regionId` — change the interface to `{ startTime: number }`
only. `setTake` still accepts `Take | null`.

Test (`state.test.ts`):

- `nativeEventToTransportPatch("/play", [1])` → `{ playing: true, stopped: false, recording: false }`.
- `/tempo 120.5` → `{ bpm: 120.5 }`.
- `/time 42.3` → `{ position: 42.3 }`.
- Unknown address → `{}`.
- Round-trip via `AppState.updateTransport` — merging sequential patches
  accumulates state.

### 4. `config.ts`

- Remove: `dispatcherHost`, `dispatcherPort`, `replyHost`, `replyPort`.
- Add: `reaperWebHost: strEnv("REAPER_WEB_HOST", "127.0.0.1")`,
  `reaperWebPort: intEnv("REAPER_WEB_PORT", 8080)`.
- Note in a comment: REAPER's web remote and Node's HTTP server will collide
  on port 8080 by default; the user must pick different ports in one or the
  other. (Default unchanged to avoid breaking existing env files.)

No test required for config — it's a flat data producer.

## Acceptance

- `pnpm -F server test -- client state` passes (or all, if you prefer).
- `pnpm -F server build` compiles. (Expected: `index.ts` will fail to compile
  until task 10 rewires it; this is tracked by the dependency chain — the
  orchestrator will see task 10 depends on this and run it next.)

## Non-goals for this task

- Do NOT touch `index.ts` or any `routes/*.ts` file. Those happen in
  dedicated tasks.
- Do NOT delete `server/src/osc/commands.ts` — that's task 11.

## Commit

```
feat(server): add RtClient, native-event reducer; simplify OscServerWrapper
```
