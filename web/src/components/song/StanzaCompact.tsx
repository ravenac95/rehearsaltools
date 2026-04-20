import type { Stanza, NoteValue } from "../../api/client";
import { TimeSigStack } from "./TimeSigStack";

interface StanzaCompactProps {
  stanza: Stanza;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  bpmInherited: boolean;
}

export function StanzaCompact({ stanza, effectiveBpm, bpmInherited }: StanzaCompactProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 2, padding: "6px 8px",
      background: "var(--surface-raised)", border: "1px solid var(--rule)",
      borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sketch)",
      minWidth: 52, flexShrink: 0,
    }}>
      <TimeSigStack num={stanza.num} denom={stanza.denom} size="sm" />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-color)" }}>
        {stanza.bars}×
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: bpmInherited ? "var(--faint)" : "var(--ink-soft)",
      }}>
        {effectiveBpm}
      </span>
    </div>
  );
}
