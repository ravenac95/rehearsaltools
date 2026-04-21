// web/tests/BottomSheets.test.tsx
// TDD tests for SongPickerSheet and RehearsalTypeSheet.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { SongPickerSheet } from "../src/components/rehearsal/SongPickerSheet";
import { RehearsalTypeSheet } from "../src/components/rehearsal/RehearsalTypeSheet";
import { useStore } from "../src/store";
import type { RehearsalType } from "../src/api/client";

afterEach(cleanup);

vi.mock("../src/api/client", async () => {
  const actual = await vi.importActual<typeof import("../src/api/client")>("../src/api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      listSongs: vi.fn().mockResolvedValue({
        songs: [
          { id: "song-1", name: "Song One", bpm: 120, timeSig: "4/4" },
          { id: "song-2", name: "Song Two", bpm: 90, timeSig: "6/8" },
        ],
      }),
      selectSong: vi.fn().mockResolvedValue({ ok: true, song: {} }),
    },
  };
});

const TYPE_1: RehearsalType = { id: "full-band", name: "Full Band", desc: "All instruments", emoji: "🎸" };
const TYPE_2: RehearsalType = { id: "piano-vox", name: "Piano + Vox", desc: "Stripped back", emoji: "🎹" };

// ── SongPickerSheet tests ──────────────────────────────────────────────────

describe("SongPickerSheet", () => {
  const setSheetState = (overrides: Record<string, any>) => {
    useStore.setState({
      songPickerOpen: false,
      setSongPickerOpen: vi.fn(),
      refreshSong: vi.fn().mockResolvedValue(undefined),
      updateSongName: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    } as any);
  };

  it("hidden when closed", () => {
    setSheetState({ songPickerOpen: false });
    render(<SongPickerSheet />);
    expect(screen.queryByTestId("song-picker-sheet")).toBeNull();
  });

  it("visible when open", async () => {
    setSheetState({ songPickerOpen: true });
    await act(async () => { render(<SongPickerSheet />); });
    expect(screen.getByTestId("song-picker-sheet")).toBeDefined();
  });

  it("overlay click closes sheet", async () => {
    const setSongPickerOpen = vi.fn();
    setSheetState({ songPickerOpen: true, setSongPickerOpen });
    await act(async () => { render(<SongPickerSheet />); });
    fireEvent.click(screen.getByTestId("song-picker-overlay"));
    expect(setSongPickerOpen).toHaveBeenCalledWith(false);
  });

  it("song items rendered after open", async () => {
    setSheetState({ songPickerOpen: true });
    await act(async () => { render(<SongPickerSheet />); });
    // Wait for fetch
    await act(async () => {});
    expect(screen.getAllByTestId(/song-item-/).length).toBe(2);
  });

  it("select song calls api.selectSong with id", async () => {
    const { api } = await import("../src/api/client");
    setSheetState({ songPickerOpen: true });
    await act(async () => { render(<SongPickerSheet />); });
    await act(async () => {});
    fireEvent.click(screen.getByTestId("song-item-song-1"));
    expect(api.selectSong).toHaveBeenCalledWith("song-1");
  });
});

// ── RehearsalTypeSheet tests ──────────────────────────────────────────────

describe("RehearsalTypeSheet", () => {
  const setTypeSheetState = (overrides: Record<string, any>) => {
    useStore.setState({
      typePickerOpen: false,
      rehearsalTypes: [],
      rehearsalType: null,
      setTypePickerOpen: vi.fn(),
      setRehearsalType: vi.fn(),
      ...overrides,
    } as any);
  };

  it("hidden when closed", () => {
    setTypeSheetState({ typePickerOpen: false });
    render(<RehearsalTypeSheet />);
    expect(screen.queryByTestId("type-picker-sheet")).toBeNull();
  });

  it("visible when open", () => {
    setTypeSheetState({ typePickerOpen: true });
    render(<RehearsalTypeSheet />);
    expect(screen.getByTestId("type-picker-sheet")).toBeDefined();
  });

  it("type cards rendered from store.rehearsalTypes", () => {
    setTypeSheetState({ typePickerOpen: true, rehearsalTypes: [TYPE_1, TYPE_2] });
    render(<RehearsalTypeSheet />);
    expect(screen.getByTestId("type-card-full-band")).toBeDefined();
    expect(screen.getByTestId("type-card-piano-vox")).toBeDefined();
  });

  it("active type card has accent styling", () => {
    setTypeSheetState({ typePickerOpen: true, rehearsalTypes: [TYPE_1, TYPE_2], rehearsalType: TYPE_1 });
    render(<RehearsalTypeSheet />);
    const card = screen.getByTestId("type-card-full-band") as HTMLElement;
    // Active card has accent border
    expect(card.style.borderColor).toContain("accent");
  });

  it("clicking type card calls setRehearsalType and closes sheet", () => {
    const setRehearsalType = vi.fn();
    const setTypePickerOpen = vi.fn();
    setTypeSheetState({ typePickerOpen: true, rehearsalTypes: [TYPE_1], setRehearsalType, setTypePickerOpen });
    render(<RehearsalTypeSheet />);
    fireEvent.click(screen.getByTestId("type-card-full-band"));
    expect(setRehearsalType).toHaveBeenCalledWith(TYPE_1);
    expect(setTypePickerOpen).toHaveBeenCalledWith(false);
  });
});
