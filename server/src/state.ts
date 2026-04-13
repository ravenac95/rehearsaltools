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

export interface Take {
  regionId: number;
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
