// web/src/components/rehearsal/TransportFooter.tsx
// Thin container — reads store and delegates all rendering to TransportFooterPresentation.

import { useStore } from "../../store";
import { api } from "../../api/client";
import { TransportFooterPresentation } from "./TransportFooterPresentation";

export function TransportFooter() {
  const status = useStore((s) => s.rehearsalStatus);
  const takes = useStore((s) => s.takes);
  const metronomeActive = useStore((s) => s.transport.metronome ?? false);
  const startRehearsal = useStore((s) => s.startRehearsal);
  const setCategory = useStore((s) => s.setCategory);
  const stopPlayback = useStore((s) => s.stopPlayback);
  return (
    <TransportFooterPresentation
      status={status}
      hasTakes={takes.length > 0}
      metronomeActive={metronomeActive}
      onStart={() => { startRehearsal(); }}
      onSetCategory={(c) => { setCategory(c); }}
      onStop={() => { stopPlayback(); }}
      onToggleMetronome={() => { api.toggleMetronome(); }}
    />
  );
}
