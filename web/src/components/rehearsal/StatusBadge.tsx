// web/src/components/rehearsal/StatusBadge.tsx
// Tappable status indicator showing rehearsal state and elapsed time.

import { useStore } from "../../store";
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

export function StatusBadge() {
  const rehearsalStatus = useStore((s) => s.rehearsalStatus);
  const position = useStore((s) => s.transport.position ?? 0);
  const currentSegmentStart = useStore((s) => s.currentSegmentStart);
  const setCategory = useStore((s) => s.setCategory);

  const config = STATUS_CONFIG[rehearsalStatus];
  const elapsed = currentSegmentStart !== null
    ? Math.max(0, position - currentSegmentStart)
    : 0;

  const onClick = rehearsalStatus === "discussion"
    ? () => setCategory("take")
    : rehearsalStatus === "take"
    ? () => setCategory("discussion")
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
      {rehearsalStatus !== "idle" && (
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
      {rehearsalStatus !== "idle" && currentSegmentStart !== null && (
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
