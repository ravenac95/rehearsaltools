// server/src/state.ts
// In-memory cache of the latest state pushed by REAPER.

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

export class AppState {
  transport: Partial<TransportState> = {};
  currentTake: Take | null = null;

  /** Apply an incoming transport update (patch merge). */
  updateTransport(patch: Partial<TransportState>): TransportState {
    this.transport = { ...this.transport, ...patch };
    return this.transport as TransportState;
  }

  setTake(take: Take | null): void {
    this.currentTake = take;
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
