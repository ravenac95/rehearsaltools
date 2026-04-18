// server/tests/state.test.ts
// Tests for AppState and nativeEventToTransportPatch reducer.

import { describe, it, expect } from "vitest";
import { AppState, nativeEventToTransportPatch } from "../src/state.js";

describe("nativeEventToTransportPatch", () => {
  it("/play → playing=true, stopped=false, recording=false", () => {
    const patch = nativeEventToTransportPatch("/play", [1]);
    expect(patch).toEqual({ playing: true, stopped: false, recording: false });
  });

  it("/stop → playing=false, stopped=true, recording=false", () => {
    const patch = nativeEventToTransportPatch("/stop", [1]);
    expect(patch).toEqual({ playing: false, stopped: true, recording: false });
  });

  it("/record → playing=false, stopped=false, recording=true", () => {
    const patch = nativeEventToTransportPatch("/record", [1]);
    expect(patch).toEqual({ playing: false, stopped: false, recording: true });
  });

  it("/playing with arg=1 → { playing: true }", () => {
    expect(nativeEventToTransportPatch("/playing", [1])).toEqual({ playing: true });
  });

  it("/playing with arg=0 → { playing: false }", () => {
    expect(nativeEventToTransportPatch("/playing", [0])).toEqual({ playing: false });
  });

  it("/stopped with arg=1 → { stopped: true }", () => {
    expect(nativeEventToTransportPatch("/stopped", [1])).toEqual({ stopped: true });
  });

  it("/recording with arg=1 → { recording: true }", () => {
    expect(nativeEventToTransportPatch("/recording", [1])).toEqual({ recording: true });
  });

  it("/tempo 120.5 → { bpm: 120.5 }", () => {
    expect(nativeEventToTransportPatch("/tempo", [120.5])).toEqual({ bpm: 120.5 });
  });

  it("/timesig_num 3 → { num: 3 }", () => {
    expect(nativeEventToTransportPatch("/timesig_num", [3])).toEqual({ num: 3 });
  });

  it("/timesig_denom 8 → { denom: 8 }", () => {
    expect(nativeEventToTransportPatch("/timesig_denom", [8])).toEqual({ denom: 8 });
  });

  it("/time 42.3 → { position: 42.3 }", () => {
    expect(nativeEventToTransportPatch("/time", [42.3])).toEqual({ position: 42.3 });
  });

  it("/click 1 → { metronome: true }", () => {
    expect(nativeEventToTransportPatch("/click", [1])).toEqual({ metronome: true });
  });

  it("unknown address → {}", () => {
    expect(nativeEventToTransportPatch("/unknown/address", [])).toEqual({});
  });
});

describe("AppState.updateTransport", () => {
  it("merges sequential patches and accumulates state", () => {
    const state = new AppState();

    state.updateTransport({ playing: true, stopped: false, recording: false });
    expect(state.transport.playing).toBe(true);

    state.updateTransport({ bpm: 120 });
    expect(state.transport.playing).toBe(true); // still set from first patch
    expect(state.transport.bpm).toBe(120);

    state.updateTransport({ position: 42.3 });
    expect(state.transport.bpm).toBe(120); // still set
    expect(state.transport.position).toBe(42.3);
  });

  it("later patch overwrites earlier patch for same key", () => {
    const state = new AppState();
    state.updateTransport({ bpm: 100 });
    state.updateTransport({ bpm: 140 });
    expect(state.transport.bpm).toBe(140);
  });

  it("round-trip: nativeEventToTransportPatch feeds updateTransport", () => {
    const state = new AppState();
    const events: Array<[string, (number | string | boolean)[]]> = [
      ["/play", [1]],
      ["/tempo", [120.5]],
      ["/time", [42.3]],
      ["/timesig_num", [4]],
      ["/timesig_denom", [4]],
    ];
    for (const [addr, args] of events) {
      const patch = nativeEventToTransportPatch(addr, args);
      if (Object.keys(patch).length > 0) {
        state.updateTransport(patch);
      }
    }
    expect(state.transport.playing).toBe(true);
    expect(state.transport.bpm).toBe(120.5);
    expect(state.transport.position).toBe(42.3);
    expect(state.transport.num).toBe(4);
    expect(state.transport.denom).toBe(4);
  });
});

describe("AppState.setTake", () => {
  it("sets and clears the current take", () => {
    const state = new AppState();
    expect(state.currentTake).toBeNull();
    state.setTake({ startTime: 10.0 });
    expect(state.currentTake).toEqual({ startTime: 10.0 });
    state.setTake(null);
    expect(state.currentTake).toBeNull();
  });
});
