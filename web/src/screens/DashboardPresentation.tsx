import type { TransportState, Take } from "../api/client";

interface DashboardPresentationProps {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  tempoInput: string;
  logEnabled: boolean;
  onTempoInputChange: (value: string) => void;
  onApplyTempo: () => void;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRecordTake: () => void;
  onSeekToEnd: () => void;
  onToggleMetronome: () => void;
  onNewProject: () => void;
  onToggleLog: () => void;
}

export function DashboardPresentation({
  transport,
  currentTake,
  tempoInput,
  logEnabled,
  onTempoInputChange,
  onApplyTempo,
  onPlay,
  onStop,
  onRecord,
  onRecordTake,
  onSeekToEnd,
  onToggleMetronome,
  onNewProject,
  onToggleLog,
}: DashboardPresentationProps) {
  return (
    <>
      <h2>Transport</h2>

      <div className="transport">
        <button className="primary" onClick={onPlay}>Play</button>
        <button className="secondary" onClick={onStop}>Stop</button>

        {currentTake ? (
          <button className="primary record" onClick={onRecordTake}>
            Record Take
          </button>
        ) : (
          <button className="primary record" onClick={onRecord}>
            Record Here
          </button>
        )}
        <button className="secondary" onClick={onSeekToEnd}>
          Seek to End
        </button>
      </div>

      {currentTake && (
        <div className="muted" style={{ marginTop: 8 }}>
          Current take: starts at {currentTake.startTime.toFixed(2)}s
        </div>
      )}

      <div className="hr" />

      <div className="card">
        <label>Tempo (BPM)</label>
        <div className="row">
          <input
            type="number"
            min="20"
            max="999"
            step="0.1"
            value={tempoInput}
            onChange={(e) => onTempoInputChange(e.target.value)}
            placeholder={transport.bpm ? String(Math.round(transport.bpm)) : "120"}
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button className="secondary" onClick={onApplyTempo}>Apply</button>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <button
            className={transport.metronome ? "primary" : "secondary"}
            onClick={onToggleMetronome}
          >
            Metronome: {transport.metronome ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="hr" />

      <div className="row">
        <button className="secondary" onClick={onNewProject}>
          New Project
        </button>
      </div>

      <div className="hr" />

      <div className="card">
        <label>Debug</label>
        <div className="row">
          <button
            className={logEnabled ? "primary" : "secondary"}
            onClick={onToggleLog}
          >
            REAPER console logging: {logEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
          Toggles verbose ReaScript logging (reaper.ShowConsoleMsg) via the
          persisted REAPER ExtState flag.
        </div>
      </div>
    </>
  );
}
