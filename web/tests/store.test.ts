import { describe, it, expect, vi } from "vitest";
import { useStore } from "../src/store";
import type { Song } from "../src/api/client";

const EMPTY_SONG: Song = {
  id: "", name: "", sections: [], songForms: [], activeFormId: null,
};

describe("store applyWsMessage", () => {
  it("transport message patches transport state", () => {
    useStore.setState({ transport: {} });
    useStore.getState().applyWsMessage({
      type: "transport",
      data: {
        playing: true, recording: false, stopped: false,
        position: 1, bpm: 120, num: 4, denom: 4, metronome: false,
      },
    } as any);
    expect(useStore.getState().transport.playing).toBe(true);
    expect(useStore.getState().transport.bpm).toBe(120);
  });

  it("songform:written sets currentTake", () => {
    useStore.setState({ currentTake: null });
    // Mock refreshRegions so it doesn't make a network call
    useStore.setState({ refreshRegions: async () => {} });
    useStore.getState().applyWsMessage({
      type: "songform:written",
      data: { startTime: 10.5 },
    } as any);
    expect(useStore.getState().currentTake).toEqual({ startTime: 10.5 });
  });

  it("snapshot message populates the store", () => {
    useStore.setState({ song: EMPTY_SONG });
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: { bpm: 100 },
        currentTake: null,
        song: {
          id: "s1", name: "T", sections: [], activeFormId: "f1",
          songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: [] }],
        },
      },
    } as any);
    expect(useStore.getState().song.id).toBe("s1");
    expect(useStore.getState().transport.bpm).toBe(100);
  });

  it("deleteSection surfaces warning toast", async () => {
    useStore.setState({ song: EMPTY_SONG, toast: null });

    // Mock the api module
    const { api } = await import("../src/api/client");
    const spy = vi.spyOn(api, "deleteSection").mockResolvedValueOnce({
      ok: true,
      song: EMPTY_SONG,
      warning: "Removed A from forms: 1",
    } as any);

    await useStore.getState().deleteSection("A");

    expect(useStore.getState().toast).toBe("Removed A from forms: 1");
    spy.mockRestore();
  });
});
