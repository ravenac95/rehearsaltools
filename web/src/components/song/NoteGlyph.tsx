import type { NoteValue } from "../../api/client";

const GLYPHS: Record<NoteValue, string> = {
  w: "○", h: "◑", q: "♩", e: "♪", s: "♬",
};
const NAMES: Record<NoteValue, string> = {
  w: "whole", h: "half", q: "quarter", e: "eighth", s: "sixteenth",
};

interface NoteGlyphProps {
  note: NoteValue;
  inherited?: boolean;  // if true, render faint (inherited value)
  size?: number;
}

export function NoteGlyph({ note, inherited = false, size = 18 }: NoteGlyphProps) {
  return (
    <span
      title={NAMES[note]}
      style={{
        fontSize: size,
        color: inherited ? "var(--faint)" : "var(--ink)",
        fontWeight: inherited ? 400 : 700,
        lineHeight: 1,
        cursor: "default",
        userSelect: "none",
      }}
    >
      {GLYPHS[note]}
    </span>
  );
}
