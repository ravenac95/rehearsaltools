import { useEffect, useState } from "react";
import { connectWs } from "./api/client";
import { useStore } from "./store";
import { Dashboard } from "./screens/Dashboard";
import { Regions } from "./screens/Regions";
import { Mixdown } from "./screens/Mixdown";
import { ThemeToggle } from "./components/ui";

type Tab = "dashboard" | "regions" | "mixdown";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "Transport" },
  { id: "regions",   label: "Regions"   },
  { id: "mixdown",   label: "Mixdown"   },
]; // Note: Sections and Song tabs added back in task-11

export function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const refresh = useStore((s) => s.refresh);
  const applyWsMessage = useStore((s) => s.applyWsMessage);
  const transport = useStore((s) => s.transport);
  const error = useStore((s) => s.error);

  useEffect(() => {
    refresh();
    const ws = connectWs(applyWsMessage);
    return () => ws.close();
  }, [refresh, applyWsMessage]);

  const dotClass = transport.recording
    ? "dot recording"
    : transport.playing
    ? "dot playing"
    : "dot stopped";
  const stateLabel = transport.recording
    ? "Recording"
    : transport.playing
    ? "Playing"
    : transport.stopped
    ? "Stopped"
    : "—";

  return (
    <div className="app">
      <div className="app-header">
        <span className="app-header__title">RehearsalTools</span>
        <ThemeToggle />
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="screen">
        {tab === "dashboard" && <Dashboard />}
        {tab === "regions"   && <Regions   />}
        {tab === "mixdown"   && <Mixdown   />}
      </div>

      <div className="status-bar">
        <span><span className={dotClass}></span>{stateLabel}</span>
        <span>
          {transport.bpm ? `${Math.round(transport.bpm)} BPM` : ""}
          {transport.num ? ` • ${transport.num}/${transport.denom}` : ""}
        </span>
        {error && <span style={{ color: "var(--accent)" }}>{error}</span>}
      </div>
    </div>
  );
}
