# Task 05: Rewrite TempoEditor to use a slider for BPM

## Objective

Replace the `Stepper`-based BPM input in `TempoEditor` with a native `<input type="range">` styled with the `.wf-slider` class. Keep the note picker and clear-override affordances.

## Dependencies

- Task 03 (`.wf-slider` class in styles.css)

## Files to modify

- `web/src/components/song/TempoEditor.tsx`

## Implementation

Layout matches WF2 tempo editor: a horizontal pill with `[note picker] = [big value] [slider] [clear×?]`.

- Wrap the whole thing in a container with 1.5px solid `var(--ink)` border, `var(--radius-sm)` radius, `var(--surface)` background, padding `6px 10px`, display flex, gap 8px, align center.

- Left: keep the existing note-picker button that cycles via `cycleNote()` (reuse `NoteGlyph`).

- Middle label: small `=` character in mono 10px muted.

- Value display: `<div>` using `var(--font-marker)`, fontSize 24, fontWeight 700, minWidth 40, lineHeight 1. Color is `var(--ink)` when `bpmOverridden`, else `var(--faint)`.

- Slider: `<input type="range" className="wf-slider" min={40} max={240} step={1} value={bpm} onChange={e => onBpmChange(+e.target.value)} />` — `flex: 1`.

- Note-clear `×`: render as small ghost chip when `noteOverridden && onNoteClear`. Keep the same title attr.
- BPM-clear `×`: small ghost chip when `bpmOverridden && onBpmClear`. Keep the same title attr.

- No `Stepper` import.

- Drop the top-row `Note` label + cycle button being on the right; instead the note picker is first inside the pill (WF2 style).

- Do not change the component's prop signature.

## Verification

```bash
cd web && pnpm build
```

In Storybook or dev, confirm the slider can drag values 40–240, and that the value display switches between bold ink and faint based on override state.
