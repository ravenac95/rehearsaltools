# Task 09: Pattern parser — parsePattern and serialisePattern

## Objective

Create `web/src/components/song/pattern.ts` with the pure parsing and serialisation functions for the type-string pattern editor, plus unit tests.

## Dependencies

- task-05-frontend-types-store-api (provides `Song`, `SongForm` types — not strictly required for the pure functions, but the build must be clean)

## Files

- **Create** `web/src/components/song/pattern.ts`
- **Create** `web/tests/pattern.test.ts`

## Context

The type-string editor allows the user to type a pattern like `"A A B A C"` or `"A×2 B A×3"`. The shorthand `×N` / `xN` is **input-time only** — it is expanded immediately before being stored. Stored patterns are always flat `string[]` with no shorthand.

Test framework: Vitest with jsdom. Test command: `pnpm -F web test`. Tests live in `web/tests/`.

This file has no React imports — it is a pure TypeScript module.

## Requirements

### `web/src/components/song/pattern.ts`

```ts
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
```

### `web/tests/pattern.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parsePattern, serialisePattern } from "../src/components/song/pattern";

describe("parsePattern", () => {
  it("parses a simple sequence", () => {
    const { letters, errors } = parsePattern("A B C");
    expect(letters).toEqual(["A", "B", "C"]);
    expect(errors).toHaveLength(0);
  });

  it("expands ×N shorthand (×)", () => {
    const { letters, errors } = parsePattern("A×2 B A×3");
    expect(letters).toEqual(["A","A","B","A","A","A"]);
    expect(errors).toHaveLength(0);
  });

  it("expands xN shorthand (x)", () => {
    const { letters } = parsePattern("Ax2 B");
    expect(letters).toEqual(["A","A","B"]);
  });

  it("returns empty letters and no errors for empty input", () => {
    const { letters, errors } = parsePattern("   ");
    expect(letters).toEqual([]);
    expect(errors).toHaveLength(0);
  });

  it("reports error for lowercase token", () => {
    const { letters, errors } = parsePattern("a B");
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("a");
    expect(letters).toEqual(["B"]);  // valid token still parsed
  });

  it("reports error for multi-char token", () => {
    const { errors } = parsePattern("AB C");
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("AB");
  });

  it("reports error for multiplier of 0", () => {
    const { errors } = parsePattern("A×0");
    expect(errors).toHaveLength(1);
  });

  it("handles mixed valid and invalid tokens, collects all errors", () => {
    const { letters, errors } = parsePattern("A 1 B ab C");
    expect(letters).toEqual(["A","B","C"]);
    expect(errors).toHaveLength(2);  // "1" and "ab"
  });

  it("allows large multipliers", () => {
    const { letters, errors } = parsePattern("A×10");
    expect(letters).toHaveLength(10);
    expect(errors).toHaveLength(0);
  });
});

describe("serialisePattern", () => {
  it("joins letters with spaces", () => {
    expect(serialisePattern(["A","A","B","A"])).toBe("A A B A");
  });

  it("returns empty string for empty array", () => {
    expect(serialisePattern([])).toBe("");
  });

  it("does not collapse repeated letters", () => {
    expect(serialisePattern(["A","A","A"])).toBe("A A A");
  });
});
```

## Existing Code References

- `web/tests/store.test.ts` — Vitest test style to match
- `web/vite.config.ts` — `test.include: ["tests/**/*.test.{ts,tsx}"]` confirms test placement

## Acceptance Criteria

- [ ] `pnpm -F web test` — all pattern tests pass (and existing store tests still pass).
- [ ] `parsePattern("A×2 B")` returns `{ letters: ["A","A","B"], errors: [] }`.
- [ ] `parsePattern("a B")` returns one error for `"a"` and `letters: ["B"]`.
- [ ] `parsePattern("")` returns empty letters and no errors.
- [ ] `serialisePattern(["A","A","B"])` returns `"A A B"`.
- [ ] No React imports in `pattern.ts`.
