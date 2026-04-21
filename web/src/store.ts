// web/src/store.ts
// Zustand store for app state — refactored from sections/songForm to unified song slice.

import { create } from "zustand";
import type {
  Song, SongForm, TransportState, Region, Take, WsMessage, NoteValue, Stanza,
  RehearsalType, RehearsalSegment, RehearsalStatus,
} from "./api/client";
import { api } from "./api/client";

const EMPTY_SONG: Song = {
  id: "", name: "", sections: [], songForms: [], activeFormId: null,
};

export interface AppStore {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  song: Song;
  regions: Region[];
  loading: boolean;
  error: string | null;
  toast: string | null;  // transient warning toast

  // Rehearsal state (server-authoritative, driven by WS)
  rehearsalStatus: RehearsalStatus;
  rehearsalTypes: RehearsalType[];
  rehearsalType: RehearsalType | null;
  takes: RehearsalSegment[];
  currentSegmentStart: number | null;

  // Playback
  currentTakeIdx: number | null;  // index into takes[] for playback

  // UI flags
  songMode: "simple" | "complex";
  playbackDrawerOpen: boolean;
  songPickerOpen: boolean;
  typePickerOpen: boolean;
  menuOpen: boolean;

  // Simple mode song values (independent of complex Song model)
  simpleBpm: number;
  simpleNote: NoteValue;
  simpleNum: number;
  simpleDenom: number;

  // Infrastructure
  refresh: () => Promise<void>;
  refreshRegions: () => Promise<void>;
  applyWsMessage: (msg: WsMessage) => void;
  setError: (err: string | null) => void;
  clearToast: () => void;

  // Song
  refreshSong: () => Promise<void>;
  updateSongName: (name: string) => Promise<void>;
  setActiveForm: (id: string) => Promise<void>;
  createForm: () => Promise<void>;
  updateForm: (id: string, partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  upsertSection: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) => Promise<void>;
  deleteSection: (letter: string) => Promise<void>;
  writeActiveForm: (regionName?: string) => Promise<void>;

  // Rehearsal actions
  fetchRehearsalTypes: () => Promise<void>;
  setRehearsalType: (type: RehearsalType) => void;
  startRehearsal: () => Promise<void>;
  setCategory: (category: "take" | "discussion") => Promise<void>;
  endRehearsal: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  selectTakeForPlayback: (idx: number) => void;

  // UI setters
  setSongMode: (mode: "simple" | "complex") => void;
  setPlaybackDrawerOpen: (open: boolean) => void;
  setSongPickerOpen: (open: boolean) => void;
  setTypePickerOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setSimpleBpm: (bpm: number) => void;
  setSimpleNote: (note: NoteValue) => void;
  setSimpleTimeSig: (num: number, denom: number) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  transport: {},
  currentTake: null,
  song: EMPTY_SONG,
  regions: [],
  loading: false,
  error: null,
  toast: null,

  // Rehearsal initial state
  rehearsalStatus: "idle",
  rehearsalTypes: [],
  rehearsalType: null,
  takes: [],
  currentSegmentStart: null,
  currentTakeIdx: null,

  // UI flags initial state
  songMode: "simple",
  playbackDrawerOpen: false,
  songPickerOpen: false,
  typePickerOpen: false,
  menuOpen: false,

  // Simple mode initial values
  simpleBpm: 120,
  simpleNote: "q",
  simpleNum: 4,
  simpleDenom: 4,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [songRes, rg] = await Promise.all([
        api.getSong(), api.listRegions(),
      ]);
      set({
        song: songRes.song,
        regions: rg.regions,
        loading: false,
      });
      // Fetch rehearsal types if not already loaded
      if (get().rehearsalTypes.length === 0) {
        await get().fetchRehearsalTypes();
      }
    } catch (err: any) {
      set({ loading: false, error: String(err.message ?? err) });
    }
  },

  refreshRegions: async () => {
    try {
      const { regions } = await api.listRegions();
      set({ regions });
    } catch (err: any) {
      set({ error: String(err.message ?? err) });
    }
  },

  applyWsMessage: (msg) => {
    if (msg.type === "snapshot") {
      const d = msg.data as {
        transport?: Partial<TransportState>;
        currentTake: Take | null;
        song: Song;
        rehearsalSegments?: RehearsalSegment[];
        rehearsalStatus?: RehearsalStatus;
      };
      const update: Partial<AppStore> = {
        transport: d.transport ?? {},
        currentTake: d.currentTake,
        song: d.song,
      };
      if (d.rehearsalSegments !== undefined) {
        update.takes = d.rehearsalSegments;
        const status = d.rehearsalStatus ?? "idle";
        const isActive = status === "discussion" || status === "take";
        const last = d.rehearsalSegments[d.rehearsalSegments.length - 1];
        update.currentSegmentStart = isActive && last ? last.startPosition : null;
      }
      if (d.rehearsalStatus !== undefined) update.rehearsalStatus = d.rehearsalStatus;
      set(update);
    } else if (msg.type === "transport") {
      set({ transport: msg.data as TransportState });
    } else if (msg.type === "songform:written") {
      const d = msg.data as { startTime: number };
      set({ currentTake: { startTime: d.startTime } });
      get().refreshRegions();
    } else if (msg.type === "rehearsal:started") {
      const { segment } = (msg as { type: "rehearsal:started"; data: { segment: RehearsalSegment } }).data;
      set({
        takes: [segment],
        rehearsalStatus: "discussion",
        currentSegmentStart: segment.startPosition,
        currentTakeIdx: null,
      });
    } else if (msg.type === "rehearsal:segment") {
      const { segment } = (msg as { type: "rehearsal:segment"; data: { segment: RehearsalSegment } }).data;
      set((s) => ({
        takes: [...s.takes, segment],
        rehearsalStatus: segment.type,
        currentSegmentStart: segment.startPosition,
      }));
    } else if (msg.type === "rehearsal:ended") {
      set({
        takes: [],
        rehearsalStatus: "idle",
        currentSegmentStart: null,
        currentTakeIdx: null,
      });
    }
  },

  setError: (err) => set({ error: err }),
  clearToast: () => set({ toast: null }),

  // Song actions
  refreshSong: async () => {
    const { song } = await api.getSong();
    set({ song });
  },

  updateSongName: async (name) => {
    const { song } = await api.updateSong({ name });
    set({ song });
  },

  setActiveForm: async (id) => {
    const { song } = await api.updateSong({ activeFormId: id });
    set({ song });
  },

  createForm: async () => {
    const { song } = await api.createForm();
    set({ song });
  },

  updateForm: async (id, partial) => {
    const { song } = await api.updateForm(id, partial);
    set({ song });
  },

  deleteForm: async (id) => {
    const { song } = await api.deleteForm(id);
    set({ song });
  },

  upsertSection: async (letter, stanzas, bpm, note) => {
    const { song } = await api.upsertSection(letter, stanzas, bpm, note);
    set({ song });
  },

  deleteSection: async (letter) => {
    const result = await api.deleteSection(letter);
    set({ song: result.song, toast: result.warning ?? null });
  },

  writeActiveForm: async (regionName) => {
    const { song } = get();
    if (!song.activeFormId) throw new Error("no active form");
    await api.writeActiveForm(song.activeFormId, regionName);
    await get().refreshRegions();
  },

  // ── Rehearsal actions ────────────────────────────────────────────────────

  fetchRehearsalTypes: async () => {
    try {
      const { types } = await api.getRehearsalTypes();
      set({ rehearsalTypes: types });
    } catch (err: any) {
      // Non-fatal — types may load later
      console.warn("fetchRehearsalTypes failed:", err.message ?? err);
    }
  },

  setRehearsalType: (type) => set({ rehearsalType: type }),

  startRehearsal: async () => {
    const { rehearsalType } = get();
    if (!rehearsalType) throw new Error("no rehearsal type selected");
    await api.startRehearsal(rehearsalType.id);
  },

  setCategory: async (category) => {
    await api.setCategory(category);
  },

  endRehearsal: async () => {
    await api.endRehearsal();
  },

  stopPlayback: async () => {
    await api.stop();
    set({ rehearsalStatus: "discussion" });
  },

  selectTakeForPlayback: (idx) => {
    set({ currentTakeIdx: idx, rehearsalStatus: "playback" });
  },

  // ── UI setters ───────────────────────────────────────────────────────────

  setSongMode: (mode) => set({ songMode: mode }),
  setPlaybackDrawerOpen: (open) => set({ playbackDrawerOpen: open }),
  setSongPickerOpen: (open) => set({ songPickerOpen: open }),
  setTypePickerOpen: (open) => set({ typePickerOpen: open }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setSimpleBpm: (bpm) => set({ simpleBpm: bpm }),
  setSimpleNote: (note) => set({ simpleNote: note }),
  setSimpleTimeSig: (num, denom) => set({ simpleNum: num, simpleDenom: denom }),
}));
