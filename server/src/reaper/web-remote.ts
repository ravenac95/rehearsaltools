// server/src/reaper/web-remote.ts
// Typed HTTP client for REAPER's built-in web remote interface.
// Reads transport state, beat position, regions and markers via /_/ endpoints.
// This replaces the read-side of the old DispatcherClient.

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Play-state mapping ───────────────────────────────────────────────────────

function toPlayState(raw: number): "stopped" | "playing" | "paused" | "recording" {
  // REAPER web remote playstate bitfield:
  // 0 = stopped, 1 = playing, 2 = paused, 5 = recording (play|record)
  if (raw === 1) return "playing";
  if (raw === 2) return "paused";
  if (raw === 5 || raw === 4) return "recording";
  return "stopped";
}

// ── Pure parsers ─────────────────────────────────────────────────────────────

/**
 * Parse a TRANSPORT response from REAPER's web remote.
 * Format: TRANSPORT\t<playstate>\t<position_seconds>\t<repeat>\t<position_str>\t<position_str_beats>\n
 */
export function parseTransport(text: string): TransportSnapshot {
  const line = text.trim();
  const parts = line.split("\t");
  if (parts.length < 6 || parts[0] !== "TRANSPORT") {
    throw new Error(`parseTransport: unexpected format: ${JSON.stringify(text.slice(0, 80))}`);
  }
  const playState = toPlayState(parseInt(parts[1], 10));
  const positionSeconds = parseFloat(parts[2]);
  const repeat = parts[3] === "1";
  const positionStr = parts[4];
  const positionBeats = parts[5];
  return { playState, positionSeconds, repeat, positionStr, positionBeats };
}

/**
 * Parse a BEATPOS response from REAPER's web remote.
 * Format: BEATPOS\t<playstate>\t<position_seconds>\t<full_beat>\t<measure>\t<beat_in_measure>\t<ts_num>\t<ts_denom>\n
 */
export function parseBeatPos(text: string): BeatPosSnapshot {
  const line = text.trim();
  const parts = line.split("\t");
  if (parts.length < 8 || parts[0] !== "BEATPOS") {
    throw new Error(`parseBeatPos: unexpected format: ${JSON.stringify(text.slice(0, 80))}`);
  }
  return {
    playState: toPlayState(parseInt(parts[1], 10)),
    positionSeconds: parseFloat(parts[2]),
    fullBeatPosition: parseFloat(parts[3]),
    measure: parseInt(parts[4], 10),
    beatInMeasure: parseInt(parts[5], 10),
    tsNum: parseInt(parts[6], 10),
    tsDenom: parseInt(parts[7], 10),
  };
}

/**
 * Parse a REGION_LIST or MARKER_LIST response from REAPER's web remote.
 * Format:
 *   REGION_LIST\n  (or MARKER_LIST\n)
 *   REGION\t<name>\t<id>\t<start>\t<end>\t<color>\n  (or MARKER\t...)
 *   ...
 *   REGION_LIST_END\n  (or MARKER_LIST_END\n)
 */
export function parseRegionList(text: string): RegionRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Determine the token prefix (REGION or MARKER)
  const firstLine = lines[0] ?? "";
  let itemToken: string;
  let endToken: string;
  if (firstLine === "REGION_LIST") {
    itemToken = "REGION";
    endToken = "REGION_LIST_END";
  } else if (firstLine === "MARKER_LIST") {
    itemToken = "MARKER";
    endToken = "MARKER_LIST_END";
  } else {
    throw new Error(`parseRegionList: unexpected header: ${JSON.stringify(firstLine)}`);
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine !== endToken) {
    throw new Error(`parseRegionList: missing end token "${endToken}", got "${lastLine}"`);
  }

  const rows: RegionRow[] = [];
  for (let i = 1; i < lines.length - 1; i++) {
    const parts = lines[i].split("\t");
    if (parts[0] !== itemToken || parts.length < 6) continue;

    const rawName = parts[1];
    const rawId = parts[2];
    const start = parseFloat(parts[3]);
    const stop = parseFloat(parts[4]);
    const color = parseInt(parts[5], 10);

    // Strip leading 'R' prefix from id if present
    const idStr = rawId.startsWith("R") ? rawId.slice(1) : rawId;
    const id = parseInt(idStr, 10);

    rows.push({ id, name: rawName, start, stop, color });
  }

  return rows;
}

// ── WebRemoteClient ──────────────────────────────────────────────────────────

export class WebRemoteClient {
  constructor(
    private baseUrl: string,
    private fetchImpl: typeof fetch = fetch,
    private timeoutMs = 2000,
  ) {}

  private async fetchText(command: string): Promise<string> {
    const url = `${this.baseUrl}/_/${command}`;
    const res = await this.fetchImpl(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`REAPER web remote ${command} returned ${res.status}`);
    }
    return res.text();
  }

  async getTransport(): Promise<TransportSnapshot> {
    const text = await this.fetchText("TRANSPORT");
    return parseTransport(text);
  }

  async getBeatPos(): Promise<BeatPosSnapshot> {
    const text = await this.fetchText("BEATPOS");
    return parseBeatPos(text);
  }

  async listRegions(): Promise<RegionRow[]> {
    const text = await this.fetchText("REGION");
    return parseRegionList(text);
  }

  async listMarkers(): Promise<RegionRow[]> {
    const text = await this.fetchText("MARKER");
    return parseRegionList(text);
  }
}
