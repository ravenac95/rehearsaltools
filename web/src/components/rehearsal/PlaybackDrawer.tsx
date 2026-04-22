// web/src/components/rehearsal/PlaybackDrawer.tsx
// Thin container — reads store and delegates all rendering to PlaybackDrawerPresentation.

import { useStore } from "../../store";
import { PlaybackDrawerPresentation } from "./PlaybackDrawerPresentation";

export function PlaybackDrawer() {
  const takes = useStore((s) => s.takes);
  const open = useStore((s) => s.playbackDrawerOpen);
  const currentTakeIdx = useStore((s) => s.currentTakeIdx);
  const status = useStore((s) => s.rehearsalStatus);
  const currentSongName = useStore((s) => s.song.name);
  const setPlaybackDrawerOpen = useStore((s) => s.setPlaybackDrawerOpen);
  const selectTakeForPlayback = useStore((s) => s.selectTakeForPlayback);
  const endRehearsal = useStore((s) => s.endRehearsal);
  const stopPlayback = useStore((s) => s.stopPlayback);
  return (
    <PlaybackDrawerPresentation
      open={open}
      takes={takes}
      currentTakeIdx={currentTakeIdx}
      status={status}
      currentSongName={currentSongName}
      onToggleOpen={() => setPlaybackDrawerOpen(!open)}
      onEndRehearsal={() => { endRehearsal(); }}
      onStopPlayback={() => { stopPlayback(); }}
      onSelectTake={(idx) => { selectTakeForPlayback(idx); }}
    />
  );
}
