# Code Review Report

## Summary

Solid, focused implementation of WF2. The pattern parser, FormStringEditor, TempoEditor slider, two-column StanzaCompact, and WF2 SectionRow all match the wireframe and PRD acceptance criteria. Build and tests pass (13/13). A handful of small bugs and a few polish items — none blocking.

## Compliance with PRD

| Criterion | Status | Notes |
|---|---|---|
| 1. `pnpm build` succeeds | PASS | tsc -b and vite build both clean |
| 2. `pnpm test` passes with rewritten tests | PASS | 9 pattern tests + 4 store tests all pass |
| 3. Typing `aabac` → `AABAC`; `1`/`x`/space shake | PASS | `FormStringEditor.tsx:24-38` — only `[a-zA-Z]` is accepted, everything else calls `triggerShake()` |
| 4. Backspace removes last letter | PASS | `FormStringEditor.tsx:29-35` |
| 5. Two-column stanza box | PASS | `StanzaCompact.tsx:14-70` matches WF2 source almost exactly (borders, padding, `16px`/`10px` sizes, `bars×` on top, note=bpm below) |
| 6. BPM slider overrides inheritance styling | PASS | `TempoEditor.tsx:60-79` — range slider 40–240 step 1; color toggles between `--ink` and `--faint` based on `bpmOverridden` |
| 7. Bar count accepts +/- AND typed input | PASS | `Stepper.tsx` now wraps the value in an `<input>` with commit/revert/clamp semantics; still has +/- buttons |

All seven acceptance criteria are met.

## Issues

### Critical

None.

### Important

1. **Slider does not trigger "override"** — `TempoEditor.tsx:77`. When the user drags the slider, `onBpmChange(+e.target.value)` fires with the *currently displayed* inherited bpm on the very first delta. That part is fine, but because no explicit "override" signal is sent, the slider-drag path only creates an override when the callback happens to set `stanza.bpm`. In `StanzaExpanded.tsx:66` this works (the parent writes `bpm: v`). In `SectionRow.tsx:155` this also works. Worth a regression test but not a code issue — noting for awareness.

2. **Slider value desynced when `bpm` is inherited** — `TempoEditor.tsx:76`. The `value={bpm}` is the *effective* bpm (since `bpmOverridden` may be false). That's visually correct (slider thumb sits on the inherited value), but the instant the user drags, the change goes straight through `onBpmChange`, creating an override *from the inherited value*. This is probably the desired behaviour, just confirming it's intentional — the PRD does say "dragging changes tempo and overrides inheritance styling".

3. **`Stepper` does not react to external `value` changes while focused** — `Stepper.tsx:15,44-46`. Once focused, `draft` is set from the *initial* value at focus time; subsequent prop changes (e.g., from parent re-renders) don't update the visible text until blur/commit. This is usually what you want for typing, but if an upstream store writes `value` during editing (e.g., a tap-tempo trigger or undo) the user won't see it. Minor since tap-tempo is explicitly non-scope.

4. **`Stepper` accepts leading zeros / empty string without feedback** — `Stepper.tsx:34-42`. Empty input parses to `NaN` → falls back to `clamp(value)`, but there is no visual cue during the draft that the input is empty-but-will-revert. A passing story but worth noting for UX.

5. **Paste into FormStringEditor is silently dropped** — `FormStringEditor.tsx:23-39`. `onKeyDown` only fires for single-key events; `Ctrl/Cmd+V` paste events bypass this handler entirely (the region is a `div`, not an `<input>`, so there's no native paste). Users who paste a pattern string like `AABAC` get nothing — not even the shake. The PRD does not explicitly require paste, but this is a real UX hole since `parsePattern` already does exactly the right thing for bulk input. Suggest adding `onPaste={e => { e.preventDefault(); const letters = parsePattern(e.clipboardData.getData("text")).letters; if (letters.length) onChange([...pattern, ...letters]); else triggerShake(); }}`.

6. **`handleClick` steals focus on every click inside the editor region** — `FormStringEditor.tsx:41-43,48`. The outer `<div style={{ padding: "8px 0" }} onClick={handleClick}>` calls `regionRef.current?.focus()` whenever any child receives a click — including the letter badges. For a simple editor this is fine, but if you later add selectable letters / click-to-remove, the re-focus will fight with the interaction.

7. **Duplicate `border` declaration** — `styles.css:381` and `styles.css:383`. `::-moz-range-thumb` sets `border: 2px solid var(--surface);` and then immediately overrides it with `border: none;`. The second declaration wins, making the Firefox thumb border-less while Chrome keeps its 2px border. Either delete the first `border` line or delete line 383. Likely you meant to keep the 2px border (matches Chrome).

8. **StanzaExpanded has unused props** — `StanzaExpanded.tsx:11-13`. `index`, `formBpm`, and `sectionBpm` are declared in the interface but never referenced inside the component body. Either wire them up (for "EDITING X·N" breadcrumb like WF2 shows at line 7190) or drop them from the props. The design *does* have an "EDITING LETTER·NUMBER" header that uses `index` — worth implementing. Currently the expanded body only has the label "Editing {letter}" in the SectionRow, not in the StanzaExpanded itself.

9. **SectionRow stanza toggle row is not a button** — `SectionRow.tsx:166-170`. `<div … cursor: "pointer" onClick={…}>Stanza {i+1} — …`. No `role="button"`, no `tabIndex`, no keyboard handling. The same applies to `SectionRow.tsx:64-74` (the outer header that toggles `expanded`). Accessibility regression relative to using semantic `<button>`s.

10. **`FormStringEditor` stats line grammar edge** — `FormStringEditor.tsx:125`. `unique: A B C` is rendered even when `pattern.length === 0` is blocked by the outer `pattern.length > 0` guard, which is correct — but when `pattern.length === 1`, "sections" still gets the correct "1 section · unique: A" — verified. No action needed.

### Nice-to-have

11. **`parsePattern` dead export** — `pattern.ts:5,24`. `ParseResult` is only consumed by `parsePattern` itself and is not referenced from any other module. Could be simplified to `export function parsePattern(input: string): string[] { ... }`. Tests assert the `{ letters: [...] }` shape, so changing it means updating tests — low priority.

12. **`FormStringEditor` shake timer leaks on unmount** — `FormStringEditor.tsx:15-21`. If the component unmounts during the 240ms shake, `setShaking(false)` fires on an unmounted component. Won't error in React 18 but worth a `useEffect(() => () => clearTimeout(shakeTimer.current), [])`.

13. **TempoEditor slider has no `aria-label` / `aria-valuetext`** — `TempoEditor.tsx:70-79`. Native `<input type="range">` gets a default accessible name from any associated `<label>`, but none exists here. A screen reader will announce "slider, 120, min 40, max 240" with no context. Add `aria-label="BPM"` (or similar).

14. **Caret is always rendered at the end** — `FormStringEditor.tsx:109-114`. Fine for an append-only editor; just noting that clicking a letter to edit mid-pattern (not in PRD) would require additional logic.

15. **`SectionRow` magic numbers** — e.g., the `width: 18` fade gradient at line 103. Matches WF2 exactly, which is good; just worth a one-line comment like `// WF2 fade width`.

16. **`FormStringEditor` hint text says "type letters"** — `FormStringEditor.tsx:65`. WF2 originally said "type letters, ×N for repeats". Since `×N` is no longer supported, the shorter copy is correct. No action.

17. **Type-only import nit** — `StanzaExpanded.tsx:1`, `StanzaCompact.tsx:1`, `TempoEditor.tsx:1`, `SectionRow.tsx:2`. All correctly use `import type`. Good.

## Tests

### Coverage

- `parsePattern`: 7 cases cover uppercase, lowercase, whitespace, digits, old `×`-multiplier, empty, symbols. Solid.
- `serialisePattern`: 2 cases (basic join, empty array). Minimal but adequate — the function is a one-liner.

### Gaps

- **No test for mixed symbols + letters** in middle positions, e.g., `"A!B@C"`. Likely fine given the iteration-per-char implementation, but easy to add.
- **No unit tests for FormStringEditor** — shake-triggering, backspace, focus, paste are all UI behaviours verified only by story inspection. Consider a vitest + `@testing-library/react` test for the three PRD scenarios (type letters → uppercased; type digit → no change + shake class present; backspace → last removed).
- **No unit tests for Stepper** — Enter commits, Escape reverts, clamp on overflow, clamp on underflow, empty-then-blur reverts. All straightforward to test.
- **No tests for TempoEditor slider or StanzaCompact rendering** — not blocking; the components are mostly presentational.

### Storybook

- All stories compile and match updated props. `SectionRow.stories.tsx` still has a `play()` that clicks the header to expand; it works because the header has `cursor: pointer` in its inline style. Fragile selector (`[style*='cursor: pointer']`) but acceptable.

## Final verdict

**APPROVE WITH CHANGES**

The implementation matches the PRD and WF2 design cleanly. Before merge, address at minimum:
- The duplicate `border` declaration on `::-moz-range-thumb` (Important #7) — trivial fix.
- Either implement or remove the unused `index`/`formBpm`/`sectionBpm` props on `StanzaExpanded` (Important #8) — they're dead weight on the public API right now.
- Add paste-handling to FormStringEditor (Important #5) — 5-line addition, fills an obvious UX gap given that `parsePattern` does exactly the right thing.

The accessibility items (#9, #13) and test gaps are follow-up work and don't need to block this PR.
