# Task 02: WebRemoteClient — typed HTTP wrapper around REAPER's web remote

## Dependencies
None.

## Goal

Create `server/src/reaper/web-remote.ts` — a typed client that fetches
`/_/TRANSPORT`, `/_/BEATPOS`, `/_/REGION`, and `/_/MARKER` from REAPER's
built-in web interface, with pure parsers tested against fixture strings.

This replaces the read-side of the old `DispatcherClient`.

## Files

### Create

- `server/src/reaper/web-remote.ts`
- `server/src/reaper/web-remote.test.ts`

## Background

REAPER's web remote returns tab-delimited, newline-separated plaintext.
Example TRANSPORT response (from REAPER docs):

```
TRANSPORT\t<playstate>\t<position_seconds>\t<repeat>\t<position_str>\t<position_str_beats>\n
```

- `playstate`: 0 = stopped, 1 = playing, 2 = paused, 5 = recording
  (REAPER bitfield: 1=play, 2=pause, 4=record; but in practice the web
  endpoint returns one of 0/1/2/5).
- `position_seconds`: float
- `repeat`: 0 or 1
- `position_str`: e.g. "1:23.456" (minutes:seconds)
- `position_str_beats`: e.g. "3.2.50" (bar.beat.ticks)

BEATPOS:

```
BEATPOS\t<playstate>\t<position_seconds>\t<full_beat_position>\t<measure>\t<beat_in_measure>\t<ts_num>\t<ts_denom>\n
```

REGION (one row per region, terminated by REGION_LIST_END):

```
REGION_LIST\n
REGION\t<name>\t<id>\t<start_seconds>\t<end_seconds>\t<color_int>\n
...
REGION_LIST_END\n
```

Note: the `id` in REGION rows is REAPER's internal markrgnindexnumber (the
same ID the rename/play endpoints take). The prefix 'R' sometimes appears —
verify with a live fetch; strip it if present.

MARKER has the same shape as REGION but with `MARKER_LIST`/`MARKER` tokens.

## TDD steps

### 1. Parsers (pure functions)

Write `web-remote.test.ts` first. Use vitest (`server/vitest.config.ts` is
already set up — check it to confirm). Inject fixture strings directly.

Exports to test:

```ts
export interface TransportSnapshot {
  playState: "stopped" | "playing" | "paused" | "recording";
  positionSeconds: number;
  repeat: boolean;
  positionStr: string;
  positionBeats: string;
}

export interface BeatPosSnapshot {
  playState: "stopped" | "playing" | "paused" | "recording";
  positionSeconds: number;
  fullBeatPosition: number;
  measure: number;
  beatInMeasure: number;
  tsNum: number;
  tsDenom: number;
}

export interface RegionRow {
  id: number;
  name: string;
  start: number;
  stop: number;
  color: number;
}

export function parseTransport(text: string): TransportSnapshot;
export function parseBeatPos(text: string): BeatPosSnapshot;
export function parseRegionList(text: string): RegionRow[];  // parses MARKER too
```

Test cases (minimum):

- `parseTransport` with stopped fixture, playing fixture, recording fixture.
- `parseBeatPos` with a typical 4/4 fixture.
- `parseRegionList` with 0, 1, and 3 regions.
- `parseRegionList` with id prefixed by 'R' (strip it).
- Malformed input — parser throws with a clear message.

### 2. `WebRemoteClient` class

```ts
export class WebRemoteClient {
  constructor(
    private baseUrl: string,   // e.g. "http://127.0.0.1:8080"
    private fetchImpl: typeof fetch = fetch,
    private timeoutMs = 2000,
  ) {}

  async getTransport(): Promise<TransportSnapshot>;
  async getBeatPos(): Promise<BeatPosSnapshot>;
  async listRegions(): Promise<RegionRow[]>;
  async listMarkers(): Promise<RegionRow[]>;
}
```

Implementation:

- Each method calls `this.fetchImpl(baseUrl + "/_/" + COMMAND, { signal: AbortSignal.timeout(this.timeoutMs) })`.
- On non-2xx, throw `Error("REAPER web remote <COMMAND> returned <status>")`.
- Parse the text with the corresponding parser and return the typed result.

Test cases:

- Inject a fake `fetchImpl` that returns a `Response` with fixture text →
  methods return parsed objects.
- Injected fetch that returns 500 → method rejects with a clear error.
- Injected fetch that throws (network failure) → method rejects with the
  underlying error.

## Acceptance

- `pnpm -F server test -- web-remote` passes.
- Parsers are pure (no I/O), covered by fixtures.
- `WebRemoteClient` never imports from any other file in `server/src/` — it's
  self-contained infrastructure.

## Commit

```
feat(server): add WebRemoteClient for REAPER web remote reads
```
