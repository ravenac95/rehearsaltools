import type { Stanza, NoteValue } from "../../api/client";
import { Stepper } from "../ui/Stepper";
import { TempoEditor } from "./TempoEditor";
import { StanzaCompact } from "./StanzaCompact";
import { TimeSigInput } from "./TimeSigInput";

interface StanzaExpandedProps {
  stanza: Stanza;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  onChange: (updated: Stanza) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const PRESETS: ReadonlyArray<readonly [number, number]> = [[4, 4], [6, 8], [7, 8]];

export function StanzaExpanded({
  stanza, effectiveBpm, effectiveNote,
  onChange, onDelete, onDuplicate,
}: StanzaExpandedProps) {
  const bpmInherited = stanza.bpm === undefined;
  const noteInherited = stanza.note === undefined;
  const isPreset = PRESETS.some(([n, d]) => n === stanza.num && d === stanza.denom);

  return (
    <div style={{
      padding: 12, background: "var(--surface-alt)",
      border: "1px solid var(--rule)", borderRadius: "var(--radius-md)",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Live preview summary */}
      <StanzaCompact
        stanza={stanza}
        effectiveBpm={effectiveBpm}
        effectiveNote={effectiveNote}
        bpmInherited={bpmInherited}
        noteInherited={noteInherited}
      />

      {/* Bars + time sig row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Stepper label="Bars" value={stanza.bars} min={1} onChange={(v) => onChange({ ...stanza, bars: v })} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>
            Time signature
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {PRESETS.map(([n, d]) => {
              const active = stanza.num === n && stanza.denom === d;
              return (
                <button
                  key={`${n}/${d}`}
                  className={active ? "chip solid" : "chip"}
                  onClick={() => onChange({ ...stanza, num: n, denom: d })}
                  style={{ minHeight: 36, padding: "6px 12px", fontSize: 14 }}
                >
                  {n}/{d}
                </button>
              );
            })}
            <button
              className={!isPreset ? "chip solid" : "chip"}
              onClick={() => {
                if (isPreset) {
                  // Seed a non-preset value so the custom editor appears.
                  onChange({ ...stanza, num: stanza.num + 1 });
                }
              }}
              style={{ minHeight: 36, padding: "6px 12px", fontSize: 14 }}
            >
              Custom
            </button>
            {!isPreset && (
              <TimeSigInput
                num={stanza.num}
                denom={stanza.denom}
                onChange={(n, d) => onChange({ ...stanza, num: n, denom: d })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tempo override row */}
      <TempoEditor
        bpm={effectiveBpm}
        note={effectiveNote}
        bpmOverridden={stanza.bpm !== undefined}
        noteOverridden={stanza.note !== undefined}
        onBpmChange={(v) => onChange({ ...stanza, bpm: v })}
        onNoteChange={(v) => onChange({ ...stanza, note: v })}
        onBpmClear={() => onChange({ ...stanza, bpm: undefined })}
        onNoteClear={() => onChange({ ...stanza, note: undefined })}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="chip" onClick={onDuplicate}
          style={{ fontSize: 13, minHeight: 36, padding: "6px 12px" }}>Duplicate</button>
        <button className="chip" onClick={onDelete}
          style={{ fontSize: 13, minHeight: 36, padding: "6px 12px", borderColor: "var(--accent)", color: "var(--accent)" }}>
          Delete
        </button>
      </div>
    </div>
  );
}
