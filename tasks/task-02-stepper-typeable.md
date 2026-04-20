# Task 02: Extend Stepper with type-editable value field

## Objective

Extend the `Stepper` component so its value display is a text input that accepts direct typing, while preserving the existing +/- buttons and API.

## Dependencies

None.

## Files to modify

- `web/src/components/ui/Stepper.tsx`

## Implementation

Replace the `<span>` that currently shows the value with an `<input type="text" inputMode="numeric">`. Rules:

- `value` prop drives the displayed value when the input is not focused.
- While focused, the user's draft string is kept in local state so partial typing (e.g. "1" on the way to "12") doesn't get rejected.
- On `blur` or `Enter`: parse the draft with `parseInt(draft, 10)`. If NaN or out of range, reset to the clamped nearest valid value. Otherwise, clamp to `[min, max]` and call `onChange(clamped)`.
- On `Escape`: revert to the incoming `value`.
- `onKeyDown`: allow digits, `Backspace`, `Delete`, arrows, `Tab`, `Enter`, `Escape`. Everything else `preventDefault()`.
- Keep the existing styles: same width (`minWidth: 48`), same font (hand / mono depending on `mono` prop), same centered text.
- Keep the +/- buttons unchanged.
- Keep `unit` suffix rendering next to the value input.

Do not change the component's prop signature.

## Verification

```bash
cd web && pnpm build && pnpm test
```

In the Storybook story for Stepper (if one exists), confirm that typing in the value field, clamping, and Enter/Escape handling work correctly.
