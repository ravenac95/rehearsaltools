// web/src/components/song/pattern.ts
// Pure functions for parsing and serialising the type-string pattern editor.
// No React imports — pure TypeScript module.

export interface ParseResult {
  letters: string[];       // expanded flat list of letters
  errors: TokenError[];    // validation errors (non-fatal — caller decides what to do)
}

export interface TokenError {
  token: string;
  message: string;
}

/**
 * Parse a whitespace-separated token string into a flat array of section letters.
 *
 * Each token must match: /^([A-Z])(?:[x×](\d+))?$/
 *   - "A"    → ["A"]
 *   - "A×2"  → ["A", "A"]
 *   - "Ax3"  → ["A", "A", "A"]
 *   - "a"    → error (lowercase)
 *   - "AB"   → error (multi-char without multiplier)
 *   - "A×0"  → error (multiplier must be >= 1)
 *   - "A×99" → allowed (no upper bound — user controls repetition)
 *
 * Invalid tokens are collected in `errors` but valid tokens continue to be
 * expanded. The caller decides whether to commit state based on error count.
 */
export function parsePattern(input: string): ParseResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const letters: string[] = [];
  const errors: TokenError[] = [];
  const TOKEN_RE = /^([A-Z])(?:[x×](\d+))?$/;

  for (const token of tokens) {
    const m = TOKEN_RE.exec(token);
    if (!m) {
      errors.push({ token, message: `"${token}" is not a valid section token (use A, A×2, Ax3…)` });
      continue;
    }
    const letter = m[1];
    const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
    if (count < 1) {
      errors.push({ token, message: `multiplier must be at least 1` });
      continue;
    }
    for (let i = 0; i < count; i++) letters.push(letter);
  }

  return { letters, errors };
}

/**
 * Serialise a flat array of letters to a display string.
 * No automatic ×N collapsing — what is stored is what is shown.
 *
 * ["A", "A", "B", "A"] → "A A B A"
 * []                   → ""
 */
export function serialisePattern(letters: string[]): string {
  return letters.join(" ");
}
