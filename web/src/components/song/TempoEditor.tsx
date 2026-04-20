import type { NoteValue } from "../../api/client";
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
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: "1.5px solid var(--ink)",
      borderRadius: "var(--radius-sm)",
      background: "var(--surface)",
      padding: "6px 10px",
      flexWrap: "nowrap",
    }}>
      {/* Note picker */}
      <button
        className="chip"
        onClick={cycleNote}
        style={{ minHeight: 36, padding: "4px 10px", flexShrink: 0 }}
      >
        <NoteGlyph note={note} inherited={!noteOverridden} />
      </button>

      {/* = separator */}
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--muted-color)",
        flexShrink: 0,
      }}>
        =
      </span>

      {/* Value display */}
      <div style={{
        fontFamily: "var(--font-marker)",
        fontSize: 24,
        fontWeight: 700,
        minWidth: 40,
        lineHeight: 1,
        color: bpmOverridden ? "var(--ink)" : "var(--faint)",
        flexShrink: 0,
      }}>
        {bpm}
      </div>

      {/* Slider */}
      <input
        type="range"
        className="wf-slider"
        min={20}
        max={999}
        step={1}
        value={bpm}
        aria-label="BPM"
        aria-valuetext={`${bpm} BPM`}
        onChange={e => onBpmChange(+e.target.value)}
        style={{ flex: 1 }}
      />

      {/* Note clear × */}
      {noteOverridden && onNoteClear && (
        <button
          className="chip ghost"
          onClick={onNoteClear}
          style={{ fontSize: 11, minHeight: 28, padding: "2px 8px", flexShrink: 0 }}
          title="Remove note override"
        >
          ×
        </button>
      )}

      {/* BPM clear × */}
      {bpmOverridden && onBpmClear && (
        <button
          className="chip ghost"
          onClick={onBpmClear}
          style={{ fontSize: 11, minHeight: 28, padding: "2px 8px", flexShrink: 0 }}
          title="Remove BPM override"
        >
          ×
        </button>
      )}
    </div>
  );
}
