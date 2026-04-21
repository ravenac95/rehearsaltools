// web/tests/rehearsal-store.test.ts
// TDD tests for rehearsal store slice — written BEFORE implementation.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "../src/store";
import type { RehearsalSegment, RehearsalType } from "../src/api/client";

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

  it("replaces any existing takes (server resets the segment log on start)", () => {
    useStore.setState({
      takes: [makeSegment({ id: "stale-1" }), makeSegment({ id: "stale-2" })],
      currentTakeIdx: 1,
    } as any);
    const seg = makeSegment({ id: "fresh", startPosition: 0 });
    useStore.getState().applyWsMessage({ type: "rehearsal:started", data: { segment: seg } });
    const state = useStore.getState();
    expect(state.takes).toEqual([seg]);
    expect(state.currentTakeIdx).toBeNull();
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

  it("derives currentSegmentStart from the last segment when active", () => {
    const segs = [
      makeSegment({ id: "s1", startPosition: 0 }),
      makeSegment({ id: "s2", type: "take", startPosition: 17 }),
    ];
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: {},
        currentTake: null,
        song: { id: "song-1", name: "Song", sections: [], songForms: [], activeFormId: null },
        rehearsalSegments: segs,
        rehearsalStatus: "take",
      } as any,
    });
    expect(useStore.getState().currentSegmentStart).toBe(17);
  });

  it("clears currentSegmentStart when snapshot status is idle", () => {
    useStore.setState({ currentSegmentStart: 99 } as any);
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: {},
        currentTake: null,
        song: { id: "song-1", name: "Song", sections: [], songForms: [], activeFormId: null },
        rehearsalSegments: [],
        rehearsalStatus: "idle",
      } as any,
    });
    expect(useStore.getState().currentSegmentStart).toBeNull();
  });
});

describe("WS message: snapshot with rehearsalType", () => {
  it("hydrates rehearsalType when present in snapshot", () => {
    const fullBand: RehearsalType = { id: "full-band", name: "Full Band", desc: "All", emoji: "🎸" };
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: {},
        currentTake: null,
        song: { id: "s1", name: "Song", sections: [], songForms: [], activeFormId: null },
        rehearsalType: fullBand,
      } as any,
    });
    expect(useStore.getState().rehearsalType).toEqual(fullBand);
  });

  it("leaves rehearsalType untouched when snapshot omits it", () => {
    const pianoVox: RehearsalType = { id: "piano-vox", name: "Piano + Vox", desc: "Quiet", emoji: "🎹" };
    useStore.setState({ rehearsalType: pianoVox } as any);
    useStore.getState().applyWsMessage({
      type: "snapshot",
      data: {
        transport: {},
        currentTake: null,
        song: { id: "s1", name: "Song", sections: [], songForms: [], activeFormId: null },
      } as any,
    });
    expect(useStore.getState().rehearsalType).toEqual(pianoVox);
  });
});

describe("WS message: rehearsal:type-changed", () => {
  it("sets rehearsalType to the broadcast type", () => {
    const pianoVox: RehearsalType = { id: "piano-vox", name: "Piano + Vox", desc: "Quiet", emoji: "🎹" };
    useStore.getState().applyWsMessage({
      type: "rehearsal:type-changed",
      data: { type: pianoVox },
    } as any);
    expect(useStore.getState().rehearsalType).toEqual(pianoVox);
  });
});

describe("setRehearsalType action", () => {
  it("optimistically updates local state and calls api.setRehearsalType", async () => {
    const fullBand: RehearsalType = { id: "full-band", name: "Full Band", desc: "All", emoji: "🎸" };
    const { api } = await import("../src/api/client");
    const spy = vi.spyOn(api, "setRehearsalType").mockResolvedValueOnce({ ok: true, type: fullBand } as any);

    await useStore.getState().setRehearsalType(fullBand);

    expect(useStore.getState().rehearsalType).toEqual(fullBand);
    expect(spy).toHaveBeenCalledWith("full-band");
    spy.mockRestore();
  });

  it("surfaces error on the store when the server call fails", async () => {
    const fullBand: RehearsalType = { id: "full-band", name: "Full Band", desc: "All", emoji: "🎸" };
    const { api } = await import("../src/api/client");
    const spy = vi.spyOn(api, "setRehearsalType").mockRejectedValueOnce(new Error("boom"));

    await useStore.getState().setRehearsalType(fullBand);

    expect(useStore.getState().error).toMatch(/boom/);
    spy.mockRestore();
    useStore.setState({ error: null } as any);
  });
});

describe("startRehearsal action", () => {
  it("succeeds without first calling setRehearsalType (server holds current type)", async () => {
    const { api } = await import("../src/api/client");
    const spy = vi.spyOn(api, "startRehearsal").mockResolvedValueOnce({ ok: true, segment: makeSegment() } as any);

    // No rehearsalType set locally
    expect(useStore.getState().rehearsalType).toBeNull();

    await useStore.getState().startRehearsal();
    expect(spy).toHaveBeenCalledTimes(1);
    // Called with no args — server uses its own currentRehearsalTypeId.
    expect(spy).toHaveBeenCalledWith();
    spy.mockRestore();
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
