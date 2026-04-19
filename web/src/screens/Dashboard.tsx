import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";

const LOG_ENABLED_STORAGE_KEY = "rehearsaltools:log_enabled";

export function Dashboard() {
  const transport = useStore((s) => s.transport);
  const currentTake = useStore((s) => s.currentTake);
  const setError = useStore((s) => s.setError);
  const [tempoInput, setTempoInput] = useState<string>("");
  const [logEnabled, setLogEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOG_ENABLED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOG_ENABLED_STORAGE_KEY, logEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [logEnabled]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: any) {
      setError(String(err.message ?? err));
    }
  };

  const applyTempo = async () => {
    const bpm = parseFloat(tempoInput);
    if (Number.isFinite(bpm) && bpm >= 20 && bpm <= 999) {
      await run(() => api.tempo(bpm));
      setTempoInput("");
    }
  };

  return (
    <>
      <h2>Transport</h2>

      <div className="transport">
        <button className="primary" onClick={() => run(api.play)}>Play</button>
        <button className="secondary" onClick={() => run(api.stop)}>Stop</button>

        {currentTake ? (
          <button className="primary record" onClick={() => run(api.recordTake)}>
            Record Take
          </button>
        ) : (
          <button className="primary record" onClick={() => run(api.record)}>
            Record Here
          </button>
        )}
        <button className="secondary" onClick={() => run(api.seekToEnd)}>
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
            onChange={(e) => setTempoInput(e.target.value)}
            placeholder={transport.bpm ? String(Math.round(transport.bpm)) : "120"}
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button className="secondary" onClick={applyTempo}>Apply</button>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <button
            className={transport.metronome ? "primary" : "secondary"}
            onClick={() => run(api.toggleMetronome)}
          >
            Metronome: {transport.metronome ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="hr" />

      <div className="row">
        <button className="secondary" onClick={() => run(api.newProject)}>
          New Project
        </button>
      </div>

      <div className="hr" />

      <div className="card">
        <label>Debug</label>
        <div className="row">
          <button
            className={logEnabled ? "primary" : "secondary"}
            onClick={() =>
              run(async () => {
                const next = !logEnabled;
                await api.setLogEnabled(next);
                setLogEnabled(next);
              })
            }
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
