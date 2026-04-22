// web/src/components/rehearsal/TransportFooterPresentation.tsx
// Pure presentation component for the fixed bottom transport bar.

import type { RehearsalStatus } from "../../api/client";
import { IconMic, IconStop, IconMetronome } from "./icons";

const ACTION_CONFIG = {
  idle:       { label: "Start Rehearsal", bg: "var(--accent)",  icon: <IconMic /> },
  discussion: { label: "Start Take",      bg: "var(--accent)",  icon: <IconMetronome /> },
  take:       { label: "End Take",        bg: "var(--ink)",     icon: <IconStop /> },
  playback:   { label: "Stop",            bg: "var(--green)",   icon: <IconStop /> },
} as const;

export interface TransportFooterPresentationProps {
  status: RehearsalStatus;
  hasTakes: boolean;               // controls bottomOffset (28 if true, 0 otherwise)
  metronomeActive: boolean;
  onStart: () => void;             // idle → Start Rehearsal
  onSetCategory: (c: "take" | "discussion") => void;
  onStop: () => void;              // playback → Stop
  onToggleMetronome: () => void;
}

export function TransportFooterPresentation({
  status,
  hasTakes,
  metronomeActive,
  onStart,
  onSetCategory,
  onStop,
  onToggleMetronome,
}: TransportFooterPresentationProps) {
  const bottomOffset = hasTakes ? 28 : 0;
  const config = ACTION_CONFIG[status];

  const handleAction = () => {
    switch (status) {
      case "idle":       return onStart();
      case "discussion": return onSetCategory("take");
      case "take":       return onSetCategory("discussion");
      case "playback":   return onStop();
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
          onClick={onToggleMetronome}
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-md)",
            flexShrink: 0,
            background: metronomeActive ? "var(--accent-soft)" : "var(--surface-alt)",
            border: metronomeActive ? "1px solid var(--accent)" : "1px solid var(--rule)",
            color: metronomeActive ? "var(--accent)" : "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconMetronome active={metronomeActive} />
        </button>
      </div>
    </div>
  );
}
