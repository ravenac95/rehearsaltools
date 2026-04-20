import type { NoteValue } from "../../api/client";

const GLYPHS: Record<NoteValue, string> = {
  w: "\u{1D157}",          // whole note (breve notehead, no stem)
  h: "\u{1D15E}",          // half note (void notehead + stem)
  q: "\u{1D15F}",          // quarter note
  e: "\u{1D160}",          // eighth note
  s: "\u{1D161}",          // sixteenth note
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
        fontFamily: "var(--font-music)",
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
