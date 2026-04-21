// web/tests/integration.test.tsx
// Integration tests for full app wiring.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { App } from "../src/App";
import { useStore } from "../src/store";

afterEach(cleanup);

vi.mock("../src/api/client", async () => {
  const actual = await vi.importActual<typeof import("../src/api/client")>("../src/api/client");
  return {
    ...actual,
    connectWs: vi.fn(() => ({ close: vi.fn() })),
    api: {
      ...actual.api,
      getSong: vi.fn().mockResolvedValue({ song: { id: "s1", name: "My Song", sections: [], songForms: [], activeFormId: null } }),
      listRegions: vi.fn().mockResolvedValue({ regions: [] }),
      getRehearsalTypes: vi.fn().mockResolvedValue({
        types: [
          { id: "full-band", name: "Full Band", desc: "All instruments", emoji: "🎸" },
        ],
      }),
    },
  };
});

const EMPTY_SONG = { id: "s1", name: "My Song", sections: [], songForms: [], activeFormId: null };

function resetStore() {
  useStore.setState({
    song: EMPTY_SONG,
    transport: {},
    takes: [],
    songMode: "simple",
    error: null,
    loading: false,
    rehearsalTypes: [],
    rehearsalType: null,
    rehearsalStatus: "idle",
    currentSegmentStart: null,
    currentTakeIdx: null,
    playbackDrawerOpen: false,
    songPickerOpen: false,
    typePickerOpen: false,
    menuOpen: false,
    simpleBpm: 120,
    simpleNote: "q",
    simpleNum: 4,
    simpleDenom: 4,
  } as any);
}

describe("Integration tests", () => {
  it("full render smoke test: no crash, header and simple view present", () => {
    resetStore();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.getAllByTestId("rehearsal-header").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("simple-song-view").length).toBeGreaterThan(0);
  });

  it("song name syncs from store", () => {
    resetStore();
    useStore.setState({ song: { ...EMPTY_SONG, name: "My Song" } } as any);
    render(<App />);
    const inputs = screen.getAllByDisplayValue("My Song");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("mode switch: click Complex hides simple-song-view", () => {
    resetStore();
    render(<App />);
    const complexBtns = screen.getAllByText("Complex");
    fireEvent.click(complexBtns[0]);
    expect(screen.queryByTestId("simple-song-view")).toBeNull();
  });

  it("rehearsal types fetched on mount via api.getRehearsalTypes", async () => {
    resetStore();
    const { api } = await import("../src/api/client");
    await act(async () => { render(<App />); });
    expect(api.getRehearsalTypes).toHaveBeenCalled();
  });

  it("rehearsal:ended WS message resets takes to empty", () => {
    resetStore();
    const seg = { id: "s1", type: "discussion" as const, num: 1, songId: "s1", songName: "My Song", startPosition: 0 };
    useStore.setState({ takes: [seg] } as any);
    useStore.getState().applyWsMessage({ type: "rehearsal:ended", data: {} as any });
    expect(useStore.getState().takes).toEqual([]);
  });
});
