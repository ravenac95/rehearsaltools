// web/src/components/rehearsal/SongPickerSheet.tsx
// Thin container — owns the fetch effect and composes callbacks for SongPickerSheetPresentation.

import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { api } from "../../api/client";
import type { SongListItem } from "../../api/client";
import { SongPickerSheetPresentation } from "./SongPickerSheetPresentation";

export function SongPickerSheet() {
  const open = useStore((s) => s.songPickerOpen);
  const setSongPickerOpen = useStore((s) => s.setSongPickerOpen);
  const refreshSong = useStore((s) => s.refreshSong);
  const updateSongName = useStore((s) => s.updateSongName);

  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError(null);
    api.listSongs()
      .then((res) => setSongs(res.songs))
      .catch((err) => setFetchError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <SongPickerSheetPresentation
      open={open}
      songs={songs}
      loading={loading}
      fetchError={fetchError}
      onClose={() => setSongPickerOpen(false)}
      onSelectSong={async (id) => {
        try {
          await api.selectSong(id);
          await refreshSong();
        } catch {
          // swallow — matches current behavior
        } finally {
          setSongPickerOpen(false);
        }
      }}
      onNewSong={() => {
        const name = `Untitled ${new Date().toISOString().slice(0, 10)}`;
        updateSongName(name);
        setSongPickerOpen(false);
      }}
    />
  );
}
