import { useEffect, useRef, useState } from "react";
import { connectWs } from "./api/client";
import { useStore } from "./store";
import { RehearsalHeader } from "./components/rehearsal/RehearsalHeader";
import { TransportFooter } from "./components/rehearsal/TransportFooter";
import { PlaybackDrawer } from "./components/rehearsal/PlaybackDrawer";
import { HamburgerMenu } from "./components/rehearsal/HamburgerMenu";
import { SongPickerSheet } from "./components/rehearsal/SongPickerSheet";
import { RehearsalTypeSheet } from "./components/rehearsal/RehearsalTypeSheet";
import { SimpleSongView } from "./components/rehearsal/SimpleSongView";
import { SongEditor } from "./screens/SongEditor";  // existing complex mode

export function App() {
  const refresh = useStore((s) => s.refresh);
  const applyWsMessage = useStore((s) => s.applyWsMessage);
  const fetchRehearsalTypes = useStore((s) => s.fetchRehearsalTypes);
  const songMode = useStore((s) => s.songMode);
  const setSongMode = useStore((s) => s.setSongMode);
  const takes = useStore((s) => s.takes);
  const error = useStore((s) => s.error);
  const song = useStore((s) => s.song);
  const updateSongName = useStore((s) => s.updateSongName);
  const setSongPickerOpen = useStore((s) => s.setSongPickerOpen);

  const [nameDraft, setNameDraft] = useState(song.name);
  const nameFocusedRef = useRef(false);

  // Keep nameDraft in sync when song changes externally (e.g. WS snapshot)
  useEffect(() => {
    if (!nameFocusedRef.current) {
      setNameDraft(song.name);
    }
  }, [song.name]);

  useEffect(() => {
    refresh();
    fetchRehearsalTypes();
    const ws = connectWs(applyWsMessage);
    return () => ws.close();
  }, [refresh, applyWsMessage, fetchRehearsalTypes]);

  const transportBottomOffset = takes.length > 0 ? 28 : 0;

  return (
    <div className="app">
      <RehearsalHeader />

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 102 + transportBottomOffset }}>
        {/* Song name row */}
        <div style={{ padding: "12px 16px 0" }}>
          <input
            type="text"
            value={nameDraft}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              background: "transparent",
              border: "none",
              borderBottom: nameFocusedRef.current ? "2px solid var(--accent)" : "2px solid transparent",
              borderRadius: 0,
              padding: "4px 0",
              width: "100%",
              minHeight: "auto",
              color: "var(--ink)",
            }}
            onFocus={() => { nameFocusedRef.current = true; }}
            onBlur={() => {
              nameFocusedRef.current = false;
              if (nameDraft !== song.name) updateSongName(nameDraft);
            }}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button
              onClick={() => setSongPickerOpen(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-pill)",
                color: "var(--muted)",
                fontSize: 12,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              Setlist ▾
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 6, padding: "12px 16px" }}>
          {(["simple", "complex"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSongMode(mode)}
              style={{
                background: songMode === mode ? "var(--accent-soft)" : "transparent",
                border: songMode === mode ? "1px solid var(--accent)" : "1px solid var(--rule)",
                color: songMode === mode ? "var(--accent)" : "var(--muted)",
                borderRadius: "var(--radius-pill)",
                padding: "6px 16px",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {songMode === "simple" ? <SimpleSongView /> : <SongEditor />}
      </div>

      <TransportFooter />
      <PlaybackDrawer />
      <HamburgerMenu />
      <SongPickerSheet />
      <RehearsalTypeSheet />

      {error && (
        <div style={{
          position: "fixed", bottom: 80, left: 16, right: 16, zIndex: 300,
          background: "var(--accent-soft)", color: "var(--accent)",
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          fontSize: 13, border: "1px solid var(--accent)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
