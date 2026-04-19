// web/src/api/client.ts
// REST + WebSocket client.

export interface SectionRow {
  bars: number; num: number; denom: number; bpm: number;
}
export interface Section {
  id: string; name: string; rows: SectionRow[];
}
export interface SongForm {
  sectionIds: string[];
}
export interface Region {
  id: number; name: string; start: number; stop: number;
}
export interface TransportState {
  playing: boolean; recording: boolean; stopped: boolean;
  position: number; bpm: number; num: number; denom: number;
  metronome: boolean;
}
export interface Take { startTime: number; }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json()) as any;
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  // Transport
  play: () => req("/api/transport/play", { method: "POST", body: JSON.stringify({}) }),
  stop: () => req("/api/transport/stop", { method: "POST", body: JSON.stringify({}) }),
  record: () => req("/api/transport/record", { method: "POST", body: JSON.stringify({}) }),
  recordTake: () => req("/api/transport/record-take", { method: "POST", body: JSON.stringify({}) }),
  seek: (time: number) => req("/api/transport/seek",
    { method: "POST", body: JSON.stringify({ time }) }),
  tempo: (bpm: number) => req("/api/transport/tempo",
    { method: "POST", body: JSON.stringify({ bpm }) }),
  toggleMetronome: () => req("/api/transport/metronome/toggle", { method: "POST", body: JSON.stringify({}) }),

  // Project
  newProject: () => req("/api/project/new", { method: "POST", body: JSON.stringify({}) }),

  // Regions
  listRegions: () => req<{ regions: Region[] }>("/api/regions"),
  createRegion: (name: string) => req<{ region: Region }>("/api/regions",
    { method: "POST", body: JSON.stringify({ name }) }),
  renameRegion: (id: number, name: string) =>
    req<{ region: Region }>(`/api/regions/${id}`,
      { method: "PATCH", body: JSON.stringify({ name }) }),
  playRegion: (id: number) =>
    req(`/api/regions/${id}/play`, { method: "POST", body: JSON.stringify({}) }),
  seekToEnd: () => req<{ position: number }>("/api/playhead/end", { method: "POST", body: JSON.stringify({}) }),

  // Sections
  listSections: () => req<{ sections: Section[] }>("/api/sections"),
  createSection: (name: string, rows: SectionRow[]) =>
    req<{ section: Section }>("/api/sections",
      { method: "POST", body: JSON.stringify({ name, rows }) }),
  updateSection: (id: string, name: string, rows: SectionRow[]) =>
    req<{ section: Section }>(`/api/sections/${id}`,
      { method: "PUT", body: JSON.stringify({ name, rows }) }),
  deleteSection: (id: string) =>
    req(`/api/sections/${id}`, { method: "DELETE", body: JSON.stringify({}) }),

  // Song form
  getSongForm: () => req<{
    songForm: SongForm; totalBars: number;
    flat: Array<{ barOffset: number; num: number; denom: number; bpm: number }>;
  }>("/api/songform"),
  setSongForm: (sectionIds: string[]) =>
    req<{ songForm: SongForm }>("/api/songform",
      { method: "PUT", body: JSON.stringify({ sectionIds }) }),
  writeSongForm: (regionName?: string) =>
    req<{ startTime: number }>("/api/songform/write",
      { method: "POST", body: JSON.stringify({ regionName }) }),

  // Mixdown
  mixdownAll: (output_dir?: string) => req("/api/mixdown/all",
    { method: "POST", body: JSON.stringify({ output_dir }) }),

  // Debug
  setLogEnabled: (enabled: boolean) =>
    req<{ enabled: boolean }>("/api/debug/logging",
      { method: "POST", body: JSON.stringify({ enabled }) }),
};

// ── WebSocket ──────────────────────────────────────────────────────────────

export type WsMessage =
  | { type: "snapshot"; data: { transport: Partial<TransportState>; currentTake: Take | null; sections: Section[]; songForm: SongForm } }
  | { type: "transport"; data: TransportState }
  | { type: "songform:written"; data: { startTime: number; regionName?: string } }
  | { type: string; data: unknown };

export function connectWs(onMessage: (msg: WsMessage) => void): WebSocket {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch (err) {
      console.error("bad ws message", err);
    }
  };
  return ws;
}
