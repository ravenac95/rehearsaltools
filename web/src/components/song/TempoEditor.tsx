import type { NoteValue } from "../../api/client";
import { Stepper } from "../ui/Stepper";
import { NoteGlyph } from "./NoteGlyph";

const NOTE_ORDER: NoteValue[] = ["w", "h", "q", "e", "s"];

interface TempoEditorProps {
  bpm: number;                // the current value (effective — may be inherited)
  note: NoteValue;            // the current value (effective)
  bpmOverridden: boolean;     // true if this level has an explicit override
  noteOverridden: boolean;    // true if this level has an explicit override
  onBpmChange: (bpm: number) => void;
  onNoteChange: (note: NoteValue) => void;
  onBpmClear?: () => void;    // if provided, shows an "×" to remove override
  onNoteClear?: () => void;
}

export function TempoEditor({
  bpm, note, bpmOverridden, noteOverridden,
  onBpmChange, onNoteChange, onBpmClear, onNoteClear,
}: TempoEditorProps) {
  const cycleNote = () => {
    const idx = NOTE_ORDER.indexOf(note);
    onNoteChange(NOTE_ORDER[(idx + 1) % NOTE_ORDER.length]);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <Stepper
        label="BPM"
        value={bpm}
        min={20} max={999}
        mono
        onChange={onBpmChange}
      />
      {bpmOverridden && onBpmClear && (
        <button className="chip ghost" onClick={onBpmClear}
          style={{ fontSize: 11, minHeight: 28, padding: "2px 8px" }}
          title="Remove BPM override">×</button>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>Note</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="chip" onClick={cycleNote}
            style={{ minHeight: 36, padding: "4px 10px" }}>
            <NoteGlyph note={note} inherited={!noteOverridden} />
          </button>
          {noteOverridden && onNoteClear && (
            <button className="chip ghost" onClick={onNoteClear}
              style={{ fontSize: 11, minHeight: 28, padding: "2px 8px" }}
              title="Remove note override">×</button>
          )}
        </div>
      </div>
    </div>
  );
}
