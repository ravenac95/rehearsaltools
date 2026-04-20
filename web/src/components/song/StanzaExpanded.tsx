import type { Stanza, NoteValue } from "../../api/client";
import { Stepper } from "../ui/Stepper";
import { TempoEditor } from "./TempoEditor";
import { StanzaCompact } from "./StanzaCompact";

interface StanzaExpandedProps {
  stanza: Stanza;
  index: number;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  formBpm: number;
  sectionBpm?: number;
  onChange: (updated: Stanza) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function StanzaExpanded({
  stanza, effectiveBpm, effectiveNote,
  onChange, onDelete, onDuplicate,
}: StanzaExpandedProps) {
  const DENOMS = [1,2,4,8,16,32,64];
  const bpmInherited = stanza.bpm === undefined;

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
      />

      {/* Bars + time sig row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Stepper label="Bars" value={stanza.bars} min={1} onChange={(v) => onChange({ ...stanza, bars: v })} />
        <Stepper label="Num" value={stanza.num} min={1} max={64}
          onChange={(v) => onChange({ ...stanza, num: v })} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>Denom</label>
          <select
            value={stanza.denom}
            onChange={(e) => onChange({ ...stanza, denom: parseInt(e.target.value, 10) })}
            style={{
              padding: "8px 12px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)", background: "var(--surface)",
              color: "var(--ink)", fontFamily: "var(--font-mono)", minHeight: 44,
            }}
          >
            {DENOMS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
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
