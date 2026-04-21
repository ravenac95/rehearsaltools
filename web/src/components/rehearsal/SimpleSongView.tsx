// web/src/components/rehearsal/SimpleSongView.tsx
// Simple mode song editor: tempo + time signature only, no song structure.

import { useStore } from "../../store";
import { TempoEditor } from "../song/TempoEditor";
import { TimeSigInput } from "../song/TimeSigInput";

const TS_PRESETS = [[4, 4], [6, 8], [7, 8]] as const;

export function SimpleSongView() {
  const simpleBpm = useStore((s) => s.simpleBpm);
  const simpleNote = useStore((s) => s.simpleNote);
  const simpleNum = useStore((s) => s.simpleNum);
  const simpleDenom = useStore((s) => s.simpleDenom);
  const setSimpleBpm = useStore((s) => s.setSimpleBpm);
  const setSimpleNote = useStore((s) => s.setSimpleNote);
  const setSimpleTimeSig = useStore((s) => s.setSimpleTimeSig);

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
          bpm={simpleBpm}
          note={simpleNote}
          bpmOverridden={true}
          noteOverridden={true}
          onBpmChange={setSimpleBpm}
          onNoteChange={setSimpleNote}
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
            const active = simpleNum === n && simpleDenom === d;
            return (
              <button
                key={`${n}/${d}`}
                className={active ? "chip solid" : "chip"}
                onClick={() => setSimpleTimeSig(n, d)}
                style={{ minHeight: 36, padding: "6px 12px", fontSize: 14 }}
              >
                {n}/{d}
              </button>
            );
          })}

          <TimeSigInput
            num={simpleNum}
            denom={simpleDenom}
            onChange={(n, d) => setSimpleTimeSig(n, d)}
          />
        </div>
      </div>
    </div>
  );
}
