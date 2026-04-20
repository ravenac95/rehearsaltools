import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { DashboardPresentation } from "./DashboardPresentation";

const LOG_ENABLED_STORAGE_KEY = "rehearsaltools:log_enabled";

export function Dashboard() {
  const transport = useStore((s) => s.transport);
  const currentTake = useStore((s) => s.currentTake);
  const setError = useStore((s) => s.setError);
  const [tempoInput, setTempoInput] = useState("");
  const [logEnabled, setLogEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(LOG_ENABLED_STORAGE_KEY) === "1"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(LOG_ENABLED_STORAGE_KEY, logEnabled ? "1" : "0"); }
    catch { /* ignore */ }
  }, [logEnabled]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); }
    catch (err: unknown) { setError(String((err as Error).message ?? err)); }
  };

  const applyTempo = async () => {
    const bpm = parseFloat(tempoInput);
    if (Number.isFinite(bpm) && bpm >= 20 && bpm <= 999) {
      await run(() => api.tempo(bpm));
      setTempoInput("");
    }
  };

  return (
    <DashboardPresentation
      transport={transport}
      currentTake={currentTake}
      tempoInput={tempoInput}
      logEnabled={logEnabled}
      onTempoInputChange={setTempoInput}
      onApplyTempo={applyTempo}
      onPlay={() => run(api.play)}
      onStop={() => run(api.stop)}
      onRecord={() => run(api.record)}
      onRecordTake={() => run(api.recordTake)}
      onSeekToEnd={() => run(api.seekToEnd)}
      onToggleMetronome={() => run(api.toggleMetronome)}
      onNewProject={() => run(api.newProject)}
      onToggleLog={() => run(async () => {
        const next = !logEnabled;
        await api.setLogEnabled(next);
        setLogEnabled(next);
      })}
    />
  );
}
