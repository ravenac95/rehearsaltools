// server/src/state.ts
// In-memory cache of the latest state pushed by REAPER.

import { randomUUID } from "node:crypto";

export interface TransportState {
  playing: boolean;
  recording: boolean;
  stopped: boolean;
  position: number;   // seconds
  bpm: number;
  num: number;
  denom: number;
  metronome: boolean;
}

/** Current take — just the start time; regionId is no longer tracked here. */
export interface Take {
  startTime: number;  // seconds
}

export interface RehearsalSegment {
  id: string;
  type: "take" | "discussion";
  num: number;
  songId: string;
  songName: string;
  startPosition: number;
}

export type RehearsalStatus = "idle" | "discussion" | "take" | "playback";

export class AppState {
  transport: Partial<TransportState> = {};
  currentTake: Take | null = null;

  rehearsalStatus: RehearsalStatus = "idle";
  rehearsalSegments: RehearsalSegment[] = [];
  private _discussionCount = 0;
  private _takeCount = 0;

  /** Apply an incoming transport update (patch merge). */
  updateTransport(patch: Partial<TransportState>): TransportState {
    this.transport = { ...this.transport, ...patch };
    return this.transport as TransportState;
  }

  setTake(take: Take | null): void {
    this.currentTake = take;
  }

  /** Start a new rehearsal — resets all counts and opens first discussion segment. */
  startRehearsal(position: number, songId: string, songName: string): RehearsalSegment {
    this.rehearsalSegments = [];
    this._discussionCount = 0;
    this._takeCount = 0;
    return this.openSegment("discussion", position, songId, songName);
  }

  /** Open a new segment of the given type, push it, update status, return it. */
  openSegment(type: "take" | "discussion", position: number, songId: string, songName: string): RehearsalSegment {
    if (type === "take") {
      this._takeCount += 1;
    } else {
      this._discussionCount += 1;
    }
    const seg: RehearsalSegment = {
      id: randomUUID(),
      type,
      num: type === "take" ? this._takeCount : this._discussionCount,
      songId,
      songName,
      startPosition: position,
    };
    this.rehearsalSegments.push(seg);
    this.rehearsalStatus = type;
    return seg;
  }

  /** End rehearsal — resets everything. */
  endRehearsal(): void {
    this.rehearsalSegments = [];
    this._discussionCount = 0;
    this._takeCount = 0;
    this.rehearsalStatus = "idle";
  }

  /** Set status to playback. */
  setPlayback(): void {
    this.rehearsalStatus = "playback";
  }
}

/**
 * Map a native REAPER OSC event into a transport patch.
 * Returns an empty patch for addresses we don't care about.
 */
export function nativeEventToTransportPatch(
  address: string,
  args: readonly (string | number | boolean)[],
): Partial<TransportState> {
  switch (address) {
    case "/playing":   return { playing:   Boolean(args[0]) };
    case "/stopped":   return { stopped:   Boolean(args[0]) };
    case "/recording": return { recording: Boolean(args[0]) };
    case "/tempo":     return { bpm:      Number(args[0]) };
    case "/timesig_num":   return { num:   Number(args[0]) };
    case "/timesig_denom": return { denom: Number(args[0]) };
    case "/time":      return { position: Number(args[0]) };
    case "/metronome":
    case "/click":     return { metronome: Boolean(args[0]) };
    default:           return {};
  }
}
