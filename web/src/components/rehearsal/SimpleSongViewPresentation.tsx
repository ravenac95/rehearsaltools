// web/src/components/rehearsal/SimpleSongViewPresentation.tsx
// Pure presentation component for the simple song editor (tempo + time signature).

import type { NoteValue } from "../../api/client";
import { TempoEditor } from "../song/TempoEditor";
import { TimeSigInput } from "../song/TimeSigInput";

const TS_PRESETS = [[4, 4], [6, 8], [7, 8]] as const;

export interface SimpleSongViewPresentationProps {
  bpm: number;
  note: NoteValue;
  num: number;
  denom: number;
  onBpmChange: (bpm: number) => void;
  onNoteChange: (note: NoteValue) => void;
  onTimeSigChange: (num: number, denom: number) => void;
}

export function SimpleSongViewPresentation({
  bpm,
  note,
  num,
  denom,
  onBpmChange,
  onNoteChange,
  onTimeSigChange,
}: SimpleSongViewPresentationProps) {
  return (
    <div
      data-testid="simple-song-view"
      style={{ padding: "0 16px" }}
    >
      <div style={{
        background: "var(--surface-alt)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        border: "1px solid var(--rule)",
      }}>
        <TempoEditor
          bpm={bpm}
          note={note}
          bpmOverridden={true}
          noteOverridden={true}
          onBpmChange={onBpmChange}
          onNoteChange={onNoteChange}
        />

        <div style={{ height: 16 }} />

        <span style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          display: "block",
          marginBottom: 8,
        }}>
          TIME SIGNATURE
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {TS_PRESETS.map(([n, d]) => {
            const active = num === n && denom === d;
            return (
              <button
                key={`${n}/${d}`}
                className={active ? "chip solid" : "chip"}
                onClick={() => onTimeSigChange(n, d)}
                style={{ minHeight: 36, padding: "6px 12px", fontSize: 14 }}
              >
                {n}/{d}
              </button>
            );
          })}

          <TimeSigInput
            num={num}
            denom={denom}
            onChange={(n, d) => onTimeSigChange(n, d)}
          />
        </div>
      </div>
    </div>
  );
}
