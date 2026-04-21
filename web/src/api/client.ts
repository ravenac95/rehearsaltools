// web/src/api/client.ts
// REST + WebSocket client — updated for the new Song/SongForm/Section/Stanza model.

// ── Song model types ──────────────────────────────────────────────────────────

export type NoteValue = "w" | "h" | "q" | "e" | "s";

export interface Stanza {
  bars: number;
  num: number;
  denom: number;
  bpm?: number;
  note?: NoteValue;
}

export interface Section {
  letter: string;
  stanzas: Stanza[];
  bpm?: number;
  note?: NoteValue;
}

export interface SongForm {
  id: string;
  name: string;
  bpm: number;
  note: NoteValue;
  pattern: string[];
}

export interface Song {
  id: string;
  name: string;
  sections: Section[];
  songForms: SongForm[];
  activeFormId: string | null;
}

// ── Other app types ───────────────────────────────────────────────────────────

export interface Region {
  id: number; name: string; start: number; stop: number;
}
export interface TransportState {
  playing: boolean; recording: boolean; stopped: boolean;
  position: number; bpm: number; num: number; denom: number;
  metronome: boolean;
}
export interface Take { startTime: number; }

// ── Rehearsal types ──────────────────────────────────────────────────────────

export interface RehearsalType {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface RehearsalSegment {
  id: string;
  type: "take" | "discussion";
  num: number;
  songId: string;
  songName: string;
  startPosition: number;
}

export type RehearsalStatus = "idle" | "discussion" | "take" | "playback";

export interface SongListItem {
  id: string;
  name: string;
  bpm: number;
  timeSig: string;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

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

// ── API ───────────────────────────────────────────────────────────────────────

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

  // Song
  getSong: () => req<{ song: Song }>("/api/song"),
  updateSong: (partial: Partial<Pick<Song, "name" | "activeFormId">>) =>
    req<{ song: Song }>("/api/song", { method: "PUT", body: JSON.stringify(partial) }),
  upsertSection: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) =>
    req<{ song: Song }>(`/api/song/sections/${letter}`,
      { method: "PUT", body: JSON.stringify({ stanzas, bpm, note }) }),
  deleteSection: (letter: string) =>
    req<{ song: Song; warning: string | null }>(`/api/song/sections/${letter}`,
      { method: "DELETE", body: JSON.stringify({}) }),
  createForm: () =>
    req<{ song: Song }>("/api/song/forms", { method: "POST", body: JSON.stringify({}) }),
  updateForm: (id: string, partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>) =>
    req<{ song: Song }>(`/api/song/forms/${id}`,
      { method: "PUT", body: JSON.stringify(partial) }),
  deleteForm: (id: string) =>
    req<{ song: Song }>(`/api/song/forms/${id}`, { method: "DELETE", body: JSON.stringify({}) }),
  writeActiveForm: (id: string, regionName?: string) =>
    req<{ ok: boolean; startTime: number }>(`/api/song/forms/${id}/write`,
      { method: "POST", body: JSON.stringify({ regionName }) }),

  // Mixdown
  mixdownAll: (output_dir?: string) => req("/api/mixdown/all",
    { method: "POST", body: JSON.stringify({ output_dir }) }),

  // Debug
  setLogEnabled: (enabled: boolean) =>
    req<{ enabled: boolean }>("/api/debug/logging",
      { method: "POST", body: JSON.stringify({ enabled }) }),

  // Rehearsal
  getRehearsalTypes: () => req<{ types: RehearsalType[] }>("/api/rehearsal/types"),
  setRehearsalType: (typeId: string) => req<{ ok: boolean; type: RehearsalType }>(
    "/api/rehearsal/type", { method: "POST", body: JSON.stringify({ typeId }) }),
  startRehearsal: () => req<{ ok: boolean; segment: RehearsalSegment }>(
    "/api/rehearsal/start", { method: "POST", body: JSON.stringify({}) }),
  setCategory: (category: "take" | "discussion") => req<{ ok: boolean; segment: RehearsalSegment }>(
    "/api/rehearsal/set-category", { method: "POST", body: JSON.stringify({ category }) }),
  endRehearsal: () => req("/api/rehearsal/end", { method: "POST", body: JSON.stringify({}) }),

  // Songs
  listSongs: () => req<{ songs: SongListItem[] }>("/api/songs"),
  selectSong: (id: string) => req<{ ok: boolean; song: Song }>(
    `/api/songs/${id}/select`, { method: "POST", body: JSON.stringify({}) }),
};

// ── WebSocket ─────────────────────────────────────────────────────────────────

export type WsMessage =
  | {
      type: "snapshot";
      data: {
        transport: Partial<TransportState>;
        currentTake: Take | null;
        song: Song;
        rehearsalSegments?: RehearsalSegment[];
        rehearsalStatus?: RehearsalStatus;
        rehearsalType?: RehearsalType | null;
      };
    }
  | { type: "transport"; data: TransportState }
  | { type: "songform:written"; data: { startTime: number; regionName?: string } }
  | { type: "rehearsal:started"; data: { segment: RehearsalSegment } }
  | { type: "rehearsal:segment"; data: { segment: RehearsalSegment } }
  | { type: "rehearsal:ended"; data: Record<string, never> }
  | { type: "rehearsal:type-changed"; data: { type: RehearsalType } }
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
