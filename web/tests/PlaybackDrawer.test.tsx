// web/tests/PlaybackDrawer.test.tsx
// TDD tests for PlaybackDrawer.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PlaybackDrawer } from "../src/components/rehearsal/PlaybackDrawer";
import { useStore } from "../src/store";
import type { RehearsalSegment } from "../src/api/client";

afterEach(cleanup);

const seg = (overrides: Partial<RehearsalSegment> = {}): RehearsalSegment => ({
  id: "s1", type: "discussion", num: 1, songId: "song-1", songName: "My Song", startPosition: 0, ...overrides,
});

const setDrawerState = (overrides: Record<string, any>) => {
  useStore.setState({
    takes: [],
    playbackDrawerOpen: false,
    currentTakeIdx: null,
    rehearsalStatus: "idle",
    song: { id: "song-1", name: "My Song", sections: [], songForms: [], activeFormId: null },
    setPlaybackDrawerOpen: vi.fn(),
    selectTakeForPlayback: vi.fn(),
    endRehearsal: vi.fn().mockResolvedValue(undefined),
    stopPlayback: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);
};

describe("PlaybackDrawer", () => {
  it("empty takes: drawer wrapper has opacity 0", () => {
    setDrawerState({ takes: [] });
    render(<PlaybackDrawer />);
    const wrapper = screen.getByTestId("playback-drawer-wrapper");
    expect(wrapper.style.opacity).toBe("0");
  });

  it("one segment: shows '1 clips' in pull tab", () => {
    setDrawerState({ takes: [seg()] });
    render(<PlaybackDrawer />);
    expect(screen.getByTestId("drawer-pull-tab").textContent).toContain("1");
  });

  it("three segments: shows '3 clips'", () => {
    setDrawerState({ takes: [seg(), seg({ id: "s2" }), seg({ id: "s3" })] });
    render(<PlaybackDrawer />);
    expect(screen.getByTestId("drawer-pull-tab").textContent).toContain("3");
  });

  it("discussion pill shows '💬 D2'", () => {
    setDrawerState({ takes: [seg({ type: "discussion", num: 2 })] });
    render(<PlaybackDrawer />);
    expect(screen.getByTestId("segment-pill-0").textContent).toContain("D2");
  });

  it("take pill shows '🎵 T1'", () => {
    setDrawerState({ takes: [seg({ type: "take", num: 1 })] });
    render(<PlaybackDrawer />);
    expect(screen.getByTestId("segment-pill-0").textContent).toContain("T1");
  });

  it("pill click calls store.selectTakeForPlayback with index", () => {
    const selectTakeForPlayback = vi.fn();
    setDrawerState({ takes: [seg(), seg({ id: "s2" })], selectTakeForPlayback });
    render(<PlaybackDrawer />);
    fireEvent.click(screen.getByTestId("segment-pill-1"));
    expect(selectTakeForPlayback).toHaveBeenCalledWith(1);
  });

  it("end rehearsal button calls store.endRehearsal", () => {
    const endRehearsal = vi.fn().mockResolvedValue(undefined);
    setDrawerState({ takes: [seg()], endRehearsal });
    render(<PlaybackDrawer />);
    fireEvent.click(screen.getByTestId("end-rehearsal-button"));
    expect(endRehearsal).toHaveBeenCalled();
  });

  it("playback status bar shown when rehearsalStatus=playback", () => {
    setDrawerState({ takes: [seg()], rehearsalStatus: "playback", currentTakeIdx: 0 });
    render(<PlaybackDrawer />);
    expect(screen.getByTestId("playback-status-bar")).toBeDefined();
  });

  it("stop button in status bar calls stopPlayback", () => {
    const stopPlayback = vi.fn().mockResolvedValue(undefined);
    setDrawerState({ takes: [seg()], rehearsalStatus: "playback", currentTakeIdx: 0, stopPlayback });
    render(<PlaybackDrawer />);
    fireEvent.click(screen.getByTestId("stop-playback-button"));
    expect(stopPlayback).toHaveBeenCalled();
  });

  it("pull tab toggle calls setPlaybackDrawerOpen with true", () => {
    const setPlaybackDrawerOpen = vi.fn();
    setDrawerState({ takes: [seg()], playbackDrawerOpen: false, setPlaybackDrawerOpen });
    render(<PlaybackDrawer />);
    fireEvent.click(screen.getByTestId("drawer-pull-tab"));
    expect(setPlaybackDrawerOpen).toHaveBeenCalledWith(true);
  });
});
