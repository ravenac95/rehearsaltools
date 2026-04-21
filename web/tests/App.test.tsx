// web/tests/App.test.tsx
// TDD tests for the new App.tsx layout — written BEFORE implementation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { App } from "../src/App";
import { useStore } from "../src/store";

// Mock connectWs so no real WebSocket is opened
vi.mock("../src/api/client", async () => {
  const actual = await vi.importActual<typeof import("../src/api/client")>("../src/api/client");
  return {
    ...actual,
    connectWs: vi.fn(() => ({ close: vi.fn() })),
    api: {
      ...actual.api,
      getSong: vi.fn().mockResolvedValue({ song: { id: "s1", name: "Test Song", sections: [], songForms: [], activeFormId: null } }),
      listRegions: vi.fn().mockResolvedValue({ regions: [] }),
      getRehearsalTypes: vi.fn().mockResolvedValue({ types: [] }),
    },
  };
});

const EMPTY_SONG = { id: "s1", name: "Test Song", sections: [], songForms: [], activeFormId: null };

afterEach(() => {
  cleanup();
});

beforeEach(() => {
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
});

describe("App renders", () => {
  it("renders without crashing", () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it("renders rehearsal-header", () => {
    render(<App />);
    expect(screen.getAllByTestId("rehearsal-header").length).toBeGreaterThan(0);
  });

  it("shows SimpleSongView when songMode is simple", () => {
    useStore.setState({ songMode: "simple" } as any);
    render(<App />);
    expect(screen.getAllByTestId("simple-song-view").length).toBeGreaterThan(0);
  });

  it("shows SongEditor when songMode is complex", () => {
    useStore.setState({ songMode: "complex" } as any);
    render(<App />);
    // SongEditor renders form tabs or song name input — just check simple-song-view is gone
    expect(screen.queryByTestId("simple-song-view")).toBeNull();
  });

  it("mode toggle buttons change songMode", () => {
    render(<App />);
    const complexBtns = screen.getAllByText("Complex");
    fireEvent.click(complexBtns[0]);
    expect(useStore.getState().songMode).toBe("complex");
  });
});
