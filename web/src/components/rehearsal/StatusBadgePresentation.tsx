// web/src/components/rehearsal/StatusBadgePresentation.tsx
// Pure presentation component for the tappable status indicator.

import type { RehearsalStatus } from "../../api/client";

const STATUS_CONFIG: Record<RehearsalStatus, {
  bg: string;
  color: string;
  border: string;
  dot: string;
  label: string;
  pulse: string | false;
}> = {
  idle:       { bg: "var(--surface-alt)",  color: "var(--muted)",  border: "var(--rule)",   dot: "var(--faint)",  label: "Not started", pulse: false },
  discussion: { bg: "var(--amber-soft)",   color: "var(--amber)",  border: "var(--amber)",  dot: "var(--amber)",  label: "Discussion",  pulse: "2s"  },
  take:       { bg: "var(--accent-soft)",  color: "var(--accent)", border: "var(--accent)", dot: "var(--accent)", label: "Take",        pulse: "1.5s" },
  playback:   { bg: "var(--green-soft)",   color: "var(--green)",  border: "var(--green)",  dot: "var(--green)",  label: "Playback",    pulse: false },
};

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export interface StatusBadgePresentationProps {
  status: RehearsalStatus;
  position: number;            // seconds since transport start (or 0)
  segmentStart: number | null; // null when idle / between segments
  onSetCategory: (category: "take" | "discussion") => void;
}

export function StatusBadgePresentation({
  status,
  position,
  segmentStart,
  onSetCategory,
}: StatusBadgePresentationProps) {
  const config = STATUS_CONFIG[status];
  const elapsed = segmentStart !== null
    ? Math.max(0, position - segmentStart)
    : 0;

  const onClick = status === "discussion"
    ? () => onSetCategory("take")
    : status === "take"
    ? () => onSetCategory("discussion")
    : undefined;

  return (
    <button
      data-testid="status-badge"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "7px 12px",
        borderRadius: "var(--radius-pill)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: config.bg,
        borderColor: config.border,
        borderWidth: "1.5px",
        borderStyle: "solid",
        color: config.color,
        cursor: onClick ? "pointer" : "default",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {status !== "idle" && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            background: config.dot,
            display: "inline-block",
            animation: config.pulse ? `pulse ${config.pulse} ease infinite` : "none",
          }}
        />
      )}
      {config.label}
      {status !== "idle" && segmentStart !== null && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          {formatTime(elapsed)}
        </span>
      )}
    </button>
  );
}
