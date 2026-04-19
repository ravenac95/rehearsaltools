// web/src/store.ts
// Zustand store for app state — refactored from sections/songForm to unified song slice.

import { create } from "zustand";
import type {
  Song, SongForm, TransportState, Region, Take, WsMessage, NoteValue, Stanza,
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
}

export const useStore = create<AppStore>((set, get) => ({
  transport: {},
  currentTake: null,
  song: EMPTY_SONG,
  regions: [],
  loading: false,
  error: null,
  toast: null,

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
      const d = msg.data as { transport?: Partial<TransportState>; currentTake: Take | null; song: Song };
      set({ transport: d.transport ?? {}, currentTake: d.currentTake, song: d.song });
    } else if (msg.type === "transport") {
      set({ transport: msg.data as TransportState });
    } else if (msg.type === "songform:written") {
      const d = msg.data as { startTime: number };
      set({ currentTake: { startTime: d.startTime } });
      get().refreshRegions();
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
}));
