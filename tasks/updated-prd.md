# Updated PRD: Reimplement Song Form UI to match WF2 design

## Problem

The first version of the song form UI (`web/src/components/song/*`) uses generic +/- stepper controls and a whitespace-separated pattern string that supports `A×2` / `Ax2` multipliers. This does not match the WF2 wireframe in `designs/Song Form Editor — Wireframes.html`.

## Goal

Rework the song form UI to match WF2 exactly:

- Stanza box is a two-column layout: **left** = time signature (stacked num/denom), **right** = bars count (`N×`) on top, BPM (`♩=N`) below.
- BPM is edited via a **slider**, not +/- buttons (note picker still cycles).
- Pattern editor accepts **only A–Z section letters**. No `x<num>` / `×<num>` multiplier syntax. Typed characters are **auto-uppercased**. Pattern is a **continuous string** (e.g. `AABAC`).
- Invalid characters (digits, `x`, symbols, spaces) are **silently ignored** and trigger a **shake animation** on the pattern input.
- Bar count in the stanza editor is **edited by a +/- stepper AND direct typing** in the value field.

## Scope

All of `web/src/components/song/` plus `web/src/components/ui/Stepper.tsx` and `web/src/styles.css`. Tests at `web/tests/pattern.test.ts`. Storybook stories updated as needed.

## Non-scope

- No backend changes. Data types (`Stanza`, `Section`, `SongForm`) unchanged.
- No tap-tempo feature.
- No changes to the numerator (`num`) / denominator (`denom`) editors in the stanza editor.

## Acceptance criteria

1. `cd web && pnpm build` succeeds.
2. `cd web && pnpm test` passes with rewritten pattern tests.
3. Typing `aabac` in the pattern editor yields `AABAC`; typing `1`, `x`, or space yields nothing and shakes the editor.
4. Backspace removes the last letter.
5. Stanza box is a two-column layout matching WF2.
6. BPM edit is a slider; dragging changes tempo and overrides inheritance styling.
7. Bar count accepts both +/- clicks and typed numeric input.
