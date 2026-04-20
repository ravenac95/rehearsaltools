export const LETTER_COLORS: Record<string, { bg: string; ink: string }> = {
  A: { bg: "var(--letter-A-bg)", ink: "var(--letter-A-ink)" },
  B: { bg: "var(--letter-B-bg)", ink: "var(--letter-B-ink)" },
  C: { bg: "var(--letter-C-bg)", ink: "var(--letter-C-ink)" },
  D: { bg: "var(--letter-D-bg)", ink: "var(--letter-D-ink)" },
  E: { bg: "var(--letter-E-bg)", ink: "var(--letter-E-ink)" },
  F: { bg: "var(--letter-F-bg)", ink: "var(--letter-F-ink)" },
  G: { bg: "var(--letter-G-bg)", ink: "var(--letter-G-ink)" },
  H: { bg: "var(--letter-H-bg)", ink: "var(--letter-H-ink)" },
  I: { bg: "var(--letter-I-bg)", ink: "var(--letter-I-ink)" },
  J: { bg: "var(--letter-J-bg)", ink: "var(--letter-J-ink)" },
  K: { bg: "var(--letter-K-bg)", ink: "var(--letter-K-ink)" },
  L: { bg: "var(--letter-L-bg)", ink: "var(--letter-L-ink)" },
  M: { bg: "var(--letter-M-bg)", ink: "var(--letter-M-ink)" },
  N: { bg: "var(--letter-N-bg)", ink: "var(--letter-N-ink)" },
  O: { bg: "var(--letter-O-bg)", ink: "var(--letter-O-ink)" },
  P: { bg: "var(--letter-P-bg)", ink: "var(--letter-P-ink)" },
  Q: { bg: "var(--letter-Q-bg)", ink: "var(--letter-Q-ink)" },
  R: { bg: "var(--letter-R-bg)", ink: "var(--letter-R-ink)" },
  S: { bg: "var(--letter-S-bg)", ink: "var(--letter-S-ink)" },
  T: { bg: "var(--letter-T-bg)", ink: "var(--letter-T-ink)" },
  U: { bg: "var(--letter-U-bg)", ink: "var(--letter-U-ink)" },
  V: { bg: "var(--letter-V-bg)", ink: "var(--letter-V-ink)" },
  W: { bg: "var(--letter-W-bg)", ink: "var(--letter-W-ink)" },
  X: { bg: "var(--letter-X-bg)", ink: "var(--letter-X-ink)" },
  Y: { bg: "var(--letter-Y-bg)", ink: "var(--letter-Y-ink)" },
  Z: { bg: "var(--letter-Z-bg)", ink: "var(--letter-Z-ink)" },
};

export function getLetterColor(letter: string): { bg: string; ink: string } {
  return LETTER_COLORS[letter] ?? { bg: "var(--surface-alt)", ink: "var(--ink)" };
}
