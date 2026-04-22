// web/src/components/rehearsal/SongPickerSheetPresentation.tsx
// Pure presentation component for the bottom sheet song picker.

import type { SongListItem } from "../../api/client";

export interface SongPickerSheetPresentationProps {
  open: boolean;
  songs: SongListItem[];
  loading: boolean;
  fetchError: string | null;
  onClose: () => void;
  onSelectSong: (id: string) => void;
  onNewSong: () => void;
}

export function SongPickerSheetPresentation({
  open,
  songs,
  loading,
  fetchError,
  onClose,
  onSelectSong,
  onNewSong,
}: SongPickerSheetPresentationProps) {
  if (!open) return null;

  return (
    <div
      data-testid="song-picker-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        data-testid="song-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "70vh",
          background: "var(--surface-raised)",
          borderRadius: "16px 16px 0 0",
          overflowY: "auto",
          padding: 16,
        }}
      >
        {/* Grip bar */}
        <div style={{ width: 36, height: 4, background: "var(--faint)", margin: "0 auto 14px", borderRadius: 2 }} />

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: "var(--ink)" }}>
          Choose a Song
        </h2>

        {/* New Song button */}
        <button
          onClick={onNewSong}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1.5px dashed var(--rule)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "var(--font-body)",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          + New Song
        </button>

        {loading && (
          <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center" }}>Loading…</p>
        )}
        {fetchError && (
          <p style={{ color: "var(--accent)", fontSize: 14 }}>{fetchError}</p>
        )}

        {/* Song list */}
        {songs.map((song) => (
          <button
            key={song.id}
            data-testid={`song-item-${song.id}`}
            onClick={() => onSelectSong(song.id)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--rule)",
              background: "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-body)",
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{song.name}</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>
              {song.bpm} BPM · {song.timeSig}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
