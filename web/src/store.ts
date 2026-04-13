// web/src/store.ts
// Zustand store for app state.

import { create } from "zustand";
import type {
  Section, SongForm, TransportState, Region, Take, WsMessage,
} from "./api/client";
import { api } from "./api/client";

export interface AppStore {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  sections: Section[];
  songForm: SongForm;
  regions: Region[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  refreshRegions: () => Promise<void>;
  applyWsMessage: (msg: WsMessage) => void;
  setError: (err: string | null) => void;

  // Sections
  createSection: (name: string, rows: Section["rows"]) => Promise<void>;
  updateSection: (id: string, name: string, rows: Section["rows"]) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;

  // Song form
  setSongForm: (sectionIds: string[]) => Promise<void>;
  writeSongForm: (regionName?: string) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  transport: {},
  currentTake: null,
  sections: [],
  songForm: { sectionIds: [] },
  regions: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [sec, sf, rg] = await Promise.all([
        api.listSections(), api.getSongForm(), api.listRegions(),
      ]);
      set({
        sections: sec.sections,
        songForm: sf.songForm,
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
      const d = msg.data as {
        transport?: Partial<TransportState>;
        currentTake: Take | null;
        sections: Section[];
        songForm: SongForm;
      };
      set({
        transport: d.transport ?? {},
        currentTake: d.currentTake,
        sections: d.sections,
        songForm: d.songForm,
      });
    } else if (msg.type === "transport") {
      set({ transport: msg.data as TransportState });
    } else if (msg.type === "songform:written") {
      const d = msg.data as { regionId: number; startTime: number };
      set({ currentTake: { regionId: d.regionId, startTime: d.startTime } });
      // Also refresh regions to pick up the new one
      get().refreshRegions();
    }
  },

  setError: (err) => set({ error: err }),

  createSection: async (name, rows) => {
    await api.createSection(name, rows);
    await get().refresh();
  },
  updateSection: async (id, name, rows) => {
    await api.updateSection(id, name, rows);
    await get().refresh();
  },
  deleteSection: async (id) => {
    await api.deleteSection(id);
    await get().refresh();
  },

  setSongForm: async (sectionIds) => {
    await api.setSongForm(sectionIds);
    await get().refresh();
  },

  writeSongForm: async (regionName) => {
    await api.writeSongForm(regionName);
    await get().refreshRegions();
  },
}));
