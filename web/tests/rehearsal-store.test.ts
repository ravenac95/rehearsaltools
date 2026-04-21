// web/tests/rehearsal-store.test.ts
// TDD tests for rehearsal store slice — written BEFORE implementation.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "../src/store";
import type { RehearsalSegment } from "../src/api/client";

const makeSegment = (overrides: Partial<RehearsalSegment> = {}): RehearsalSegment => ({
  id: "seg-1",
  type: "discussion",
  num: 1,
  songId: "song-abc",
  songName: "My Song",
  startPosition: 0,
  ...overrides,
});

beforeEach(() => {
  useStore.setState({
    rehearsalStatus: "idle",
    rehearsalTypes: [],
    rehearsalType: null,
    takes: [],
    currentSegmentStart: null,
    currentTakeIdx: null,
    songMode: "simple",
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

describe("Initial state", () => {
  it("rehearsalStatus is idle", () => {
    expect(useStore.getState().rehearsalStatus).toBe("idle");
  });

  it("takes is []", () => {
    expect(useStore.getState().takes).toEqual([]);
  });

  it("currentSegmentStart is null", () => {
    expect(useStore.getState().currentSegmentStart).toBeNull();
  });
});

describe("WS message: rehearsal:started", () => {
  it("pushes segment, sets rehearsalStatus to discussion, sets currentSegmentStart", () => {
    const seg = makeSegment({ type: "discussion", startPosition: 42 });
    useStore.getState().applyWsMessage({ type: "rehearsal:started", data: { segment: seg } });
    const state = useStore.getState();
    expect(state.takes).toHaveLength(1);
    expect(state.takes[0]).toEqual(seg);
    expect(state.rehearsalStatus).toBe("discussion");
    expect(state.currentSegmentStart).toBe(42);
  });
});

describe("WS message: rehearsal:segment with type take", () => {
  it("pushes take segment, sets rehearsalStatus to take", () => {
    const seg = makeSegment({ type: "take", startPosition: 10 });
    useStore.getState().applyWsMessage({ type: "rehearsal:segment", data: { segment: seg } });
    const state = useStore.getState();
    expect(state.rehearsalStatus).toBe("take");
    expect(state.takes[0].type).toBe("take");
  });
});

describe("WS message: rehearsal:segment with type discussion", () => {
  it("pushes discussion segment, sets rehearsalStatus to discussion", () => {
    const seg = makeSegment({ type: "discussion" });
    useStore.getState().applyWsMessage({ type: "rehearsal:segment", data: { segment: seg } });
    expect(useStore.getState().rehearsalStatus).toBe("discussion");
  });
});

describe("WS message: rehearsal:ended", () => {
  it("clears takes, resets rehearsalStatus to idle", () => {
    useStore.setState({ takes: [makeSegment()], rehearsalStatus: "take", currentSegmentStart: 5, currentTakeIdx: 0 } as any);
    useStore.getState().applyWsMessage({ type: "rehearsal:ended", data: {} });
    const state = useStore.getState();
    expect(state.takes).toEqual([]);
    expect(state.rehearsalStatus).toBe("idle");
    expect(state.currentSegmentStart).toBeNull();
    expect(state.currentTakeIdx).toBeNull();
  });
});

describe("WS message: snapshot with rehearsalSegments", () => {
  it("populates takes from snapshot", () => {
    const segs = [makeSegment({ id: "s1" }), makeSegment({ id: "s2" })];
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: {},
        currentTake: null,
        song: { id: "song-1", name: "Song", sections: [], songForms: [], activeFormId: null },
        rehearsalSegments: segs,
        rehearsalStatus: "discussion",
      } as any,
    });
    expect(useStore.getState().takes).toHaveLength(2);
    expect(useStore.getState().rehearsalStatus).toBe("discussion");
  });
});

describe("setSongMode", () => {
  it("updates songMode", () => {
    useStore.getState().setSongMode("complex");
    expect(useStore.getState().songMode).toBe("complex");
  });
});

describe("setSimpleBpm", () => {
  it("updates simpleBpm", () => {
    useStore.getState().setSimpleBpm(140);
    expect(useStore.getState().simpleBpm).toBe(140);
  });
});

describe("setSimpleTimeSig", () => {
  it("updates simpleNum and simpleDenom", () => {
    useStore.getState().setSimpleTimeSig(6, 8);
    expect(useStore.getState().simpleNum).toBe(6);
    expect(useStore.getState().simpleDenom).toBe(8);
  });
});
