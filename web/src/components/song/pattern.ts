// web/src/components/song/pattern.ts
// Pure functions for parsing and serialising the WF2 pattern editor.
// No React imports — pure TypeScript module.

export interface ParseResult {
  letters: string[]; // flat list of section letters (A–Z)
}

/**
 * Parse any string into a flat array of A–Z section letters.
 *
 * Rules:
 *  - Any letter a–z / A–Z is kept and auto-uppercased.
 *  - All other characters (digits, whitespace, symbols, ×) are silently dropped.
 *
 * Examples:
 *   "ABC"    → { letters: ["A","B","C"] }
 *   "aabac"  → { letters: ["A","A","B","A","C"] }
 *   "A B C"  → { letters: ["A","B","C"] }
 *   "A1B2C"  → { letters: ["A","B","C"] }
 *   "A×2"    → { letters: ["A"] }   (× dropped, 2 dropped)
 *   ""       → { letters: [] }
 */
export function parsePattern(input: string): ParseResult {
  const letters: string[] = [];
  for (const ch of input) {
    if (/[a-zA-Z]/.test(ch)) {
      letters.push(ch.toUpperCase());
    }
  }
  return { letters };
}

/**
 * Serialise a flat array of letters to a compact string with no separator.
 *
 * ["A", "A", "B", "A"] → "AABA"
 * []                   → ""
 */
export function serialisePattern(letters: string[]): string {
  return letters.join("");
}
