import { getLetterColor } from "./colors";

interface LetterBadgeProps {
  letter: string;
  size?: number;  // default 36
}

export function LetterBadge({ letter, size = 36 }: LetterBadgeProps) {
  const { bg, ink } = getLetterColor(letter);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 6,
      background: bg, color: ink,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-marker)", fontWeight: 700,
      fontSize: size * 0.55,
      flexShrink: 0,
      boxShadow: "var(--shadow-sketch)",
    }}>
      {letter}
    </div>
  );
}
