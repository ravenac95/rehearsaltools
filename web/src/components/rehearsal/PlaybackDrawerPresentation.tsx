// web/src/components/rehearsal/PlaybackDrawerPresentation.tsx
// Pure presentation component for the pull-up playback drawer.

import type { RehearsalSegment, RehearsalStatus } from "../../api/client";

export interface PlaybackDrawerPresentationProps {
  open: boolean;
  takes: RehearsalSegment[];
  currentTakeIdx: number | null;
  status: RehearsalStatus;
  currentSongName: string;              // used to decide whether to show songName badge on pill
  onToggleOpen: () => void;             // pull-tab click flips open/closed
  onEndRehearsal: () => void;
  onStopPlayback: () => void;
  onSelectTake: (idx: number) => void;
}

export function PlaybackDrawerPresentation({
  open,
  takes,
  currentTakeIdx,
  status,
  currentSongName,
  onToggleOpen,
  onEndRehearsal,
  onStopPlayback,
  onSelectTake,
}: PlaybackDrawerPresentationProps) {
  const hasTakes = takes.length > 0;

  return (
    <div
      data-testid="playback-drawer-wrapper"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        transform: open ? "translateY(0)" : "translateY(calc(100% - 28px))",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: hasTakes ? "auto" : "none",
        opacity: hasTakes ? 1 : 0,
      }}
    >
      {/* Pull tab */}
      <div
        data-testid="drawer-pull-tab"
        onClick={onToggleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "6px 0",
          cursor: "pointer",
          background: "var(--surface-raised)",
          borderTop: "1px solid var(--rule)",
          borderRadius: "12px 12px 0 0",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
          height: 28,
          userSelect: "none",
        }}
      >
        <div style={{ width: 28, height: 3, background: "var(--faint)", borderRadius: 2 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
          {takes.length} clips
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>
          {open ? "▼" : "▲"}
        </span>
      </div>

      {/* Drawer content */}
      <div style={{
        background: "var(--surface-raised)",
        padding: "8px 16px 16px",
        maxHeight: "40vh",
        overflowY: "auto",
        borderTop: "1px solid var(--rule)",
      }}>
        {/* End Rehearsal button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            data-testid="end-rehearsal-button"
            onClick={onEndRehearsal}
            style={{
              background: "transparent",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-pill)",
              color: "var(--accent)",
              padding: "6px 14px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            ⏏ End Rehearsal
          </button>
        </div>

        {/* Playback status bar */}
        {status === "playback" && currentTakeIdx !== null && takes[currentTakeIdx] && (
          <div
            data-testid="playback-status-bar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "var(--green-soft)",
              borderRadius: "var(--radius-md)",
              marginBottom: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
              Playing {takes[currentTakeIdx].type === "discussion" ? "D" : "T"}{takes[currentTakeIdx].num}
            </span>
            <button
              data-testid="stop-playback-button"
              onClick={onStopPlayback}
              style={{
                background: "var(--green)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              Stop
            </button>
          </div>
        )}

        {/* Segment pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {takes.map((take, idx) => {
            const isActive = idx === currentTakeIdx;
            const isDiscussion = take.type === "discussion";
            const label = isDiscussion ? `💬 D${take.num}` : `🎵 T${take.num}`;
            const showSong = take.songName !== currentSongName;

            return (
              <button
                key={take.id}
                data-testid={`segment-pill-${idx}`}
                onClick={() => onSelectTake(idx)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  minHeight: 32,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: isActive
                    ? (isDiscussion ? "var(--amber)" : "var(--accent)")
                    : "var(--surface-alt)",
                  border: `1px solid ${isActive ? "transparent" : "var(--rule)"}`,
                  color: isActive ? "#fff" : "var(--ink)",
                }}
              >
                {label}
                {showSong && (
                  <span style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.7)" : "var(--muted)", marginTop: 2 }}>
                    {take.songName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
