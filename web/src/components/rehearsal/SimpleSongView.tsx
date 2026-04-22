// web/src/components/rehearsal/SimpleSongView.tsx
// Thin container — reads store and delegates all rendering to SimpleSongViewPresentation.

import { useStore } from "../../store";
import { SimpleSongViewPresentation } from "./SimpleSongViewPresentation";

export function SimpleSongView() {
  const bpm = useStore((s) => s.simpleBpm);
  const note = useStore((s) => s.simpleNote);
  const num = useStore((s) => s.simpleNum);
  const denom = useStore((s) => s.simpleDenom);
  const setSimpleBpm = useStore((s) => s.setSimpleBpm);
  const setSimpleNote = useStore((s) => s.setSimpleNote);
  const setSimpleTimeSig = useStore((s) => s.setSimpleTimeSig);
  return (
    <SimpleSongViewPresentation
      bpm={bpm} note={note} num={num} denom={denom}
      onBpmChange={setSimpleBpm}
      onNoteChange={setSimpleNote}
      onTimeSigChange={setSimpleTimeSig}
    />
  );
}
