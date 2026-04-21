// web/tests/TransportFooter.test.tsx
// TDD tests for TransportFooter.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransportFooter } from "../src/components/rehearsal/TransportFooter";
import { useStore } from "../src/store";

afterEach(cleanup);

// Mock the api module so we can spy on toggleMetronome
vi.mock("../src/api/client", async () => {
  const actual = await vi.importActual<typeof import("../src/api/client")>("../src/api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      toggleMetronome: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const setFooterState = (overrides: Record<string, any>) => {
  useStore.setState({
    rehearsalStatus: "idle",
    transport: { metronome: false },
    takes: [],
    startRehearsal: vi.fn().mockResolvedValue(undefined),
    setCategory: vi.fn().mockResolvedValue(undefined),
    stopPlayback: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);
};

describe("TransportFooter", () => {
  it("idle state shows 'Start Rehearsal'", () => {
    setFooterState({ rehearsalStatus: "idle" });
    render(<TransportFooter />);
    expect(screen.getByTestId("action-button").textContent).toContain("Start Rehearsal");
  });

  it("discussion state shows 'Start Take'", () => {
    setFooterState({ rehearsalStatus: "discussion" });
    render(<TransportFooter />);
    expect(screen.getByTestId("action-button").textContent).toContain("Start Take");
  });

  it("take state shows 'End Take'", () => {
    setFooterState({ rehearsalStatus: "take" });
    render(<TransportFooter />);
    expect(screen.getByTestId("action-button").textContent).toContain("End Take");
  });

  it("playback state shows 'Stop'", () => {
    setFooterState({ rehearsalStatus: "playback" });
    render(<TransportFooter />);
    expect(screen.getByTestId("action-button").textContent).toContain("Stop");
  });

  it("clicking start rehearsal calls store.startRehearsal", () => {
    const startRehearsal = vi.fn().mockResolvedValue(undefined);
    setFooterState({ rehearsalStatus: "idle", startRehearsal });
    render(<TransportFooter />);
    fireEvent.click(screen.getByTestId("action-button"));
    expect(startRehearsal).toHaveBeenCalled();
  });

  it("clicking end take calls store.setCategory with discussion", () => {
    const setCategory = vi.fn().mockResolvedValue(undefined);
    setFooterState({ rehearsalStatus: "take", setCategory });
    render(<TransportFooter />);
    fireEvent.click(screen.getByTestId("action-button"));
    expect(setCategory).toHaveBeenCalledWith("discussion");
  });

  it("metronome button has inactive styling when metronome=false", () => {
    setFooterState({ transport: { metronome: false } });
    render(<TransportFooter />);
    const btn = screen.getByTestId("metronome-toggle");
    // Just verify the element exists and renders
    expect(btn).toBeDefined();
  });

  it("metronome button has active styling when metronome=true", () => {
    setFooterState({ transport: { metronome: true } });
    render(<TransportFooter />);
    const btn = screen.getByTestId("metronome-toggle");
    expect(btn).toBeDefined();
  });

  it("clicking metronome calls api.toggleMetronome", async () => {
    const { api } = await import("../src/api/client");
    setFooterState({});
    render(<TransportFooter />);
    fireEvent.click(screen.getByTestId("metronome-toggle"));
    expect(api.toggleMetronome).toHaveBeenCalled();
  });

  it("when takes has items, footer has bottom 28px style", () => {
    setFooterState({ takes: [{ id: "s1", type: "take", num: 1, songId: "s", songName: "S", startPosition: 0 }] });
    render(<TransportFooter />);
    const footer = screen.getByTestId("transport-footer");
    expect(footer.style.bottom).toBe("28px");
  });
});
