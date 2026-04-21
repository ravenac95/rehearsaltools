// web/tests/SimpleSongView.test.tsx
// TDD tests for SimpleSongView.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SimpleSongView } from "../src/components/rehearsal/SimpleSongView";
import { useStore } from "../src/store";

afterEach(cleanup);

const setSimpleState = (overrides: Record<string, any>) => {
  useStore.setState({
    simpleBpm: 120,
    simpleNote: "q",
    simpleNum: 4,
    simpleDenom: 4,
    setSimpleBpm: vi.fn(),
    setSimpleNote: vi.fn(),
    setSimpleTimeSig: vi.fn(),
    ...overrides,
  } as any);
};

describe("SimpleSongView", () => {
  it("renders with data-testid=simple-song-view", () => {
    setSimpleState({});
    render(<SimpleSongView />);
    expect(screen.getByTestId("simple-song-view")).toBeDefined();
  });

  it("shows bpm from store (e.g. 140)", () => {
    setSimpleState({ simpleBpm: 140 });
    render(<SimpleSongView />);
    // TempoEditor renders the bpm value
    expect(screen.getByText("140")).toBeDefined();
  });

  it("preset 4/4 has chip solid class when active", () => {
    setSimpleState({ simpleNum: 4, simpleDenom: 4 });
    render(<SimpleSongView />);
    const btn = screen.getByText("4/4") as HTMLButtonElement;
    expect(btn.className).toContain("solid");
  });

  it("preset 6/8 has chip solid class when active", () => {
    setSimpleState({ simpleNum: 6, simpleDenom: 8 });
    render(<SimpleSongView />);
    const btn = screen.getByText("6/8") as HTMLButtonElement;
    expect(btn.className).toContain("solid");
  });

  it("click 6/8 preset calls setSimpleTimeSig(6, 8)", () => {
    const setSimpleTimeSig = vi.fn();
    setSimpleState({ simpleNum: 4, simpleDenom: 4, setSimpleTimeSig });
    render(<SimpleSongView />);
    fireEvent.click(screen.getByText("6/8"));
    expect(setSimpleTimeSig).toHaveBeenCalledWith(6, 8);
  });

  it("click 7/8 preset calls setSimpleTimeSig(7, 8)", () => {
    const setSimpleTimeSig = vi.fn();
    setSimpleState({ simpleNum: 4, simpleDenom: 4, setSimpleTimeSig });
    render(<SimpleSongView />);
    fireEvent.click(screen.getByText("7/8"));
    expect(setSimpleTimeSig).toHaveBeenCalledWith(7, 8);
  });
});
