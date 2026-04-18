import { describe, it, expect } from "vitest";
import { useStore } from "../src/store";

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
    useStore.setState({ sections: [], songForm: { sectionIds: [] } });
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: { bpm: 100 },
        currentTake: null,
        sections: [{ id: "a", name: "A", rows: [] }],
        songForm: { sectionIds: ["a"] },
      },
    } as any);
    expect(useStore.getState().sections).toHaveLength(1);
    expect(useStore.getState().songForm.sectionIds).toEqual(["a"]);
    expect(useStore.getState().transport.bpm).toBe(100);
  });
});
