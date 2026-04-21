// web/tests/StatusBadge.test.tsx
// TDD tests for StatusBadge — written BEFORE implementation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StatusBadge } from "../src/components/rehearsal/StatusBadge";
import { useStore } from "../src/store";

afterEach(cleanup);

const setRehearsalState = (overrides: Record<string, any>) => {
  useStore.setState({
    rehearsalStatus: "idle",
    transport: { position: 0 },
    currentSegmentStart: null,
    setCategory: vi.fn(),
    ...overrides,
  } as any);
};

describe("StatusBadge", () => {
  it("idle state shows 'Not started'", () => {
    setRehearsalState({ rehearsalStatus: "idle" });
    render(<StatusBadge />);
    expect(screen.getByText("Not started")).toBeDefined();
  });

  it("discussion state shows 'Discussion'", () => {
    setRehearsalState({ rehearsalStatus: "discussion", currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    expect(screen.getByText("Discussion")).toBeDefined();
  });

  it("take state shows 'Take'", () => {
    setRehearsalState({ rehearsalStatus: "take", currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    expect(screen.getByText("Take")).toBeDefined();
  });

  it("playback state shows 'Playback'", () => {
    setRehearsalState({ rehearsalStatus: "playback", currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    expect(screen.getByText("Playback")).toBeDefined();
  });

  it("shows elapsed time 1:00 when position=65 and segmentStart=5", () => {
    setRehearsalState({
      rehearsalStatus: "take",
      transport: { position: 65 },
      currentSegmentStart: 5,
    });
    render(<StatusBadge />);
    expect(screen.getByText("1:00")).toBeDefined();
  });

  it("tap in discussion state calls setCategory with take", () => {
    const setCategory = vi.fn().mockResolvedValue(undefined);
    setRehearsalState({ rehearsalStatus: "discussion", setCategory, currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    const badge = screen.getByTestId("status-badge");
    fireEvent.click(badge);
    expect(setCategory).toHaveBeenCalledWith("take");
  });

  it("tap in take state calls setCategory with discussion", () => {
    const setCategory = vi.fn().mockResolvedValue(undefined);
    setRehearsalState({ rehearsalStatus: "take", setCategory, currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    const badge = screen.getByTestId("status-badge");
    fireEvent.click(badge);
    expect(setCategory).toHaveBeenCalledWith("discussion");
  });

  it("tap in idle state does not throw", () => {
    setRehearsalState({ rehearsalStatus: "idle" });
    render(<StatusBadge />);
    const badge = screen.getByTestId("status-badge");
    expect(() => fireEvent.click(badge)).not.toThrow();
  });

  it("tap in playback state does not call setCategory", () => {
    const setCategory = vi.fn();
    setRehearsalState({ rehearsalStatus: "playback", setCategory, currentSegmentStart: 0, transport: { position: 0 } });
    render(<StatusBadge />);
    const badge = screen.getByTestId("status-badge");
    fireEvent.click(badge);
    expect(setCategory).not.toHaveBeenCalled();
  });
});
