// web/src/components/rehearsal/TransportFooter.tsx
// Fixed bottom action bar with primary action button and metronome toggle.

import { useStore } from "../../store";
import { api } from "../../api/client";
import { IconMic, IconStop, IconMetronome } from "./icons";

const ACTION_CONFIG = {
  idle:       { label: "Start Rehearsal", bg: "var(--accent)",  icon: <IconMic /> },
  discussion: { label: "Start Take",      bg: "var(--accent)",  icon: <IconMetronome /> },
  take:       { label: "End Take",        bg: "var(--ink)",     icon: <IconStop /> },
  playback:   { label: "Stop",            bg: "var(--green)",   icon: <IconStop /> },
} as const;

export function TransportFooter() {
  const rehearsalStatus = useStore((s) => s.rehearsalStatus);
  const takes = useStore((s) => s.takes);
  const metronome = useStore((s) => s.transport.metronome ?? false);
  const startRehearsal = useStore((s) => s.startRehearsal);
  const setCategory = useStore((s) => s.setCategory);
  const stopPlayback = useStore((s) => s.stopPlayback);

  const bottomOffset = takes.length > 0 ? 28 : 0;
  const config = ACTION_CONFIG[rehearsalStatus];

  const handleAction = () => {
    switch (rehearsalStatus) {
      case "idle":       return startRehearsal();
      case "discussion": return setCategory("take");
      case "take":       return setCategory("discussion");
      case "playback":   return stopPlayback();
    }
  };

  return (
    <div
      data-testid="transport-footer"
      style={{
        position: "fixed",
        bottom: bottomOffset,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "var(--surface-raised)",
        borderTop: "1px solid var(--rule)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        transition: "bottom 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 12px" }}>
        {/* Main action button */}
        <button
          data-testid="action-button"
          onClick={handleAction}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: "var(--radius-md)",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            background: config.bg,
          }}
        >
          {config.icon}
          {config.label}
        </button>

        {/* Metronome toggle */}
        <button
          data-testid="metronome-toggle"
          onClick={() => api.toggleMetronome()}
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-md)",
            flexShrink: 0,
            background: metronome ? "var(--accent-soft)" : "var(--surface-alt)",
            border: metronome ? "1px solid var(--accent)" : "1px solid var(--rule)",
            color: metronome ? "var(--accent)" : "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconMetronome active={metronome} />
        </button>
      </div>
    </div>
  );
}
