import type { Stanza, NoteValue } from "../../api/client";
import { TimeSigStack } from "./TimeSigStack";
import { NoteGlyph } from "./NoteGlyph";

interface StanzaCompactProps {
  stanza: Stanza;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  bpmInherited: boolean;
}

export function StanzaCompact({ stanza, effectiveBpm, effectiveNote, bpmInherited }: StanzaCompactProps) {
  return (
    <div style={{
      display: "flex",
      border: "1.5px solid var(--ink)",
      borderRadius: 8,
      background: "var(--surface)",
      overflow: "hidden",
      boxShadow: "2px 2px 0 var(--ink-soft)",
      minWidth: 78,
      flexShrink: 0,
    }}>
      {/* Left column: time signature */}
      <div style={{
        padding: "6px 7px",
        borderRight: "1.5px solid var(--rule)",
        display: "flex",
        alignItems: "center",
        background: "var(--surface-alt)",
      }}>
        <TimeSigStack num={stanza.num} denom={stanza.denom} size="md" />
      </div>

      {/* Right column: bars × and BPM readout */}
      <div style={{
        padding: "5px 9px 5px 8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 1,
        minWidth: 44,
      }}>
        {/* Top line: bars × */}
        <div style={{
          fontFamily: "var(--font-hand)",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          color: "var(--ink)",
        }}>
          {stanza.bars}×
        </div>

        {/* Bottom line: note glyph = bpm */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: bpmInherited ? 400 : 700,
          color: bpmInherited ? "var(--faint)" : "var(--ink)",
        }}>
          <NoteGlyph note={effectiveNote} inherited={bpmInherited} size={11} />
          <span>={effectiveBpm}</span>
        </div>
      </div>
    </div>
  );
}
