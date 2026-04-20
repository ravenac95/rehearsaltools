# Task 01: Simplify pattern parser + rewrite tests

## Objective

Rewrite the pattern parser to accept only A–Z letters (auto-uppercased), drop all other characters silently, and remove the `x<num>` / `×<num>` multiplier syntax.

## Dependencies

None.

## Files to modify

- `web/src/components/song/pattern.ts`
- `web/tests/pattern.test.ts`

## Implementation

Replace the contents of `web/src/components/song/pattern.ts` with a simpler parser:

- Export `ParseResult { letters: string[] }` — drop the `errors` field (no more errors to report; invalid chars just disappear).
- Export `parsePattern(input: string): ParseResult` that:
  - Takes any string.
  - Returns an array of A–Z letters, one per valid character found (auto-uppercased).
  - Drops any character that is not `[a-zA-Z]` (digits, whitespace, `x`, `×`, symbols).
- Export `serialisePattern(letters: string[]): string` that joins the letter array with **no separator** (e.g. `["A","A","B"]` → `"AAB"`).
- Remove the `TokenError` type entirely.

Do not keep backwards-compatible handling of the old multiplier syntax — `Ax2` should parse as `["A","A","X","A"]` (wait, no — per the rule, `x` is not A-Z and is dropped; result is `["A","A"]` since "A", "x" dropped, "2" dropped, "A" kept... actually no, `Ax2` → A (kept), x (not letter — well, x IS a letter) — hmm).

**Clarification: `x` is a letter**, so `Ax2` parses as `["A","X"]`. The user's requirement "invalid characters" means non-letters (digits, symbols, whitespace). `x`/`X` as a standalone letter is valid and becomes section X. That is the intended behavior: the pattern must only contain section letters, including X if the user types it.

Then rewrite `web/tests/pattern.test.ts` to cover:

- `parsePattern("ABC")` → `{ letters: ["A","B","C"] }`
- `parsePattern("aabac")` → `{ letters: ["A","A","B","A","C"] }` (auto-uppercase)
- `parsePattern("A B C")` → `{ letters: ["A","B","C"] }` (whitespace dropped)
- `parsePattern("A1B2C")` → `{ letters: ["A","B","C"] }` (digits dropped)
- `parsePattern("A×2")` → `{ letters: ["A"] }` (× is not a letter, `2` is a digit)
- `parsePattern("")` → `{ letters: [] }`
- `parsePattern("!@#$")` → `{ letters: [] }`
- `serialisePattern(["A","A","B","A"])` → `"AABA"`
- `serialisePattern([])` → `""`

Remove the old tests that exercised `×N` expansion and error reporting.

## Verification

```bash
cd web && pnpm test
```

All tests in `tests/pattern.test.ts` pass.
