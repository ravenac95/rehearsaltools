# Task 04: Rewrite FormStringEditor for WF2 (continuous letter-box input + shake)

## Objective

Replace the current text-input-with-token-pills FormStringEditor with a WF2-style editor: rows of colored letter boxes with a blinking caret, auto-uppercasing keystrokes, shaking on invalid input.

## Dependencies

- Task 01 (updated `pattern.ts` API — `ParseResult` no longer has `errors`)
- Task 03 (`.wf-shake` and `.wf-caret` CSS classes)

## Files to modify

- `web/src/components/song/FormStringEditor.tsx`

## Implementation

Replace the file with a WF2 letter-box editor. Structure:

- Container `<div>` that holds:
  - A small header label (`FORM PATTERN`, font `--font-mono`, 10px, muted) — right-align a subheader `type letters` in handwriting font.
  - A focusable region (`tabIndex={0}`, role "textbox", uses ref for focus management) that shows:
    - One colored letter box per character (use `LetterBadge` size 32 with a wrapping div for `active` state if applicable).
    - A blinking caret at the end (`<span className="wf-caret" style={{ height: 34, marginLeft: 2 }} />`), only rendered when the editor is focused.
    - When `definedLetters !== undefined` and a letter is not in that set, wrap its badge with a dashed border (re-use the current visual logic).
  - A stats line below: `N sections · unique: A B C` (re-use existing logic).

- State:
  - `focused: boolean` — toggled on focus/blur of the region.
  - `shaking: boolean` — set true briefly when invalid input is rejected, auto-cleared with `setTimeout` after 240ms. Apply `wf-shake` class while true.

- Keystroke handling (`onKeyDown` on the focusable region):
  - If `e.key` matches `/^[a-zA-Z]$/`: append `e.key.toUpperCase()` to a new array, call `onChange([...pattern, letter])`. `preventDefault()`.
  - If `e.key === "Backspace"` and pattern is non-empty: call `onChange(pattern.slice(0, -1))`. `preventDefault()`.
  - Else: trigger shake (`setShaking(true)` with timeout reset) and `preventDefault()`.

- The component should forward focus to itself when the user clicks anywhere in the editor region.

- Remove the old `<input type="text">` + parse-on-change logic. Remove the `draft`/`errors` state. Remove the old hint `(type letters, use A×2 for repeats)`.

- Keep the props the same: `{ pattern: string[]; onChange: (letters: string[]) => void; definedLetters?: string[] }`.

## Styling notes

- Letter boxes: use `LetterBadge` at size 32.
- Unresolved letters: wrap with `style={{ padding: 2, border: "1.5px dashed var(--accent)", borderRadius: 6 }}`.
- The editor region gets a 2px solid `var(--ink)` border with `var(--radius-md)` radius, `var(--surface)` background, padding `10px 12px`, and a 3px-3px drop shadow in `var(--ink-soft)` when focused (call out the active-input state).
- Keyboard focus visible: `outline: none` on the region itself, but the drop shadow acts as the focus ring.

## Verification

```bash
cd web && pnpm build && pnpm test
```

- Typing `aabac` renders 5 letter boxes spelling `AABAC`.
- Typing digits, spaces, symbols shakes the editor and adds nothing.
- Backspace removes the last box.
- The pattern prop is the source of truth (controlled component).
